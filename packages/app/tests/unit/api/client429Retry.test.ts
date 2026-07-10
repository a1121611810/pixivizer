import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

  it("429 后重试 3 次，指数退避，最终成功", { timeout: 15000 }, async () => {
    const { apiClient } = await loadModule();

    // 前 3 次 429，第 4 次成功
    mockFetch
      .mockResolvedValueOnce(make429Response())
      .mockResolvedValueOnce(make429Response())
      .mockResolvedValueOnce(make429Response())
      .mockResolvedValueOnce(make200Response({ data: "ok" }));

    const result = await apiClient.get("/v1/illust/detail");

    expect(result).toEqual({ data: "ok" });
    // 总共调了 4 次 fetch（前 3 次 429 + 第 4 次 200）
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it("429 重试 3 次全部失败后抛出 429 错误", { timeout: 15000 }, async () => {
    const { apiClient } = await loadModule();

    mockFetch.mockResolvedValue(make429Response());

    await expect(apiClient.get("/v1/illust/detail")).rejects.toThrow(/429/);

    // 重试 3 次后放弃，总共 4 次调用（首次 + 3 次重试）
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it("非 429 错误不触发重试", async () => {
    const { apiClient } = await loadModule();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      clone: function () { return this; },
    } as unknown as Response);

    await expect(apiClient.get("/v1/illust/detail")).rejects.toThrow(/500/);

    // 只调了 1 次，没有重试
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("401 优先于 429 处理，不受重试影响", async () => {
    const { setAccessToken, setOnUnauthorized, apiClient } = await loadModule();

    setAccessToken("expired");
    const mockRefresh = vi.fn(async () => { setAccessToken("new-token"); });
    setOnUnauthorized(mockRefresh);

    // 首次 401 → refresh → 重试 200
    mockFetch
      .mockResolvedValueOnce({
        ok: false, status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
        clone: function () { return this; },
      } as unknown as Response)
      .mockResolvedValueOnce(make200Response({ data: "ok" }));

    const result = await apiClient.get("/v1/illust/detail");

    expect(result).toEqual({ data: "ok" });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
