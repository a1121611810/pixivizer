// @vitest-environment browser
import { render, screen, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import NovelVirtualFeed from "../../src/components/NovelVirtualFeed";
import type { PixivNovel } from "../../src/api/types";

// ── Helper ──
function createNovels(count: number): PixivNovel[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `小说标题 ${i + 1}`,
    user: {
      id: 1,
      name: `作者${i + 1}`,
      account: `author${i + 1}`,
      profile_image_urls: {},
    },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 1000,
    is_bookmarked: false,
    total_bookmarks: 10,
    total_view: 50,
    x_restrict: 0,
    novel_ai_type: 0,
    create_date: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
  } as PixivNovel));
}

describe("NovelVirtualFeed", () => {
  it("renders all novel cards", async () => {
    const novels = createNovels(3);
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={novels}
        loading={false}
        error={null}
        hasMore={false}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />
    ));
    await waitFor(() => {
      expect(container.textContent).toContain("小说标题 1");
    });
    expect(container.textContent).toContain("小说标题 2");
    expect(container.textContent).toContain("小说标题 3");
  });

  it("shows empty state for empty list", () => {
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={[]}
        loading={false}
        error={null}
        hasMore={false}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />
    ));
    expect(container.textContent).toContain("暂无小说");
  });

  it("shows error message", () => {
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={[]}
        loading={false}
        error="请求失败"
        hasMore={false}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />
    ));
    expect(container.textContent).toContain("请求失败");
  });

  it("shows loading spinner with text", async () => {
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={createNovels(2)}
        loading={true}
        error={null}
        hasMore={true}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />
    ));
    // Should still show existing novels AND loading indicator
    await waitFor(() => {
      expect(container.textContent).toContain("小说标题 1");
    });
    expect(container.textContent).toContain("加载中");
  });

  it("shows end-of-list message when no more data", () => {
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={createNovels(1)}
        loading={false}
        error={null}
        hasMore={false}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />
    ));
    expect(container.textContent).toContain("已经到底了");
  });
});
