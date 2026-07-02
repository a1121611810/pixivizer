import { describe, it, expect } from "vitest";

// Import dynamically to avoid ESM issues
async function load() {
  const mod = await import("@/utils/imageLoader");
  return mod;
}

describe("toWebProxyUrl", () => {
  it("converts i.pixiv.re URL to /pixiv-re/ proxy path", async () => {
    const { toWebProxyUrl } = await load();
    const result = toWebProxyUrl(
      "https://i.pixiv.re/c/540x540_70/img-master/img/2026/01/01/1_p0_master1200.jpg",
    );
    expect(result).toBe("/pixiv-re/c/540x540_70/img-master/img/2026/01/01/1_p0_master1200.jpg");
  });

  it("converts i.pixiv.nl URL to /pixiv-nl/ proxy path", async () => {
    const { toWebProxyUrl } = await load();
    const result = toWebProxyUrl(
      "https://i.pixiv.nl/c/540x540_70/img-master/img/2026/01/01/1_p0_master1200.jpg",
    );
    expect(result).toBe("/pixiv-nl/c/540x540_70/img-master/img/2026/01/01/1_p0_master1200.jpg");
  });

  it("converts i.pximg.net URL to /pixiv-img/ proxy path", async () => {
    const { toWebProxyUrl } = await load();
    const result = toWebProxyUrl(
      "https://i.pximg.net/c/540x540_70/img-master/img/2026/01/01/1_p0_master1200.jpg",
    );
    expect(result).toBe("/pixiv-img/c/540x540_70/img-master/img/2026/01/01/1_p0_master1200.jpg");
  });

  it("returns already-proxied URLs unchanged", async () => {
    const { toWebProxyUrl } = await load();
    expect(toWebProxyUrl("/pixiv-re/c/1.jpg")).toBe("/pixiv-re/c/1.jpg");
    expect(toWebProxyUrl("/pixiv-img/c/1.jpg")).toBe("/pixiv-img/c/1.jpg");
  });

  it("returns empty string for empty input", async () => {
    const { toWebProxyUrl } = await load();
    expect(toWebProxyUrl("")).toBe("");
  });

  it("handles unknown hosts via resolveImageUrl fallback", async () => {
    const { toWebProxyUrl } = await load();
    const result = toWebProxyUrl("https://cdn.example.com/c/540x540_70/img.jpg");
    // Should fall back to /pixiv-img/ proxy path
    expect(result).toMatch(/^\/pixiv-img\//);
  });
});
