// 验证 NovelDetail 进入详情页时不会自我触发导致重复请求。
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@solidjs/testing-library";

const mockLoadDetail = vi.fn();
const mockFetchNovelData = vi.fn();
const mockNovelCacheEnabled = vi.fn().mockReturnValue(false);

vi.mock("@tanstack/solid-router", () => ({
  useParams: () => () => ({ id: "42" }),
  useNavigate: () => vi.fn(),
  useLocation: () => () => ({ pathname: "/novel/42" }),
  useRouter: () => ({ history: { back: vi.fn() } }),
  getRouteApi: () => ({ useLoaderData: () => () => undefined }),
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

describe("NovelDetail loading deduplication", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockNovelCacheEnabled.mockReturnValue(false);
  });

  it("fetches detail and text only once per novel id", async () => {
    const detail = deferred<import("@/api/types").PixivNovelDetailResponse>();
    const text = deferred<{ text: string; navigation: unknown; images: unknown }>();

    mockLoadDetail.mockImplementation(function () {
      return detail.promise;
    });
    mockFetchNovelData.mockImplementation(function () {
      return text.promise;
    });

    render(() => <NovelDetail />);

    // Give any self-triggered effects time to run
    await new Promise((r) => setTimeout(r, 0));

    expect(mockLoadDetail).toHaveBeenCalledTimes(1);
    expect(mockFetchNovelData).toHaveBeenCalledTimes(1);

    detail.resolve({
      novel: {
        id: 42,
        title: "Test Novel",
        user: { id: 1, name: "Author", account: "author", profile_image_urls: {} },
        image_urls: { square_medium: "", medium: "", large: "" },
        tags: [],
        page_count: 1,
        text_length: 1000,
        is_bookmarked: false,
        total_bookmarks: 0,
        total_view: 0,
        x_restrict: 0,
        create_date: "2026-01-01T00:00:00Z",
      },
    });
    text.resolve({ text: "正文内容", navigation: {}, images: {} });

    await screen.findByText("Test Novel");

    expect(mockLoadDetail).toHaveBeenCalledTimes(1);
    expect(mockFetchNovelData).toHaveBeenCalledTimes(1);
  });
});
