import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockRequest = vi.fn();

vi.mock("@capacitor/core", async () => {
  const actual = await vi.importActual<typeof import("@capacitor/core")>("@capacitor/core");
  return {
    ...actual,
    Capacitor: { isNativePlatform: vi.fn(() => true) },
    CapacitorHttp: { request: mockRequest },
  };
});

describe("loadImage on native platform", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequest.mockReset();
  });


  it("requests image with responseType arraybuffer and decodes base64", async () => {
    // Capacitor 将 arraybuffer 响应编码为 base64 字符串返回（无 data: 前缀）
    const testBase64 = btoa("test-image-bytes");
    mockRequest.mockResolvedValue({
      status: 200,
      data: testBase64,
      headers: { "Content-Type": "image/jpeg" },
    });

    const { loadImage } = await import("@/utils/imageLoader");
    const result = await loadImage("https://i.pximg.net/img.jpg");

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "https://i.pximg.net/img.jpg",
        responseType: "arraybuffer",
      }),
    );
    // 返回的 url 应为 blob: URL，非空
    expect(result.url).toMatch(/^blob:/);
  });
});
