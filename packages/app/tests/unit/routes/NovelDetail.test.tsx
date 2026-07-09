// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@solidjs/testing-library";

const mockLoadDetail = vi.fn();
const mockFetchNovelData = vi.fn();
const mockNovelCacheEnabled = vi.fn().mockReturnValue(false);

vi.mock("@solidjs/router", () => ({
  useParams: () => ({ id: "42" }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/novel/42" }),
  useBeforeLeave: () => {},
}));

vi.mock("@/api/novel", () => ({
  loadDetail: (...args: unknown[]) => mockLoadDetail(...args),
  fetchNovelData: (...args: unknown[]) => mockFetchNovelData(...args),
}));

vi.mock("@/stores/uiStore", () => ({
  novelCacheEnabled: () => mockNovelCacheEnabled(),
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

globalThis.ResizeObserver = vi.fn(function ResizeObserver() {
  return {
    observe: vi.fn(),
    disconnect: vi.fn(),
  };
}) as unknown as typeof ResizeObserver;

globalThis.IntersectionObserver = vi.fn(function IntersectionObserver() {
  return {
    observe: vi.fn(),
    disconnect: vi.fn(),
  };
}) as unknown as typeof IntersectionObserver;

import NovelDetail from "@/routes/NovelDetail";

describe("NovelDetail content rendering", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockNovelCacheEnabled.mockReturnValue(false);
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      value: 1000,
    });
    window.innerWidth = 1000;
    window.innerHeight = 800;
  });

  it("renders text paragraphs, embedded images and page breaks", async () => {
    mockLoadDetail.mockResolvedValue({
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
    mockFetchNovelData.mockResolvedValue({
      text: "第一段正文内容\n\n[uploadedimage:24980988]\n\n[newpage]\n\n第二段正文内容",
      navigation: {},
      images: {
        "24980988": {
          novelImageId: "24980988",
          sl: "2",
          urls: {
            "240mw": "https://example.com/240.jpg",
            "480mw": "https://example.com/480.jpg",
            "1200x1200": "https://example.com/1200.jpg",
            "128x128": "https://example.com/128.jpg",
            original: "https://example.com/original.png",
          },
        },
      },
    });

    render(() => <NovelDetail />);

    await screen.findByText("Test Novel");

    expect(screen.getByText("第一段正文内容")).toBeDefined();
    expect(screen.getByText("第二段正文内容")).toBeDefined();
    expect(document.querySelectorAll("figure.novel-image-block").length).toBe(1);
    expect(document.querySelectorAll("hr.novel-page-break").length).toBe(1);
  });
});
