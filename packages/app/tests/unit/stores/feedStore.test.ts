import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadRecommended, loadFollow, loadNext } from "@/api/illust";
import { type PixivIllust } from "@/api/types";

vi.mock("@capacitor/core", async () => {
  const actual = await vi.importActual<typeof import("@capacitor/core")>("@capacitor/core");
  return {
    ...actual,
    Capacitor: { getPlatform: vi.fn(() => "web"), isNativePlatform: vi.fn(() => false) },
  };
});

vi.mock("@/api/illust", () => ({
  loadRecommended: vi.fn(),
  loadFollow: vi.fn(),
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
  setShowSettingsDrawer: vi.fn(),
  showR18: () => false,
  showR18G: () => false,
}));

function createIllust(
  id: number,
  createDate: string,
  type: "illust" | "manga" = "illust",
): PixivIllust {
  return {
    id,
    title: `work-${id}`,
    type,
    user: { id: 1, name: "u", account: "u", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    width: 100,
    height: 100,
    page_count: 1,
    is_bookmarked: false,
    total_bookmarks: 0,
    tags: [],
    x_restrict: 0,
    create_date: createDate,
    meta_pages: [],
    meta_single_page: {},
  } as PixivIllust;
}

function mockRecommendedResponses(
  illustResponse: { illusts: PixivIllust[]; next_url: string | null },
  mangaResponse: { illusts: PixivIllust[]; next_url: string | null },
) {
  vi.mocked(loadRecommended).mockImplementation(async (type) => {
    if (type === "manga") return mangaResponse;
    return illustResponse;
  });
}

describe("saveTabScroll", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCurrentTab = "recommended";
  });

  afterEach(() => {
    (globalThis as any).window = undefined;
  });

  it("saves window.scrollY as the tab scroll position", async () => {
    (globalThis as any).window = { scrollY: 1234 };
    const { saveTabScroll, getFeedScrollY } = await import("@/stores/feedStore");

    saveTabScroll("recommended");

    expect(getFeedScrollY()).toBe(1234);
  });

  it("saves different scroll positions per tab", async () => {
    (globalThis as any).window = { scrollY: 567 };
    mockCurrentTab = "follow";
    const { saveTabScroll, getFeedScrollY } = await import("@/stores/feedStore");

    saveTabScroll("follow");

    expect(getFeedScrollY()).toBe(567);
  });
});

describe("fetchMixed", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCurrentTab = "recommended";
    vi.mocked(loadRecommended).mockReset();
  });

  afterEach(() => {
    (globalThis as any).window = undefined;
  });

  it("merges illust and manga by create_date descending", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockRecommendedResponses(
      {
        illusts: [
          createIllust(1, "2026-07-01T09:00:00+09:00", "illust"),
          createIllust(3, "2026-07-01T11:00:00+09:00", "illust"),
        ],
        next_url: "https://app-api.pixiv.net/v1/illust/recommended?content_type=illust&offset=30",
      },
      {
        illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
        next_url: "https://app-api.pixiv.net/v1/illust/recommended?content_type=manga&offset=30",
      },
    );

    const { setRecommendSubTab, illusts, fetchMixed } = await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();

    const ids = illusts().map((i) => i.id);
    expect(ids).toEqual([3, 2, 1]);
  });

  it("shows partial data when one source fails", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockImplementation(async (type) => {
      if (type === "manga") throw new Error("manga error");
      return { illusts: [createIllust(1, "2026-07-01T09:00:00+09:00", "illust")], next_url: null };
    });

    const { setRecommendSubTab, illusts, error, fetchMixed } = await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();

    expect(illusts().map((i) => i.id)).toEqual([1]);
    expect(error()).toBeNull();
  });

  it("deduplicates when the same illust appears in both illust and manga sources", async () => {
    (globalThis as any).window = { scrollY: 0 };
    // 同一作品 id=2 同时在 illust 和 manga 两路返回
    mockRecommendedResponses(
      {
        illusts: [
          createIllust(1, "2026-07-01T09:00:00+09:00", "illust"),
          createIllust(2, "2026-07-01T11:00:00+09:00", "illust"),
          createIllust(3, "2026-07-01T08:00:00+09:00", "illust"),
        ],
        next_url: "next-illust",
      },
      {
        illusts: [
          createIllust(2, "2026-07-01T11:00:00+09:00", "manga"),
          createIllust(4, "2026-07-01T10:00:00+09:00", "manga"),
        ],
        next_url: "next-manga",
      },
    );

    const { setRecommendSubTab, illusts, fetchMixed } = await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();

    const ids = illusts().map((i) => i.id);
    // 期望: [2(11:00), 4(10:00), 1(09:00), 3(08:00)] — 按时间降序且 id=2 只出现一次
    expect(ids).toEqual([2, 4, 1, 3]);
    // 确认无重复
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("fetchMoreMixed", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCurrentTab = "recommended";
    vi.mocked(loadRecommended).mockReset();
    vi.mocked(loadNext).mockReset();
  });

  afterEach(() => {
    (globalThis as any).window = undefined;
  });

  it("loads more from the source with older tail first", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockRecommendedResponses(
      {
        illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
        next_url: "next-illust",
      },
      {
        illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
        next_url: "next-manga",
      },
    );
    vi.mocked(loadNext).mockImplementation(async (url: string) => {
      if (url === "next-manga") {
        return {
          illusts: [createIllust(3, "2026-07-01T09:00:00+09:00", "manga")],
          next_url: null,
        };
      }
      return { illusts: [], next_url: null };
    });

    const { setRecommendSubTab, fetchMixed, fetchMoreMixed, illusts } =
      await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();
    expect(illusts().map((i) => i.id)).toEqual([1, 2]);

    await fetchMoreMixed();
    expect(illusts().map((i) => i.id)).toEqual([1, 2, 3]);
    expect(loadNext).toHaveBeenCalledWith("next-manga");
  });

  it("falls back to the other source when the preferred source has no next_url", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockRecommendedResponses(
      {
        illusts: [createIllust(1, "2026-07-01T10:00:00+09:00", "illust")],
        next_url: null,
      },
      {
        illusts: [createIllust(2, "2026-07-01T12:00:00+09:00", "manga")],
        next_url: "next-manga",
      },
    );
    vi.mocked(loadNext).mockResolvedValue({
      illusts: [createIllust(3, "2026-07-01T09:00:00+09:00", "manga")],
      next_url: null,
    });

    const { setRecommendSubTab, fetchMixed, fetchMoreMixed, illusts } =
      await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();

    await fetchMoreMixed();
    expect(illusts().map((i) => i.id)).toEqual([2, 1, 3]);
    expect(loadNext).toHaveBeenCalledWith("next-manga");
  });

  it("clears error on successful load", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockRecommendedResponses(
      {
        illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
        next_url: "next-illust",
      },
      {
        illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
        next_url: "next-manga",
      },
    );
    vi.mocked(loadNext).mockResolvedValue({
      illusts: [createIllust(3, "2026-07-01T09:00:00+09:00", "manga")],
      next_url: null,
    });

    const { setRecommendSubTab, fetchMixed, fetchMoreMixed, illusts, error } =
      await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();
    await fetchMoreMixed();
    expect(illusts().map((i) => i.id)).toEqual([1, 2, 3]);
    expect(error()).toBeNull();
  });

  it("does not surface error when fallback succeeds", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockRecommendedResponses(
      {
        illusts: [createIllust(1, "2026-07-01T10:00:00+09:00", "illust")],
        next_url: "next-illust",
      },
      {
        illusts: [createIllust(2, "2026-07-01T12:00:00+09:00", "manga")],
        next_url: "next-manga",
      },
    );
    vi.mocked(loadNext).mockImplementation(async (url: string) => {
      if (url === "next-illust") {
        throw new Error("illust load failed");
      }
      return {
        illusts: [createIllust(3, "2026-07-01T09:00:00+09:00", "manga")],
        next_url: null,
      };
    });

    const { setRecommendSubTab, fetchMixed, fetchMoreMixed, illusts, error } =
      await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();

    await fetchMoreMixed();
    expect(illusts().map((i) => i.id)).toEqual([2, 1, 3]);
    expect(error()).toBeNull();
    expect(loadNext).toHaveBeenCalledWith("next-manga");
  });

  it("deduplicates when more-loaded illust overlaps with existing manga source", async () => {
    (globalThis as any).window = { scrollY: 0 };
    // 初始: illust 有 [1(12:00)], manga 有 [2(10:00)]
    // 第二次 fetchMoreMixed 时 illust 返回的作品 id=2 已在 manga 中存在
    mockRecommendedResponses(
      {
        illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
        next_url: "next-illust",
      },
      {
        illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
        next_url: "next-manga",
      },
    );
    vi.mocked(loadNext).mockImplementation(async (url: string) => {
      if (url === "next-manga") {
        return {
          illusts: [createIllust(3, "2026-07-01T09:00:00+09:00", "manga")],
          next_url: null,
        };
      }
      // illust 的新一页返回了一个与 manga 已有作品 id=2 相同 id 的作品
      return {
        illusts: [
          createIllust(2, "2026-07-01T10:00:00+09:00", "illust"),
          createIllust(4, "2026-07-01T08:00:00+09:00", "illust"),
        ],
        next_url: null,
      };
    });

    const { setRecommendSubTab, fetchMixed, fetchMoreMixed, illusts } =
      await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();
    expect(illusts().map((i) => i.id)).toEqual([1, 2]);

    // 第一次 fetchMoreMixed: manga tail 更老 (10:00 < 12:00)，优先加载 manga
    await fetchMoreMixed();
    let ids = illusts().map((i) => i.id);
    expect(ids).toEqual([1, 2, 3]);
    expect(new Set(ids).size).toBe(ids.length);

    // 第二次 fetchMoreMixed: manga 已无下一页，fallback 到 illust
    // illust 返回了 id=2 (重复) 和 id=4 (新)
    await fetchMoreMixed();
    ids = illusts().map((i) => i.id);
    expect(ids).toEqual([1, 2, 3, 4]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("aggregates errors when both sources fail", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockRecommendedResponses(
      {
        illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
        next_url: "next-illust",
      },
      {
        illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
        next_url: "next-manga",
      },
    );
    vi.mocked(loadNext).mockImplementation(async (url: string) => {
      if (url === "next-manga") {
        throw new Error("manga load failed");
      }
      throw new Error("illust load failed");
    });

    const { setRecommendSubTab, fetchMixed, fetchMoreMixed, error } =
      await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();

    await fetchMoreMixed();
    expect(error()).toContain("illust load failed");
    expect(error()).toContain("manga load failed");
  });
});

describe("recommended sub-tab routing", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCurrentTab = "recommended";
    vi.mocked(loadRecommended).mockReset();
    vi.mocked(loadNext).mockReset();
  });

  afterEach(() => {
    (globalThis as any).window = undefined;
  });

  it("ensureLoaded loads illust recommended when sub-tab is illust", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
      next_url: "next-illust",
    });

    const { setRecommendSubTab, ensureLoaded, illusts } = await import("@/stores/feedStore");
    setRecommendSubTab("illust");
    await ensureLoaded();
    await vi.waitFor(() => illusts().length > 0);

    expect(loadRecommended).toHaveBeenCalledWith("illust");
    expect(illusts().map((i) => i.id)).toEqual([1]);
  });

  it("ensureLoaded loads manga recommended when sub-tab is manga", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(2, "2026-07-01T12:00:00+09:00", "manga")],
      next_url: "next-manga",
    });

    const { setRecommendSubTab, ensureLoaded, illusts } = await import("@/stores/feedStore");
    setRecommendSubTab("manga");
    await ensureLoaded();
    await vi.waitFor(() => illusts().length > 0);

    expect(loadRecommended).toHaveBeenCalledWith("manga");
    expect(illusts().map((i) => i.id)).toEqual([2]);
  });

  it("ensureLoaded loads both sources when sub-tab is mixed", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockRecommendedResponses(
      {
        illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
        next_url: "next-illust",
      },
      {
        illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
        next_url: "next-manga",
      },
    );

    const { setRecommendSubTab, ensureLoaded, illusts } = await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await ensureLoaded();
    await vi.waitFor(() => illusts().length > 0);

    expect(loadRecommended).toHaveBeenCalledWith("illust");
    expect(loadRecommended).toHaveBeenCalledWith("manga");
    expect(illusts().map((i) => i.id)).toEqual([1, 2]);
  });

  it("refresh loads the active sub-tab", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(3, "2026-07-01T12:00:00+09:00", "illust")],
      next_url: "next-illust",
    });

    const { setRecommendSubTab, refresh } = await import("@/stores/feedStore");
    setRecommendSubTab("illust");
    await refresh();

    expect(loadRecommended).toHaveBeenCalledWith("illust");
  });

  it("refresh loads both sources for mixed sub-tab", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockRecommendedResponses(
      {
        illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
        next_url: "next-illust",
      },
      {
        illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
        next_url: "next-manga",
      },
    );

    const { setRecommendSubTab, refresh } = await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await refresh();

    expect(loadRecommended).toHaveBeenCalledWith("illust");
    expect(loadRecommended).toHaveBeenCalledWith("manga");
  });

  it("fetchMore loads next page for illust sub-tab", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
      next_url: "next-illust",
    });
    vi.mocked(loadNext).mockResolvedValue({
      illusts: [createIllust(3, "2026-07-01T11:00:00+09:00", "illust")],
      next_url: null,
    });

    const { setRecommendSubTab, ensureLoaded, fetchMore, illusts } =
      await import("@/stores/feedStore");
    setRecommendSubTab("illust");
    await ensureLoaded();
    await fetchMore();

    expect(loadNext).toHaveBeenCalledWith("next-illust");
    expect(illusts().map((i) => i.id)).toEqual([1, 3]);
  });

  it("fetchMore loads next page for manga sub-tab", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(2, "2026-07-01T12:00:00+09:00", "manga")],
      next_url: "next-manga",
    });
    vi.mocked(loadNext).mockResolvedValue({
      illusts: [createIllust(4, "2026-07-01T11:00:00+09:00", "manga")],
      next_url: null,
    });

    const { setRecommendSubTab, ensureLoaded, fetchMore, illusts } =
      await import("@/stores/feedStore");
    setRecommendSubTab("manga");
    await ensureLoaded();
    await fetchMore();

    expect(loadNext).toHaveBeenCalledWith("next-manga");
    expect(illusts().map((i) => i.id)).toEqual([2, 4]);
  });

  it("fetchManga delegates to fetchRecommended('manga')", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(5, "2026-07-01T12:00:00+09:00", "manga")],
      next_url: "next-manga",
    });

    const { setRecommendSubTab, fetchManga, illusts } = await import("@/stores/feedStore");
    setRecommendSubTab("manga");
    await fetchManga();

    expect(loadRecommended).toHaveBeenCalledWith("manga");
    expect(illusts().map((i) => i.id)).toEqual([5]);
  });
});

describe("recommended sub-tab regression fixes", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCurrentTab = "recommended";
    vi.mocked(loadRecommended).mockReset();
    vi.mocked(loadNext).mockReset();
  });

  afterEach(() => {
    (globalThis as any).window = undefined;
  });

  it("clears error when switching recommended sub-tab", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockRejectedValue(new Error("load fail"));

    const { setRecommendSubTab, fetchMixed, error } = await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();
    expect(error()).not.toBeNull();

    setRecommendSubTab("illust");
    expect(error()).toBeNull();
  });

  it("saves and restores scroll per recommended sub-tab", async () => {
    const { setRecommendSubTab, saveTabScroll, getFeedScrollY } =
      await import("@/stores/feedStore");

    (globalThis as any).window = { scrollY: 100 };
    setRecommendSubTab("illust");
    saveTabScroll("recommended");

    (globalThis as any).window = { scrollY: 200 };
    setRecommendSubTab("manga");
    saveTabScroll("recommended");

    expect(getFeedScrollY("recommended")).toBe(200);
    setRecommendSubTab("illust");
    expect(getFeedScrollY("recommended")).toBe(100);
  });

  it("derives mixed nextUrl from source keys and does not corrupt it on scroll save", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockRecommendedResponses(
      {
        illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
        next_url: "next-illust",
      },
      {
        illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
        next_url: null,
      },
    );

    const { setRecommendSubTab, ensureLoaded, nextUrl, saveTabScroll } =
      await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await ensureLoaded();
    expect(nextUrl()).toBe("next-illust");

    saveTabScroll("recommended");

    // Leave and return to mixed; nextUrl should still be derived from source keys
    setRecommendSubTab("illust");
    setRecommendSubTab("mixed");
    await ensureLoaded();
    expect(nextUrl()).toBe("next-illust");
  });

  it("ensureLoaded resolves only after the fetch settles", async () => {
    (globalThis as any).window = { scrollY: 0 };
    let resolveLoad!: (value: { illusts: PixivIllust[]; next_url: string | null }) => void;
    const loadPromise = new Promise<{ illusts: PixivIllust[]; next_url: string | null }>((r) => {
      resolveLoad = r;
    });
    vi.mocked(loadRecommended).mockReturnValue(loadPromise);

    const { setRecommendSubTab, ensureLoaded, illusts } = await import("@/stores/feedStore");
    setRecommendSubTab("illust");
    const ensurePromise = ensureLoaded();
    expect(illusts()).toEqual([]);

    resolveLoad({
      illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
      next_url: null,
    });
    await ensurePromise;
    expect(illusts().map((i) => i.id)).toEqual([1]);
  });
});

// ── 并发刷新锁：子标签切换时防止重复请求 ──
// 之前的 bug：在"全部"下拉刷新请求中切换到"非公开"，
// 可以再触发一次下拉刷新，导致两个 fetchFollow 并行写入缓存。
describe("refresh concurrent lock", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(loadRecommended).mockReset();
    vi.mocked(loadFollow).mockReset();
    vi.mocked(loadNext).mockReset();
  });

  afterEach(() => {
    (globalThis as any).window = undefined;
  });

  it("blocks follow refresh when switching sub-tab during in-flight refresh", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockCurrentTab = "follow";

    // 用共享 promise 让 fetchFollow 挂起（两个 loadFollow 返回同一个 promise）
    let resolveFollow!: (v: { illusts: PixivIllust[]; next_url: string | null }) => void;
    const deferred = new Promise<{ illusts: PixivIllust[]; next_url: string | null }>((r) => {
      resolveFollow = r;
    });
    vi.mocked(loadFollow).mockReturnValue(deferred);

    const { setFollowTab, refresh } = await import("@/stores/feedStore");

    // 首次刷新 — 挂起
    const firstRefresh = refresh();

    // 切换到非公开子标签
    setFollowTab("private");

    // 第二次刷新应被 pendingRefreshKeys 阻止，立即返回
    await refresh();

    // loadFollow 应只被首次刷新调用（public + private = 2 次）
    expect(loadFollow).toHaveBeenCalledTimes(2);

    // 让首次刷新完成，避免悬空 promise
    resolveFollow!({ illusts: [createIllust(1, "2026-07-01T12:00:00+09:00")], next_url: null });
    await firstRefresh;
  });

  it("blocks recommended mixed refresh when single sub-tab refresh is in-flight", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockCurrentTab = "recommended";

    let resolveRec!: (v: { illusts: PixivIllust[]; next_url: string | null }) => void;
    const deferred = new Promise<{ illusts: PixivIllust[]; next_url: string | null }>((r) => {
      resolveRec = r;
    });
    vi.mocked(loadRecommended).mockReturnValue(deferred);

    const { setRecommendSubTab, refresh } = await import("@/stores/feedStore");

    // 在 illust 子标签下发起刷新 — 挂起
    setRecommendSubTab("illust");
    const firstRefresh = refresh();

    // 切换到 mixed 子标签并尝试刷新
    // mixed 锁 recommended_illust + recommended_manga，而 recommended_illust 已被锁
    setRecommendSubTab("mixed");
    await refresh();

    // loadRecommended 应只被首次刷新调用（1 次）
    expect(loadRecommended).toHaveBeenCalledTimes(1);

    resolveRec!({ illusts: [createIllust(1, "2026-07-01T12:00:00+09:00")], next_url: null });
    await firstRefresh;
  });

  it("allows recommended manga refresh when illust refresh is in-flight (non-overlapping keys)", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockCurrentTab = "recommended";

    let resolveIllust!: (v: { illusts: PixivIllust[]; next_url: string | null }) => void;
    const deferred = new Promise<{ illusts: PixivIllust[]; next_url: string | null }>((r) => {
      resolveIllust = r;
    });
    vi.mocked(loadRecommended).mockImplementation(async (type) => {
      if (type === "illust") return deferred;
      return { illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")], next_url: null };
    });

    const { setRecommendSubTab, refresh } = await import("@/stores/feedStore");

    // illust 子标签刷新 — 挂起
    setRecommendSubTab("illust");
    const firstRefresh = refresh();

    // 切换到 manga 子标签并刷新 — 应通过（recommended_manga 未锁）
    setRecommendSubTab("manga");
    await refresh();

    // loadRecommended 应被调用 2 次：第一次 illust，第二次 manga
    expect(loadRecommended).toHaveBeenCalledTimes(2);
    expect(loadRecommended).toHaveBeenCalledWith("illust");
    expect(loadRecommended).toHaveBeenCalledWith("manga");

    resolveIllust!({ illusts: [createIllust(1, "2026-07-01T12:00:00+09:00")], next_url: null });
    await firstRefresh;
  });

  it("allows cross-tab refresh (follow → recommended) when scopes don't overlap", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockCurrentTab = "follow";

    let resolveFollow!: (v: { illusts: PixivIllust[]; next_url: string | null }) => void;
    const deferred = new Promise<{ illusts: PixivIllust[]; next_url: string | null }>((r) => {
      resolveFollow = r;
    });
    vi.mocked(loadFollow).mockReturnValue(deferred);

    const { refresh } = await import("@/stores/feedStore");

    // follow 刷新 — 挂起（锁 follow_public + follow_private）
    const firstRefresh = refresh();

    // 切换到 recommended 标签并刷新 — 应通过（不同数据源）
    mockCurrentTab = "recommended";
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(3, "2026-07-01T12:00:00+09:00")],
      next_url: null,
    });

    const { setRecommendSubTab } = await import("@/stores/feedStore");
    setRecommendSubTab("mixed");
    await refresh();

    // 两个请求都应发生
    expect(loadFollow).toHaveBeenCalledTimes(2);
    expect(loadRecommended).toHaveBeenCalledTimes(2);

    resolveFollow!({ illusts: [createIllust(1, "2026-07-01T12:00:00+09:00")], next_url: null });
    await firstRefresh;
  });

  it("releases locks after refresh completes so subsequent refresh works", async () => {
    (globalThis as any).window = { scrollY: 0 };
    mockCurrentTab = "follow";

    vi.mocked(loadFollow).mockResolvedValue({
      illusts: [createIllust(1, "2026-07-01T12:00:00+09:00")],
      next_url: "next",
    });

    const { refresh } = await import("@/stores/feedStore");

    // 第一次刷新正常完成
    await refresh();
    expect(loadFollow).toHaveBeenCalledTimes(2);

    // 第二次刷新应正常触发（锁已释放）
    await refresh();
    expect(loadFollow).toHaveBeenCalledTimes(4);
  });
});
