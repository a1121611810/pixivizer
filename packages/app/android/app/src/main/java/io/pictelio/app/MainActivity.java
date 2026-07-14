package io.pictelio.app;

import android.content.pm.PackageInfo;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

import io.pictelio.app.PredictiveBackPlugin;

import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;

/**
 * Pictelio Android 客户端 — 拦截 /pixiv-img/ 请求并代理到 i.pximg.net（注入 Referer 头）。
 */
public class MainActivity extends BridgeActivity {

    /** WebView 最低主版本号要求（低于此版本拦截启动并提示用户升级）。 */
    private static final int MIN_WEBVIEW_MAJOR_VERSION = 70;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        if (!isWebViewVersionOk()) {
            showWebViewUpgradeError();
            return;
        }

        registerPlugin(PredictiveBackPlugin.class);
        registerPlugin(PictelioHttpPlugin.class);
        registerPlugin(ImageCachePlugin.class);
        registerPlugin(AuthPlugin.class);
        super.onCreate(savedInstanceState);
        // 调试模式 — 需要时取消注释，下次启动生效（release 构建记得改回来）
        // WebView.setWebContentsDebuggingEnabled(true);
    }

    @Override
    public void onStart() {
        super.onStart();

        final WebView webView = bridge.getWebView();
        if (webView == null) return;

        // 保留 Capacitor 原有的 WebViewClient，用包装类代理非图片请求
        final WebViewClient originalClient = webView.getWebViewClient();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    WebResourceRequest request
            ) {
                String url = request.getUrl().toString();
                WebResourceResponse custom = interceptImage(url);
                if (custom != null) return custom;
                if (originalClient != null) {
                    return originalClient.shouldInterceptRequest(view, request);
                }
                return super.shouldInterceptRequest(view, request);
            }

            @SuppressWarnings("deprecation")
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                WebResourceResponse custom = interceptImage(url);
                if (custom != null) return custom;
                // 弃用重载无法获取请求头，让原始 WebViewClient 处理
                if (originalClient != null) {
                    return originalClient.shouldInterceptRequest(view, url);
                }
                return super.shouldInterceptRequest(view, url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (originalClient != null) {
                    return originalClient.shouldOverrideUrlLoading(view, request);
                }
                return super.shouldOverrideUrlLoading(view, request);
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (originalClient != null) {
                    return originalClient.shouldOverrideUrlLoading(view, url);
                }
                return super.shouldOverrideUrlLoading(view, url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (originalClient != null) {
                    originalClient.onPageFinished(view, url);
                }
                super.onPageFinished(view, url);
            }
        });
    }

    private WebResourceResponse interceptImage(String url) {
        if (url == null || !url.contains("/pixiv-img/")) return null;

        try {
            String path = url.substring(url.indexOf("/pixiv-img/") + "/pixiv-img/".length());
            String pixivUrl = new URI("https://i.pximg.net/" + path).normalize().toString();

            HttpURLConnection conn = (HttpURLConnection) new URL(pixivUrl).openConnection();
            conn.setRequestProperty("Referer", "https://app-api.pixiv.net/");
            // 与 JS 侧 src/api/userAgent.ts 的 PIXIV_USER_AGENT 保持一致
            conn.setRequestProperty("User-Agent", "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);

            String mime = conn.getContentType();
            if (mime == null) mime = "image/jpeg";

            return new WebResourceResponse(
                    mime,
                    conn.getContentEncoding(),
                    conn.getInputStream()
            );
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    // ── WebView 版本检测 ────────────────────────────────────────────

    /**
     * 提取当前设备 WebView 的主版本号。
     *
     * @return 主版本号（如 85）；无法获取时返回 -1。
     */
    private static int getWebViewMajorVersion() {
        try {
            PackageInfo pi = WebView.getCurrentWebViewPackage();
            if (pi == null || pi.versionName == null) return -1;
            int dotIdx = pi.versionName.indexOf('.');
            if (dotIdx > 0) {
                return Integer.parseInt(pi.versionName.substring(0, dotIdx));
            }
            return -1;
        } catch (Exception e) {
            return -1;
        }
    }

    /**
     * 检查当前 WebView 版本是否满足最低要求。
     *
     * 无法检测到版本时保守放行（避免误杀非标准实现）。
     */
    private boolean isWebViewVersionOk() {
        int major = getWebViewMajorVersion();
        if (major < 0) return true;     // 检测失败 → 放行，让应用自己处理
        return major >= MIN_WEBVIEW_MAJOR_VERSION;
    }

    /**
     * 显示 WebView 升级提示页，阻止应用正常启动。
     *
     * 直接加载本地静态 HTML，不初始化 Capacitor Bridge / 插件 / WebViewClient 等任何额外组件。
     */
    private void showWebViewUpgradeError() {
        setContentView(R.layout.activity_webview_error);
        WebView wv = findViewById(R.id.webview_error);
        if (wv != null) {
            wv.getSettings().setJavaScriptEnabled(true);
            wv.loadUrl("file:///android_res/raw/upgrade.html");
        }
    }

}
