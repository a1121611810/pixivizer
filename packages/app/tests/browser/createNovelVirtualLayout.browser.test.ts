// @vitest-environment browser
import { describe, it, expect } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createNovelVirtualLayout } from "@/primitives/createNovelVirtualLayout";
import { clearNovelTextLayoutCache } from "@/primitives/novelTextLayoutCache";
import { parseNovelBlocks } from "@/utils/novelBlocks";

const DEFAULT_SETTINGS = {
  fontSize: 16,
  fontWeight: 400,
  fontFamily: "monospace" as const,
  lineHeight: 1.5,
};

function textToBlocks(text: string) {
  return parseNovelBlocks(text, null);
}

describe("createNovelVirtualLayout", () => {
  it("returns zero height and no visible blocks for empty blocks", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const [blocks] = createSignal(textToBlocks(""));
      const [imageDimensions] = createSignal<
        Record<string, { width: number; height: number } | null>
      >({});
      const [width] = createSignal(400);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        blocks,
        imageDimensions,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      expect(virtual.totalHeight()).toBe(0);
      expect(virtual.visibleBlocks()).toEqual([]);
      dispose();
    }));

  it("returns zero height when container width is not positive", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const [blocks] = createSignal(textToBlocks("Hello world"));
      const [imageDimensions] = createSignal<
        Record<string, { width: number; height: number } | null>
      >({});
      const [width] = createSignal(0);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        blocks,
        imageDimensions,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      expect(virtual.totalHeight()).toBe(0);
      expect(virtual.visibleBlocks()).toEqual([]);
      dispose();
    }));

  it("computes layout for simple text", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const [blocks] = createSignal(textToBlocks("Paragraph one\n\nParagraph two"));
      const [imageDimensions] = createSignal<
        Record<string, { width: number; height: number } | null>
      >({});
      const [width] = createSignal(1000);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        blocks,
        imageDimensions,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      expect(virtual.totalHeight()).toBeGreaterThan(0);
      expect(virtual.layoutResult().paragraphs.length).toBe(2);
      dispose();
    }));

  it("exposes virtualizer instance", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const [blocks] = createSignal(textToBlocks("Test text"));
      const [imageDimensions] = createSignal<
        Record<string, { width: number; height: number } | null>
      >({});
      const [width] = createSignal(1000);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        blocks,
        imageDimensions,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      expect(virtual.virtualizer).toBeDefined();
      expect(typeof virtual.virtualizer.getVirtualItems).toBe("function");
      expect(typeof virtual.virtualizer.scrollToOffset).toBe("function");
      dispose();
    }));

  it("filters empty paragraphs", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const [blocks] = createSignal(textToBlocks("A\n\n\n\nB"));
      const [imageDimensions] = createSignal<
        Record<string, { width: number; height: number } | null>
      >({});
      const [width] = createSignal(1000);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        blocks,
        imageDimensions,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      expect(virtual.layoutResult().paragraphs.length).toBe(2);
      dispose();
    }));
});
