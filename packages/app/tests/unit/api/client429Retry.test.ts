import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiErrorType } from "@/api/types";

vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>();
  return {
    ...actual,
    Capacitor: { isNativePlatform: () => false },
    CapacitorHttp: { request: vi.fn() },
  };
});

vi.mock("@/native/PictelioHttp", () => ({
  PictelioHttp: { request: vi.fn() },
}));

async function loadModule() {
  vi.resetModules();
  return import("@/api/client");
}

describe("429 重试 — 指数退避", () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function make429Response() {
    return {
      ok: false,
      status: 429,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      clone: () => make429Response(),
    } as unknown as Response;
  }

  function make200Response(data = {}) {
    return {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      clone: () => make200Response(data),
    } as unknown as Response;
  }

  it("429 直接抛出，由 TanStack Query 处理重试", async () => {
    const { apiClient } = await loadModule();

    mockFetch.mockResolvedValue(make429Response());

    await expect(apiClient.get("/v1/illust/detail")).rejects.toMatchObject({
      type: ApiErrorType.RATE_LIMIT,
      message: "请求过于频繁，请稍后重试 (HTTP 429)",
    });

    // 只调了 1 次 fetch，client.ts 不做重试
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("非 429 错误不触发重试", async () => {
    const { apiClient } = await loadModule();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      clone: function () {
        return this;
      },
    } as unknown as Response);

    await expect(apiClient.get("/v1/illust/detail")).rejects.toThrow(/500/);

    // 只调了 1 次，没有重试
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("401 优先于 429 处理，不受重试影响", async () => {
    const { setAccessToken, setOnUnauthorized, apiClient } = await loadModule();

    setAccessToken("expired");
    const mockRefresh = vi.fn(async () => {
      setAccessToken("new-token");
    });
    setOnUnauthorized(mockRefresh);

    // 首次 401 → refresh → 重试 200
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
        clone: function () {
          return this;
        },
      } as unknown as Response)
      .mockResolvedValueOnce(make200Response({ data: "ok" }));

    const result = await apiClient.get("/v1/illust/detail");

    expect(result).toEqual({ data: "ok" });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
