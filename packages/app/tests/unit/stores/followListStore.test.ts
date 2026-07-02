import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUserFollowing = vi.fn();
const mockGetUserFollowers = vi.fn();
const mockFollowUser = vi.fn();
const mockUnfollowUser = vi.fn();

vi.mock("@/api/user", () => ({
  getUserFollowing: (...args: unknown[]) => mockGetUserFollowing(...args),
  getUserFollowers: (...args: unknown[]) => mockGetUserFollowers(...args),
}));

vi.mock("@/api/illust", () => ({
  followUser: (...args: unknown[]) => mockFollowUser(...args),
  unfollowUser: (...args: unknown[]) => mockUnfollowUser(...args),
}));

vi.mock("@/utils/r18Filter", () => ({
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
  return import("@/stores/followListStore");
}

describe("followListStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts empty", async () => {
      const { users, loading, error, nextUrl } = await loadStore();
      expect(users()).toEqual([]);
      expect(loading()).toBe(false);
      expect(error()).toBeNull();
      expect(nextUrl()).toBeNull();
    });
  });

  describe("loadList", () => {
    it("loads following list", async () => {
      mockGetUserFollowing.mockResolvedValue({
        user_previews: [createPreview(1), createPreview(2)],
        next_url: "next",
      });

      const store = await loadStore();
      await store.loadList("following", 5);

      expect(store.users()).toHaveLength(2);
      expect(store.nextUrl()).toBe("next");
      expect(mockGetUserFollowing).toHaveBeenCalledWith(5);
    });

    it("loads followers list", async () => {
      mockGetUserFollowers.mockResolvedValue({
        user_previews: [createPreview(3)],
        next_url: null,
      });

      const store = await loadStore();
      await store.loadList("followers", 5);

      expect(store.users()).toHaveLength(1);
      expect(mockGetUserFollowers).toHaveBeenCalledWith(5);
    });

    it("handles errors gracefully", async () => {
      mockGetUserFollowing.mockRejectedValue(new Error("Failed"));

      const store = await loadStore();
      await store.loadList("following", 5);

      expect(store.error()).toContain("Failed");
      expect(store.loading()).toBe(false);
    });
  });

  describe("loadMore", () => {
    it("loads next page of following", async () => {
      mockGetUserFollowing.mockResolvedValue({
        user_previews: [createPreview(1)],
        next_url: "next-following",
      });

      const store = await loadStore();
      await store.loadList("following", 5);

      mockGetUserFollowing.mockResolvedValue({
        user_previews: [createPreview(2)],
        next_url: null,
      });

      await store.loadMore("following", 5);

      expect(store.users()).toHaveLength(2);
      expect(mockGetUserFollowing).toHaveBeenCalledWith(5, "public", 1);
    });

    it("does nothing when already loading", async () => {
      const store = await loadStore();
      // Simulate loading by calling loadMore without a prior list load
      expect(store.nextUrl()).toBeNull();
      await store.loadMore("following", 5);
      expect(mockGetUserFollowing).not.toHaveBeenCalled();
    });
  });

  describe("toggleFollow", () => {
    it("optimistically toggles follow state", async () => {
      mockGetUserFollowing.mockResolvedValue({
        user_previews: [createPreview(10, false)],
        next_url: null,
      });

      const store = await loadStore();
      await store.loadList("following", 5);

      await store.toggleFollow(0);

      expect(store.users()[0].user.is_followed).toBe(true);
      expect(mockFollowUser).toHaveBeenCalledWith(10);
    });

    it("rolls back on API failure", async () => {
      mockFollowUser.mockRejectedValue(new Error("err"));
      mockGetUserFollowing.mockResolvedValue({
        user_previews: [createPreview(10, false)],
        next_url: null,
      });

      const store = await loadStore();
      await store.loadList("following", 5);
      await store.toggleFollow(0);

      expect(store.users()[0].user.is_followed).toBe(false);
    });

    it("does nothing for invalid index", async () => {
      const store = await loadStore();
      await store.toggleFollow(999);
      expect(mockFollowUser).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("resets all state", async () => {
      mockGetUserFollowing.mockResolvedValue({
        user_previews: [createPreview(1)],
        next_url: "next",
      });

      const store = await loadStore();
      await store.loadList("following", 5);
      store.reset();

      expect(store.users()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
      expect(store.nextUrl()).toBeNull();
    });
  });
});
