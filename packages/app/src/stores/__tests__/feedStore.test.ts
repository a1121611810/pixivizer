import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadRecommended, loadNext } from "../../api/illust";
import { type PixivIllust } from "../../api/types";

vi.mock("@capacitor/core", async () => {
  const actual = await vi.importActual<typeof import("@capacitor/core")>("@capacitor/core");
  return {
    ...actual,
    Capacitor: { getPlatform: vi.fn(() => "web"), isNativePlatform: vi.fn(() => false) },
  };
});

vi.mock("../../api/illust", () => ({
  loadRecommended: vi.fn(),
  loadFollow: vi.fn(),
  loadNext: vi.fn(),
}));

let mockCurrentTab = "recommended";

vi.mock("../uiStore", () => ({
  get currentTab() {
    return () => mockCurrentTab;
  },
  setCurrentTab: vi.fn((t: string) => {
    mockCurrentTab = t;
  }),
  setShowSettingsSheet: vi.fn(),
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
    vi.restoreAllMocks();
    (globalThis as any).window = undefined;
  });

  it("saves window.scrollY as the tab scroll position", async () => {
    (globalThis as any).window = { scrollY: 1234 };
    const { saveTabScroll, getFeedScrollY } = await import("../feedStore");

    saveTabScroll("recommended");

    expect(getFeedScrollY()).toBe(1234);
  });

  it("saves different scroll positions per tab", async () => {
    (globalThis as any).window = { scrollY: 567 };
    mockCurrentTab = "follow";
    const { saveTabScroll, getFeedScrollY } = await import("../feedStore");

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
    vi.restoreAllMocks();
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

    const { setRecommendSubTab, illusts, fetchMixed } = await import("../feedStore");
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

    const { setRecommendSubTab, illusts, error, fetchMixed } = await import("../feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();

    expect(illusts().map((i) => i.id)).toEqual([1]);
    expect(error()).toBeNull();
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
    vi.restoreAllMocks();
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
      await import("../feedStore");
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
      await import("../feedStore");
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
      await import("../feedStore");
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
      await import("../feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();

    await fetchMoreMixed();
    expect(illusts().map((i) => i.id)).toEqual([2, 1, 3]);
    expect(error()).toBeNull();
    expect(loadNext).toHaveBeenCalledWith("next-manga");
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

    const { setRecommendSubTab, fetchMixed, fetchMoreMixed, error } = await import("../feedStore");
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
    vi.restoreAllMocks();
    (globalThis as any).window = undefined;
  });

  it("ensureLoaded loads illust recommended when sub-tab is illust", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
      next_url: "next-illust",
    });

    const { setRecommendSubTab, ensureLoaded, illusts } = await import("../feedStore");
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

    const { setRecommendSubTab, ensureLoaded, illusts } = await import("../feedStore");
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

    const { setRecommendSubTab, ensureLoaded, illusts } = await import("../feedStore");
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

    const { setRecommendSubTab, refresh } = await import("../feedStore");
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

    const { setRecommendSubTab, refresh } = await import("../feedStore");
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

    const { setRecommendSubTab, ensureLoaded, fetchMore, illusts } = await import("../feedStore");
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

    const { setRecommendSubTab, ensureLoaded, fetchMore, illusts } = await import("../feedStore");
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

    const { setRecommendSubTab, fetchManga, illusts } = await import("../feedStore");
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
    vi.restoreAllMocks();
    (globalThis as any).window = undefined;
  });

  it("clears error when switching recommended sub-tab", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockRejectedValue(new Error("load fail"));

    const { setRecommendSubTab, fetchMixed, error } = await import("../feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();
    expect(error()).not.toBeNull();

    setRecommendSubTab("illust");
    expect(error()).toBeNull();
  });

  it("saves and restores scroll per recommended sub-tab", async () => {
    const { setRecommendSubTab, saveTabScroll, getFeedScrollY } = await import("../feedStore");

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
      await import("../feedStore");
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

    const { setRecommendSubTab, ensureLoaded, illusts } = await import("../feedStore");
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
