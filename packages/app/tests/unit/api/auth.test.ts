import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    Capacitor: {
      isNativePlatform: () => false,
    },
    CapacitorHttp: {
      request: vi.fn(),
    },
  };
});

vi.mock("spark-md5", () => ({
  default: {
    hash: vi.fn(() => "mocked-hash"),
  },
}));

describe("api/auth.ts", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("refreshToken", () => {
    it("makes OAuth request with correct parameters on web", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            response: {
              access_token: "new-access",
              refresh_token: "new-refresh",
              user: { id: 123, name: "TestUser", account: "testuser" },
            },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { refreshToken } = await import("@/api/auth");

      // Must call setAccessToken first to avoid reference error
      const client = await import("@/api/client");
      client.setAccessToken("");

      const result = await refreshToken("my-refresh-token");

      expect(mockFetch).toHaveBeenCalledWith("/pixiv-oauth/auth/token", {
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/x-www-form-urlencoded",
          "App-OS": "ios",
        }),
        body: expect.stringContaining("refresh_token=my-refresh-token"),
        credentials: "omit",
      });
      expect(result.response.access_token).toBe("new-access");
      expect(result.response.refresh_token).toBe("new-refresh");
    });

    it("throws on OAuth failure on web", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("invalid_grant"),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { refreshToken } = await import("@/api/auth");
      const client = await import("@/api/client");
      client.setAccessToken("");

      await expect(refreshToken("bad-token")).rejects.toThrow("OAuth 失败");
    });
  });
});
