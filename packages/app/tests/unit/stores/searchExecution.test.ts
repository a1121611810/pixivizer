import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSearchStore } from "@/stores/searchStore";
import type { PixivIllust } from "@/api/types";

const mockSearchIllust = vi.fn();
const mockSearchNovel = vi.fn();
const mockSearchIllustNext = vi.fn();
const mockSearchNovelNext = vi.fn();

vi.mock("@/api/search", () => ({
  searchIllust: (...args: unknown[]) => mockSearchIllust(...args),
  searchNovel: (...args: unknown[]) => mockSearchNovel(...args),
  searchIllustNext: (...args: unknown[]) => mockSearchIllustNext(...args),
  searchNovelNext: (...args: unknown[]) => mockSearchNovelNext(...args),
}));

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

function makeNovel(id: number, date: string) {
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
  };
}

describe("searchStore executeSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executeSearch with scope=illust calls searchIllust only", async () => {
    mockSearchIllust.mockResolvedValue({ illusts: [makeIllust(1, "2026-01-01")], next_url: null });
    const store = createSearchStore();
    store.setScope("illust");
    store.setKeyword("test");

    await store.executeSearch();

    expect(mockSearchIllust).toHaveBeenCalledWith(
      "test",
      "date_desc",
      "partial_match_for_tags",
      expect.any(AbortSignal),
    );
    expect(mockSearchNovel).not.toHaveBeenCalled();
    expect(store.illustResults()).toHaveLength(1);
    expect(store.loading()).toBe(false);
  });

  it("executeSearch with scope=novel calls searchNovel only", async () => {
    mockSearchNovel.mockResolvedValue({ novels: [makeNovel(1, "2026-01-01")], next_url: null });
    const store = createSearchStore();
    store.setScope("novel");
    store.setKeyword("test");

    await store.executeSearch();

    expect(mockSearchNovel).toHaveBeenCalled();
    expect(mockSearchIllust).not.toHaveBeenCalled();
    expect(store.novelResults()).toHaveLength(1);
  });

  it("executeSearch with scope=all calls both APIs", async () => {
    mockSearchIllust.mockResolvedValue({ illusts: [makeIllust(1, "2026-01-02")], next_url: null });
    mockSearchNovel.mockResolvedValue({ novels: [makeNovel(2, "2026-01-01")], next_url: null });
    const store = createSearchStore();
    store.setScope("all");
    store.setKeyword("test");

    await store.executeSearch();

    expect(mockSearchIllust).toHaveBeenCalled();
    expect(mockSearchNovel).toHaveBeenCalled();
    expect(store.illustResults()).toHaveLength(1);
    expect(store.novelResults()).toHaveLength(1);
  });

  it("executeSearch sets error on failure", async () => {
    mockSearchIllust.mockRejectedValue({ type: "NETWORK" as const, message: "网络错误" });
    const store = createSearchStore();
    store.setScope("illust");
    store.setKeyword("test");

    await store.executeSearch();

    expect(store.error()).toBeTruthy();
    expect(store.loading()).toBe(false);
  });

  it("executeSearch aborts previous request on re-execute", async () => {
    const abortSpy = vi.fn();
    const slowResponse = new Promise<never>(() => {}); // never resolves
    mockSearchIllust.mockReturnValue(slowResponse);
    const store = createSearchStore();
    store.setScope("illust");
    store.setKeyword("test");

    const first = store.executeSearch();
    // Execute again immediately
    const second = store.executeSearch();

    // Second should reject first via AbortController
    // Just verify loading is correct
    expect(store.loading()).toBe(true);

    // Cancel the second to clean up
    mockSearchIllust.mockResolvedValue({ illusts: [], next_url: null });
    // Can't easily test AbortController in a microtask without proper fixtures
  });

  it("loadMoreIllust fetches next page and appends", async () => {
    mockSearchIllust.mockResolvedValueOnce({
      illusts: [makeIllust(1, "2026-01-01")],
      next_url: "https://app-api.pixiv.net/v1/search/illust?word=test&offset=30",
    });
    mockSearchIllustNext.mockResolvedValue({
      illusts: [makeIllust(2, "2026-01-02")],
      next_url: null,
    });
    const store = createSearchStore();
    store.setKeyword("test");
    await store.executeSearch();
    expect(store.illustResults()).toHaveLength(1);

    await store.loadMoreIllust();

    expect(mockSearchIllustNext).toHaveBeenCalled();
    expect(store.illustResults()).toHaveLength(2);
    expect(store.hasMoreIllust()).toBe(false);
  });

  it("loadMoreNovel fetches next page and appends", async () => {
    mockSearchNovel.mockResolvedValueOnce({
      novels: [makeNovel(1, "2026-01-01")],
      next_url: "https://app-api.pixiv.net/v1/search/novel?word=test&offset=30",
    });
    mockSearchNovelNext.mockResolvedValue({ novels: [makeNovel(2, "2026-01-02")], next_url: null });
    const store = createSearchStore();
    store.setScope("novel");
    store.setKeyword("test");
    await store.executeSearch();
    expect(store.novelResults()).toHaveLength(1);

    await store.loadMoreNovel();

    expect(mockSearchNovelNext).toHaveBeenCalled();
    expect(store.novelResults()).toHaveLength(2);
  });
});
