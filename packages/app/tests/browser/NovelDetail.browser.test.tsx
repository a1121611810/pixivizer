// @vitest-environment browser
// 验证 NovelDetail 组件在浏览器中正确渲染 scroll-header 结构。
// IntersectionObserver 的滚动行为已在 playwright-cli 端到端验证。
import { render, screen, fireEvent, waitFor, cleanup } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SeriesNavigation } from "../../src/api/types";

const mockNavigate = vi.fn();

function generateNovelText(): string {
  const paragraphs = Array.from(
    { length: 50 },
    (_, i) => `第${i + 1}段测试内容，用于撑高文档以便测试滚动行为。`,
  );
  paragraphs[0] = "正文内容";
  paragraphs[1] = "第二段";
  return paragraphs.join("\n\n");
}

const mockLoaderData = () => {
  const { novel } = makeMockNovel();
  return {
    error: null,
    novel,
    text: generateNovelText(),
    nav: currentNavigation,
    images: {},
  };
};

// Override router mock from setup.ts — provide novel ID in params
vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => () => ({ pathname: `/novel/${currentNovelId}` }),
  useParams: () => () => ({ id: String(currentNovelId) }),
  useRouter: () => ({ history: { back: mockNavigate } }),
  getRouteApi: () => ({ useLoaderData: () => () => mockLoaderData() }),
  useBeforeLeave: (fn: unknown) => fn as any,
}));

let currentNovelId = 1;
let currentSeries: { id: number; title: string } | undefined = undefined;
let currentNavigation: SeriesNavigation = {};

function makeMockNovel() {
  return {
    novel: {
      id: currentNovelId,
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
      series: currentSeries,
    },
  };
}

// Mock novel API to return data
vi.mock("../../src/api/novel", () => ({
  loadDetail: () => Promise.resolve(makeMockNovel()),
  fetchNovelData: () =>
    Promise.resolve({ text: "正文内容\n\n第二段", navigation: currentNavigation }),
  extractNovelTextFromHtml: () => "",
  extractNovelDataFromHtml: () => ({ text: "", navigation: {} }),
  fetchNovelText: vi.fn(),
  loadRecommended: vi.fn(),
  loadBookmarks: vi.fn(),
  loadFollow: vi.fn(),
  loadNext: vi.fn(),
  loadSeries: vi.fn(),
  loadSeriesNext: vi.fn(),
  addBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}));

import NovelDetail from "../../src/routes/NovelDetail";

describe("NovelDetail scroll-header", () => {
  beforeEach(() => {
    cleanup();
    currentNovelId++;
    currentSeries = undefined;
    currentNavigation = {};
    mockNavigate.mockClear();
  });

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

  it("back button calls navigate when clicked", async () => {
    const { container } = render(() => <NovelDetail />);
    await screen.findAllByText("Scroll Header 测试标题");

    const backButton = container.querySelector('[aria-label="返回"]');
    expect(backButton).not.toBeNull();

    fireEvent.click(backButton!);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it("renders bottom toolbar with fixed positioning and Fluent transition", async () => {
    const { container } = render(() => <NovelDetail />);
    await screen.findAllByText("Scroll Header 测试标题");

    // Find the bottom toolbar div (the one with "显示设置" text somewhere inside)
    const toolbar = container.querySelector('[class*="fixed bottom-0"]');
    expect(toolbar).not.toBeNull();

    // Verify it uses translateY for show/hide
    const style = toolbar!.getAttribute("style")?.replace(/\s+/g, " ");
    expect(style).toContain("transform");
    expect(style).toContain("translateY(0");

    // Verify Fluent animation tokens
    expect(style).toContain("var(--durationNormal)");
    expect(style).toContain("var(--curveEasyEase)");

    // Verify content area has bottom padding for the fixed bar
    const contentArea = container.querySelector('[class*="max-w-2xl"]');
    expect(contentArea?.classList.contains("pb-[64px]")).toBe(true);
  });

  it("renders virtualized novel text content", async () => {
    const { container } = render(() => <NovelDetail />);
    await screen.findAllByText("Scroll Header 测试标题");

    const textContainer = container.querySelector(".novel-text");
    expect(textContainer).not.toBeNull();
    await waitFor(() => {
      expect(textContainer!.textContent).toContain("正文内容");
    });
    expect(textContainer!.textContent).toContain("第二段");
  });

  it("double-clicking header scrolls page back to top", async () => {
    const { container } = render(() => <NovelDetail />);
    await screen.findAllByText("Scroll Header 测试标题");

    const header = container.querySelector("header");
    expect(header).not.toBeNull();

    // Ensure the document is tall enough to scroll in the test viewport.
    const originalMinHeight = document.documentElement.style.minHeight;
    document.documentElement.style.minHeight = "2000px";
    try {
      window.scrollTo(0, 400);
      expect(window.scrollY).toBeGreaterThan(0);

      fireEvent.doubleClick(header!);
      await waitFor(() => expect(window.scrollY).toBe(0));
    } finally {
      document.documentElement.style.minHeight = originalMinHeight;
    }
  });

  it("hides series nav buttons when novel is not in a series", async () => {
    currentSeries = undefined;
    currentNavigation = {
      prevNovel: { id: 0, title: "Prev Novel" },
      nextNovel: { id: 2, title: "Next Novel" },
    };

    const { container } = render(() => <NovelDetail />);
    await screen.findAllByText("Scroll Header 测试标题");

    const toolbar = container.querySelector('[class*="fixed bottom-0"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar!.textContent).toContain("显示设置");
    expect(toolbar!.textContent).not.toContain("目录");
    expect(toolbar!.textContent).not.toContain("上一章");
    expect(toolbar!.textContent).not.toContain("下一章");
  });

  it("shows series nav buttons when novel is in a series", async () => {
    currentSeries = { id: 100, title: "Test Series" };
    currentNavigation = {
      prevNovel: { id: 0, title: "Prev Novel" },
      nextNovel: { id: 2, title: "Next Novel" },
    };

    const { container } = render(() => <NovelDetail />);
    await screen.findAllByText("Scroll Header 测试标题");

    const toolbar = container.querySelector('[class*="fixed bottom-0"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar!.textContent).toContain("显示设置");
    expect(toolbar!.textContent).toContain("目录");
    expect(toolbar!.textContent).toContain("上一章");
    expect(toolbar!.textContent).toContain("下一章");
  });

  it("hides series controls when API returns an empty series object", async () => {
    // Pixiv API returns series: {} for novels that are not in a series.
    currentSeries = {} as { id: number; title: string };
    currentNavigation = {
      prevNovel: { id: 0, title: "Prev Novel" },
      nextNovel: { id: 2, title: "Next Novel" },
    };

    const { container } = render(() => <NovelDetail />);
    await screen.findAllByText("Scroll Header 测试标题");

    const toolbar = container.querySelector('[class*="fixed bottom-0"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar!.textContent).toContain("显示设置");
    expect(toolbar!.textContent).not.toContain("目录");
    expect(toolbar!.textContent).not.toContain("上一章");
    expect(toolbar!.textContent).not.toContain("下一章");

    // The metadata area should not show a "系列：" entry either.
    expect(container.textContent).not.toContain("系列：");
  });
});
