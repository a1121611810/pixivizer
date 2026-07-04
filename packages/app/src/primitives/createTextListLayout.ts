import { createMemo, createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import type { MasonryLayout } from "./types";
import type { PixivNovel } from "../api/types";

interface CreateTextListLayoutOptions {
  gap?: number;
  /** Fallback row height used before real measurement (px) */
  defaultHeight?: number;
}

function estimateHeight(title: string): number {
  // Conservative estimate: up to 2 title lines (28px each) + meta line (20px) + badges (24px) + tags (24px) + padding (24px)
  const titleLines = title.length > 24 ? 2 : 1;
  return 24 + titleLines * 28 + 20 + 24 + 24;
}

export interface TextListLayoutResult {
  layout: Accessor<MasonryLayout>;
  /** Report the real rendered height of a visible item. */
  measureItem: (id: number, height: number) => void;
}

/**
 * Text-list layout that starts with an estimated height and is corrected
 * by real DOM measurements from the rendered rows.
 *
 * This avoids the impossible task of predicting the exact height of a
 * Tailwind-styled card with `line-clamp`, custom Fluent badges, and
 * wrapping tags. Instead, each visible card measures itself via
 * ResizeObserver and reports back; the cache is a Solid signal so the
 * virtual layout updates when a corrected height arrives.
 */
export function createTextListLayout(
  novels: Accessor<PixivNovel[]>,
  containerWidth: Accessor<number>,
  options: CreateTextListLayoutOptions = {},
): TextListLayoutResult {
  const gap = options.gap ?? 12;
  const defaultHeight = options.defaultHeight ?? 80;

  // id -> measured height. Using a Solid signal so the layout memo re-runs
  // when corrected heights arrive.
  const [heightCache, setHeightCache] = createSignal<Record<number, number>>({});

  const layout = createMemo<MasonryLayout>(() => {
    const list = novels();
    const width = containerWidth();
    const cache = heightCache();

    if (list.length === 0 || width <= 0) {
      return {
        items: [],
        totalHeight: 0,
        columns: 1,
        columnWidth: width,
        gap,
        columnGap: 0,
      };
    }

    let y = 0;
    const items = list.map((novel, index) => {
      const height = cache[novel.id] ?? Math.max(estimateHeight(novel.title), defaultHeight);
      const item = {
        index,
        x: 0,
        y,
        width,
        height,
        column: 0,
      };
      y += height + gap;
      return item;
    });

    const totalHeight =
      items.length > 0 ? items[items.length - 1].y + items[items.length - 1].height : 0;

    return {
      items,
      totalHeight,
      columns: 1,
      columnWidth: width,
      gap,
      columnGap: 0,
    };
  });

  function measureItem(id: number, height: number) {
    const cache = heightCache();
    const existing = cache[id];
    if (existing != null && Math.abs(existing - height) < 1) return;
    setHeightCache({ ...cache, [id]: height });
  }

  return { layout, measureItem };
}
