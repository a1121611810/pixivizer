package io.pictelio.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Dns;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * HTTP 客户端 — 使用 OkHttp + DoH DNS，绕过 GFW DNS 污染直连 Pixiv。
 *
 * 仅对 app-api.pixiv.net / i.pximg.net 启用 DoH DNS 覆盖，
 * 其他域名回退系统 DNS。DoH 失败时也回退，保证可用性。
 */
@CapacitorPlugin(name = "PictelioHttp")
public class PictelioHttpPlugin extends Plugin {

    private static volatile OkHttpClient client;

    private OkHttpClient getClient() {
        if (client != null) return client;
        synchronized (PictelioHttpPlugin.class) {
            if (client != null) return client;
            client = new OkHttpClient.Builder()
                    .dns(new DohDns())
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .build();
        }
        return client;
    }

    // ---- DNS over HTTPS 解析 ----

    /** Cloudflare DoH 端点，也可替换为 Google(8.8.8.8) 或阿里(dns.alidns.com) */
    private static final String DOH_URL = "https://cloudflare-dns.com/dns-query?name=";

    static class DohDns implements Dns {
        private static final OkHttpClient dohClient = new OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(5, TimeUnit.SECONDS)
                .build();

        @Override
        public List<InetAddress> lookup(String hostname) throws UnknownHostException {
            if (!"app-api.pixiv.net".equals(hostname) && !"i.pximg.net".equals(hostname)) {
                return Dns.SYSTEM.lookup(hostname);
            }
            try {
                Request req = new Request.Builder()
                        .url(DOH_URL + hostname + "&type=A")
                        .header("Accept", "application/dns-json")
                        .build();
                Response resp = dohClient.newCall(req).execute();
                String body = resp.body() != null ? resp.body().string() : "";
                resp.close();
                String ip = extractFirstIp(body);
                if (ip != null) {
                    return Arrays.asList(InetAddress.getByName(ip));
                }
            } catch (Exception e) {
                // DoH 失败，回退系统 DNS
            }
            return Dns.SYSTEM.lookup(hostname);
        }

        /** 从 DoH JSON 响应中提取第一个 A 记录的 IP */
        private static String extractFirstIp(String json) {
            int idx = json.indexOf("\"Answer\"");
            if (idx < 0) return null;
            int dataStart = json.indexOf("\"data\":\"", idx);
            if (dataStart < 0) return null;
            dataStart += 8;
            int dataEnd = json.indexOf("\"", dataStart);
            if (dataEnd < 0) return null;
            return json.substring(dataStart, dataEnd);
        }
    }

    // ---- Capacitor 插件方法 ----

    /** 允许通过 PictelioHttp 请求的域名白名单 */
    static final Set<String> ALLOWED_HOSTS = Collections.unmodifiableSet(
            new HashSet<>(Arrays.asList(
                    "app-api.pixiv.net",
                    "i.pximg.net"
            ))
    );

    /**
     * 校验 URL 是否在白名单内。
     * 要求：https 协议 + host 精确匹配 ALLOWED_HOSTS。
     */
    static boolean isAllowedUrl(String url) {
        if (url == null || url.isEmpty()) return false;
        try {
            URI uri = new URI(url);
            String host = uri.getHost();
            String scheme = uri.getScheme();
            return "https".equals(scheme)
                    && host != null
                    && ALLOWED_HOSTS.contains(host);
        } catch (URISyntaxException e) {
            return false;
        }
    }

    @PluginMethod
    public void request(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }
        if (!isAllowedUrl(url)) {
            call.reject("url not allowed: " + url);
            return;
        }

        String method = call.getString("method", "GET");
        JSObject headersObj = call.getObject("headers", new JSObject());
        String body = call.getString("body", null);

        Request.Builder builder = new Request.Builder().url(url);

        Iterator<String> keys = headersObj.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            builder.addHeader(key, headersObj.getString(key));
        }

        if ("POST".equalsIgnoreCase(method) && body != null) {
            builder.post(RequestBody.create(
                    body,
                    MediaType.parse("application/x-www-form-urlencoded")
            ));
        } else if ("POST".equalsIgnoreCase(method)) {
            builder.post(RequestBody.create("", null));
        }

        getClient().newCall(builder.build()).enqueue(new Callback() {
            @Override
            public void onResponse(Call c, Response response) throws IOException {
                JSObject ret = new JSObject();
                ret.put("status", response.code());
                String responseBody = response.body() != null ? response.body().string() : "";
                ret.put("data", responseBody);
                ret.put("headers", new JSObject());
                call.resolve(ret);
            }

            @Override
            public void onFailure(Call c, IOException e) {
                call.reject(e.getMessage());
            }
        });
    }
}
