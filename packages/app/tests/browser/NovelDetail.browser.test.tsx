// @vitest-environment browser
// 验证 NovelDetail 组件在浏览器中正确渲染 scroll-header 结构。
// IntersectionObserver 的滚动行为已在 playwright-cli 端到端验证。
import { render, screen } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";

// Override router mock from setup.ts — provide novel ID in params
vi.mock("@solidjs/router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/novel/1" }),
  useParams: () => ({ id: "1" }),
  useBeforeLeave: (fn: unknown) => fn as any,
}));

// Mock novel API to return data
const mockNovel = {
  novel: {
    id: 1,
    title: "Scroll Header 测试标题",
    user: {
      id: 1,
      name: "测试作者",
      account: "test_author",
      profile_image_urls: { medium: "", px_16x16: "", px_50x50: "", px_170x170: "" },
      is_followed: false,
    },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [{ name: "tag1" }],
    page_count: 1,
    text_length: 5000,
    is_bookmarked: false,
    total_bookmarks: 10,
    total_view: 100,
    x_restrict: 0,
    create_date: "2026-01-01T00:00:00Z",
    caption: "",
  },
};

vi.mock("../../src/api/novel", () => ({
  loadDetail: () => Promise.resolve(mockNovel),
  fetchNovelData: () => Promise.resolve({ text: "正文内容\n\n第二段", navigation: {} }),
  extractNovelTextFromHtml: () => "",
  extractNovelDataFromHtml: () => ({ text: "", navigation: {} }),
  fetchNovelText: vi.fn(),
  loadRecommended: vi.fn(),
  loadBookmarks: vi.fn(),
  loadFollow: vi.fn(),
  loadNext: vi.fn(),
  loadSeries: vi.fn(),
  addBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}));

import NovelDetail from "../../src/routes/NovelDetail";

describe("NovelDetail scroll-header", () => {
  it("renders metadata title and header title span after data loads", async () => {
    const { container } = render(() => <NovelDetail />);

    // Wait for the metadata h1 with the novel title to appear
    const titles = await screen.findAllByText("Scroll Header 测试标题");
    expect(titles.length).toBeGreaterThanOrEqual(1);

    // Header should contain the title wrapped in 《》
    expect(container.textContent).toContain("《Scroll Header 测试标题》");

    // Find the header title span (the one with 《》)
    const headerTitleSpan = [...container.querySelectorAll("h1 span")].find((s) =>
      s.textContent?.includes("《"),
    );
    expect(headerTitleSpan).not.toBeNull();

    // Verify the span has opacity transition style
    const style = headerTitleSpan!.getAttribute("style");
    expect(style).toContain("transition");
    expect(style).toContain("opacity");
  });
});
