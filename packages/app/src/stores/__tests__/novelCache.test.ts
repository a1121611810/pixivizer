import { describe, it, expect, beforeEach } from "vitest";
import {
  getDetail,
  setDetail,
  getText,
  setText,
  getNav,
  setNav,
  getSeries,
  setSeries,
  clearNovelCache,
} from "@/stores/novelCache";
import type { NovelSeriesDetailResponse } from "@/api/novel";
import type { PixivNovel, SeriesNavigation } from "@/api/types";

const novelTemplate: PixivNovel = {
  id: 1,
  title: "Chapter",
  user: { id: 1, name: "Author", account: "author", profile_image_urls: {} },
  image_urls: { square_medium: "", medium: "", large: "" },
  tags: [],
  page_count: 1,
  text_length: 1000,
  is_bookmarked: false,
  total_bookmarks: 0,
  x_restrict: 0,
  create_date: "2026-01-01T00:00:00Z",
};

function makeSeriesResponse(id: number): NovelSeriesDetailResponse {
  return {
    novel_series_detail: {
      id,
      title: `Series ${id}`,
      user: { id: 1, name: "Author", account: "author", profile_image_urls: {} },
      create_date: "2026-01-01T00:00:00Z",
      total_character_count: 1000,
      display_text_count: 1000,
    },
    novels: [{ ...novelTemplate, id, title: `Novel ${id}` }],
    next_url: null,
  };
}

describe("novelCache series cache", () => {
  beforeEach(() => {
    clearNovelCache();
  });

  it("stores and retrieves series data", () => {
    const data = makeSeriesResponse(1);
    setSeries(1, data);
    expect(getSeries(1)).toBe(data);
  });

  it("returns undefined for missing series", () => {
    expect(getSeries(999)).toBeUndefined();
  });

  it("evicts oldest entries when cache exceeds limit", () => {
    // seriesMax is 20; insert 21 entries to trigger eviction
    for (let i = 1; i <= 21; i++) {
      setSeries(i, makeSeriesResponse(i));
    }
    // The oldest entry (id 1) should be evicted
    expect(getSeries(1)).toBeUndefined();
    // The most recent entries should still exist
    expect(getSeries(21)).toBeDefined();
    expect(getSeries(20)).toBeDefined();
  });

  it("updates access time on get so recently used items survive", async () => {
    // Fill cache to capacity (20)
    for (let i = 1; i <= 20; i++) {
      setSeries(i, makeSeriesResponse(i));
    }
    // Access id 1 to refresh its time
    getSeries(1);
    // Add a new entry to trigger eviction
    setSeries(21, makeSeriesResponse(21));
    // id 1 was recently accessed, should still exist
    expect(getSeries(1)).toBeDefined();
    // id 2 (now oldest) should be evicted
    expect(getSeries(2)).toBeUndefined();
  });

  it("clears series cache with clearNovelCache", () => {
    setSeries(1, makeSeriesResponse(1));
    setDetail(1, { ...novelTemplate, id: 1 });
    setText(1, "text");
    setNav(1, { nextNovel: null, prevNovel: null } as SeriesNavigation);

    clearNovelCache();

    expect(getSeries(1)).toBeUndefined();
    expect(getDetail(1)).toBeUndefined();
    expect(getText(1)).toBeUndefined();
    expect(getNav(1)).toBeUndefined();
  });
});
