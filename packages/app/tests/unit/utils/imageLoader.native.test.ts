import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();

vi.mock("@capacitor/core", async () => {
  const actual = await vi.importActual<typeof import("@capacitor/core")>("@capacitor/core");
  return {
    ...actual,
    Capacitor: { isNativePlatform: vi.fn(() => true) },
    CapacitorHttp: { request: vi.fn() },
    registerPlugin: vi.fn(() => ({
      saveImage: vi.fn().mockResolvedValue({}),
      getImage: vi.fn().mockResolvedValue({}),
      getCachedKeys: vi.fn().mockResolvedValue({ keys: [] }),
      clearCache: vi.fn(),
    })),
  };
});

describe("loadImage on native platform", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Native 平台使用 fetch() 走 Vite 代理，而非 CapacitorHttp
    globalThis.fetch = mockFetch;
  });

  it("fetches image via proxy URL and returns proxy path", async () => {
    const testBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic bytes
    const testBlob = new Blob([testBytes], { type: "image/jpeg" });
    mockFetch.mockResolvedValue(new Response(testBlob));

    const { loadImage } = await import("@/utils/imageLoader");
    const result = await loadImage("https://i.pximg.net/img.jpg");

    // Native 路径走 fetch() 到 Vite 代理，而非 CapacitorHttp
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/pixiv-img/img.jpg");

    // LoadImage 返回代理 URL（不走 blob: URL，避免 Network 面板条目 + 0.5ms 开销）
    expect(result.url).toMatch(/^\/pixiv-img\//u);
  });
});
