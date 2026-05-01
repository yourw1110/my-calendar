package com.yuatoz.calendar

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.*

class CalendarWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.calendar_widget)
        
        val now = Calendar.getInstance()
        val year = now.get(Calendar.YEAR)
        val month = now.get(Calendar.MONTH)
        val today = now.get(Calendar.DAY_OF_MONTH)

        // ヘッダー表示 (例: 2026.05)
        views.setTextViewText(R.id.widget_date, String.format("%d.%02d", year, month + 1))

        // カレンダーグリッドの生成
        val calendarText = generateCalendarGrid(year, month, today)
        views.setTextViewText(R.id.calendar_grid_text, calendarText)

        // タップでアプリを起動
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

        // 更新を実行
        AppWidgetManager.getInstance(context).updateAppWidget(appWidgetId, views)
    }

    private fun generateCalendarGrid(year: Int, month: Int, today: Int): String {
        val cal = Calendar.getInstance()
        cal.set(year, month, 1)
        val firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) // 1:SUN, 2:MON...
        val maxDay = cal.getActualMaximum(Calendar.DAY_OF_MONTH)

        val grid = StringBuilder()
        
        // 初日の前を空白で埋める (1マス3文字分 "   ")
        for (i in 1 until firstDayOfWeek) {
            grid.append("   ")
        }

        for (day in 1..maxDay) {
            // 今日の日付は [ ] で囲むなどの表現も可能だが、ここではシンプルに数字を表示
            // 等幅にするため2桁にパディング
            val dayStr = String.format("%2d ", day)
            grid.append(dayStr)

            // 土曜日で改行 (firstDayOfWeek + day - 1) が 7 の倍数
            if ((firstDayOfWeek + day - 1) % 7 == 0) {
                grid.append("\n")
            }
        }
        
        return grid.toString()
    }
}
