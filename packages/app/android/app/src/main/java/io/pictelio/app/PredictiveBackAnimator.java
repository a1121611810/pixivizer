package io.pictelio.app;

import android.os.Build;
import android.util.Log;
import android.window.BackEvent;
import android.window.OnBackAnimationCallback;
import android.window.OnBackInvokedCallback;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

import com.getcapacitor.JSObject;

/**
 * Android 16+ (API 36, VANILLA_ICE_CREAM) 预测性返回手势动画回调。
 *
 * 必须与 PredictiveBackPlugin 分离为独立类，否则 API < 36 设备上
 * ART 加载 PredictiveBackPlugin 时会因缺少 BackEvent / OnBackAnimationCallback
 * 类而抛出 ClassNotFoundException。
 *
 * 此类仅在 PredictiveBackPlugin 的 enable() 中检查
 * SDK_INT >= VANILLA_ICE_CREAM 后才会被加载。
 */
@RequiresApi(api = Build.VERSION_CODES.VANILLA_ICE_CREAM)
public class PredictiveBackAnimator {

    private static final String TAG = "PredictiveBackAnimator";

    /**
     * 创建支持进度事件的返回回调（API 34+）。
     */
    static OnBackInvokedCallback createCallback(PredictiveBackPlugin plugin) {
        return new OnBackAnimationCallback() {
            @Override
            public void onBackStarted(@NonNull BackEvent backEvent) {
                Log.d(TAG, "onBackStarted edge=" + backEvent.getSwipeEdge()
                        + " touchY=" + backEvent.getTouchY()
                        + " progress=" + backEvent.getProgress());
                plugin.notifyBackListeners("predictiveBackStart", buildPayload(backEvent));
            }

            @Override
            public void onBackProgressed(@NonNull BackEvent backEvent) {
                Log.d(TAG, "onBackProgressed progress=" + backEvent.getProgress()
                        + " edge=" + backEvent.getSwipeEdge()
                        + " touchY=" + backEvent.getTouchY());
                JSObject payload = buildPayload(backEvent);
                payload.put("progress", backEvent.getProgress());
                plugin.notifyBackListeners("predictiveBackProgress", payload);
            }

            @Override
            public void onBackInvoked() {
                Log.d(TAG, "onBackInvoked");
                plugin.notifyBackListeners("predictiveBackEnd", new JSObject());
            }

            @Override
            public void onBackCancelled() {
                Log.d(TAG, "onBackCancelled");
                plugin.notifyBackListeners("predictiveBackCancel", new JSObject());
            }
        };
    }

    private static JSObject buildPayload(@NonNull BackEvent backEvent) {
        JSObject payload = new JSObject();
        payload.put("edge", backEvent.getSwipeEdge() == BackEvent.EDGE_LEFT ? "left" : "right");
        payload.put("touchY", backEvent.getTouchY());
        return payload;
    }
}
