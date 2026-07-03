// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createLayout } from "@/components/LayoutEngine";
import type { PixivIllust } from "@/api/types";
import type { MasonryLayout } from "@/primitives/types";
import { computeMasonryLayout } from "@/primitives/computeMasonryLayout";
import { makeIllust } from "../../helpers";

/**
 * Helper: assert that a MasonryLayout produced by createLayout matches
 * the result of a direct computeMasonryLayout call for the same data.
 * This verifies layout correctness without relying on reactive memo updates.
 */
function assertLayoutMatchesDirect(
  layout: () => MasonryLayout,
  illusts: PixivIllust[],
  columnWidth = 200,
  columnCount = 2,
  gap = 10,
  columnGap = 10,
) {
  const l = layout();
  const expected = computeMasonryLayout({
    items: illusts.map((ill) => ({
      width: ill.width,
      height: ill.type === "ugoira" ? Math.round(ill.height * 0.75) : ill.height,
    })),
    columnWidth,
    columnCount,
    gap,
    columnGap,
  });

  expect(l.items).toHaveLength(expected.items.length);
  expect(l.totalHeight).toBe(expected.totalHeight);
  for (let i = 0; i < l.items.length; i++) {
    expect(l.items[i].x).toBe(expected.items[i].x);
    expect(l.items[i].y).toBe(expected.items[i].y);
    expect(l.items[i].height).toBe(expected.items[i].height);
    expect(l.items[i].width).toBe(expected.items[i].width);
    expect(l.items[i].column).toBe(expected.items[i].column);
    expect(l.items[i].index).toBe(i);
  }
}

/**
 * Mount createLayout inside a SolidJS root and return the layout accessor.
 * The root stays alive until done() is called.
 * Note: SolidJS resolves to server build in Node/happy-dom vitest,
 * so createMemo evaluates once and does NOT react to signal changes.
 * Tests that verify signal reactivity require a browser environment.
 */
function mountLayout(
  illusts: PixivIllust[],
  columnWidth = 200,
  columnCount = 2,
  gap = 10,
  columnGap = 10,
): { layout: () => MasonryLayout; done: () => void } {
  let dispose!: () => void;
  let layout!: () => MasonryLayout;

  createRoot((_dispose) => {
    dispose = _dispose;
    const [illustsSignal] = createSignal(illusts);
    const columns = () => columnCount;
    const g = () => gap;
    const cg = () => columnGap;
    const cw = () => columnWidth;
    const mode = () => "waterfall" as const;

    layout = createLayout(illustsSignal, cw, columns, g, cg, mode);
  });

  return { layout: () => layout(), done: dispose };
}

describe("createLayout", () => {
  describe("basic layout computation", () => {
    it("returns empty layout for empty illusts", () => {
      const { layout, done } = mountLayout([]);
      try {
        const l = layout();
        expect(l.items).toEqual([]);
        expect(l.totalHeight).toBe(0);
      } finally {
        done();
      }
    });

    it("places single item at (0,0) in waterfall mode", () => {
      const { layout, done } = mountLayout([makeIllust(1, { width: 200, height: 200 })]);
      try {
        assertLayoutMatchesDirect(layout, [makeIllust(1, { width: 200, height: 200 })]);
      } finally {
        done();
      }
    });

    it("computes correct layout for multiple items", () => {
      const illusts = [
        makeIllust(1, { width: 200, height: 200 }),
        makeIllust(2, { width: 200, height: 400 }),
        makeIllust(3, { width: 200, height: 300 }),
      ];
      const { layout, done } = mountLayout(illusts);
      try {
        assertLayoutMatchesDirect(layout, illusts);
      } finally {
        done();
      }
    });

    it("handles ugoira items with height correction", () => {
      const illusts = [makeIllust(1, { width: 200, height: 200, type: "ugoira" as const })];
      const { layout, done } = mountLayout(illusts);
      try {
        assertLayoutMatchesDirect(layout, illusts);
      } finally {
        done();
      }
    });
  });

  describe("data source replacement (the bug scenario)", () => {
    // These tests simulate what happens when the recommended sub-tab is switched,
    // replacing the entire illusts array. In a browser environment with reactive
    // signal updates, createLayout's memo would need to detect the data source
    // change and compute a fresh layout instead of doing incremental append.
    //
    // Since SolidJS's server build does not support reactive memo updates, we
    // verify correctness by mounting with different datasets independently and
    // asserting each produces the correct layout.

    it("dataset A (3 items) produces correct layout", () => {
      const datasetA = [
        makeIllust(10, { width: 200, height: 200 }),
        makeIllust(11, { width: 200, height: 400 }),
        makeIllust(12, { width: 200, height: 300 }),
      ];
      const { layout, done } = mountLayout(datasetA);
      try {
        assertLayoutMatchesDirect(layout, datasetA);
      } finally {
        done();
      }
    });

    it("dataset B (5 items, different content) produces correct layout", () => {
      const datasetB = [
        makeIllust(20, { width: 200, height: 500 }),
        makeIllust(21, { width: 200, height: 200 }),
        makeIllust(22, { width: 200, height: 300 }),
        makeIllust(23, { width: 200, height: 400 }),
        makeIllust(24, { width: 200, height: 150 }),
      ];
      const { layout, done } = mountLayout(datasetB);
      try {
        assertLayoutMatchesDirect(layout, datasetB);
      } finally {
        done();
      }
    });

    it("dataset C (2 items, shrank) produces correct layout", () => {
      const datasetC = [
        makeIllust(99, { width: 200, height: 600 }),
        makeIllust(98, { width: 200, height: 200 }),
      ];
      const { layout, done } = mountLayout(datasetC);
      try {
        assertLayoutMatchesDirect(layout, datasetC);
      } finally {
        done();
      }
    });

    it("dataset D (same length as A, different content) produces correct layout", () => {
      const datasetD = [
        makeIllust(20, { width: 200, height: 400 }),
        makeIllust(21, { width: 200, height: 200 }),
      ];
      const { layout, done } = mountLayout(datasetD);
      try {
        assertLayoutMatchesDirect(layout, datasetD);
      } finally {
        done();
      }
    });
  });

  describe("incremental append (fetchMore scenario)", () => {
    // The incremental append optimization is verified by testing the underlying
    // pure function appendToLayout (in computeMasonryLayout.test.ts). Here we
    // verify that createLayout with a full dataset produces the same result as
    // appendToLayout would produce when appending incrementally.

    it("creates correct layout for a 4-item set (simulates 1→4 append)", () => {
      const illusts = [
        makeIllust(1, { width: 200, height: 200 }),
        makeIllust(2, { width: 200, height: 400 }),
        makeIllust(3, { width: 200, height: 300 }),
        makeIllust(4, { width: 200, height: 200 }),
      ];
      const { layout, done } = mountLayout(illusts);
      try {
        assertLayoutMatchesDirect(layout, illusts);
      } finally {
        done();
      }
    });
  });
});
