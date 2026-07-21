package io.pictelio.app;

import android.app.Application;
import android.webkit.WebView;

/**
 * Pictelio Application 入口。
 *
 * 在 Application.onCreate() 中预热 WebView 服务进程，与 SplashScreen 互补：
 * - SplashScreen 掩盖 Activity 初始化到首帧绘制之间的视觉空白
 * - WebView 预热缩短 WebView 服务进程初始化耗时，减少 SplashScreen 展示时间
 * - 两者独立工作，互不干扰
 *
 * 预热时序：
 *   Application.onCreate() → new WebView() + destroy()
 *     ↓ (约 50-300ms 后)
 *   MainActivity.onCreate() → 正式 WebView 创建 → 复用已就绪的 WebView 服务进程
 *
 * 异常安全：预热失败时静默吞异常，app 正常启动，正式 WebView 回退冷初始化路径。
 */
public class PictelioApp extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        warmUpWebView();
    }

    private void warmUpWebView() {
        try {
            WebView webView = new WebView(this);
            webView.destroy();
        } catch (Exception ignored) {
            // 预热失败不阻塞 app 启动
            // 涵盖：WebView 服务崩溃、系统 WebView 未安装、ROM 定制导致
            // 的构造异常等。正式 WebView 创建时会回退到冷初始化路径。
        }
    }
}
