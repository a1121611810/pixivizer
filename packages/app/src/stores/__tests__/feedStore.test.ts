import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadRecommended, loadMangaRecommended, loadNext } from "../../api/illust";
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
  loadMangaRecommended: vi.fn(),
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
    vi.mocked(loadMangaRecommended).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).window = undefined;
  });

  it("merges illust and manga by create_date descending", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [
        createIllust(1, "2026-07-01T09:00:00+09:00", "illust"),
        createIllust(3, "2026-07-01T11:00:00+09:00", "illust"),
      ],
      next_url: "https://app-api.pixiv.net/v1/illust/recommended?content_type=illust&offset=30",
    });
    vi.mocked(loadMangaRecommended).mockResolvedValue({
      illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
      next_url: "https://app-api.pixiv.net/v1/illust/recommended?content_type=manga&offset=30",
    });

    const { setRecommendSubTab, illusts, fetchMixed } = await import("../feedStore");
    setRecommendSubTab("mixed");
    await fetchMixed();

    const ids = illusts().map((i) => i.id);
    expect(ids).toEqual([3, 2, 1]);
  });

  it("shows partial data when one source fails", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(1, "2026-07-01T09:00:00+09:00", "illust")],
      next_url: null,
    });
    vi.mocked(loadMangaRecommended).mockRejectedValue(new Error("manga error"));

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
    vi.mocked(loadMangaRecommended).mockReset();
    vi.mocked(loadNext).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).window = undefined;
  });

  it("loads more from the source with older tail first", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
      next_url: "next-illust",
    });
    vi.mocked(loadMangaRecommended).mockResolvedValue({
      illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
      next_url: "next-manga",
    });
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
});
