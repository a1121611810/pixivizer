// @vitest-environment browser
import { render, screen, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => () => ({ pathname: "/novel/1" }),
  useParams: () => () => ({ id: "1" }),
  useRouter: () => ({ history: { back: vi.fn() } }),
  getRouteApi: () => ({
    useLoaderData: () => () => ({
      error: null,
      novel: mockNovel.novel,
      text: generateText(50),
      nav: {},
      images: {},
    }),
  }),
  useBeforeLeave: (fn: unknown) => fn as any,
}));

function generateText(paragraphs: number): string {
  return Array.from(
    { length: paragraphs },
    (_, i) => `第${i + 1}段正文内容，用于测试虚拟滚动。`,
  ).join("\n\n");
}

const mockNovel = {
  novel: {
    id: 1,
    title: "Scroll Blank 测试标题",
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
  fetchNovelData: () => Promise.resolve({ text: generateText(50), navigation: {} }),
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

describe("NovelDetail virtual scroll", () => {
  it("keeps early paragraphs rendered after scrolling down past cover", async () => {
    render(() => <NovelDetail />);
    await screen.findAllByText("Scroll Blank 测试标题");

    const textContainer = document.querySelector(".novel-text");
    expect(textContainer).not.toBeNull();

    await waitFor(() => {
      expect(textContainer!.textContent).toContain("第1段正文内容");
    });

    // Scroll past the cover/metadata area. The text container is below it,
    // So we are still near the top of the text content.
    window.scrollTo(0, 300);
    window.dispatchEvent(new Event("scroll"));

    await waitFor(() => {
      expect(textContainer!.textContent).toContain("第1段正文内容");
    });
  });
});
