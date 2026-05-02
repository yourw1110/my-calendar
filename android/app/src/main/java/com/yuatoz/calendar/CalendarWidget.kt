package com.yuatoz.calendar

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.util.*
import com.yuatoz.calendar.R
import kotlin.concurrent.thread

class CalendarWidget : AppWidgetProvider() {

    companion object {
        const val ACTION_PREV = "com.yuatoz.calendar.ACTION_PREV"
        const val ACTION_NEXT = "com.yuatoz.calendar.ACTION_NEXT"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        // 1. 即座に更新
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }

        // 2. 非同期で予定を取得して永続化
        thread {
            try {
                val connection = URL("https://calendar.yuatoz.com/api/events").openConnection() as HttpURLConnection
                connection.connectTimeout = 3000
                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    // 端末内に保存
                    val prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE)
                    prefs.edit().putString("events_json", response).apply()
                    
                    // 全ウィジェットを再描画
                    val manager = AppWidgetManager.getInstance(context)
                    val ids = manager.getAppWidgetIds(ComponentName(context, CalendarWidget::class.java))
                    manager.notifyAppWidgetViewDataChanged(ids, R.id.calendar_grid)
                }
            } catch (e: Exception) { e.printStackTrace() }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return

        val prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE)
        var offset = prefs.getInt("offset_$appWidgetId", 0)

        when (intent.action) {
            ACTION_PREV -> {
                prefs.edit().putInt("offset_$appWidgetId", offset - 1).apply()
                updateWidget(context, AppWidgetManager.getInstance(context), appWidgetId)
            }
            ACTION_NEXT -> {
                prefs.edit().putInt("offset_$appWidgetId", offset + 1).apply()
                updateWidget(context, AppWidgetManager.getInstance(context), appWidgetId)
            }
        }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.calendar_widget)

        val prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE)
        val offset = prefs.getInt("offset_$appWidgetId", 0)
        val cal = Calendar.getInstance()
        cal.add(Calendar.MONTH, offset)
        
        // Month Header in English (e.g., APR 2026)
        val months = arrayOf("JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC")
        views.setTextViewText(R.id.widget_date_header, "${months[cal.get(Calendar.MONTH)]} ${cal.get(Calendar.YEAR)}")

        views.setOnClickPendingIntent(R.id.btn_prev, getPendingSelfIntent(context, ACTION_PREV, appWidgetId))
        views.setOnClickPendingIntent(R.id.btn_next, getPendingSelfIntent(context, ACTION_NEXT, appWidgetId))

        val serviceIntent = Intent(context, CalendarWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
        }
        views.setRemoteAdapter(R.id.calendar_grid, serviceIntent)

        val clickIntent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(context, 0, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
        views.setPendingIntentTemplate(R.id.calendar_grid, pendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.calendar_grid)
    }

    private fun getPendingSelfIntent(context: Context, action: String, appWidgetId: Int): PendingIntent {
        val intent = Intent(context, javaClass).apply {
            this.action = action
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        }
        return PendingIntent.getBroadcast(context, appWidgetId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
}
