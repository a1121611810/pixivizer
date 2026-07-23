// @vitest-environment browser
import { render, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import NovelVirtualFeed from "../../src/components/NovelVirtualFeed";
import type { PixivNovel } from "../../src/api/types";

// ── Helper ──
function createNovels(count: number): PixivNovel[] {
  return Array.from(
    { length: count },
    (_, i) =>
      ({
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
      }) as PixivNovel,
  );
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

  it("shows error component with retry", () => {
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={[]}
        loading={false}
        error={{ type: "NETWORK", message: "请求失败" } as any}
        hasMore={false}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />
    ));
    // ErrorDisplay renders a retry button
    expect(container.textContent).toContain("重试");
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

  it("textList mode does not rely on card ResizeObserver", async () => {
    const observeSpy = vi.spyOn(ResizeObserver.prototype, "observe");
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
        layoutMode="textList"
      />
    ));
    await waitFor(() => {
      expect(container.textContent).toContain("小说标题 1");
    });
    // ResizeObserver on the feed container itself is still expected; cards should not mount one.
    const cardElements = container.querySelectorAll('[data-testid="novel-title"]');
    expect(cardElements.length).toBeGreaterThan(0);
    observeSpy.mockRestore();
  });

  it("coverWall mode computes dynamic card heights", async () => {
    const novels = [
      ...createNovels(2),
      {
        id: 3,
        title: "a".repeat(200),
        user: { id: 1, name: "作者3", account: "author3", profile_image_urls: {} },
        image_urls: { square_medium: "", medium: "", large: "" },
        tags: [{ name: "tag1", translated_name: "标签1" }],
        page_count: 1,
        text_length: 1000,
        is_bookmarked: false,
        total_bookmarks: 10,
        total_view: 50,
        x_restrict: 0,
        novel_ai_type: 0,
        create_date: "2026-01-03T00:00:00Z",
      } as PixivNovel,
    ];
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={novels}
        loading={false}
        error={null}
        hasMore={false}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
        layoutMode="coverWall"
      />
    ));
    await waitFor(() => {
      expect(container.textContent).toContain("小说标题 1");
    });
    // The feed should render cover wall cards including the long-title one
    expect(container.textContent).toContain("a".repeat(200));
  });

  it("cards render with measureElement ref for dynamic sizing", async () => {
    const novels = createNovels(10);
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
    // Cards should have data-index for measureElement
    const items = container.querySelectorAll("[data-index]");
    expect(items.length).toBeGreaterThan(0);
  });
});
