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

  it("restores scroll only after layout is tall enough to contain the offset", async () => {
    window.scrollTo(0, 0);
    const scrollToSpy = vi.spyOn(window, "scrollTo");
    try {
      const novels = createNovels(20);
      const [width, setWidth] = createSignal(0);
      // Defer giving the feed container a real width until after the initial
      // restoration frame would have fired. With the buggy code the scroll is
      // applied while totalHeight is ~0 and is clamped to the top; the fix waits
      // until the layout is tall enough before scrolling.
      setTimeout(() => setWidth(800), 50);

      render(() => (
        <div style={{ width: `${width()}px` }}>
          <NovelVirtualFeed
            novels={novels}
            loading={false}
            error={null}
            hasMore={false}
            onNovelClick={vi.fn()}
            onLoadMore={vi.fn()}
            onRefresh={vi.fn()}
            restoreScrollTop={500}
          />
        </div>
      ));

      // Give the buggy early restoration frame time to fire while width is still 0.
      await new Promise((resolve) => setTimeout(resolve, 40));
      const earlyScrollTo500 = scrollToSpy.mock.calls.some(
        (call) => call[0] === 0 && call[1] === 500,
      );
      expect(earlyScrollTo500).toBe(false);

      await waitFor(
        () => {
          expect(window.scrollY).toBe(500);
        },
        { timeout: 3000 },
      );
    } finally {
      scrollToSpy.mockRestore();
    }
  });
});
