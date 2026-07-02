import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock uiStore signals
let mockShowR18 = true;
let mockShowR18G = true;

vi.mock("../../stores/uiStore", () => ({
  get showR18() {
    return () => mockShowR18;
  },
  get showR18G() {
    return () => mockShowR18G;
  },
}));

// Mock blockStore
let mockBlockedIds = new Set<number>();

vi.mock("../../stores/blockStore", () => ({
  get isBlocked() {
    return (id: number) => mockBlockedIds.has(id);
  },
}));

function createIllust(
  id: number,
  x_restrict: 0 | 1 | 2 = 0,
  userId: number = 1,
) {
  return {
    id,
    title: `work-${id}`,
    type: "illust" as const,
    user: { id: userId, name: "u", account: "u", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    width: 100,
    height: 100,
    page_count: 1,
    is_bookmarked: false,
    total_bookmarks: 0,
    tags: [],
    x_restrict,
    create_date: "2026-01-01T00:00:00+00:00",
    meta_pages: [],
    meta_single_page: {},
  };
}

describe("r18Filter", () => {
  beforeEach(() => {
    mockShowR18 = true;
    mockShowR18G = true;
    mockBlockedIds = new Set();
  });

  describe("filterFeedIllusts", () => {
    it("keeps all-age illusts when R18 and R18G are enabled", async () => {
      const { filterFeedIllusts } = await import("../r18Filter");
      const input = [
        createIllust(1, 0),
        createIllust(2, 1),
        createIllust(3, 2),
      ];
      const result = filterFeedIllusts(input);
      expect(result).toHaveLength(3);
    });

    it("filters out R-18 illusts when showR18 is false", async () => {
      mockShowR18 = false;
      const { filterFeedIllusts } = await import("../r18Filter");
      const input = [
        createIllust(1, 0),
        createIllust(2, 1),
        createIllust(3, 2),
      ];
      const result = filterFeedIllusts(input);
      expect(result.map((i) => i.id)).toEqual([1, 3]);
    });

    it("filters out R-18G illusts when showR18G is false", async () => {
      mockShowR18G = false;
      const { filterFeedIllusts } = await import("../r18Filter");
      const input = [
        createIllust(1, 0),
        createIllust(2, 1),
        createIllust(3, 2),
      ];
      const result = filterFeedIllusts(input);
      expect(result.map((i) => i.id)).toEqual([1, 2]);
    });

    it("filters out both R-18 and R-18G when both disabled", async () => {
      mockShowR18 = false;
      mockShowR18G = false;
      const { filterFeedIllusts } = await import("../r18Filter");
      const input = [
        createIllust(1, 0),
        createIllust(2, 1),
        createIllust(3, 2),
      ];
      const result = filterFeedIllusts(input);
      expect(result.map((i) => i.id)).toEqual([1]);
    });

    it("removes illusts from blocked users", async () => {
      mockBlockedIds = new Set([2, 3]);
      const { filterFeedIllusts } = await import("../r18Filter");
      const input = [
        createIllust(1, 0, 1),
        createIllust(2, 0, 2), // user 2 is blocked
        createIllust(3, 0, 3), // user 3 is blocked
      ];
      const result = filterFeedIllusts(input);
      expect(result.map((i) => i.id)).toEqual([1]);
    });

    it("combines R18 filtering and blocked user filtering", async () => {
      mockShowR18 = false;
      mockBlockedIds = new Set([3]);
      const { filterFeedIllusts } = await import("../r18Filter");
      const input = [
        createIllust(1, 0, 1), // safe
        createIllust(2, 1, 1), // R-18
        createIllust(3, 0, 3), // blocked user
      ];
      const result = filterFeedIllusts(input);
      expect(result.map((i) => i.id)).toEqual([1]);
    });

    it("returns empty array for empty input", async () => {
      const { filterFeedIllusts } = await import("../r18Filter");
      expect(filterFeedIllusts([])).toEqual([]);
    });
  });

  describe("filterUserPreviews", () => {
    function createPreview(userId: number, illustIds: number[]) {
      return {
        user: { id: userId, name: `u${userId}`, account: `u${userId}`, is_followed: false },
        illusts: illustIds.map((id) => createIllust(id, 0)),
      };
    }

    it("removes blocked users from previews", async () => {
      mockBlockedIds = new Set([2]);
      const { filterUserPreviews } = await import("../r18Filter");
      const input = [createPreview(1, [10]), createPreview(2, [20])];
      const result = filterUserPreviews(input);
      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe(1);
    });

    it("filters R-18 illusts inside each preview", async () => {
      mockShowR18 = false;
      const { filterUserPreviews } = await import("../r18Filter");
      const preview = {
        user: { id: 1, name: "u1", account: "u1", is_followed: false },
        illusts: [
          createIllust(1, 0),
          createIllust(2, 1),
          createIllust(3, 2),
        ],
      };
      const result = filterUserPreviews([preview]);
      expect(result[0].illusts.map((i) => i.id)).toEqual([1, 3]);
    });
  });
});
