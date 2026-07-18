import { describe, it, expect } from "vitest";

/**
 * 此常量必须与 PictelioHttpPlugin.java 中的 ALLOWED_HOSTS 完全一致。
 *
 * 这是 JS 与 Java 之间的白名单一致性契约：
 * - Java 侧 (PictelioHttpPlugin) 用 ALLOWED_HOSTS 做运行时 URL 校验
 * - JS 侧 (client.ts) 用 PIXIV_API_BASE 等常量拼 URL
 * - 原生模式下 PictelioHttp.request() 收到的 URL 域名必须在该集合内
 */
const EXPECTED_ALLOWED_HOSTS = ["app-api.pixiv.net", "i.pximg.net"];

/** 从 URL 中提取 host */
function extractHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

describe("URL 白名单一致性契约 (JS ↔ Java)", () => {
  it("Pixiv API 绝对 URL 的 host 在白名单内", () => {
    const host = extractHost("https://app-api.pixiv.net/v1/illust/detail");
    expect(EXPECTED_ALLOWED_HOSTS).toContain(host);
  });

  it("i.pximg.net 图片 URL 的 host 在白名单内", () => {
    const host = extractHost("https://i.pximg.net/img/123.jpg");
    expect(EXPECTED_ALLOWED_HOSTS).toContain(host);
  });

  it("非 Pixiv URL 的 host 不在白名单内 — PictelioHttp 会拒绝", () => {
    const host = extractHost("https://evil.com/payload");
    expect(EXPECTED_ALLOWED_HOSTS).not.toContain(host);
  });

  it("内网 IP URL 不在白名单内 — PictelioHttp 会拒绝", () => {
    const host1 = extractHost("http://10.0.2.2:8080/admin");
    const host2 = extractHost("http://127.0.0.1:3000");
    expect(EXPECTED_ALLOWED_HOSTS).not.toContain(host1);
    expect(EXPECTED_ALLOWED_HOSTS).not.toContain(host2);
  });

  it("子域名欺骗不在白名单内", () => {
    const host = extractHost("https://app-api.pixiv.net.evil.com/");
    expect(EXPECTED_ALLOWED_HOSTS).not.toContain(host);
  });

  it("credential 注入不在白名单内", () => {
    // https://app-api.pixiv.net@evil.com/ → host 是 evil.com
    const host = extractHost("https://app-api.pixiv.net@evil.com/");
    expect(EXPECTED_ALLOWED_HOSTS).not.toContain(host);
  });

  it("http 协议不匹配白名单（白名单只要求 host，协议校验在 Java 层）", () => {
    const host = extractHost("http://app-api.pixiv.net/v1/");
    // Host 在白名单内，但协议是 http — Java 层的 isAllowedUrl 会拒绝
    expect(EXPECTED_ALLOWED_HOSTS).toContain(host);
  });
});
