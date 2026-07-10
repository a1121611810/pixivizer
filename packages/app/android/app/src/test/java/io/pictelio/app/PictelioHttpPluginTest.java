package io.pictelio.app;

import static org.junit.Assert.*;

import org.junit.Test;

/**
 * 测试 PictelioHttpPlugin 的 URL 白名单校验。
 * isAllowedUrl() 作为纯函数测试，不依赖 Capacitor 环境。
 */
public class PictelioHttpPluginTest {

    // ── 允许的域名 ──

    @Test
    public void allowsAppApiPixivNet() {
        assertTrue(PictelioHttpPlugin.isAllowedUrl("https://app-api.pixiv.net/v1/illust/detail"));
    }

    @Test
    public void allowsIPximgNet() {
        assertTrue(PictelioHttpPlugin.isAllowedUrl("https://i.pximg.net/img/123.jpg"));
    }

    @Test
    public void allowsUrlWithQueryParams() {
        assertTrue(PictelioHttpPlugin.isAllowedUrl("https://app-api.pixiv.net/v1/illust/bookmark/add?id=123&type=illust"));
    }

    // ── 应拒绝的域名 ──

    @Test
    public void rejectsEvilDomain() {
        assertFalse(PictelioHttpPlugin.isAllowedUrl("https://evil.com/payload"));
    }

    @Test
    public void rejectsPrivateIpHttp() {
        assertFalse(PictelioHttpPlugin.isAllowedUrl("http://10.0.2.2:8080/admin"));
    }

    @Test
    public void rejectsLoopback() {
        assertFalse(PictelioHttpPlugin.isAllowedUrl("http://127.0.0.1:3000"));
    }

    @Test
    public void rejectsCloudMetadata() {
        assertFalse(PictelioHttpPlugin.isAllowedUrl("http://169.254.169.254/latest/meta-data/"));
    }

    @Test
    public void rejectsSubdomainTrick() {
        // app-api.pixiv.net.evil.com 是不同的域名
        assertFalse(PictelioHttpPlugin.isAllowedUrl("https://app-api.pixiv.net.evil.com/"));
    }

    @Test
    public void rejectsCredentialsInUrl() {
        // 使用 @ 符号跳过白名单前缀
        assertFalse(PictelioHttpPlugin.isAllowedUrl("https://app-api.pixiv.net@evil.com/"));
    }

    // ── 异常输入 ──

    @Test
    public void rejectsEmptyUrl() {
        assertFalse(PictelioHttpPlugin.isAllowedUrl(""));
    }

    @Test
    public void rejectsNullUrl() {
        assertFalse(PictelioHttpPlugin.isAllowedUrl(null));
    }

    @Test
    public void rejectsMalformedUrl() {
        assertFalse(PictelioHttpPlugin.isAllowedUrl("not a url at all"));
    }

    @Test
    public void rejectsUrlWithoutScheme() {
        // 缺少 https:// 协议
        assertFalse(PictelioHttpPlugin.isAllowedUrl("app-api.pixiv.net/v1/"));
    }

    @Test
    public void rejectsHttpInsteadOfHttps() {
        // 只允许 https 协议
        assertFalse(PictelioHttpPlugin.isAllowedUrl("http://app-api.pixiv.net/v1/"));
    }
}
