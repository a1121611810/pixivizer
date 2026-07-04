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

describe("createTextListLayout (browser)", () => {
  it("updates layout when measured height is reported", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([makeNovel(1, "A")]);
      const [width] = createSignal(400);
      const { layout, measureItem } = createTextListLayout(novels, width, { gap: 12 });
      const before = layout().items[0].height;
      measureItem(1, 200);
      const after = layout().items[0].height;
      expect(after).toBe(200);
      expect(after).not.toBe(before);
      dispose();
    }));
});
