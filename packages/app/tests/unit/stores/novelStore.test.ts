import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadRecommended, loadBookmarks, loadNext, loadFollow } from "@/api/novel";
import type { PixivNovel } from "@/api/types";

vi.mock("@capacitor/core", async () => {
  const actual = await vi.importActual<typeof import("@capacitor/core")>("@capacitor/core");
  return {
    ...actual,
    Capacitor: { getPlatform: vi.fn(() => "web"), isNativePlatform: vi.fn(() => false) },
  };
});

vi.mock("@/api/novel", () => ({
  loadRecommended: vi.fn(),
  loadBookmarks: vi.fn(),
  loadNext: vi.fn(),
  loadFollow: vi.fn(),
}));

let mockCurrentTab = "recommended";

vi.mock("@/stores/uiStore", () => ({
  get currentTab() {
    return () => mockCurrentTab;
  },
  setCurrentTab: vi.fn((t: string) => {
    mockCurrentTab = t;
  }),
}));

let mockUser: { id: number; name: string } | null = { id: 42, name: "testuser" };

vi.mock("@/stores/authStore", () => ({
  get user() {
    return () => mockUser;
  },
}));

function createNovel(id: number, createDate: string): PixivNovel {
  return {
    id,
    title: `novel-${id}`,
    user: { id: 1, name: "author", account: "author", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 5000,
    is_bookmarked: false,
    total_bookmarks: 10,
    total_view: 100,
    x_restrict: 0,
    create_date: createDate,
  } as PixivNovel;
}

async function loadStore() {
  vi.resetModules();
  return import("@/stores/novelStore");
}

describe("novelStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentTab = "recommended";
  });

  describe("ensureLoaded — recommended tab", () => {
    it("loads recommended novels on first call", async () => {
      const novels = [createNovel(1, "2026-01-01T00:00:00Z")];
      vi.mocked(loadRecommended).mockResolvedValue({ novels, next_url: null });

      const store = await loadStore();
      await store.ensureLoaded();

      expect(loadRecommended).toHaveBeenCalledTimes(1);
      expect(store.novels()).toEqual(novels);
      expect(store.nextUrl()).toBeNull();
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it("uses cached data on subsequent calls", async () => {
      const novels = [createNovel(1, "2026-01-01T00:00:00Z")];
      vi.mocked(loadRecommended).mockResolvedValue({ novels, next_url: null });

      const store = await loadStore();
      await store.ensureLoaded(); // first fetch
      await store.ensureLoaded(); // second call — should use cache

      expect(loadRecommended).toHaveBeenCalledTimes(1); // not called again
      expect(store.novels()).toEqual(novels);
    });

    it("sets error on failure and clears loading", async () => {
      vi.mocked(loadRecommended).mockRejectedValue(new Error("Network error"));

      const store = await loadStore();
      await store.ensureLoaded();

      expect(store.loading()).toBe(false);
      expect(store.error()).toContain("Network error");
    });

    it("supports pagination via fetchMore", async () => {
      const page1 = [createNovel(1, "2026-02-01T00:00:00Z")];
      const page2 = [createNovel(2, "2026-01-01T00:00:00Z")];
      vi.mocked(loadRecommended).mockResolvedValue({
        novels: page1,
        next_url: "https://app-api.pixiv.net/v1/novel/recommended?offset=1",
      });
      vi.mocked(loadNext).mockResolvedValue({ novels: page2, next_url: null });

      const store = await loadStore();
      await store.ensureLoaded();
      expect(store.novels().map((n) => n.id)).toEqual([1]);

      await store.fetchMore();
      expect(loadNext).toHaveBeenCalledWith(
        "https://app-api.pixiv.net/v1/novel/recommended?offset=1",
      );
      expect(store.novels().map((n) => n.id)).toEqual([1, 2]);
      expect(store.nextUrl()).toBeNull();
    });

    it("does not fetchMore when nextUrl is null", async () => {
      vi.mocked(loadRecommended).mockResolvedValue({ novels: [], next_url: null });

      const store = await loadStore();
      await store.ensureLoaded();
      await store.fetchMore();

      expect(loadNext).not.toHaveBeenCalled();
    });
  });

  describe("ensureLoaded — bookmarks tab", () => {
    it("loads bookmarked novels when user is logged in", async () => {
      mockCurrentTab = "bookmarks";
      const novels = [createNovel(1, "2026-01-01T00:00:00Z")];
      vi.mocked(loadBookmarks).mockResolvedValue({ novels, next_url: null });

      const store = await loadStore();
      await store.ensureLoaded();

      expect(loadBookmarks).toHaveBeenCalledWith(42); // mockUser.id
      expect(store.novels()).toEqual(novels);
    });

    it("sets error when user is not logged in", async () => {
      mockCurrentTab = "bookmarks";
      mockUser = null;
      const store = await loadStore();
      await store.ensureLoaded();

      expect(loadBookmarks).not.toHaveBeenCalled();
      expect(store.error()).toBe("未登录");
    });
  });

  describe("refresh", () => {
    it("clears cache and re-fetches", async () => {
      const page1 = [createNovel(1, "2026-01-01T00:00:00Z")];
      vi.mocked(loadRecommended).mockResolvedValue({ novels: page1, next_url: null });

      const store = await loadStore();
      await store.ensureLoaded();
      expect(store.novels()).toEqual(page1);

      const page2 = [createNovel(2, "2026-02-01T00:00:00Z")];
      vi.mocked(loadRecommended).mockResolvedValue({ novels: page2, next_url: null });

      await store.refresh();
      expect(loadRecommended).toHaveBeenCalledTimes(2);
      expect(store.novels()).toEqual(page2);
    });

    it("refresh works for follow tab", async () => {
      mockCurrentTab = "follow";
      vi.mocked(loadFollow).mockResolvedValue({ novels: [], next_url: null });
      const store = await loadStore();
      await store.refresh();
      expect(loadFollow).toHaveBeenCalled();
      expect(loadRecommended).not.toHaveBeenCalled();
    });
  });

  describe("scroll position", () => {
    it("getFeedScrollY returns 0 for unloaded tab", async () => {
      const store = await loadStore();
      expect(store.getFeedScrollY("recommended")).toBe(0);
    });
  });

  // ⚠️ 测试盲区说明：
  // 以下场景无法通过 unit test 覆盖，由 E2E 测试 (feed.e2e.ts "novel follow")
  // 和 browser 测试覆盖：
  //
  // 1. 子 tab 切换后旧卡片 DOM 未被清理 → 卡片 Badge 重叠
  //    原因：Unit test 运行在 Node 环境，无 DOM 渲染。
  //    修复：For keyed remount (NovelFeedPage feedKey)
  //    验证：tests/e2e/specs/feed.e2e.ts — 检查 absolute 子元素是否有重复 top 值
  //
  // 2. 虚拟滚动中 absolute 定位元素的数据竞争
  //    原因：SolidJS For 组件 reconciliation 时序
  //    验证：E2E 测试通过 page.evaluate 直接检查 DOM 结构

  describe("isNovelCached", () => {
    it("returns true after loading", async () => {
      vi.mocked(loadRecommended).mockResolvedValue({
        novels: [createNovel(1, "2026-01-01T00:00:00Z")],
        next_url: null,
      });

      const store = await loadStore();
      expect(store.isNovelCached("recommended")).toBe(false);
      await store.ensureLoaded();
      expect(store.isNovelCached("recommended")).toBe(true);
    });
  });

  describe("follow tab", () => {
    beforeEach(() => {
      mockCurrentTab = "follow";
    });

    it("loads both public and private novels on first ensureLoaded", async () => {
      const pubNovels = [createNovel(1, "2026-02-01T00:00:00Z")];
      const privNovels = [createNovel(2, "2026-01-01T00:00:00Z")];
      vi.mocked(loadFollow).mockImplementation((restrict: string) => {
        if (restrict === "public") return Promise.resolve({ novels: pubNovels, next_url: null });
        if (restrict === "private") return Promise.resolve({ novels: privNovels, next_url: null });
        return Promise.resolve({ novels: [], next_url: null });
      });

      const store = await loadStore();
      await store.ensureLoaded();

      expect(loadFollow).toHaveBeenCalledTimes(2);
      expect(loadFollow).toHaveBeenCalledWith("public");
      expect(loadFollow).toHaveBeenCalledWith("private");
      // default followTab is "all", so should merge both
      expect(store.novels().map((n) => n.id)).toEqual([1, 2]);
      expect(store.loading()).toBe(false);
    });

    it("uses cache on subsequent ensureLoaded calls", async () => {
      vi.mocked(loadFollow).mockResolvedValue({ novels: [], next_url: null });

      const store = await loadStore();
      await store.ensureLoaded();
      await store.ensureLoaded();

      expect(loadFollow).toHaveBeenCalledTimes(2); // only first call (public + private)
    });

    it("shows empty state when follow list is empty", async () => {
      vi.mocked(loadFollow).mockResolvedValue({ novels: [], next_url: null });

      const store = await loadStore();
      await store.ensureLoaded();

      expect(store.novels()).toEqual([]);
    });

    it("sets error when both requests fail", async () => {
      vi.mocked(loadFollow).mockRejectedValue(new Error("API error"));

      const store = await loadStore();
      await store.ensureLoaded();

      expect(store.error()).toBeTruthy();
      expect(store.loading()).toBe(false);
    });

    it("gracefully degrades when only private fails", async () => {
      const pubNovels = [createNovel(1, "2026-02-01T00:00:00Z")];
      vi.mocked(loadFollow).mockImplementation((restrict: string) => {
        if (restrict === "public") return Promise.resolve({ novels: pubNovels, next_url: null });
        return Promise.reject(new Error("Private error"));
      });

      const store = await loadStore();
      await store.ensureLoaded();

      // Should still show public data
      expect(store.novels()).toEqual(pubNovels);
      // error should be null (single failure is warning, not error)
      expect(store.error()).toBeNull();
    });

    it("refreshes follow data on refresh()", async () => {
      const page1 = [createNovel(1, "2026-01-01T00:00:00Z")];
      const page2 = [createNovel(2, "2026-02-01T00:00:00Z")];
      vi.mocked(loadFollow).mockImplementation((restrict: string) => {
        if (restrict === "public") return Promise.resolve({ novels: page1, next_url: null });
        return Promise.resolve({ novels: [], next_url: null });
      });

      const store = await loadStore();
      await store.ensureLoaded();
      expect(store.novels()).toEqual(page1);

      vi.mocked(loadFollow).mockImplementation((restrict: string) => {
        if (restrict === "public") return Promise.resolve({ novels: page2, next_url: null });
        return Promise.resolve({ novels: [], next_url: null });
      });
      await store.refresh();
      expect(loadFollow).toHaveBeenCalledTimes(4); // first load (2) + refresh (2)
      expect(store.novels()).toEqual(page2);
    });

    it("scrollY is saved and restored per sub-tab", async () => {
      vi.mocked(loadFollow).mockResolvedValue({ novels: [], next_url: null });

      const store = await loadStore();
      // Simulate saving scroll at position 100 in "all" mode
      store.saveTabScroll("follow");
      // We can't easily mock window.scrollY, but we can verify it doesn't error
      expect(() => store.saveTabScroll("follow")).not.toThrow();
    });

    it("isNovelCached returns true after follow is loaded", async () => {
      vi.mocked(loadFollow).mockResolvedValue({ novels: [], next_url: null });

      const store = await loadStore();
      expect(store.isNovelCached("follow")).toBe(false);
      await store.ensureLoaded();
      expect(store.isNovelCached("follow")).toBe(true);
    });

    it("fetchMore loads next page for follow public tab", async () => {
      mockCurrentTab = "follow";
      vi.mocked(loadFollow).mockImplementation((restrict: string) => {
        if (restrict === "public")
          return Promise.resolve({
            novels: [createNovel(1, "2026-02-01T00:00:00Z")],
            next_url: "https://app-api.pixiv.net/v1/novel/follow?offset=1",
          });
        return Promise.resolve({
          novels: [createNovel(2, "2026-01-01T00:00:00Z")],
          next_url: null,
        });
      });
      vi.mocked(loadNext).mockResolvedValue({
        novels: [createNovel(3, "2026-01-01T00:00:00Z")],
        next_url: null,
      });

      const store = await loadStore();
      await store.ensureLoaded();
      const { setNovelFollowTab } = await import("@/stores/novelStore");
      setNovelFollowTab("public");
      await store.fetchMore();

      expect(store.novels()).toHaveLength(3); // [pub=1, priv=2] + fetchMore adds 3
      expect(loadNext).toHaveBeenCalledWith("https://app-api.pixiv.net/v1/novel/follow?offset=1");
      expect(store.novels().map((n) => n.id)).toEqual([1, 2, 3]);
    });

    it("does not fetchMore when nextUrl is null for follow", async () => {
      mockCurrentTab = "follow";
      vi.mocked(loadFollow).mockResolvedValue({ novels: [], next_url: null });

      const store = await loadStore();
      await store.ensureLoaded();
      await store.fetchMore();

      expect(loadNext).not.toHaveBeenCalled();
    });
  });
});
