package com.pixivizer.app;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Pixiv Android 客户端 — 拦截 /pixiv-img/ 请求并代理到 i.pximg.net，
 * 注入 Referer 头绕过 Pixiv 防盗链。
 */
public class MainActivity extends BridgeActivity {

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
                WebResourceResponse custom = interceptImage(request.getUrl().toString());
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
}
