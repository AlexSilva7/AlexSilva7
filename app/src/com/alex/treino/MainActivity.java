package com.alex.treino;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int REQ_FILE = 11;
    private static final int REQ_SAVE = 12;

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingExport;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        boolean night = isNightMode();
        int bg = night ? Color.rgb(0x16, 0x17, 0x1A) : Color.rgb(0xF3, 0xF1, 0xEC);
        applyBars(bg, !night);

        web = new WebView(this);
        web.setBackgroundColor(bg);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !url.startsWith("file:///android_asset/");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Escolha o backup"), REQ_FILE);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });
        setContentView(web);
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl("file:///android_asset/index.html");
    }

    private boolean isNightMode() {
        return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }

    private void applyBars(int color, boolean lightBg) {
        Window w = getWindow();
        w.setStatusBarColor(color);
        w.setNavigationBarColor(color);
        int flags = w.getDecorView().getSystemUiVisibility();
        if (lightBg) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= 26) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        } else {
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= 26) flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        w.getDecorView().setSystemUiVisibility(flags);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onConfigurationChanged(Configuration c) {
        super.onConfigurationChanged(c);
        if (web != null) web.evaluateJavascript("window.__themeChanged && window.__themeChanged()", null);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.__onBack && window.__onBack()) ? 'y' : 'n'", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String v) {
                if (v == null || !v.contains("y")) MainActivity.super.onBackPressed();
            }
        });
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript("void 0", null);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_FILE) {
            if (fileCallback != null) {
                Uri[] r = null;
                if (res == RESULT_OK && data != null && data.getData() != null) r = new Uri[]{data.getData()};
                fileCallback.onReceiveValue(r);
                fileCallback = null;
            }
        } else if (req == REQ_SAVE) {
            if (res == RESULT_OK && data != null && data.getData() != null && pendingExport != null) {
                try {
                    OutputStream os = getContentResolver().openOutputStream(data.getData());
                    os.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                    os.close();
                    Toast.makeText(this, "Backup salvo ✔", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Erro ao salvar backup", Toast.LENGTH_LONG).show();
                }
            }
            pendingExport = null;
        }
    }

    private class Bridge {
        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v == null) return;
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(new long[]{0, ms / 2, 120, ms / 2}, -1));
                else v.vibrate(ms);
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public boolean isNight() { return isNightMode(); }

        @JavascriptInterface
        public void keepOn(final boolean on) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }

        @JavascriptInterface
        public void setBars(final String css) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String[] p = css.replaceAll("[^0-9,]", "").split(",");
                        int r = Integer.parseInt(p[0]), g = Integer.parseInt(p[1]), b = Integer.parseInt(p[2]);
                        int c = Color.rgb(r, g, b);
                        applyBars(c, (r * 299 + g * 587 + b * 114) / 1000 > 140);
                        web.setBackgroundColor(c);
                    } catch (Exception ignored) { }
                }
            });
        }

        @JavascriptInterface
        public void share(final String text, final String filename) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    pendingExport = text;
                    Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("application/json");
                    i.putExtra(Intent.EXTRA_TITLE, filename);
                    try {
                        startActivityForResult(i, REQ_SAVE);
                    } catch (Exception e) {
                        Intent s = new Intent(Intent.ACTION_SEND);
                        s.setType("text/plain");
                        s.putExtra(Intent.EXTRA_TEXT, text);
                        startActivity(Intent.createChooser(s, "Exportar backup"));
                    }
                }
            });
        }
    }
}
