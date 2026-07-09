// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createNovelTextLayout, NovelTextLayoutError } from "@/primitives/createNovelTextLayout";

const DEFAULT_INPUT = {
  paragraphs: ["Hello world", "Second paragraph"],
  containerWidth: 400,
  fontSize: 16,
  fontWeight: 400,
  fontFamily: "monospace",
  lineHeight: 1.5,
  paragraphSpacing: 10,
  textIndent: 0,
} as const;

describe("createNovelTextLayout", () => {
  it("throws when containerWidth is not positive", () => {
    expect(() => createNovelTextLayout({ ...DEFAULT_INPUT, containerWidth: 0 })).toThrow(
      NovelTextLayoutError,
    );
    expect(() => createNovelTextLayout({ ...DEFAULT_INPUT, containerWidth: -1 })).toThrow(
      NovelTextLayoutError,
    );
  });

  it("throws when fontSize is out of range", () => {
    expect(() => createNovelTextLayout({ ...DEFAULT_INPUT, fontSize: 11 })).toThrow(
      NovelTextLayoutError,
    );
    expect(() => createNovelTextLayout({ ...DEFAULT_INPUT, fontSize: 29 })).toThrow(
      NovelTextLayoutError,
    );
  });

  it("throws when fontFamily is not allowed", () => {
    expect(() => createNovelTextLayout({ ...DEFAULT_INPUT, fontFamily: "Comic Sans" })).toThrow(
      NovelTextLayoutError,
    );
  });

  it("returns empty layout for empty paragraphs", () => {
    const result = createNovelTextLayout({ ...DEFAULT_INPUT, paragraphs: [] });
    expect(result.paragraphs).toHaveLength(0);
    expect(result.totalHeight).toBe(0);
    expect(result.lineHeightPx).toBe(24);
  });

  it("computes total height for a single-line paragraph", () => {
    const result = createNovelTextLayout({
      ...DEFAULT_INPUT,
      paragraphs: ["Hi"],
    });
    expect(result.paragraphs).toHaveLength(1);
    expect(result.paragraphs[0].lineCount).toBe(1);
    expect(result.paragraphs[0].height).toBe(24);
    expect(result.totalHeight).toBe(24);
  });

  it("computes line ranges for a wrapped paragraph", () => {
    // 26 lowercase latin chars at 16px monospace are wider than 200px
    const result = createNovelTextLayout({
      ...DEFAULT_INPUT,
      paragraphs: ["abcdefghijklmnopqrstuvwxyz"],
      containerWidth: 200,
    });
    expect(result.paragraphs[0].lineCount).toBeGreaterThanOrEqual(2);
    expect(result.paragraphs[0].lineRanges.length).toBe(result.paragraphs[0].lineCount);
    const firstRange = result.paragraphs[0].lineRanges[0];
    expect(firstRange.start).toBe(0);
    expect(firstRange.end).toBeGreaterThan(0);
    expect(firstRange.width).toBeLessThanOrEqual(200);
  });

  it("respects textIndent for the first line", () => {
    const withoutIndent = createNovelTextLayout({
      ...DEFAULT_INPUT,
      paragraphs: ["abcdefghijklmnopqrstuvwxyz"],
      containerWidth: 200,
      textIndent: 0,
    });
    const withIndent = createNovelTextLayout({
      ...DEFAULT_INPUT,
      paragraphs: ["abcdefghijklmnopqrstuvwxyz"],
      containerWidth: 200,
      textIndent: 32,
    });
    // Indent reduces available first-line width, usually producing more lines
    expect(withIndent.paragraphs[0].lineCount).toBeGreaterThanOrEqual(
      withoutIndent.paragraphs[0].lineCount,
    );
  });

  it("stacks paragraphs with paragraphSpacing", () => {
    const result = createNovelTextLayout({
      ...DEFAULT_INPUT,
      paragraphs: ["A", "B"],
      containerWidth: 1000,
    });
    expect(result.paragraphs[0].offset).toBe(0);
    expect(result.paragraphs[1].offset).toBe(
      result.paragraphs[0].height + DEFAULT_INPUT.paragraphSpacing,
    );
  });

  it("maps paragraph char index to pixel offset", () => {
    const result = createNovelTextLayout({
      ...DEFAULT_INPUT,
      paragraphs: ["AB"],
      containerWidth: 1000,
    });
    expect(result.getOffsetByCharIndex(0, 0)).toBe(0);
    expect(result.getOffsetByCharIndex(0, 2)).toBe(result.paragraphs[0].height);
  });

  it("maps pixel offset to nearest char index", () => {
    const result = createNovelTextLayout({
      ...DEFAULT_INPUT,
      paragraphs: ["AB"],
      containerWidth: 1000,
    });
    expect(result.getCharIndexByOffset(0)).toEqual({
      paragraphIndex: 0,
      charIndex: 0,
    });
    expect(result.getCharIndexByOffset(100)).toEqual({
      paragraphIndex: 0,
      charIndex: 2,
    });
  });

  it("reports lineHeightPx as fontSize * lineHeight", () => {
    const result = createNovelTextLayout({
      ...DEFAULT_INPUT,
      fontSize: 20,
      lineHeight: 2,
    });
    expect(result.lineHeightPx).toBe(40);
  });
});
