import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUserDetail = vi.fn();
const mockGetUserFollowing = vi.fn();
const mockGetUserFollowers = vi.fn();
const mockFollowUser = vi.fn();
const mockUnfollowUser = vi.fn();

vi.mock("@/api/user", () => ({
  getUserDetail: (...args: unknown[]) => mockGetUserDetail(...args),
  getUserFollowing: (...args: unknown[]) => mockGetUserFollowing(...args),
  getUserFollowers: (...args: unknown[]) => mockGetUserFollowers(...args),
}));

vi.mock("@/api/illust", () => ({
  followUser: (...args: unknown[]) => mockFollowUser(...args),
  unfollowUser: (...args: unknown[]) => mockUnfollowUser(...args),
}));

// Mock authStore
vi.mock("@/stores/authStore", () => ({
  user: () => ({ id: 1, name: "Self", account: "self" }),
}));

// Mock r18Filter
vi.mock("@/utils/r18Filter", () => ({
  filterFeedIllusts: (illusts: unknown[]) => illusts,
  filterUserPreviews: (previews: unknown[]) => previews,
}));

function createPreview(userId: number, followed = false) {
  return {
    user: { id: userId, name: `u${userId}`, account: `u${userId}`, is_followed: followed },
    illusts: [],
  };
}

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

  describe("loadFollowing / loadFollowers", () => {
    it("loads following list", async () => {
      mockGetUserFollowing.mockResolvedValue({
        user_previews: [createPreview(10, true), createPreview(11, false)],
        next_url: "next-url",
      });

      const store = await loadStore();
      await store.loadFollowing(5);

      expect(store.followingList()).toHaveLength(2);
      expect(store.followingNextUrl()).toBe("next-url");
      expect(store.loading()).toBe(false);
    });

    it("loads followers list", async () => {
      mockGetUserFollowers.mockResolvedValue({
        user_previews: [createPreview(20)],
        next_url: null,
      });

      const store = await loadStore();
      await store.loadFollowers();

      expect(store.followersList()).toHaveLength(1);
      expect(store.loading()).toBe(false);
    });

    it("handles errors gracefully", async () => {
      mockGetUserFollowing.mockRejectedValue(new Error("Network error"));

      const store = await loadStore();
      await store.loadFollowing(5);

      expect(store.error()!.message).toContain("Network error");
      expect(store.loading()).toBe(false);
    });
  });

  describe("toggleUserFollow", () => {
    it("optimistically toggles and calls API", async () => {
      mockGetUserFollowing.mockResolvedValue({
        user_previews: [createPreview(10, false)],
        next_url: null,
      });

      const store = await loadStore();
      await store.loadFollowing(5);

      // Optimistic toggle
      await store.toggleUserFollow(store.followingList()[0], "following");

      expect(store.followingList()[0].user.is_followed).toBe(true);
      expect(mockFollowUser).toHaveBeenCalledWith(10);
    });

    it("rolls back on API failure", async () => {
      mockFollowUser.mockRejectedValue(new Error("API error"));
      mockGetUserFollowing.mockResolvedValue({
        user_previews: [createPreview(10, false)],
        next_url: null,
      });

      const store = await loadStore();
      await store.loadFollowing(5);

      await store.toggleUserFollow(store.followingList()[0], "following");

      // Should be rolled back to false
      expect(store.followingList()[0].user.is_followed).toBe(false);
    });
  });

  describe("switchTab", () => {
    it("switches active tab", async () => {
      mockGetUserFollowing.mockResolvedValue({
        user_previews: [],
        next_url: null,
      });
      mockGetUserFollowers.mockResolvedValue({
        user_previews: [createPreview(30)],
        next_url: null,
      });

      const store = await loadStore();
      store.switchTab("followers");

      expect(store.activeTab()).toBe("followers");
      // FollowersList is empty so it triggers load
      expect(mockGetUserFollowers).toHaveBeenCalled();
    });
  });

  describe("resetData", () => {
    it("resets all state", async () => {
      mockGetUserDetail.mockResolvedValue({
        user: { id: 5, name: "T", account: "t" },
        profile: { bio: "B" },
      });

      const store = await loadStore();
      await store.loadProfile(5);
      store.resetData();

      expect(store.profile()).toBeNull();
      expect(store.viewedUser()).toBeNull();
      expect(store.followingList()).toEqual([]);
      expect(store.followersList()).toEqual([]);
      expect(store.error()).toBeNull();
      expect(store.loading()).toBe(false);
    });
  });
});
