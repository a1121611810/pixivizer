// @vitest-environment happy-dom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import NovelTextListCard from "@/components/NovelTextListCard";
import type { PixivNovel } from "@/api/types";

import { addBookmark, deleteBookmark } from "@/api/novel";

vi.mock("@/api/novel", () => ({
  addBookmark: vi.fn().mockResolvedValue(undefined),
  deleteBookmark: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  cleanup();
});

function makeNovel(overrides: Partial<PixivNovel> = {}): PixivNovel {
  return {
    id: 1,
    title: "Test Novel Title",
    user: { id: 10, name: "AuthorName", account: "author", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 5678,
    series: undefined,
    is_bookmarked: false,
    total_bookmarks: 42,
    total_view: 300,
    x_restrict: 0,
    create_date: "2024-01-01T00:00:00+09:00",
    ...overrides,
  };
}

describe("NovelTextListCard", () => {
  it("renders title, author, length, and bookmarks", () => {
    const { getByTestId } = render(() => (
      <NovelTextListCard novel={makeNovel()} onClick={() => {}} />
    ));
    expect(getByTestId("novel-title")).toBeTruthy();
    expect(getByTestId("novel-title").textContent).toBe("Test Novel Title");
    expect(getByTestId("novel-author")).toBeTruthy();
    expect(getByTestId("novel-meta").textContent).toContain("5,678字");
    expect(getByTestId("novel-meta").textContent).toContain("42");
  });

  it("calls onClick when title is clicked", () => {
    const onClick = vi.fn();
    const { getByTestId } = render(() => (
      <NovelTextListCard novel={makeNovel()} onClick={onClick} />
    ));
    fireEvent.click(getByTestId("novel-title"));
    expect(onClick).toHaveBeenCalledWith(1);
  });

  it("calls onAuthorClick when author is clicked", () => {
    const onAuthorClick = vi.fn();
    const { getByTestId } = render(() => (
      <NovelTextListCard novel={makeNovel()} onClick={() => {}} onAuthorClick={onAuthorClick} />
    ));
    fireEvent.click(getByTestId("novel-author"));
    expect(onAuthorClick).toHaveBeenCalledWith(10);
  });

  it("renders series tag and calls onSeriesClick", () => {
    const onSeriesClick = vi.fn();
    const novel = makeNovel({ series: { id: 99, title: "My Series" } });
    const { getByTestId } = render(() => (
      <NovelTextListCard novel={novel} onClick={() => {}} onSeriesClick={onSeriesClick} />
    ));
    expect(getByTestId("novel-series")).toBeTruthy();
    expect(getByTestId("novel-series").textContent).toContain("My Series");
    fireEvent.click(getByTestId("novel-series"));
    expect(onSeriesClick).toHaveBeenCalledWith(99);
  });

  it("renders R-18 badge when x_restrict is 1", () => {
    const { getByTestId } = render(() => (
      <NovelTextListCard novel={makeNovel({ x_restrict: 1 })} onClick={() => {}} />
    ));
    expect(getByTestId("novel-r18-badge")).toBeTruthy();
  });

  it("renders AI badge when novel_ai_type is 2", () => {
    const { getByTestId } = render(() => (
      <NovelTextListCard novel={makeNovel({ novel_ai_type: 2 })} onClick={() => {}} />
    ));
    expect(getByTestId("novel-ai-badge")).toBeTruthy();
  });

  it("calls addBookmark when bookmark button is clicked", async () => {
    const { getByLabelText } = render(() => (
      <NovelTextListCard novel={makeNovel()} onClick={() => {}} />
    ));
    const btn = getByLabelText("收藏");
    fireEvent.click(btn);
    await vi.waitFor(() => {
      expect(addBookmark).toHaveBeenCalledWith(1, "public");
    });
  });

  it("calls deleteBookmark when already bookmarked", async () => {
    const { getByLabelText } = render(() => (
      <NovelTextListCard novel={makeNovel({ is_bookmarked: true })} onClick={() => {}} />
    ));
    const btn = getByLabelText("取消收藏");
    fireEvent.click(btn);
    await vi.waitFor(() => {
      expect(deleteBookmark).toHaveBeenCalledWith(1);
    });
  });

  it("does not mount ResizeObserver", () => {
    const observeSpy = vi.spyOn(ResizeObserver.prototype, "observe");
    render(() => <NovelTextListCard novel={makeNovel()} onClick={() => {}} />);
    expect(observeSpy).not.toHaveBeenCalled();
    observeSpy.mockRestore();
  });
});
