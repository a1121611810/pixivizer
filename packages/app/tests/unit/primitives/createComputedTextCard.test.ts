// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createComputedTextCard } from "@/primitives/createComputedTextCard";
import { isPretextSupported } from "@/primitives/isPretextSupported";
import type { PixivNovel, PixivTag } from "@/api/types";

vi.mock("@/primitives/isPretextSupported", () => ({
  isPretextSupported: vi.fn(),
}));

function makeNovel(overrides: Partial<PixivNovel> = {}): PixivNovel {
  return {
    id: 1,
    title: "Short title",
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
    ...overrides,
  };
}

const DEFAULT_TITLE_FONT = {
  fontSize: 16,
  fontWeight: 600,
  fontFamily: "monospace" as const,
  lineHeight: 1.5,
};

const DEFAULT_TAG_FONT = {
  fontSize: 10,
  fontWeight: 400,
  fontFamily: "sans-serif" as const,
  lineHeight: 1.4,
};

describe("createComputedTextCard", () => {
  it("returns undefined for unknown novel id", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([]);
      const [width] = createSignal(400);
      const metrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => DEFAULT_TITLE_FONT,
        tagFont: () => DEFAULT_TAG_FONT,
        maxTitleLines: 2,
        maxTagLines: 2,
      });
      expect(metrics.getMetrics(999)).toBeUndefined();
      expect(metrics.getInfoHeight(999)).toBe(0);
      dispose();
    }));

  it("computes info height for a textList card", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([makeNovel()]);
      const [width] = createSignal(400);
      const metrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => DEFAULT_TITLE_FONT,
        tagFont: () => DEFAULT_TAG_FONT,
        maxTitleLines: 2,
        maxTagLines: 2,
      });
      const infoHeight = metrics.getInfoHeight(1);
      expect(infoHeight).toBeGreaterThan(0);
      const m = metrics.getMetrics(1);
      expect(m).toBeDefined();
      expect(m!.titleHeight).toBeGreaterThan(0);
      expect(m!.titleLineCount).toBeGreaterThanOrEqual(1);
      dispose();
    }));

  it("respects maxTitleLines for long titles", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([makeNovel({ title: "a".repeat(200) })]);
      const [width] = createSignal(200);
      const metrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => DEFAULT_TITLE_FONT,
        tagFont: () => DEFAULT_TAG_FONT,
        maxTitleLines: 2,
        maxTagLines: 2,
      });
      const m = metrics.getMetrics(1)!;
      expect(m.titleLineCount).toBeLessThanOrEqual(2);
      dispose();
    }));

  it("adds tag height when tags are present", () =>
    createRoot((dispose) => {
      const tags: PixivTag[] = [
        { name: "tag1", translated_name: "标签1" },
        { name: "tag2", translated_name: "标签2" },
        { name: "tag3", translated_name: "标签3" },
      ];
      const [novels] = createSignal<PixivNovel[]>([
        makeNovel({ tags }),
        makeNovel({ id: 2, tags: [] }),
      ]);
      const [width] = createSignal(400);
      const metrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => DEFAULT_TITLE_FONT,
        tagFont: () => DEFAULT_TAG_FONT,
        maxTitleLines: 2,
        maxTagLines: 2,
      });
      expect(metrics.getInfoHeight(1)).toBeGreaterThan(metrics.getInfoHeight(2));
      const withTags = metrics.getMetrics(1)!;
      const withoutTags = metrics.getMetrics(2)!;
      expect(withTags.tagLineCount).toBe(1);
      expect(withTags.tagHeight).toBe(18);
      expect(withoutTags.tagLineCount).toBe(0);
      expect(withoutTags.tagHeight).toBe(0);
      dispose();
    }));

  it("uses coverWall preset with smaller heights", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([makeNovel()]);
      const [width] = createSignal(400);
      const textListMetrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => DEFAULT_TITLE_FONT,
        tagFont: () => DEFAULT_TAG_FONT,
        maxTitleLines: 2,
        maxTagLines: 2,
        stylePreset: () => "textList",
      });
      const coverWallMetrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => DEFAULT_TITLE_FONT,
        tagFont: () => DEFAULT_TAG_FONT,
        maxTitleLines: 2,
        maxTagLines: 2,
        stylePreset: () => "coverWall",
      });
      expect(coverWallMetrics.getInfoHeight(1)).toBeLessThan(textListMetrics.getInfoHeight(1));
      dispose();
    }));

  it("recomputes when width changes", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([makeNovel({ title: "a".repeat(90) })]);
      const [width, setWidth] = createSignal(200);
      const metrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => DEFAULT_TITLE_FONT,
        tagFont: () => DEFAULT_TAG_FONT,
        maxTitleLines: 2,
        maxTagLines: 2,
      });
      const narrowHeight = metrics.getInfoHeight(1);
      setWidth(1000);
      const wideHeight = metrics.getInfoHeight(1);
      expect(wideHeight).not.toBe(narrowHeight);
      dispose();
    }));

  it("textList height matches NovelTextListCard CSS without badges/tags", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([makeNovel({ title: "A" })]);
      const [width] = createSignal(400);
      const metrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => DEFAULT_TITLE_FONT,
        tagFont: () => DEFAULT_TAG_FONT,
        maxTitleLines: 2,
        maxTagLines: 2,
      });
      const m = metrics.getMetrics(1)!;
      // NovelTextListCard CSS:
      // py-3 = 12px vertical padding each side
      // title: fontSizeBase400 (16px) * leading-snug (1.375) = 22px per line
      // meta: fontSizeBase200 (12px) * body lineHeight (1.4286) ≈ 17.14px + mt-1 (4px) ≈ 22px
      expect(m.titleHeight).toBe(22);
      expect(m.titleLineCount).toBe(1);
      expect(m.height).toBe(12 + 22 + 22 + 12);
      dispose();
    }));

  it("textList height includes badge and tag section margins", () =>
    createRoot((dispose) => {
      const tags: PixivTag[] = [{ name: "tag1", translated_name: "标签1" }];
      const [novels] = createSignal<PixivNovel[]>([makeNovel({ title: "A", x_restrict: 1, tags })]);
      const [width] = createSignal(400);
      const metrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => DEFAULT_TITLE_FONT,
        tagFont: () => DEFAULT_TAG_FONT,
        maxTitleLines: 2,
        maxTagLines: 2,
      });
      const m = metrics.getMetrics(1)!;
      // padding 24 + title 22 + meta section 22 + badge section (mt-1.5 6 + badge 20)
      // + tag section (mt-2 8 + actual tag lines 1 * tagLineHeight 18)
      expect(m.tagLineCount).toBe(1);
      expect(m.height).toBe(24 + 22 + 22 + 26 + 26);
      dispose();
    }));

  it("wraps long tags into multiple lines based on available width", () =>
    createRoot((dispose) => {
      vi.mocked(isPretextSupported).mockReturnValue(true);
      const tags: PixivTag[] = [
        { name: "a".repeat(20), translated_name: "A".repeat(20) },
        { name: "b".repeat(20), translated_name: "B".repeat(20) },
        { name: "c".repeat(20), translated_name: "C".repeat(20) },
      ];
      const [novels] = createSignal<PixivNovel[]>([makeNovel({ tags })]);
      const [width] = createSignal(200);
      const metrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => DEFAULT_TITLE_FONT,
        tagFont: () => DEFAULT_TAG_FONT,
        maxTitleLines: 2,
        maxTagLines: 2,
      });
      const m = metrics.getMetrics(1)!;
      expect(m.tagLineCount).toBe(2);
      expect(m.tagHeight).toBe(36);
      dispose();
    }));

  it("falls back to tag count estimate when pretext is unsupported", () =>
    createRoot((dispose) => {
      vi.mocked(isPretextSupported).mockReturnValue(false);
      const tags: PixivTag[] = [
        { name: "tag1", translated_name: "标签1" },
        { name: "tag2", translated_name: "标签2" },
        { name: "tag3", translated_name: "标签3" },
        { name: "tag4", translated_name: "标签4" },
      ];
      const [novels] = createSignal<PixivNovel[]>([makeNovel({ tags })]);
      const [width] = createSignal(400);
      const metrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => DEFAULT_TITLE_FONT,
        tagFont: () => DEFAULT_TAG_FONT,
        maxTitleLines: 2,
        maxTagLines: 2,
      });
      const m = metrics.getMetrics(1)!;
      // ceil(4 / 3) = 2, clamped by maxTagLines
      expect(m.tagLineCount).toBe(2);
      expect(m.tagHeight).toBe(36);
      dispose();
    }));

  it("list preset computes minimal info height for short content", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([makeNovel({ title: "A" })]);
      const [width] = createSignal(400);
      const metrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => ({
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "monospace",
          lineHeight: 1.25,
        }),
        tagFont: () => ({
          fontSize: 10,
          fontWeight: 400,
          fontFamily: "sans-serif",
          lineHeight: 1.4,
        }),
        maxTitleLines: 3,
        maxTagLines: 3,
        stylePreset: () => "list",
      });
      const m = metrics.getMetrics(1)!;
      // title 15 + author 14 + stats 14 + bottom 14 + 4 gaps * 4 = 73
      expect(m.titleLineCount).toBe(1);
      expect(m.tagLineCount).toBe(0);
      expect(m.height).toBe(73);
      dispose();
    }));

  it("list preset clamps title and tags to max lines for long content", () =>
    createRoot((dispose) => {
      vi.mocked(isPretextSupported).mockReturnValue(true);
      const tags: PixivTag[] = [
        { name: "a".repeat(30), translated_name: "A".repeat(30) },
        { name: "b".repeat(30), translated_name: "B".repeat(30) },
        { name: "c".repeat(30), translated_name: "C".repeat(30) },
        { name: "d".repeat(30), translated_name: "D".repeat(30) },
      ];
      const [novels] = createSignal<PixivNovel[]>([makeNovel({ title: "a".repeat(200), tags })]);
      const [width] = createSignal(400);
      const metrics = createComputedTextCard({
        novels,
        containerWidth: width,
        titleFont: () => ({
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "monospace",
          lineHeight: 1.25,
        }),
        tagFont: () => ({
          fontSize: 10,
          fontWeight: 400,
          fontFamily: "sans-serif",
          lineHeight: 1.4,
        }),
        maxTitleLines: 3,
        maxTagLines: 3,
        stylePreset: () => "list",
      });
      const m = metrics.getMetrics(1)!;
      expect(m.titleLineCount).toBe(3);
      expect(m.tagLineCount).toBe(3);
      // title 45 + author 14 + stats 14 + tags 54 + bottom 14 + 4 gaps * 4 = 157
      expect(m.height).toBe(157);
      dispose();
    }));
});
