import { describe, it, expect } from "vitest";
import {
  computeMasonryLayout,
  appendToLayout,
  computeWindow,
  CARD_INFO_HEIGHT,
  estimateTagAreaHeight,
} from "@/primitives/computeMasonryLayout";
import type { MasonryLayout, MasonryItemLayout } from "@/primitives/types";

function makeItem(w: number, h: number) {
  return { width: w, height: h };
}

describe("computeMasonryLayout", () => {
  it("returns empty layout for zero items", () => {
    const layout = computeMasonryLayout({
      items: [],
      columnWidth: 200,
      columnCount: 2,
      gap: 10,
    });
    expect(layout.items).toEqual([]);
    expect(layout.totalHeight).toBe(0);
    expect(layout.columns).toBe(2);
    expect(layout.columnWidth).toBe(200);
  });

  it("places a single item in column 0", () => {
    const layout = computeMasonryLayout({
      items: [makeItem(200, 200)],
      columnWidth: 200,
      columnCount: 2,
      gap: 10,
    });
    expect(layout.items).toHaveLength(1);
    expect(layout.items[0].column).toBe(0);
    expect(layout.items[0].x).toBe(0);
    expect(layout.items[0].y).toBe(0);
    // height = 200/1 + CARD_INFO_HEIGHT
    expect(layout.items[0].height).toBe(200 + CARD_INFO_HEIGHT);
  });

  it("uses shortest-column placement for two items", () => {
    const layout = computeMasonryLayout({
      items: [makeItem(200, 200), makeItem(200, 400)],
      columnWidth: 200,
      columnCount: 2,
      gap: 10,
    });
    expect(layout.items).toHaveLength(2);
    // Both go to different columns
    expect(layout.items[0].column).not.toBe(layout.items[1].column);
    // First item in each column should be at y=0
    expect(layout.items[0].y).toBe(0);
    expect(layout.items[1].y).toBe(0);
  });

  it("uses columnGap when provided", () => {
    const layout = computeMasonryLayout({
      items: [makeItem(200, 200), makeItem(200, 200)],
      columnWidth: 200,
      columnCount: 2,
      gap: 10,
      columnGap: 20,
    });
    // Column 0: x=0, Column 1: x = 1 * (200 + 20) = 220
    expect(layout.items[1].x).toBe(220);
    expect(layout.columnGap).toBe(20);
  });

  it("defaults columnGap to gap", () => {
    const layout = computeMasonryLayout({
      items: [makeItem(200, 200), makeItem(200, 200)],
      columnWidth: 200,
      columnCount: 2,
      gap: 15,
    });
    expect(layout.columnGap).toBe(15);
    expect(layout.items[1].x).toBe(215);
  });

  it("handles zero-width/zero-height items gracefully", () => {
    const layout = computeMasonryLayout({
      items: [makeItem(0, 0)],
      columnWidth: 200,
      columnCount: 1,
      gap: 10,
    });
    // aspectRatio falls back to 1 when width or height is 0
    expect(layout.items[0].height).toBe(200 + CARD_INFO_HEIGHT);
  });

  it("calculates totalHeight correctly", () => {
    const layout = computeMasonryLayout({
      items: [makeItem(200, 200), makeItem(200, 400)],
      columnWidth: 200,
      columnCount: 1,
      gap: 10,
    });
    const _h1 = 200 + CARD_INFO_HEIGHT;
    const _h2 = 100 + CARD_INFO_HEIGHT; // 200/(400/200) = 100
    expect(layout.totalHeight).toBe(780);
  });

  it("distributes items across multiple columns", () => {
    const layout = computeMasonryLayout({
      items: [
        makeItem(200, 200),
        makeItem(200, 200),
        makeItem(200, 200),
        makeItem(200, 200),
        makeItem(200, 200),
      ],
      columnWidth: 150,
      columnCount: 3,
      gap: 8,
    });
    expect(layout.items).toHaveLength(5);
    // Verify each item has a valid column 0-2
    for (const item of layout.items) {
      expect(item.column).toBeGreaterThanOrEqual(0);
      expect(item.column).toBeLessThan(3);
    }
    // All 3 columns should have at least 1 item
    const columnsUsed = new Set(layout.items.map((i) => i.column));
    expect(columnsUsed.size).toBe(3);
  });
});

describe("estimateTagAreaHeight", () => {
  it("returns 0 for empty tags", () => {
    expect(estimateTagAreaHeight([], 200)).toBe(0);
  });

  it("returns 0 for undefined tags", () => {
    expect(estimateTagAreaHeight(undefined, 200)).toBe(0);
  });

  it("fits short tags on a single row", () => {
    const tags = [{ name: "a" }, { name: "b" }];
    expect(estimateTagAreaHeight(tags, 200)).toBeGreaterThan(0);
  });

  it("adds extra rows for tags that overflow", () => {
    const tags = Array.from({ length: 30 }, (_, i) => ({ name: `tag-${i}` }));
    expect(estimateTagAreaHeight(tags, 100)).toBeGreaterThan(18);
  });
});

describe("computeMasonryLayout with tags", () => {
  it("includes tag height in total card height", () => {
    const tags = Array.from({ length: 10 }, (_, i) => ({ name: `tag-${i}` }));
    const withTags = computeMasonryLayout({
      items: [{ width: 100, height: 100, tags }],
      columnWidth: 100,
      columnCount: 1,
      gap: 12,
    });
    const withoutTags = computeMasonryLayout({
      items: [{ width: 100, height: 100 }],
      columnWidth: 100,
      columnCount: 1,
      gap: 12,
    });
    expect(withTags.items[0].height).toBeGreaterThan(withoutTags.items[0].height);
  });
});

describe("appendToLayout", () => {
  it("returns computeMasonryLayout when existing is empty", () => {
    const existing: MasonryLayout = {
      items: [],
      totalHeight: 0,
      columns: 2,
      columnWidth: 200,
      gap: 10,
      columnGap: 10,
    };
    const result = appendToLayout(existing, [makeItem(200, 200)]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].column).toBe(0);
  });

  it("appends new items after existing ones", () => {
    const initial = computeMasonryLayout({
      items: [makeItem(200, 200)],
      columnWidth: 200,
      columnCount: 1,
      gap: 10,
    });
    const result = appendToLayout(initial, [makeItem(200, 400)]);
    expect(result.items).toHaveLength(2);
    expect(result.items[1].index).toBe(1);
    // Second item should be below first with gap
    expect(result.items[1].y).toBe(initial.items[0].y + initial.items[0].height + initial.gap);
  });

  it("preserves existing items", () => {
    const initial = computeMasonryLayout({
      items: [makeItem(200, 200)],
      columnWidth: 200,
      columnCount: 2,
      gap: 10,
    });
    const result = appendToLayout(initial, [makeItem(200, 200)]);
    expect(result.items[0]).toEqual(initial.items[0]);
  });
});

describe("computeWindow", () => {
  function makeLayout(itemCount: number, itemHeight: number): MasonryLayout {
    const items: MasonryItemLayout[] = [];
    for (let i = 0; i < itemCount; i++) {
      items.push({
        index: i,
        x: 0,
        y: i * itemHeight,
        width: 200,
        height: itemHeight,
        column: i % 2,
      });
    }
    return {
      items,
      totalHeight: itemCount * itemHeight,
      columns: 2,
      columnWidth: 200,
      gap: 0,
      columnGap: 10,
    };
  }

  it("returns empty range for empty layout", () => {
    const layout = makeLayout(0, 100);
    expect(computeWindow(layout, 0, 800)).toEqual({ startIndex: 0, endIndex: -1 });
  });

  it("finds visible items at top of viewport", () => {
    const layout = makeLayout(20, 100);
    const win = computeWindow(layout, 0, 800);
    expect(win.startIndex).toBe(0);
    // With overscan=400, visible range is from -400 to 1200
    // Items 0-11 are in range (y < 1200)
    expect(win.endIndex).toBeGreaterThanOrEqual(7);
    expect(win.endIndex).toBeLessThanOrEqual(12);
  });

  it("finds visible items scrolled down", () => {
    const layout = makeLayout(50, 100);
    // Scroll to item 20, so visible items start around 16 (with overscan)
    const win = computeWindow(layout, 2000, 800);
    // minY = 2000 - 400 = 1600 → item 16
    // maxY = 2000 + 800 + 400 = 3200 → item 32
    expect(win.startIndex).toBe(16);
    expect(win.endIndex).toBe(31);
  });

  it("handles scroll beyond total content", () => {
    const layout = makeLayout(10, 100);
    const win = computeWindow(layout, 5000, 800);
    expect(win.startIndex).toBe(10);
    expect(win.endIndex).toBe(9);
  });

  it("uses custom overscan value", () => {
    const layout = makeLayout(30, 100);
    const win = computeWindow(layout, 500, 600, 200);
    // minY = 500 - 200 = 300 → item 3
    expect(win.startIndex).toBe(3);
    // maxY = 500 + 600 + 200 = 1300 → item 13
    expect(win.endIndex).toBe(12);
  });

  it("handles negative scrollTop (overscroll)", () => {
    const layout = makeLayout(10, 100);
    const win = computeWindow(layout, -50, 800);
    expect(win.startIndex).toBe(0);
    expect(win.endIndex).toBeGreaterThanOrEqual(4);
  });
});
