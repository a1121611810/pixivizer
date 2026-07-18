package io.pictelio.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Iterator;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Pixiv OAuth 认证插件 — 在 Native 层完成 refresh_token 交换。
 *
 * CLIENT_ID / CLIENT_SECRET / HASH_SECRET 仅存在于编译后的 Java 字节码中，
 * 不出现在 JS bundle 中，避免凭证泄漏。
 *
 * 调用方式（JS 侧）：
 *   AuthPlugin.refreshToken({ refreshToken: "..." })
 *     → { accessToken, refreshToken, userId, userName, userAccount }
 */
@CapacitorPlugin(name = "AuthPlugin")
public class AuthPlugin extends Plugin {

    // ─── Pixiv OAuth 凭证（仅在此 Java 文件中出现） ───
    private static final String CLIENT_ID = "MOBrBDS8blbauoSck0ZfDbtuzpyT";
    private static final String CLIENT_SECRET = "lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj";
    private static final String HASH_SECRET = "28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c";
    private static final String AUTH_URL = "https://oauth.secure.pixiv.net/auth/token";
    private static final String USER_AGENT = "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)";

    private static volatile OkHttpClient client;

    private static OkHttpClient getClient() {
        if (client != null) return client;
        synchronized (AuthPlugin.class) {
            if (client != null) return client;
            client = new OkHttpClient.Builder()
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .build();
        }
        return client;
    }

    /**
     * 使用 refresh_token 交换新的 access_token。
     *
     * @param call 包含 refreshToken 字段的 PluginCall
     */
    @PluginMethod
    public void refreshToken(PluginCall call) {
        String refreshToken = call.getString("refreshToken");
        if (refreshToken == null || refreshToken.isEmpty()) {
            call.reject("refreshToken is required");
            return;
        }

        String localTime = DateTimeFormatter.ISO_OFFSET_DATE_TIME
                .withZone(ZoneOffset.UTC)
                .format(Instant.now())
                .replace("Z", "+00:00");

        String clientHash = md5Hex(localTime + HASH_SECRET);

        String body = new URLSearchParams()
                .add("client_id", CLIENT_ID)
                .add("client_secret", CLIENT_SECRET)
                .add("grant_type", "refresh_token")
                .add("refresh_token", refreshToken)
                .add("get_secure_url", "1")
                .build();

        Request request = new Request.Builder()
                .url(AUTH_URL)
                .addHeader("X-Client-Time", localTime)
                .addHeader("X-Client-Hash", clientHash)
                .addHeader("App-OS", "ios")
                .addHeader("App-OS-Version", "18.5")
                .addHeader("User-Agent", USER_AGENT)
                .addHeader("Content-Type", "application/x-www-form-urlencoded")
                .post(RequestBody.create(body, MediaType.parse("application/x-www-form-urlencoded")))
                .build();

        getClient().newCall(request).enqueue(new okhttp3.Callback() {
            @Override
            public void onResponse(okhttp3.Call c, Response response) {
                try {
                    String responseBody = response.body() != null ? response.body().string() : "";
                    if (!response.isSuccessful()) {
                        call.reject("OAuth failed (HTTP " + response.code() + "): "
                                + responseBody.substring(0, Math.min(300, responseBody.length())));
                        return;
                    }

                    JSONObject json = new JSONObject(responseBody);
                    // Pixiv 返回 { response: { access_token, refresh_token, user } }
                    JSONObject resp = json.optJSONObject("response");
                    if (resp == null) resp = json;

                    JSObject result = new JSObject();
                    result.put("accessToken", resp.optString("access_token", ""));
                    result.put("refreshToken", resp.optString("refresh_token", ""));

                    JSONObject user = resp.optJSONObject("user");
                    if (user != null) {
                        result.put("userId", user.optInt("id", 0));
                        result.put("userName", user.optString("name", ""));
                        result.put("userAccount", user.optString("account", ""));

                        // 提取 profile_image_urls（头像 URL），供 JS 侧 user() 信号使用
                        JSONObject profileImageUrls = user.optJSONObject("profile_image_urls");
                        if (profileImageUrls != null) {
                            JSObject urls = new JSObject();
                            for (Iterator<String> it = profileImageUrls.keys(); it.hasNext();) {
                                String key = it.next();
                                urls.put(key, profileImageUrls.optString(key, ""));
                            }
                            result.put("profileImageUrls", urls);
                        }
                    } else {
                        result.put("userId", 0);
                        result.put("userName", "");
                        result.put("userAccount", "");
                    }

                    call.resolve(result);
                } catch (JSONException e) {
                    call.reject("Failed to parse OAuth response: " + e.getMessage());
                } catch (Exception e) {
                    call.reject("Unexpected error: " + e.getMessage());
                }
            }

            @Override
            public void onFailure(okhttp3.Call c, IOException e) {
                call.reject("Network error: " + e.getMessage());
            }
        });
    }

    /**
     * 计算 UTF-8 字符串的 MD5 十六进制摘要。
     * 使用 java.security.MessageDigest，无外部依赖。
     */
    private static String md5Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(32);
            for (byte b : digest) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("MD5 not available", e);
        }
    }

    // ─── 轻量 URLSearchParams 构建（不引入 Android SDK 依赖） ───

    /**
     * 轻量的 URL 编码表单构建器。
     * 避免引入 android.net.Uri 或 java.net.URLEncoder 的平台差异。
     */
    static class URLSearchParams {
        private final StringBuilder sb = new StringBuilder();

        URLSearchParams add(String key, String value) {
            if (sb.length() > 0) sb.append('&');
            sb.append(urlEncode(key)).append('=').append(urlEncode(value));
            return this;
        }

        String build() {
            return sb.toString();
        }

        private static String urlEncode(String s) {
            StringBuilder out = new StringBuilder(s.length());
            for (byte b : s.getBytes(StandardCharsets.UTF_8)) {
                int c = b & 0xff;
                if (c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z'
                        || c >= '0' && c <= '9' || c == '-' || c == '_'
                        || c == '.' || c == '*') {
                    out.append((char) c);
                } else if (c == ' ') {
                    out.append('+');
                } else {
                    out.append('%').append(String.format("%02X", c));
                }
            }
            return out.toString();
        }
    }
}
