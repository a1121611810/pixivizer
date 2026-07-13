import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PixivIllust, PixivNovel } from "@/api/types";

// ── Dual-resource mock state ──
// Illust resource (first createResource call)
let mockIllustValue: { illusts: PixivIllust[]; nextUrl: string | null } = {
  illusts: [],
  nextUrl: null,
};
let mockIllustLoading = false;
let mockIllustError: Error | null = null;
const mockIllustMutate = vi.fn();

// Novel resource (second createResource call)
let mockNovelValue: { novels: PixivNovel[]; nextUrl: string | null } = {
  novels: [],
  nextUrl: null,
};
let mockNovelLoading = false;
let mockNovelError: Error | null = null;
const mockNovelMutate = vi.fn();

// Track which createResource call we're on
let mockCreateResourceCount = 0;

vi.mock("solid-js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    createResource: () => {
      const isIllust = mockCreateResourceCount === 0;
      mockCreateResourceCount++;
      if (isIllust) {
        const resourceFn = () => mockIllustValue;
        resourceFn.loading = mockIllustLoading;
        resourceFn.error = mockIllustError;
        resourceFn.state = mockIllustError ? "errored" : "ready";
        return [
          resourceFn,
          {
            mutate: mockIllustMutate.mockImplementation(
              (
                fn:
                  | ((prev: typeof mockIllustValue) => typeof mockIllustValue)
                  | typeof mockIllustValue,
              ) => {
                if (typeof fn === "function") {
                  mockIllustValue = fn(mockIllustValue);
                } else {
                  mockIllustValue = fn;
                }
              },
            ),
          },
        ];
      }
      const resourceFn = () => mockNovelValue;
      resourceFn.loading = mockNovelLoading;
      resourceFn.error = mockNovelError;
      resourceFn.state = mockNovelError ? "errored" : "ready";
      return [
        resourceFn,
        {
          mutate: mockNovelMutate.mockImplementation(
            (
              fn: ((prev: typeof mockNovelValue) => typeof mockNovelValue) | typeof mockNovelValue,
            ) => {
              if (typeof fn === "function") {
                mockNovelValue = fn(mockNovelValue);
              } else {
                mockNovelValue = fn;
              }
            },
          ),
        },
      ];
    },
  };
});

const mockLoadUserIllusts = vi.fn();
const mockLoadUserNovels = vi.fn();
const mockIllustLoadNext = vi.fn();
const mockNovelLoadNext = vi.fn();

vi.mock("@/api/illust", () => ({
  loadUserIllusts: (...args: unknown[]) => mockLoadUserIllusts(...args),
  loadNext: (...args: unknown[]) => mockIllustLoadNext(...args),
}));

vi.mock("@/api/novel", () => ({
  loadUserNovels: (...args: unknown[]) => mockLoadUserNovels(...args),
  loadNext: (...args: unknown[]) => mockNovelLoadNext(...args),
}));

vi.mock("@/utils/r18Filter", () => ({
  filterFeedIllusts: (illusts: PixivIllust[]) => illusts,
  filterNovels: (novels: PixivNovel[]) => novels,
}));

function makeIllust(id: number): PixivIllust {
  return {
    id,
    title: `w-${id}`,
    type: "illust",
    user: { id: 1, name: "u", account: "u", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    width: 100,
    height: 100,
    page_count: 1,
    is_bookmarked: false,
    total_bookmarks: 0,
    tags: [],
    x_restrict: 0,
    create_date: "2026-01-01T00:00:00+00:00",
    meta_pages: [],
    meta_single_page: {},
  } as PixivIllust;
}

function makeNovel(id: number): PixivNovel {
  return {
    id,
    title: `n-${id}`,
    user: { id: 1, name: "u", account: "u", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 1000,
    is_bookmarked: false,
    total_bookmarks: 0,
    x_restrict: 0,
    create_date: "2026-01-01T00:00:00+00:00",
  };
}

async function loadStore() {
  vi.resetModules();
  return import("@/stores/userIllustsStore");
}

describe("userIllustsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateResourceCount = 0;
    mockIllustValue = { illusts: [], nextUrl: null };
    mockIllustLoading = false;
    mockIllustError = null;
    mockNovelValue = { novels: [], nextUrl: null };
    mockNovelLoading = false;
    mockNovelError = null;
  });

  describe("initial state", () => {
    it("starts with empty illusts and no error", async () => {
      const { illusts, loading, error, nextUrl } = await loadStore();
      expect(illusts()).toEqual([]);
      expect(loading()).toBe(false);
      expect(error()).toBeNull();
      expect(nextUrl()).toBeNull();
    });

    it("starts with empty novels", async () => {
      const { novels } = await loadStore();
      expect(novels()).toEqual([]);
    });
  });

  describe("novel data", () => {
    it("loads novels and exposes them via novels()", async () => {
      mockNovelValue = { novels: [makeNovel(1), makeNovel(2)], nextUrl: null };
      const store = await loadStore();
      store.load(42, "novel");
      expect(store.contentType()).toBe("novel");
      expect(store.novels()).toHaveLength(2);
      expect(store.novels()[0].id).toBe(1);
      expect(store.novels()[1].id).toBe(2);
    });

    it("exposes nextUrl for novel", async () => {
      mockNovelValue = { novels: [makeNovel(1)], nextUrl: "page2" };
      const store = await loadStore();
      store.load(42, "novel");
      expect(store.nextUrl()).toBe("page2");
    });

    it("returns empty illusts when type is novel", async () => {
      mockNovelValue = { novels: [makeNovel(1)], nextUrl: null };
      const store = await loadStore();
      store.load(42, "novel");
      expect(store.illusts()).toEqual([]);
    });
  });

  describe("loadMore", () => {
    it("does nothing when nextUrl is null (illust)", async () => {
      const store = await loadStore();
      await store.loadMore();
      expect(mockIllustLoadNext).not.toHaveBeenCalled();
    });

    it("loads next page when nextUrl exists (illust)", async () => {
      mockIllustValue = { illusts: [makeIllust(1)], nextUrl: "page2" };
      const store = await loadStore();
      mockIllustLoadNext.mockResolvedValue({
        illusts: [makeIllust(2)],
        next_url: null,
      });
      await store.loadMore();
      expect(mockIllustLoadNext).toHaveBeenCalledWith("page2");
      expect(mockIllustMutate).toHaveBeenCalled();
    });

    it("does nothing when loading (illust)", async () => {
      mockIllustValue = { illusts: [makeIllust(1)], nextUrl: "page2" };
      mockIllustLoading = true;
      const store = await loadStore();
      await store.loadMore();
      expect(mockIllustLoadNext).not.toHaveBeenCalled();
    });

    it("loads next page for novel type via novel loadNext", async () => {
      mockNovelValue = { novels: [makeNovel(1)], nextUrl: "novel-page2" };
      const store = await loadStore();
      store.load(42, "novel");
      expect(store.nextUrl()).toBe("novel-page2");
      mockNovelLoadNext.mockResolvedValue({
        novels: [makeNovel(2)],
        next_url: null,
      });
      await store.loadMore();
      expect(mockNovelLoadNext).toHaveBeenCalledWith("novel-page2");
    });

    it("does nothing for novel when loading", async () => {
      mockNovelValue = { novels: [makeNovel(1)], nextUrl: "novel-page2" };
      mockNovelLoading = true;
      const store = await loadStore();
      store.load(42, "novel");
      await store.loadMore();
      expect(mockNovelLoadNext).not.toHaveBeenCalled();
    });
  });

  describe("switchType", () => {
    it("changes content type to illust without triggering fetch", async () => {
      const store = await loadStore();
      expect(store.contentType()).toBe("illust");
      store.switchType("manga");
      expect(store.contentType()).toBe("manga");
      expect(mockLoadUserIllusts).not.toHaveBeenCalled();
    });

    it("changes content type to novel without triggering fetch", async () => {
      const store = await loadStore();
      store.switchType("novel");
      expect(store.contentType()).toBe("novel");
      expect(mockLoadUserIllusts).not.toHaveBeenCalled();
      expect(mockLoadUserNovels).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("returns null when no error", async () => {
      const { error } = await loadStore();
      expect(error()).toBeNull();
    });

    it("maps error message", async () => {
      mockIllustError = new Error("Network failure");
      const { error } = await loadStore();
      expect(error()).toContain("Network failure");
    });

    it("maps error message for novel type", async () => {
      mockNovelError = new Error("Novel failure");
      const store = await loadStore();
      store.load(42, "novel");
      expect(store.error()).toContain("Novel failure");
    });
  });

  describe("load", () => {
    it("sets contentType from parameter", async () => {
      const store = await loadStore();
      store.load(42, "manga");
      expect(store.contentType()).toBe("manga");
    });

    it("sets contentType to novel from parameter", async () => {
      const store = await loadStore();
      store.load(42, "novel");
      expect(store.contentType()).toBe("novel");
    });
  });

  describe("scrollPositions", () => {
    it("saves and retrieves scroll position for current type", async () => {
      const store = await loadStore();
      store.saveScrollPosition(100);
      expect(store.getScrollPosition("illust")).toBe(100);
    });

    it("saves and retrieves scroll position for novel type", async () => {
      const store = await loadStore();
      store.load(42, "novel");
      store.saveScrollPosition(250);
      expect(store.getScrollPosition("novel")).toBe(250);
    });

    it("saves positions independently per type", async () => {
      const store = await loadStore();
      store.saveScrollPosition(50); // illust
      store.load(42, "manga");
      store.saveScrollPosition(80); // manga
      store.load(42, "novel");
      store.saveScrollPosition(200); // novel
      expect(store.getScrollPosition("illust")).toBe(50);
      expect(store.getScrollPosition("manga")).toBe(80);
      expect(store.getScrollPosition("novel")).toBe(200);
    });

    it("returns 0 for unsaved position", async () => {
      const store = await loadStore();
      expect(store.getScrollPosition("novel")).toBe(0);
    });
  });
});
