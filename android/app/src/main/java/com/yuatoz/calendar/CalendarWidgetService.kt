package com.yuatoz.calendar

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import org.json.JSONArray
import java.util.*

class CalendarWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return CalendarRemoteViewsFactory(this.applicationContext, intent)
    }
}

class CalendarRemoteViewsFactory(private val context: Context, intent: Intent) : RemoteViewsService.RemoteViewsFactory {
    private val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
    private var events: JSONArray? = null
    private var viewCalendar = Calendar.getInstance()

    // カラーマップ（App.jsxと同期）
    private val colorMap = mapOf(
        "red" to "#ff3b3b",
        "orange" to "#ff8c00",
        "yellow" to "#ffe600",
        "green" to "#00e676",
        "cyan" to "#00e5ff",
        "pop_pink" to "#ff4070ff",
        "pop_purple" to "#4d5fffff",
        "pop_teal" to "#009688"
    )

    override fun onCreate() {}

    override fun onDataSetChanged() {
        val prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE)
        val offset = prefs.getInt("offset_$appWidgetId", 0)
        
        viewCalendar = Calendar.getInstance()
        viewCalendar.add(Calendar.MONTH, offset)
        viewCalendar.set(Calendar.DAY_OF_MONTH, 1)
        
        val jsonStr = prefs.getString("events_json", null)
        if (jsonStr != null) {
            try {
                events = JSONArray(jsonStr)
            } catch (e: Exception) {
                events = null
            }
        }
    }

    override fun onDestroy() {}
    override fun getCount(): Int = 42

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.calendar_widget_day_cell)
        
        val cal = viewCalendar.clone() as Calendar
        val firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
        val maxDay = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        val today = Calendar.getInstance()

        val dayOfMonth = position - (firstDayOfWeek - 2)

        if (dayOfMonth in 1..maxDay) {
            views.setTextViewText(R.id.day_num, dayOfMonth.toString())
            
            val dateStr = String.format("%d-%02d-%02d", viewCalendar.get(Calendar.YEAR), viewCalendar.get(Calendar.MONTH) + 1, dayOfMonth)

            // 2026年祝日リスト
            val holidays = setOf(
                "2026-01-01", "2026-01-12", "2026-02-11", "2026-02-23", "2026-02-24", 
                "2026-03-20", "2026-04-29", "2026-05-03", "2026-05-04", "2026-05-05", 
                "2026-05-06", "2026-07-20", "2026-08-11", "2026-09-21", "2026-09-22", 
                "2026-09-23", "2026-10-12", "2026-11-03", "2026-11-23", "2026-11-24"
            )
            val isHoliday = holidays.contains(dateStr)

            if (dayOfMonth == today.get(Calendar.DAY_OF_MONTH) && 
                viewCalendar.get(Calendar.MONTH) == today.get(Calendar.MONTH) &&
                viewCalendar.get(Calendar.YEAR) == today.get(Calendar.YEAR)) {
                views.setTextColor(R.id.day_num, Color.parseColor("#00e5ff"))
                views.setInt(R.id.day_num, "setBackgroundColor", Color.TRANSPARENT)
            } else {
                val wd = (position % 7) + 1
                // 日曜日(1) または 祝日 の場合は赤
                val color = if(wd==1 || isHoliday) "#ff3b3b" else if(wd==7) "#00e5ff" else "#888888"
                views.setTextColor(R.id.day_num, Color.parseColor(color))
                views.setInt(R.id.day_num, "setBackgroundColor", Color.TRANSPARENT)
            }

            views.setViewVisibility(R.id.task1, View.GONE)
            views.setViewVisibility(R.id.task2, View.GONE)
            views.setViewVisibility(R.id.task3, View.GONE)

            if (events != null) {
                var foundCount = 0
                for (i in 0 until events!!.length()) {
                    val ev = events!!.getJSONObject(i)
                    if (ev.optString("date") == dateStr) {
                        foundCount++
                        val taskId = when(foundCount) {
                            1 -> R.id.task1
                            2 -> R.id.task2
                            3 -> R.id.task3
                            else -> 0
                        }
                        
                        if (taskId != 0) {
                            val title = ev.optString("title", "")
                            val displayTitle = truncateByZenWidth(title, 5)
                            views.setTextViewText(taskId, displayTitle)
                            
                            // カラーIDをHEXコードに変換
                            val colorId = ev.optString("color", "cyan")
                            val hexColor = colorMap[colorId] ?: "#333333"
                            
                            try {
                                views.setInt(taskId, "setBackgroundColor", Color.parseColor(hexColor))
                                views.setTextColor(taskId, Color.BLACK)
                            } catch (e: Exception) {}
                            views.setViewVisibility(taskId, View.VISIBLE)
                        }
                        
                        if (foundCount >= 3) break
                    }
                }
            }

            val fillInIntent = Intent().apply { putExtra("date", dateStr) }
            views.setOnClickFillInIntent(R.id.day_container, fillInIntent)
        } else {
            views.setTextViewText(R.id.day_num, "")
            views.setViewVisibility(R.id.task1, View.GONE)
            views.setViewVisibility(R.id.task2, View.GONE)
            views.setViewVisibility(R.id.task3, View.GONE)
            views.setInt(R.id.day_num, "setBackgroundColor", Color.TRANSPARENT)
        }

        return views
    }

    private fun truncateByZenWidth(text: String, limitZen: Int): String {
        var currentZenCount = 0.0
        val result = StringBuilder()
        for (char in text) {
            val isHalfWidth = char.toInt() <= 127
            currentZenCount += if (isHalfWidth) 0.5 else 1.0
            
            if (currentZenCount <= limitZen) {
                result.append(char)
            } else {
                break
            }
        }
        return result.toString()
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = true
}
