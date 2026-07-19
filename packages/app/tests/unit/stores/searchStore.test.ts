import { describe, it, expect, beforeEach } from "vitest";
import { createSearchStore, type SearchStoreState } from "@/stores/searchStore";
import type { SearchSort, SearchTarget, PixivIllust, PixivNovel, ApiError } from "@/api/types";

function makeIllust(id: number, date: string): PixivIllust {
  return {
    id,
    title: `illust-${id}`,
    type: "illust",
    user: { id: 1, name: "a", account: "a", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    width: 100,
    height: 100,
    page_count: 1,
    is_bookmarked: false,
    total_bookmarks: 0,
    tags: [],
    x_restrict: 0,
    create_date: date,
    meta_pages: [],
    meta_single_page: {},
  } as PixivIllust;
}

function makeNovel(id: number, date: string): PixivNovel {
  return {
    id,
    title: `novel-${id}`,
    user: { id: 1, name: "a", account: "a", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 100,
    is_bookmarked: false,
    total_bookmarks: 0,
    x_restrict: 0,
    create_date: date,
  } as PixivNovel;
}

describe("searchStore", () => {
  let store: SearchStoreState;

  beforeEach(() => {
    store = createSearchStore();
  });

  it("starts with default values", () => {
    expect(store.keyword()).toBe("");
    expect(store.scope()).toBe("all");
    expect(store.sort()).toBe("date_desc");
    expect(store.searchTarget()).toBe("partial_match_for_tags");
    expect(store.illustResults()).toEqual([]);
    expect(store.novelResults()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.hasMoreIllust()).toBe(false);
    expect(store.hasMoreNovel()).toBe(false);
  });

  it("setKeyword updates keyword", () => {
    store.setKeyword("星空");
    expect(store.keyword()).toBe("星空");
  });

  it("setScope updates scope", () => {
    store.setScope("illust");
    expect(store.scope()).toBe("illust");
    store.setScope("novel");
    expect(store.scope()).toBe("novel");
    store.setScope("all");
    expect(store.scope()).toBe("all");
  });

  it("setSort updates sort", () => {
    store.setSort("popular_desc");
    expect(store.sort()).toBe("popular_desc");
    store.setSort("date_asc");
    expect(store.sort()).toBe("date_asc");
  });

  it("setSearchTarget updates search target", () => {
    store.setSearchTarget("title_and_caption");
    expect(store.searchTarget()).toBe("title_and_caption");
  });

  it("setResults updates illust and novel results and loading/error state", () => {
    const illusts = [makeIllust(1, "2026-01-01T00:00:00Z")];
    const novels = [makeNovel(2, "2026-01-02T00:00:00Z")];

    store.setResults(
      illusts,
      novels,
      false,
      true,
      false,
      "https://next.url/illust",
      "https://next.url/novel",
    );

    expect(store.illustResults()).toEqual(illusts);
    expect(store.novelResults()).toEqual(novels);
    expect(store.loading()).toBe(false);
    expect(store.hasMoreIllust()).toBe(true);
    expect(store.hasMoreNovel()).toBe(false);
    expect(store.nextIllustUrl()).toBe("https://next.url/illust");
    expect(store.nextNovelUrl()).toBe("https://next.url/novel");
  });

  it("setLoading updates loading state", () => {
    store.setLoading(true);
    expect(store.loading()).toBe(true);
    store.setLoading(false);
    expect(store.loading()).toBe(false);
  });

  it("setError updates error state", () => {
    const err = { type: "NETWORK" as any, message: "网络错误" };
    store.setError(err);
    expect(store.error()).toEqual(err);
    store.setError(null);
    expect(store.error()).toBeNull();
  });

  it("appendResults appends to existing results", () => {
    const illusts1 = [makeIllust(1, "2026-01-01T00:00:00Z")];
    const novels1 = [makeNovel(2, "2026-01-02T00:00:00Z")];
    store.setResults(
      illusts1,
      novels1,
      false,
      true,
      true,
      "https://next/illust",
      "https://next/novel",
    );

    const illusts2 = [makeIllust(3, "2026-01-03T00:00:00Z")];
    const novels2: PixivNovel[] = [];
    store.appendResults(illusts2, novels2, false, false, true, null, "https://next/novel");

    expect(store.illustResults()).toHaveLength(2);
    expect(store.novelResults()).toHaveLength(1);
    expect(store.hasMoreIllust()).toBe(false);
    expect(store.hasMoreNovel()).toBe(true);
    expect(store.nextIllustUrl()).toBeNull();
  });

  it("clearResults resets to defaults", () => {
    store.setResults(
      [makeIllust(1, "2026-01-01")],
      [makeNovel(2, "2026-01-02")],
      true,
      false,
      "url",
      "url2",
    );
    store.setKeyword("test");
    store.clearResults();

    expect(store.illustResults()).toEqual([]);
    expect(store.novelResults()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.hasMoreIllust()).toBe(false);
    expect(store.hasMoreNovel()).toBe(false);
    expect(store.nextIllustUrl()).toBeNull();
    expect(store.nextNovelUrl()).toBeNull();
    // keyword should NOT be cleared
    expect(store.keyword()).toBe("test");
  });

  it("persists search history with addToHistory", () => {
    store.addToHistory("星空");
    const history = store.searchHistory();
    expect(history).toContain("星空");
    expect(history.length).toBe(1);
  });

  it("deduplicates search history entries", () => {
    store.addToHistory("星空");
    store.addToHistory("星空");
    expect(store.searchHistory().filter((h) => h === "星空").length).toBe(1);
  });

  it("moves duplicate to top of history", () => {
    store.addToHistory("Fate");
    store.addToHistory("星空");
    store.addToHistory("Fate");
    expect(store.searchHistory()).toEqual(["Fate", "星空"]);
  });

  it("caps search history at 50 entries", () => {
    for (let i = 0; i < 60; i++) {
      store.addToHistory(`keyword-${i}`);
    }
    expect(store.searchHistory().length).toBe(50);
    expect(store.searchHistory()[0]).toBe("keyword-59");
  });

  it("removeFromHistory removes specific entry", () => {
    store.addToHistory("星空");
    store.addToHistory("Fate");
    store.removeFromHistory("星空");
    expect(store.searchHistory()).toEqual(["Fate"]);
  });

  it("clearHistory removes all entries", () => {
    store.addToHistory("星空");
    store.addToHistory("Fate");
    store.clearHistory();
    expect(store.searchHistory()).toEqual([]);
  });
});
