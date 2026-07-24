import { describe, it, expect, vi, beforeEach } from "vitest";
import { filterNovels, filterFeedIllusts } from "@/utils/r18Filter";
import type { PixivNovel, PixivIllust } from "@/api/types";

vi.mock("@/stores/settingsStore", () => ({
  showR18: vi.fn(() => false),
  showR18G: vi.fn(() => false),
}));

vi.mock("@/stores/blockStore", () => ({
  isBlocked: vi.fn((id: number) => id === 999),
}));

import { showR18, showR18G } from "@/stores/settingsStore";

function createNovel(id: number, xRestrict: number, userId: number): PixivNovel {
  return {
    id,
    title: `novel-${id}`,
    user: { id: userId, name: "author", account: "author", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 5000,
    is_bookmarked: false,
    total_bookmarks: 10,
    x_restrict: xRestrict,
    create_date: "2026-01-01T00:00:00Z",
  } as PixivNovel;
}

function createIllust(id: number, xRestrict: number, userId: number): PixivIllust {
  return {
    id,
    title: `illust-${id}`,
    type: "illust",
    user: { id: userId, name: "author", account: "author", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    width: 100,
    height: 100,
    page_count: 1,
    is_bookmarked: false,
    total_bookmarks: 10,
    tags: [],
    x_restrict: xRestrict,
    create_date: "2026-01-01T00:00:00Z",
    meta_pages: [],
    meta_single_page: {},
  } as PixivIllust;
}

describe("r18Filter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("filterNovels", () => {
    it("keeps all-age novels by default", () => {
      const novels = [createNovel(1, 0, 1)];
      expect(filterNovels(novels)).toEqual(novels);
    });

    it("filters R-18 novels when showR18 is false", () => {
      vi.mocked(showR18).mockReturnValue(false);
      vi.mocked(showR18G).mockReturnValue(false);
      const novels = [createNovel(1, 1, 1), createNovel(2, 0, 1)];
      expect(filterNovels(novels)).toEqual([novels[1]]);
    });

    it("filters R-18G novels when showR18G is false", () => {
      vi.mocked(showR18).mockReturnValue(false);
      vi.mocked(showR18G).mockReturnValue(false);
      const novels = [createNovel(1, 2, 1), createNovel(2, 0, 1)];
      expect(filterNovels(novels)).toEqual([novels[1]]);
    });

    it("keeps R-18 novels when showR18 is true", () => {
      vi.mocked(showR18).mockReturnValue(true);
      vi.mocked(showR18G).mockReturnValue(false);
      const novels = [createNovel(1, 1, 1)];
      expect(filterNovels(novels)).toEqual(novels);
    });

    it("filters novels from blocked users", () => {
      const novels = [createNovel(1, 0, 999), createNovel(2, 0, 1)];
      expect(filterNovels(novels)).toEqual([novels[1]]);
    });
  });

  describe("filterFeedIllusts backward compatibility", () => {
    it("still filters R-18 and blocked users for illusts", () => {
      vi.mocked(showR18).mockReturnValue(false);
      vi.mocked(showR18G).mockReturnValue(false);
      const illusts = [createIllust(1, 1, 1), createIllust(2, 0, 999), createIllust(3, 0, 1)];
      expect(filterFeedIllusts(illusts)).toEqual([illusts[2]]);
    });
  });
});
