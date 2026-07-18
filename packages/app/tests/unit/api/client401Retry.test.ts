import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Capacitor: web 模式
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

describe("401 并发重试 — Promise 队列", () => {
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

  /** 构造一个 401 响应 */
  function make401Response() {
    return {
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      clone: () => make401Response(),
    } as unknown as Response;
  }

  /** 构造一个成功的 200 响应 */
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

  it("并发 401 请求共享一次 refresh，全部成功", async () => {
    const { setAccessToken, setOnUnauthorized, apiClient } = await loadModule();

    let refreshCallCount = 0;
    const mockRefresh = vi.fn(async () => {
      refreshCallCount++;
      setAccessToken("new-token");
    });

    setAccessToken("expired-token");
    setOnUnauthorized(mockRefresh);

    // MockFetch: 前两次调用返回 401，后续返回 200
    mockFetch
      .mockResolvedValueOnce(make401Response()) // 请求 A 首次
      .mockResolvedValueOnce(make401Response()) // 请求 B 首次（并发）
      .mockResolvedValueOnce(make200Response({ data: "A" })) // 请求 A 重试
      .mockResolvedValueOnce(make200Response({ data: "B" })); // 请求 B 重试

    // 并发发起两个请求
    const [resultA, resultB] = await Promise.all([
      apiClient.get("/v1/illust/A"),
      apiClient.get("/v1/illust/B"),
    ]);

    // 两个请求都应该拿到数据
    expect(resultA).toEqual({ data: "A" });
    expect(resultB).toEqual({ data: "B" });

    // Refresh 只被调用一次
    expect(refreshCallCount).toBe(1);
  });

  it("refresh 失败后，所有并发请求一致抛 401", async () => {
    const { setAccessToken, setOnUnauthorized, apiClient } = await loadModule();

    let refreshCallCount = 0;
    const mockRefresh = vi.fn(async () => {
      refreshCallCount++;
      // Refresh 失败，token 为空
      setAccessToken("");
    });

    setAccessToken("expired-token");
    setOnUnauthorized(mockRefresh);

    mockFetch.mockResolvedValue(make401Response());

    // 并发发起两个请求
    const [errA, errB] = await Promise.all([
      apiClient.get("/v1/illust/A").catch((error: Error) => error),
      apiClient.get("/v1/illust/B").catch((error: Error) => error),
    ]);

    // 两个请求都收到 401 错误
    expect(errA.message).toContain("401");
    expect(errB.message).toContain("401");

    // Refresh 只被调用一次
    expect(refreshCallCount).toBe(1);
  });
});
