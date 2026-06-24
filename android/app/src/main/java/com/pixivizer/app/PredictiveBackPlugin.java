package com.pixivizer.app;

import android.app.Activity;
import android.os.Build;
import android.util.Log;
import android.window.BackEvent;
import android.window.OnBackAnimationCallback;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.annotation.NonNull;
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
                backCallback = createAnimationCallback();
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

    @RequiresApi(api = Build.VERSION_CODES.VANILLA_ICE_CREAM)
    private OnBackAnimationCallback createAnimationCallback() {
        return new OnBackAnimationCallback() {
            @Override
            public void onBackStarted(@NonNull BackEvent backEvent) {
                Log.d("PredictiveBackPlugin", "onBackStarted edge=" + backEvent.getSwipeEdge()
                        + " touchY=" + backEvent.getTouchY()
                        + " progress=" + backEvent.getProgress());
                notifyListeners("predictiveBackStart", buildBackEventPayload(backEvent));
            }

            @Override
            public void onBackProgressed(@NonNull BackEvent backEvent) {
                Log.d("PredictiveBackPlugin", "onBackProgressed progress=" + backEvent.getProgress()
                        + " edge=" + backEvent.getSwipeEdge()
                        + " touchY=" + backEvent.getTouchY());
                JSObject payload = buildBackEventPayload(backEvent);
                payload.put("progress", backEvent.getProgress());
                notifyListeners("predictiveBackProgress", payload);
            }

            @Override
            public void onBackInvoked() {
                Log.d("PredictiveBackPlugin", "onBackInvoked");
                notifyListeners("predictiveBackEnd", new JSObject());
            }

            @Override
            public void onBackCancelled() {
                Log.d("PredictiveBackPlugin", "onBackCancelled");
                notifyListeners("predictiveBackCancel", new JSObject());
            }
        };
    }

    @RequiresApi(api = Build.VERSION_CODES.VANILLA_ICE_CREAM)
    private JSObject buildBackEventPayload(@NonNull BackEvent backEvent) {
        JSObject payload = new JSObject();
        payload.put("edge", backEvent.getSwipeEdge() == BackEvent.EDGE_LEFT ? "left" : "right");
        payload.put("touchY", backEvent.getTouchY());
        return payload;
    }
}
