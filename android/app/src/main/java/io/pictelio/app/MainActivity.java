package io.pictelio.app;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

import io.pictelio.app.PredictiveBackPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.HashMap;

/**
 * Pictelio Android 客户端 — 拦截 /pixiv-img/ 请求并代理到 i.pximg.net（注入 Referer 头），
 * 以及拦截 /github-api/ 请求并代理到 api.github.com（走 Android 原生网络栈）。
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(PredictiveBackPlugin.class);
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
                custom = interceptGithubApi(url, request);
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
            String pixivUrl = "https://i.pximg.net/" + path;

            HttpURLConnection conn = (HttpURLConnection) new URL(pixivUrl).openConnection();
            conn.setRequestProperty("Referer", "https://app-api.pixiv.net/");
            conn.setRequestProperty("User-Agent", "PixivIOSApp/7.16.9 (iOS 16.4.1; iPad13,4)");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);

            InputStream input = conn.getInputStream();
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] data = new byte[8192];
            int n;
            while ((n = input.read(data)) != -1) {
                buffer.write(data, 0, n);
            }
            input.close();
            conn.disconnect();

            String mime = conn.getContentType();
            if (mime == null) mime = "image/jpeg";

            return new WebResourceResponse(
                    mime,
                    conn.getContentEncoding(),
                    new java.io.ByteArrayInputStream(buffer.toByteArray())
            );
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * 拦截 /github-api/ 请求，通过 Android 原生 HttpURLConnection 代理到 GitHub API。
     * 这样请求走系统网络栈（包括 VPN/代理），不受 WebView JS fetch 的限制。
     */
    private WebResourceResponse interceptGithubApi(String url, WebResourceRequest request) {
        if (url == null || !url.contains("/github-api/")) return null;

        android.util.Log.d("Pictelio", "[interceptGithubApi] 拦截请求: " + url);

        try {
            String path = url.substring(url.indexOf("/github-api/") + "/github-api/".length());
            String targetUrl = "https://api.github.com/" + path;

            android.util.Log.d("Pictelio", "[interceptGithubApi] 代理到: " + targetUrl);

            // 使用系统网络栈连接（随手机代理/VPN 状态自动路由）
            HttpURLConnection conn = (HttpURLConnection) new URL(targetUrl).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);

            // GitHub API 强校验这些头，显式设置确保正确
            conn.setRequestProperty("Accept", "application/vnd.github.v3+json");
            conn.setRequestProperty("User-Agent", "Pictelio-Android/1.0");

            // 转发 WebView 请求中的其他头（Accept 和 User-Agent 已显式设置）
            Map<String, String> webViewHeaders = request.getRequestHeaders();
            if (webViewHeaders != null) {
                for (Map.Entry<String, String> header : webViewHeaders.entrySet()) {
                    String key = header.getKey();
                    if (!key.equalsIgnoreCase("Host")
                            && !key.equalsIgnoreCase("Origin")
                            && !key.equalsIgnoreCase("Referer")
                            && !key.equalsIgnoreCase("Connection")
                            && !key.equalsIgnoreCase("Accept-Encoding")
                            && !key.equalsIgnoreCase("User-Agent")
                            && !key.equalsIgnoreCase("Accept")) {
                        conn.setRequestProperty(key, header.getValue());
                    }
                }
            }

            int statusCode;
            InputStream input;
            try {
                input = conn.getInputStream();
                statusCode = conn.getResponseCode();
            } catch (Exception e) {
                // 非 2xx 响应（如 404、403）会抛异常，从 errorStream 读取
                input = conn.getErrorStream();
                statusCode = conn.getResponseCode();
                if (input == null) {
                    input = new java.io.ByteArrayInputStream(new byte[0]);
                }
            }

            android.util.Log.d("Pictelio", "[interceptGithubApi] GitHub 响应: " + statusCode);

            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] data = new byte[8192];
            int n;
            while ((n = input.read(data)) != -1) {
                buffer.write(data, 0, n);
            }
            input.close();
            conn.disconnect();

            // 构建响应头 Map
            Map<String, String> responseHeaders = new HashMap<>();
            responseHeaders.put("Access-Control-Allow-Origin", "*");
            String contentType = conn.getContentType();
            if (contentType != null) {
                responseHeaders.put("Content-Type", contentType);
            }

            String mime = contentType != null ? contentType : "application/json";
            String reason = getReasonForStatus(statusCode);

            return new WebResourceResponse(
                    mime,
                    "",
                    statusCode,
                    reason,
                    responseHeaders,
                    new java.io.ByteArrayInputStream(buffer.toByteArray())
            );
        } catch (Exception e) {
            android.util.Log.e("Pictelio", "[interceptGithubApi] 异常: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    private static String getReasonForStatus(int code) {
        switch (code) {
            case 200: return "OK";
            case 201: return "Created";
            case 204: return "No Content";
            case 301: return "Moved Permanently";
            case 302: return "Found";
            case 304: return "Not Modified";
            case 400: return "Bad Request";
            case 401: return "Unauthorized";
            case 403: return "Forbidden";
            case 404: return "Not Found";
            case 405: return "Method Not Allowed";
            case 408: return "Request Timeout";
            case 429: return "Too Many Requests";
            case 500: return "Internal Server Error";
            case 502: return "Bad Gateway";
            case 503: return "Service Unavailable";
            default: return "";
        }
    }
}
