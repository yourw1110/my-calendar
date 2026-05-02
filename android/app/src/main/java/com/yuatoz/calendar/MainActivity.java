package com.yuatoz.calendar;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 初回起動時のインテント処理
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // アプリ起動中のインテント処理
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        final String date = intent.getStringExtra("date");
        if (date != null && !date.isEmpty()) {
            // Bridgeの準備ができるまで少し待ってから実行
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        // 現在のURLに date パラメータを付与して移動
                        String js = "if (window.location) {" +
                                    "  const url = new URL(window.location.href);" +
                                    "  url.searchParams.set('date', '" + date + "');" +
                                    "  window.location.href = url.toString();" +
                                    "}";
                        getBridge().getWebView().evaluateJavascript(js, null);
                    }
                }
            }, 1000); // 1秒待機（クラッシュ防止）
        }
    }

    @Override
    public void onBackPressed() {
        // WebViewの履歴を遡らずにアプリを終了する
        finish();
    }
}
