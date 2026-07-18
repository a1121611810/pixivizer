// @vitest-environment browser
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import SeriesSheet from "../../src/components/SeriesSheet";
import type { PixivNovel } from "../../src/api/types";
import type { NovelSeriesDetailResponse } from "../../src/api/novel";

const mockNovels: PixivNovel[] = [
  {
    id: 42,
    title: "Target Novel",
    user: { id: 1, name: "Author", account: "author", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 1000,
    is_bookmarked: false,
    total_bookmarks: 0,
    x_restrict: 0,
    create_date: "2026-01-01T00:00:00Z",
  },
];

const mockSeriesResponse: NovelSeriesDetailResponse = {
  novel_series_detail: {
    id: 1,
    title: "Test Series",
    user: { id: 1, name: "Author", account: "author", profile_image_urls: {} },
    create_date: "2026-01-01T00:00:00Z",
    total_character_count: 1000,
    display_text_count: 1000,
  },
  novels: mockNovels,
  next_url: null,
};

vi.mock("../../src/api/novel", () => ({
  loadSeries: vi.fn(() => Promise.resolve(mockSeriesResponse)),
  loadSeriesNext: vi.fn(() =>
    Promise.resolve({ ...mockSeriesResponse, novels: [], next_url: null }),
  ),
}));

vi.mock("../../src/stores/novelCache", () => ({
  getSeries: vi.fn(() => undefined),
  setSeries: vi.fn(),
}));

describe("SeriesSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onNovelSelect and onClose when an item is clicked", async () => {
    const onNovelSelect = vi.fn();
    const onClose = vi.fn();

    render(() => (
      <SeriesSheet
        seriesId={1}
        seriesTitle="Test Series"
        authorName="Author"
        authorId={1}
        isOpen={true}
        onClose={onClose}
        onNovelSelect={onNovelSelect}
      />
    ));

    const item = await screen.findByRole("button", { name: /Target Novel/u });
    fireEvent.click(item);

    expect(onClose).toHaveBeenCalledOnce();
    expect(onNovelSelect).toHaveBeenCalledOnce();
    expect(onNovelSelect).toHaveBeenCalledWith(42);
  });

  it("marks active novel with indicator", async () => {
    render(() => (
      <SeriesSheet
        seriesId={1}
        seriesTitle="Test Series"
        authorName="Author"
        authorId={1}
        isOpen={true}
        onClose={vi.fn()}
        onNovelSelect={vi.fn()}
        activeNovelId={42}
      />
    ));

    const item = await screen.findByRole("button", { name: /当前章节：Target Novel/u });
    expect(item).not.toBeNull();
  });
});
