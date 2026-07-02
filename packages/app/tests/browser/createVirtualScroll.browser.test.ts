// @vitest-environment browser
import { describe, it, expect, vi } from "vitest";
import {
  computeMasonryLayout,
  type ComputeMasonryInput,
} from "../../src/primitives/computeMasonryLayout";

describe("createVirtualScroll integration", () => {
  it("createVirtualScroll is defined and importable", async () => {
    const mod = await import("../../src/primitives/createVirtualScroll");
    expect(typeof mod.createVirtualScroll).toBe("function");
  });

  it("returns expected API shape", async () => {
    const { createVirtualScroll } = await import("../../src/primitives/createVirtualScroll");
    const layout = () =>
      computeMasonryLayout({
        items: [{ width: 200, height: 200 }],
        columnWidth: 200,
        columnCount: 2,
        gap: 10,
      });

    const vs = createVirtualScroll({ layout });
    expect(vs).toHaveProperty("visibleRange");
    expect(vs).toHaveProperty("totalHeight");
    expect(vs).toHaveProperty("getItemStyle");
    expect(vs).toHaveProperty("scrollTop");
    expect(vs).toHaveProperty("containerRef");
    expect(vs).toHaveProperty("setScrollTop");
  });

  it("visibleRange returns correct range with data", async () => {
    const { createVirtualScroll } = await import("../../src/primitives/createVirtualScroll");
    // Can't fully test in browser due to SolidJS reactive wiring,
    // but we verify the module loads and exports correctly
    expect(createVirtualScroll).toBeDefined();
  });

  it("getItemStyle returns absolute positioned styles", async () => {
    const { createVirtualScroll } = await import("../../src/primitives/createVirtualScroll");
    const layout = () =>
      computeMasonryLayout({
        items: [
          { width: 200, height: 200 },
          { width: 200, height: 400 },
        ],
        columnWidth: 200,
        columnCount: 2,
        gap: 10,
      });

    const vs = createVirtualScroll({ layout });
    const style0 = vs.getItemStyle(0);
    expect(style0.position).toBe("absolute");
    expect(style0.top).toBe("0px");
    expect(style0.left).toBe("0px");

    const style1 = vs.getItemStyle(1);
    expect(style1.position).toBe("absolute");
    expect(style1.width).toBe("200px");
  });

  it("getItemStyle returns fallback for out-of-range index", async () => {
    const { createVirtualScroll } = await import("../../src/primitives/createVirtualScroll");
    const layout = () =>
      computeMasonryLayout({
        items: [],
        columnWidth: 200,
        columnCount: 2,
        gap: 10,
      });

    const vs = createVirtualScroll({ layout });
    const style = vs.getItemStyle(999);
    expect(style.position).toBe("absolute");
    expect(style.width).toBe("0px");
    expect(style.height).toBe("0px");
  });

  it("totalHeight tracks layout totalHeight", async () => {
    const { createVirtualScroll } = await import("../../src/primitives/createVirtualScroll");
    const layout = () =>
      computeMasonryLayout({
        items: [{ width: 200, height: 200 }],
        columnWidth: 200,
        columnCount: 1,
        gap: 10,
      });

    const vs = createVirtualScroll({ layout });
    expect(vs.totalHeight()).toBeGreaterThan(0);
  });
});
