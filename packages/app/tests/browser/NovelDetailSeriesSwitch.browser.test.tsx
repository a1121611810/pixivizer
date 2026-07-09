// @vitest-environment browser
import { render, screen, fireEvent, waitFor, cleanup } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SeriesNavigation } from "../../src/api/types";

const mockNavigate = vi.fn();

vi.mock("@solidjs/router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/novel/1" }),
  useParams: () => ({ id: "1" }),
  useBeforeLeave: (fn: unknown) => fn as any,
}));

function generateText(paragraphs: number): string {
  return Array.from(
    { length: paragraphs },
    (_, i) => `第${i + 1}段正文内容，用于测试虚拟滚动。`,
  ).join("\n\n");
}

function makeMockNovel(id: number) {
  return {
    novel: {
      id,
      title: `Series Novel ${id}`,
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
      series: { id: 100, title: "Test Series" },
    },
  };
}

const nextNovel = { id: 2, title: "Series Novel 2" };

vi.mock("../../src/api/novel", () => ({
  loadDetail: (id: number) => Promise.resolve(makeMockNovel(id)),
  fetchNovelData: (id: number) =>
    Promise.resolve({
      text: generateText(50),
      navigation: id === 1 ? ({ nextNovel } as SeriesNavigation) : ({} as SeriesNavigation),
    }),
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

describe("NovelDetail series switch scroll reset", () => {
  const OriginalResizeObserver = window.ResizeObserver;

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    mockNavigate.mockClear();

    // Provide a non-zero container width synchronously so that layout is ready
    // when restoreProgress runs, matching real browser timing.
    window.ResizeObserver = class implements ResizeObserver {
      constructor(private cb: ResizeObserverCallback) {}
      observe(target: Element) {
        this.cb(
          [
            {
              target,
              contentRect: new DOMRect(0, 0, 800, 600),
              borderBoxSize: [],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            } as unknown as ResizeObserverEntry,
          ],
          this,
        );
      }
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    window.ResizeObserver = OriginalResizeObserver;
  });

  it("scrolls to top after switching to next chapter even when target has saved progress", async () => {
    // Pretend the target chapter was previously read half-way through.
    localStorage.setItem(
      "novel_progress_2",
      JSON.stringify({ paragraphIndex: 10, charIndex: 0, progress: 0.5 }),
    );

    document.body.style.width = "800px";

    const { container } = render(() => <NovelDetail />);
    await screen.findAllByText("Series Novel 1");

    // Scroll partway through the chapter first.
    window.scrollTo(0, 500);
    window.dispatchEvent(new Event("scroll"));

    const nextButton = await screen.findByText(/下一章/);
    fireEvent.click(nextButton);

    // The target chapter should load and the page should end up back at the top,
    // not at its previously saved reading position.
    await waitFor(() => {
      expect(container.textContent).toContain("Series Novel 2");
    });
    // restoreProgress runs in a requestAnimationFrame; give it time to act before
    // asserting the final scroll position.
    await new Promise((resolve) => setTimeout(resolve, 200));
    await waitFor(() => expect(window.scrollY).toBeLessThan(50));
  });
});
