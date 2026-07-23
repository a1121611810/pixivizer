import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUserDetail = vi.fn();

vi.mock("@/api/user", () => ({
  getUserDetail: (...args: unknown[]) => mockGetUserDetail(...args),
}));

// Mock authStore
vi.mock("@/stores/authStore", () => ({
  user: () => ({ id: 1, name: "Self", account: "self" }),
}));

async function loadStore() {
  vi.resetModules();
  return import("@/stores/userStore");
}

describe("userStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadProfile", () => {
    it("loads profile and caches it", async () => {
      mockGetUserDetail.mockResolvedValue({
        user: { id: 5, name: "Target", account: "target" },
        profile: { bio: "Hello" },
      });

      const store = await loadStore();
      await store.loadProfile(5);

      expect(store.profile()?.bio).toBe("Hello");
      expect(store.viewedUser()?.id).toBe(5);
      expect(mockGetUserDetail).toHaveBeenCalledWith(5);
    });

    it("uses cache on second call", async () => {
      mockGetUserDetail.mockResolvedValue({
        user: { id: 5, name: "Target", account: "target" },
        profile: { bio: "Hello" },
      });

      const store = await loadStore();
      await store.loadProfile(5);
      expect(mockGetUserDetail).toHaveBeenCalledTimes(1);

      await store.loadProfile(5);
      // Should NOT call API again (cache hit)
      expect(mockGetUserDetail).toHaveBeenCalledTimes(1);
    });
  });
});
