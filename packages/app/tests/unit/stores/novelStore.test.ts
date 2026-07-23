/**
 * novelStore TQ 迁移测试。
 *
 * 使用 TQ createInfiniteQuery mock 验证 TQ 版 novelStore 的所有公开接口。
 * 4 个数据源: follow_public, follow_private, recommended, bookmarks
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiErrorType, type PixivNovel, type ApiError } from "@/api/types";

// ── Mock TanStack Query ──

type MockInfiniteData = {
  pages: { novels: PixivNovel[]; next_url: string | null }[];
  pageParams: unknown[];
};

interface QueryMock {
  data: MockInfiniteData | undefined;
  isFetching: boolean;
  error: ApiError | null;
  hasNextPage: boolean;
  fetchNextPage: ReturnType<typeof vi.fn>;
  refetch: ReturnType<typeof vi.fn>;
}

const queryMocks: Record<string, QueryMock> = {};

function getQ(key: string): QueryMock {
  if (!queryMocks[key]) {
    queryMocks[key] = {
      data: undefined,
      isFetching: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    };
  }
  return queryMocks[key];
}

/**
 * 根据 queryKey 数组提取用于 mock lookup 的 key。
 * ["novel", "follow_public"] → "follow_public"
 * ["novel", "bookmarks", 1, "public"] → "bookmarks"
 */
function queryKeyToLookupKey(qk: readonly unknown[]): string {
  if (qk[0] === "novel") {
    // bookmark key: ["novel", "bookmarks", userId, restrict]
    if (qk[1] === "bookmarks") return "bookmarks";
    // follow/recommended: ["novel", "follow_public"] → "follow_public"
    return String(qk[1]);
  }
  return "unknown";
}

vi.mock("@tanstack/solid-query", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    createInfiniteQuery: vi.fn(
      (optsAccessor: () => { queryKey: readonly unknown[]; enabled: boolean }) => {
        const mock = {} as Record<string, unknown>;
        function currentOpts() {
          return optsAccessor();
        }
        Object.defineProperties(mock, {
          data: {
            get() {
              if (currentOpts().enabled === false) return undefined;
              return getQ(queryKeyToLookupKey(currentOpts().queryKey)).data;
            },
            enumerable: true,
          },
          isFetching: {
            get() {
              if (currentOpts().enabled === false) return false;
              return getQ(queryKeyToLookupKey(currentOpts().queryKey)).isFetching;
            },
            enumerable: true,
          },
          error: {
            get() {
              if (currentOpts().enabled === false) return null;
              return getQ(queryKeyToLookupKey(currentOpts().queryKey)).error;
            },
            enumerable: true,
          },
          hasNextPage: {
            get() {
              if (currentOpts().enabled === false) return false;
              return getQ(queryKeyToLookupKey(currentOpts().queryKey)).hasNextPage;
            },
            enumerable: true,
          },
          fetchNextPage: {
            get() {
              return getQ(queryKeyToLookupKey(currentOpts().queryKey)).fetchNextPage;
            },
            enumerable: true,
          },
          refetch: {
            get() {
              return getQ(queryKeyToLookupKey(currentOpts().queryKey)).refetch;
            },
            enumerable: true,
          },
          isFetchingNextPage: { get: () => false, enumerable: true },
        });
        return mock;
      },
    ),
  };
});

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

import { scrollRestoreGlobal } from "@/primitives/createScrollRestore";

let mockCurrentTab = "recommended";
let mockUserId: number | null = 1;

vi.mock("@/stores/uiStore", () => ({
  get currentTab() {
    return () => mockCurrentTab;
  },
  setCurrentTab: vi.fn((t: string) => {
    mockCurrentTab = t;
  }),
  showR18: () => false,
  showR18G: () => false,
}));

vi.mock("@/stores/authStore", () => ({
  get user() {
    return () => (mockUserId ? { id: mockUserId, name: "Test", account: "test" } : null);
  },
}));

vi.mock("@/utils/r18Filter", () => ({
  filterNovels: (novels: PixivNovel[]) => novels,
  filterFeedIllusts: (illusts: unknown[]) => illusts,
}));

// ── Helpers ──

function createNovel(id: number, createDate: string): PixivNovel {
  return {
    id,
    title: `novel-${id}`,
    user: { id: 1, name: "u", account: "u", profile_image_urls: {} },
    image_urls: {},
    tags: [],
    x_restrict: 0,
    create_date: createDate,
    text_length: 1000,
    page_count: null,
    series: null,
    is_bookmarked: false,
    total_bookmarks: 0,
    total_view: 0,
  } as PixivNovel;
}

function resetQueryMocks() {
  for (const key of Object.keys(queryMocks)) delete queryMocks[key];
}

function setQueryData(key: string, novels: PixivNovel[], next_url: string | null) {
  const q = getQ(key);
  q.data = { pages: [{ novels, next_url }], pageParams: [undefined] };
  q.hasNextPage = next_url !== null;
}

// ── Tests ──

describe("novelStore TQ — recommended tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryMocks();
    mockCurrentTab = "recommended";
    scrollRestoreGlobal.clearAll();
  });

  it("novels() returns recommended novel data", async () => {
    setQueryData("recommended", [createNovel(1, "2026-07-01T12:00:00+09:00")], "next-r");
    const store = await import("@/stores/novelStore");
    expect(store.novels().map((n: PixivNovel) => n.id)).toEqual([1]);
    expect(store.nextUrl()).toBe("next-r");
  });

  it("loading reflects isFetching", async () => {
    getQ("recommended").isFetching = true;
    const store = await import("@/stores/novelStore");
    expect(store.loading()).toBe(true);
  });

  it("error reflects query error", async () => {
    getQ("recommended").error = { type: ApiErrorType.SERVER, message: "err" };
    const store = await import("@/stores/novelStore");
    expect(store.error()?.type).toBe(ApiErrorType.SERVER);
  });
});

describe("novelStore TQ — follow tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryMocks();
    mockCurrentTab = "follow";
    scrollRestoreGlobal.clearAll();
  });

  it("novels() returns public follow when followTab is public", async () => {
    setQueryData("follow_public", [createNovel(1, "2026-07-01T12:00:00+09:00")], null);
    const store = await import("@/stores/novelStore");
    store.setNovelFollowTab("public");
    expect(store.novels().map((n: PixivNovel) => n.id)).toEqual([1]);
  });

  it("novels() returns private follow when followTab is private", async () => {
    setQueryData("follow_private", [createNovel(2, "2026-07-01T12:00:00+09:00")], null);
    const store = await import("@/stores/novelStore");
    store.setNovelFollowTab("private");
    expect(store.novels().map((n: PixivNovel) => n.id)).toEqual([2]);
  });

  it("novels() merges public+private when followTab is all", async () => {
    setQueryData("follow_public", [createNovel(1, "2026-07-01T12:00:00+09:00")], null);
    setQueryData("follow_private", [createNovel(2, "2026-07-01T10:00:00+09:00")], null);
    const store = await import("@/stores/novelStore");
    store.setNovelFollowTab("all");
    expect(store.novels().map((n: PixivNovel) => n.id)).toEqual([1, 2]);
  });
});

describe("novelStore TQ — bookmarks tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryMocks();
    mockCurrentTab = "bookmarks";
    mockUserId = 1;
    scrollRestoreGlobal.clearAll();
  });

  it("novels() returns bookmarked novels", async () => {
    setQueryData("bookmarks", [createNovel(1, "2026-07-01T12:00:00+09:00")], "next-b");
    const store = await import("@/stores/novelStore");
    expect(store.novels().map((n: PixivNovel) => n.id)).toEqual([1]);
    expect(store.nextUrl()).toBe("next-b");
  });

  it("bookmarkRestrict switches between public/private", async () => {
    const store = await import("@/stores/novelStore");
    expect(store.bookmarkRestrict()).toBe("public");
    store.setBookmarkRestrict("private");
    expect(store.bookmarkRestrict()).toBe("private");
    store.setBookmarkRestrict("private"); // same value - no-op
    expect(store.bookmarkRestrict()).toBe("private");
  });

  it("returns UNAUTHORIZED error when user is not logged in on bookmarks tab", async () => {
    mockUserId = null;
    const store = await import("@/stores/novelStore");
    await store.ensureLoaded();
    expect(store.error()).not.toBeNull();
    expect(store.error()!.type).toBe(ApiErrorType.UNAUTHORIZED);
    expect(store.error()!.message).toContain("未登录");
  });
});

describe("novelStore TQ — actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryMocks();
    mockCurrentTab = "recommended";
    scrollRestoreGlobal.clearAll();
  });

  it("fetchMore calls fetchNextPage on active query", async () => {
    setQueryData("recommended", [createNovel(1, "2026-07-01T12:00:00+09:00")], "next-r");
    getQ("recommended").hasNextPage = true;
    const store = await import("@/stores/novelStore");
    await store.fetchMore();
    expect(getQ("recommended").fetchNextPage).toHaveBeenCalled();
  });

  it("refresh calls refetch on active query", async () => {
    setQueryData("recommended", [createNovel(1, "2026-07-01T12:00:00+09:00")], null);
    const store = await import("@/stores/novelStore");
    await store.refresh();
    expect(getQ("recommended").refetch).toHaveBeenCalled();
  });

  it("scroll positions save/restore correctly", async () => {
    (globalThis as any).window = { scrollY: 100 };
    const store = await import("@/stores/novelStore");
    store.saveTabScroll("recommended");
    expect(store.getFeedScrollY("recommended")).toBe(100);
  });

  it("saveNovelScrollState / getNovelScrollState persist and restore VirtualItem state", async () => {
    (globalThis as any).window = { scrollY: 0 };
    const store = await import("@/stores/novelStore");
    const state = { snapshot: [] as any[], offset: 50, version: 1 };
    store.saveNovelScrollState("recommended", state);
    expect(store.getNovelScrollState("recommended")).toEqual(state);
  });

  it("isNovelCached returns true when data exists", async () => {
    setQueryData("recommended", [createNovel(1, "2026-07-01T12:00:00+09:00")], null);
    const store = await import("@/stores/novelStore");
    expect(store.isNovelCached()).toBe(true);
  });

  it("isNovelCached returns false when no data", async () => {
    const store = await import("@/stores/novelStore");
    expect(store.isNovelCached()).toBe(false);
  });
});

describe("novelStore TQ — follow fetchMore pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryMocks();
    mockCurrentTab = "follow";
    scrollRestoreGlobal.clearAll();
  });

  it("fetchMore only fetches from the single active source when followTab=public", async () => {
    setQueryData("follow_public", [createNovel(1, "2026-07-01T12:00:00+09:00")], "next-pub");
    setQueryData("follow_private", [createNovel(2, "2026-07-01T10:00:00+09:00")], null);
    getQ("follow_public").hasNextPage = true;

    const store = await import("@/stores/novelStore");
    store.setNovelFollowTab("public");
    await store.fetchMore();
    // Only follow_public's fetchNextPage should be called (follow_private is not active)
    expect(getQ("follow_public").fetchNextPage).toHaveBeenCalled();
    expect(getQ("follow_private").fetchNextPage).not.toHaveBeenCalled();
  });
});
