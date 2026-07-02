import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

async function loadService() {
  vi.resetModules();
  return import("../../../src/services/updateService");
}

describe("updateService", () => {
  // APP_VERSION is used as a global constant in updateService.ts
  // Set it before each test
  beforeEach(() => {
    vi.stubGlobal("APP_VERSION", "1.2.3");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("isNewer", () => {
    it("returns true when remote major is greater", async () => {
      const { isNewer } = await loadService();
      expect(isNewer("1.0.0", "2.0.0")).toBe(true);
    });

    it("returns false when local major is greater", async () => {
      const { isNewer } = await loadService();
      expect(isNewer("3.0.0", "2.0.0")).toBe(false);
    });

    it("returns true when remote minor is greater", async () => {
      const { isNewer } = await loadService();
      expect(isNewer("1.1.0", "1.2.0")).toBe(true);
    });

    it("returns false when local minor is greater", async () => {
      const { isNewer } = await loadService();
      expect(isNewer("1.3.0", "1.2.0")).toBe(false);
    });

    it("returns true when remote patch is greater", async () => {
      const { isNewer } = await loadService();
      expect(isNewer("1.2.3", "1.2.4")).toBe(true);
    });

    it("returns false when versions are equal", async () => {
      const { isNewer } = await loadService();
      expect(isNewer("1.2.3", "1.2.3")).toBe(false);
    });

    it("handles leading v prefix on remote", async () => {
      const { isNewer } = await loadService();
      expect(isNewer("1.0.0", "v2.0.0")).toBe(true);
      expect(isNewer("2.0.0", "v1.0.0")).toBe(false);
    });

    it("handles different length versions", async () => {
      const { isNewer } = await loadService();
      expect(isNewer("1.0", "1.0.1")).toBe(true);
      expect(isNewer("1.0.1", "1.0")).toBe(false);
    });
  });

  describe("checkForUpdate", () => {
    it("returns noUpdate when fetch fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }));

      const { checkForUpdate } = await loadService();
      const result = await checkForUpdate();

      expect(result.hasUpdate).toBe(false);
      expect(result.latestVersion).toBe("");
    });

    it("returns noUpdate on network error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

      const { checkForUpdate } = await loadService();
      const result = await checkForUpdate();

      expect(result.hasUpdate).toBe(false);
    });

    it("detects update when remote is newer", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            version: "2.0.0",
            url: "https://github.com/a1121611810/pixivizer/releases/v2.0.0",
            changelog: "Major update",
          }),
      }));

      const { checkForUpdate } = await loadService();
      const result = await checkForUpdate();

      expect(result.hasUpdate).toBe(true);
      expect(result.latestVersion).toBe("2.0.0");
      expect(result.latestReleaseUrl).toContain("v2.0.0");
    });

    it("detects no update when remote is same version", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            version: "1.2.3",
            url: "",
            changelog: "",
          }),
      }));

      const { checkForUpdate } = await loadService();
      const result = await checkForUpdate();

      expect(result.hasUpdate).toBe(false);
    });

    it("returns cached result on subsequent failures", async () => {
      vi.stubGlobal("fetch", vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              version: "2.0.0",
              url: "https://example.com",
              changelog: "changes",
            }),
        })
        .mockRejectedValueOnce(new Error("Network error"))
      );

      const { checkForUpdate } = await loadService();
      const first = await checkForUpdate();
      expect(first.hasUpdate).toBe(true);

      const second = await checkForUpdate();
      expect(second.hasUpdate).toBe(true); // Returns cached
    });
  });

  describe("resetCache / getCachedResult", () => {
    it("getCachedResult returns null before any check", async () => {
      const { getCachedResult } = await loadService();
      expect(getCachedResult()).toBeNull();
    });

    it("resetCache clears cached result", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: "2.0.0", url: "", changelog: "" }),
      }));

      const { checkForUpdate, resetCache, getCachedResult } = await loadService();
      await checkForUpdate();
      expect(getCachedResult()).not.toBeNull();

      resetCache();
      expect(getCachedResult()).toBeNull();
    });
  });
});
