package io.pictelio.app;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 控制 WebView 调试模式（chrome://inspect / edge://inspect）。
 * 默认关闭，用户可在「关于 → 开发者选项」中开启。
 */
@CapacitorPlugin(name = "WebDebug")
public class WebDebugPlugin extends Plugin {

    private static final String TAG = "WebDebugPlugin";
    private static final String PREFS_NAME = "WebDebugPrefs";
    private static final String KEY_ENABLED = "webview_debug_enabled";

    /**
     * 设置 WebView 调试开关。
     * 即时生效并持久化到 SharedPreferences。
     *
     * 注意：WebView.setWebContentsDebuggingEnabled 必须在 UI 线程调用。
     */
    @PluginMethod
    public void setEnabled(PluginCall call) {
        final boolean enabled = call.getBoolean("enabled", false);

        // 写入 SharedPreferences（可在后台线程执行）
        Context ctx = getContext();
        if (ctx != null) {
            ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putBoolean(KEY_ENABLED, enabled)
                    .apply();
        }

        // WebView.setWebContentsDebuggingEnabled 必须在 UI 线程调用
        final Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                try {
                    WebView.setWebContentsDebuggingEnabled(enabled);
                } catch (Exception e) {
                    Log.w(TAG, "Failed to set WebView debugging", e);
                }
            });
        }

        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    /**
     * 获取当前 WebView 调试状态。
     */
    @PluginMethod
    public void getIsEnabled(PluginCall call) {
        boolean enabled = false;
        Context ctx = getContext();
        if (ctx != null) {
            enabled = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .getBoolean(KEY_ENABLED, false);
        }

        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    /**
     * 供 MainActivity.onCreate() 调用的静态方法，在 WebView 加载前应用设置。
     */
    public static void applyOnCreate(Context ctx) {
        boolean enabled = false;
        if (ctx != null) {
            enabled = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .getBoolean(KEY_ENABLED, false);
        }
        WebView.setWebContentsDebuggingEnabled(enabled);
    }
}
