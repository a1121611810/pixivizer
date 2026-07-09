// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createNovelVirtualLayout } from "@/primitives/createNovelVirtualLayout";
import { clearNovelTextLayoutCache } from "@/primitives/novelTextLayoutCache";

const DEFAULT_SETTINGS = {
  fontSize: 16,
  fontWeight: 400,
  fontFamily: "monospace" as const,
  lineHeight: 1.5,
};

describe("createNovelVirtualLayout", () => {
  it("returns zero height and no visible paragraphs for null text", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const [text] = createSignal<string | null>(null);
      const [width] = createSignal(400);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        text,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      expect(virtual.totalHeight()).toBe(0);
      expect(virtual.visibleParagraphs()).toEqual([]);
      dispose();
    }));

  it("returns zero height when container width is not positive", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const [text] = createSignal<string | null>("Hello world");
      const [width] = createSignal(0);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        text,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      expect(virtual.totalHeight()).toBe(0);
      expect(virtual.visibleParagraphs()).toEqual([]);
      dispose();
    }));

  it("computes layout for simple text", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const [text] = createSignal<string | null>("Paragraph one\n\nParagraph two");
      const [width] = createSignal(1000);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        text,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      expect(virtual.totalHeight()).toBeGreaterThan(0);
      expect(virtual.layoutResult().paragraphs.length).toBe(2);
      dispose();
    }));

  it("computes paragraph absolute style", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const [text] = createSignal<string | null>("A\n\nB");
      const [width] = createSignal(1000);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        text,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      const style = virtual.getParagraphStyle(1);
      expect(style.position).toBe("absolute");
      expect(style.top).toMatch(/^\d+(\.\d+)?px$/);
      expect(style.height).toMatch(/^\d+(\.\d+)?px$/);
      dispose();
    }));

  it("scrolls to char index via container ref", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const container = document.createElement("div");
      const scrollToMock = vi.fn();
      container.scrollTo = scrollToMock;

      const [text] = createSignal<string | null>("A\n\nB");
      const [width] = createSignal(1000);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        text,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      virtual.containerRef(container);
      virtual.scrollToCharIndex(1, 0);

      expect(scrollToMock).toHaveBeenCalled();
      dispose();
    }));

  it("reports current char index based on scroll position", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const container = document.createElement("div");
      container.scrollTop = 0;
      Object.defineProperty(container, "clientHeight", { value: 500 });

      const [text] = createSignal<string | null>("A\n\nB");
      const [width] = createSignal(1000);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        text,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      virtual.containerRef(container);
      container.dispatchEvent(new Event("scroll"));

      expect(virtual.currentCharIndex().paragraphIndex).toBe(0);
      expect(virtual.currentCharIndex().charIndex).toBe(0);
      dispose();
    }));

  it("filters empty paragraphs", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const [text] = createSignal<string | null>("A\n\n\n\nB");
      const [width] = createSignal(1000);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        text,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
      });

      expect(virtual.layoutResult().paragraphs.length).toBe(2);
      dispose();
    }));

  it("accounts for container offset when using window scroll", () =>
    createRoot((dispose) => {
      clearNovelTextLayoutCache();
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.marginTop = "100px";
      const container = document.createElement("div");
      wrapper.appendChild(container);
      document.body.appendChild(wrapper);

      const [text] = createSignal<string | null>("A\n\nB\n\nC\n\nD");
      const [width] = createSignal(1000);
      const [novelId] = createSignal(1);
      const virtual = createNovelVirtualLayout({
        text,
        containerWidth: width,
        settings: () => DEFAULT_SETTINGS,
        containerRef: () => {},
        novelId,
        useWindowScroll: true,
      });

      virtual.containerRef(container);

      // Container starts at document offset 100.
      // When window.scrollY is 100, we are at the top of the container,
      // so the first paragraph should still be visible.
      Object.defineProperty(window, "scrollY", {
        value: 100,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 500,
        configurable: true,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));

      expect(virtual.visibleParagraphs()).toContain(0);

      document.body.removeChild(wrapper);
      dispose();
    }));
});
