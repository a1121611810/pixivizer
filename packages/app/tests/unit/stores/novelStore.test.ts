import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadRecommended, loadBookmarks, loadNext } from "@/api/novel";
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

    it("skips refresh for follow tab (no API)", async () => {
      mockCurrentTab = "follow";
      const store = await loadStore();
      await store.refresh();
      expect(loadRecommended).not.toHaveBeenCalled();
    });
  });

  describe("scroll position", () => {
    it("getFeedScrollY returns 0 for unloaded tab", async () => {
      const store = await loadStore();
      expect(store.getFeedScrollY("recommended")).toBe(0);
    });
  });

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
});
