// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createTextListLayout } from "@/primitives/createTextListLayout";
import type { PixivNovel } from "@/api/types";

function makeNovel(id: number, title: string): PixivNovel {
  return {
    id,
    title,
    user: { id: 1, name: "Author", account: "author", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 1234,
    is_bookmarked: false,
    total_bookmarks: 10,
    total_view: 100,
    x_restrict: 0,
    create_date: "2024-01-01T00:00:00+09:00",
  };
}

describe("createTextListLayout", () => {
  it("returns empty layout for empty novels", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([]);
      const [width] = createSignal(400);
      const { layout } = createTextListLayout(novels, width, { gap: 12 });
      expect(layout().items).toHaveLength(0);
      expect(layout().totalHeight).toBe(0);
      expect(layout().columns).toBe(1);
      dispose();
    }));

  it("computes single-column layout with estimated heights", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([makeNovel(1, "Short title")]);
      const [width] = createSignal(400);
      const { layout } = createTextListLayout(novels, width, { gap: 12 });
      const l = layout();
      expect(l.items).toHaveLength(1);
      expect(l.items[0].x).toBe(0);
      expect(l.items[0].width).toBe(400);
      expect(l.items[0].height).toBeGreaterThan(0);
      expect(l.totalHeight).toBe(l.items[0].height);
      dispose();
    }));

  it("computes multi-item layout with gap offsets", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([makeNovel(1, "A"), makeNovel(2, "B")]);
      const [width] = createSignal(400);
      const { layout } = createTextListLayout(novels, width, { gap: 12 });
      const l = layout();
      expect(l.items).toHaveLength(2);
      expect(l.items[1].y).toBe(l.items[0].y + l.items[0].height + 12);
      expect(l.totalHeight).toBe(l.items[1].y + l.items[1].height);
      dispose();
    }));

  it("returns consistent layout for repeated reads", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([makeNovel(1, "Short title")]);
      const [width] = createSignal(400);
      const { layout } = createTextListLayout(novels, width, { gap: 12 });
      const a = layout();
      const b = layout();
      expect(a.items[0].height).toBe(b.items[0].height);
      expect(a.totalHeight).toBe(b.totalHeight);
      dispose();
    }));
});
