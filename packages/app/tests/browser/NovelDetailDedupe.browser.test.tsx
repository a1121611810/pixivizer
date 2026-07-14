// 验证 NovelDetail 在系列章节切换时不会对同一篇小说重复请求。
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@solidjs/testing-library";
import { setTestStore } from "@/stores/novelCache";
import { createMemoryStore } from "@/stores/db";
import type { PixivNovel } from "@/api/types";

const mockLoadDetail = vi.fn();
const mockFetchNovelData = vi.fn();
const mockNovelCacheEnabled = vi.fn().mockReturnValue(false);

const mockLoaderData = vi.hoisted(() => ({
  value: {
    novel: {
      id: 42,
      title: "Test Novel 42",
      user: { id: 1, name: "Author", account: "author", profile_image_urls: {} },
      image_urls: { square_medium: "", medium: "", large: "" },
      tags: [],
      page_count: 1,
      text_length: 1000,
      series: { id: 100, title: "Test Series" },
      is_bookmarked: false,
      total_bookmarks: 0,
      total_view: 0,
      x_restrict: 0,
      create_date: "2026-01-01T00:00:00Z",
    } as PixivNovel,
    text: "正文 42",
    nav: { nextNovel: { id: 43, title: "Test Novel 43" } },
    images: {},
  },
}));

const mockUseLoaderData = vi.hoisted(() => vi.fn(() => () => mockLoaderData.value));

vi.mock("@tanstack/solid-router", () => ({
  useParams: () => () => ({ id: undefined }),
  useNavigate: () => vi.fn(),
  useLocation: () => () => ({ pathname: "/novel/42" }),
  useRouter: () => ({ history: { back: vi.fn() } }),
  getRouteApi: () => ({ useLoaderData: mockUseLoaderData }),
  useBeforeLeave: () => {},
}));

vi.mock("@/api/novel", () => ({
  loadDetail: (...args: unknown[]) => mockLoadDetail(...args),
  fetchNovelData: (...args: unknown[]) => mockFetchNovelData(...args),
}));

vi.mock("@/stores/uiStore", () => ({
  novelCacheEnabled: () => mockNovelCacheEnabled(),
  useDnsOverride: () => false,
}));

vi.mock("@/components/PixivImage", () => ({
  default: () => <div data-testid="pixiv-image" />,
}));

vi.mock("@/components/NovelSearchBar", () => ({
  default: () => <div data-testid="novel-search-bar" />,
}));

vi.mock("@/components/ReaderSettingsSheet", () => ({
  default: () => <div data-testid="reader-settings-sheet" />,
}));

vi.mock("@/components/SeriesSheet", () => ({
  default: () => <div data-testid="series-sheet" />,
}));

vi.mock("@/components/PageTransition", () => ({
  default: (props: { children?: unknown }) => <div>{props.children}</div>,
}));

vi.mock("@/components/ui/FluentIcon", () => ({
  default: () => <span>icon</span>,
}));

vi.mock("@/components/LoadingSpinner", () => ({
  default: () => <div>Loading...</div>,
}));

vi.mock("@/utils/novelImageDimensions", () => ({
  loadNovelImageDimensions: () => Promise.resolve({}),
}));

import NovelDetail from "@/routes/NovelDetail";

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function createNovel(id: number, title: string): PixivNovel {
  return {
    id,
    title,
    user: { id: 1, name: "Author", account: "author", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 1000,
    series: { id: 100, title: "Test Series" },
    is_bookmarked: false,
    total_bookmarks: 0,
    total_view: 0,
    x_restrict: 0,
    create_date: "2026-01-01T00:00:00Z",
  };
}

describe("NovelDetail loading deduplication", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockNovelCacheEnabled.mockReturnValue(false);
    setTestStore(createMemoryStore());
  });

  it("loads each novel only once when switching chapters", async () => {
    const detailPromises: Record<
      number,
      ReturnType<typeof deferred<import("@/api/types").PixivNovelDetailResponse>>
    > = {};
    const textPromises: Record<
      number,
      ReturnType<typeof deferred<{ text: string; navigation: unknown; images: unknown }>>
    > = {};

    mockLoadDetail.mockImplementation((id: number) => {
      if (!detailPromises[id]) detailPromises[id] = deferred();
      return detailPromises[id].promise;
    });
    mockFetchNovelData.mockImplementation((id: number) => {
      if (!textPromises[id]) textPromises[id] = deferred();
      return textPromises[id].promise;
    });

    render(() => <NovelDetail />);

    // 路由 loader 已提供初始数据，不应触发任何 API 请求。
    await new Promise((r) => setTimeout(r, 0));
    expect(mockLoadDetail).not.toHaveBeenCalled();
    expect(mockFetchNovelData).not.toHaveBeenCalled();

    // 切换到下一章 43。
    fireEvent.click(screen.getByText("下一章 ▶"));
    await new Promise((r) => setTimeout(r, 0));

    expect(mockLoadDetail).toHaveBeenCalledTimes(1);
    expect(mockLoadDetail).toHaveBeenLastCalledWith(43);
    expect(mockFetchNovelData).toHaveBeenCalledTimes(1);
    expect(mockFetchNovelData).toHaveBeenLastCalledWith(43);

    detailPromises[43].resolve({ novel: createNovel(43, "Test Novel 43") });
    textPromises[43].resolve({
      text: "正文 43",
      navigation: {
        prevNovel: { id: 42, title: "Test Novel 42" },
        nextNovel: { id: 44, title: "Test Novel 44" },
      },
      images: {},
    });
    await screen.findByText("Test Novel 43");

    // 继续切换到下一章 44。
    fireEvent.click(screen.getByText("下一章 ▶"));
    await new Promise((r) => setTimeout(r, 0));

    expect(mockLoadDetail).toHaveBeenCalledTimes(2);
    expect(mockLoadDetail).toHaveBeenLastCalledWith(44);
    expect(mockFetchNovelData).toHaveBeenCalledTimes(2);
    expect(mockFetchNovelData).toHaveBeenLastCalledWith(44);

    detailPromises[44].resolve({ novel: createNovel(44, "Test Novel 44") });
    textPromises[44].resolve({
      text: "正文 44",
      navigation: {
        prevNovel: { id: 43, title: "Test Novel 43" },
      },
      images: {},
    });
    await screen.findByText("Test Novel 44");

    // 返回上一章 43，应命中缓存，不触发新的 loadNovelEntry / API 请求。
    fireEvent.click(screen.getByText("◀ 上一章"));
    await new Promise((r) => setTimeout(r, 0));

    expect(mockLoadDetail).toHaveBeenCalledTimes(2);
    expect(mockFetchNovelData).toHaveBeenCalledTimes(2);
    await screen.findByText("Test Novel 43");
  });
});
