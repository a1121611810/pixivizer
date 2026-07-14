package io.pictelio.app;

import android.app.Activity;
import android.os.Build;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.annotation.RequiresApi;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 暴露 Android 16 预测性返回手势事件给 Capacitor Web 层。
 */
@CapacitorPlugin(name = "PredictiveBack")
public class PredictiveBackPlugin extends Plugin {

    private Object backCallback;
    private volatile boolean isEnabled = false;

    @PluginMethod
    public void enable(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve();
            return;
        }

        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        activity.runOnUiThread(() -> {
            if (activity.isFinishing()) {
                call.reject("Activity is finishing");
                return;
            }

            if (isEnabled) {
                call.resolve();
                return;
            }

            OnBackInvokedDispatcher dispatcher = activity.getOnBackInvokedDispatcher();
            if (dispatcher == null) {
                call.resolve();
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                backCallback = PredictiveBackAnimator.createCallback(this);
            } else {
                backCallback = createFallbackCallback();
            }

            dispatcher.registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    (OnBackInvokedCallback) backCallback
            );
            isEnabled = true;
            call.resolve();
        });
    }

    @PluginMethod
    public void disable(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve();
            return;
        }

        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        activity.runOnUiThread(() -> {
            if (activity.isFinishing()) {
                call.reject("Activity is finishing");
                return;
            }

            if (!isEnabled || backCallback == null) {
                call.resolve();
                return;
            }

            OnBackInvokedDispatcher dispatcher = activity.getOnBackInvokedDispatcher();
            if (dispatcher != null) {
                dispatcher.unregisterOnBackInvokedCallback((OnBackInvokedCallback) backCallback);
            }
            backCallback = null;
            isEnabled = false;
            call.resolve();
        });
    }

    @PluginMethod
    public void finishActivity(PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        activity.runOnUiThread(() -> {
            if (activity.isFinishing()) {
                call.reject("Activity is finishing");
                return;
            }

            activity.finish();
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && isEnabled
                && backCallback != null) {
            Activity activity = getActivity();
            if (activity != null) {
                OnBackInvokedDispatcher dispatcher = activity.getOnBackInvokedDispatcher();
                if (dispatcher != null) {
                    dispatcher.unregisterOnBackInvokedCallback((OnBackInvokedCallback) backCallback);
                }
            }
            backCallback = null;
            isEnabled = false;
        }
        super.handleOnDestroy();
    }

    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    private OnBackInvokedCallback createFallbackCallback() {
        return () -> notifyListeners("predictiveBackEnd", new JSObject());
    }

    /** 包级访问桥 — PredictivBackAnimator 通过此方法调用 protected notifyListeners。 */
    void notifyBackListeners(String eventName, JSObject data) {
        notifyListeners(eventName, data);
    }

}
