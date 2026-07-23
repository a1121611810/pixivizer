// @vitest-environment browser
import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import NovelCard from "../../src/components/NovelCard";
import type { PixivNovel } from "../../src/api/types";

// ── Helper ──
function createNovel(overrides?: Partial<PixivNovel>): PixivNovel {
  return {
    id: 1,
    title: "测试小说的标题",
    user: {
      id: 1,
      name: "测试作者",
      account: "test_author",
      profile_image_urls: { medium: "", px_16x16: "", px_50x50: "", px_170x170: "" },
      is_followed: false,
    },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [{ name: "tag1" }],
    page_count: 3,
    text_length: 5000,
    series: undefined,
    has_chapters: false,
    is_original: true,
    is_bookmarked: false,
    total_bookmarks: 100,
    total_comments: 5,
    total_view: 500,
    x_restrict: 0,
    novel_ai_type: 0,
    create_date: "2026-01-01T00:00:00Z",
    caption: "小说简介",
    ...overrides,
  } as PixivNovel;
}

describe("NovelCard", () => {
  it("renders title and author name", () => {
    const { container } = render(() => <NovelCard novel={createNovel()} onClick={vi.fn()} />);
    expect(container.textContent).toContain("测试小说的标题");
    expect(container.textContent).toContain("@测试作者");
  });

  it("shows R-18 badge for x_restrict=1", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ x_restrict: 1 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("R-18");
  });

  it("shows R-18G badge for x_restrict=2", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ x_restrict: 2 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("R-18G");
  });

  it("shows AI badge for novel_ai_type=2", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ novel_ai_type: 2 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("AI");
  });

  it("shows AI辅助 badge for novel_ai_type=3", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ novel_ai_type: 3 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("AI辅助");
  });

  it("shows no restriction badges for safe content", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ x_restrict: 0, novel_ai_type: 0 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).not.toContain("R-18");
    expect(container.textContent).not.toContain("R-18G");
    expect(container.textContent).not.toContain("AI");
  });

  it("shows series badge when novel has series", () => {
    const novel = createNovel({
      series: { id: 10, title: "测试系列" },
    });
    const { container } = render(() => (
      <NovelCard novel={novel} onClick={vi.fn()} onSeriesClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("📚");
  });

  it("renders bookmark count", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ total_bookmarks: 42 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("★ 42");
  });

  it("renders text length", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ text_length: 12_345 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("12,345字");
  });

  it("uses responsive cover sizing instead of fixed 128px", () => {
    const { container } = render(() => <NovelCard novel={createNovel()} onClick={vi.fn()} />);
    const html = container.innerHTML;
    // 固定 128px 尺寸应该不再存在
    expect(html).not.toContain("w-[128px]");
    expect(html).not.toContain("h-[128px]");
    // 封面容器应使用响应式尺寸（精确匹配，避免误中 line-clamp）
    expect(html).toContain("w-[clamp(80px,20vw,128px)]");
    expect(html).toContain("aspect-square");
  });
});
