import type { Accessor } from "solid-js";
import type { PixivNovel } from "@/api/types";
import { isPretextSupported } from "./isPretextSupported";
import { measureTextLines, measureTextWidth } from "./measureText";

export interface FontConfig {
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  lineHeight: number;
}

export interface ComputedTextCardMetrics {
  /** 信息区总高度 px */
  height: number;
  /** 标题区域高度 px */
  titleHeight: number;
  /** 标题实际行数 */
  titleLineCount: number;
  /** 标签区域高度 px */
  tagHeight: number;
  /** 标签实际行数 */
  tagLineCount: number;
}

export interface CreateComputedTextCardOptions {
  novels: Accessor<PixivNovel[]>;
  containerWidth: Accessor<number>;
  /** 标题字体配置 */
  titleFont: () => FontConfig;
  /** 标签字体配置，用于精确计算标签换行 */
  tagFont: () => FontConfig;
  /** 标题最大行数 */
  maxTitleLines: number;
  /** 标签最大行数 */
  maxTagLines: number;
  /** 样式预设：决定各区域固定高度，textList 对应列表卡片，coverWall 对应封面墙卡片 */
  stylePreset?: () => TextCardStylePreset;
}

export type TextCardStylePreset = "textList" | "coverWall" | "list";

interface StyleMetrics {
  paddingTop: number;
  paddingBottom: number;
  titleLineHeight: number;
  tagLineHeight: number;
  // TextList / coverWall 使用
  metaHeight?: number;
  metaMarginTop?: number;
  badgeHeight?: number;
  badgeMarginTop?: number;
  tagMarginTop?: number;
  // List 模式使用
  authorLineHeight?: number;
  statsLineHeight?: number;
  bottomLineHeight?: number;
  sectionGap?: number;
}

export interface ComputedTextCardResult {
  /** 获取指定小说 ID 的信息区 metrics */
  getMetrics: (novelId: number) => ComputedTextCardMetrics | undefined;
  /** 获取指定小说 ID 的信息区高度 */
  getInfoHeight: (novelId: number) => number;
}

// 预设值必须与对应卡片的 CSS 一致，否则虚拟滚动会出现间距不均或重叠。
// TextList 对应 NovelTextListCard；coverWall 对应 NovelCoverCard。
const PRESETS: Record<TextCardStylePreset, StyleMetrics> = {
  textList: {
    // Py-3
    paddingTop: 12,
    paddingBottom: 12,
    // Meta: fontSizeBase200 (12px) * body lineHeightBase300 (1.4286) ≈ 17.14px，取 18
    metaHeight: 18,
    // Mt-1
    metaMarginTop: 4,
    // Fluent-badge 高约 20px
    badgeHeight: 20,
    // Mt-1.5
    badgeMarginTop: 6,
    // Tag: fontSizeBase100 (10px) * lineHeightBase100 (1.4) = 14px + py-0.5 (4px)
    tagLineHeight: 18,
    // Mt-2
    tagMarginTop: 8,
    // Title: fontSizeBase400 (16px) * leading-snug (1.375) = 22px
    titleLineHeight: 22,
  },
  coverWall: {
    // P-2
    paddingTop: 8,
    paddingBottom: 8,
    // Meta/author: fontSizeBase200 (12px) * lineHeightBase200 (1.333) ≈ 16px
    metaHeight: 16,
    // 信息区使用 gap-1
    metaMarginTop: 4,
    // 封面墙的系列 badge
    badgeHeight: 20,
    badgeMarginTop: 4,
    // Tag: fontSizeBase100 (10px) * lineHeightBase100 (1.4) = 14px + py-0.5 (4px)
    tagLineHeight: 18,
    tagMarginTop: 4,
    // Title: fontSizeBase300 (14px) * leading-tight (1.25) ≈ 17.5px，取 18px
    titleLineHeight: 18,
  },
  list: {
    // P-2.5
    paddingTop: 10,
    paddingBottom: 10,
    // Title: fontSizeBase200 (12px) * leading-tight (1.25) = 15px
    titleLineHeight: 15,
    // Author: fontSizeBase100 (10px) * lineHeightBase100 (1.4) = 14px
    authorLineHeight: 14,
    // Stats row: same as author
    statsLineHeight: 14,
    // Tag: fontSizeBase100 (10px) * lineHeightBase100 (1.4) = 14px + py-0.5 (4px)
    tagLineHeight: 18,
    // Bottom row: same as author
    bottomLineHeight: 14,
    // Gap-1 between sections
    sectionGap: 4,
  },
};

function hasBadges(novel: PixivNovel): boolean {
  return (
    novel.x_restrict > 0 ||
    (novel.novel_ai_type != null && novel.novel_ai_type > 1) ||
    !!novel.series?.title
  );
}

function hasTags(novel: PixivNovel): boolean {
  return novel.tags.length > 0;
}

function measureTitle(
  title: string,
  width: number,
  font: FontConfig,
  maxLines: number,
  titleLineHeight: number,
): { height: number; lineCount: number } {
  const measured = measureTextLines({
    text: title,
    fontSize: font.fontSize,
    fontWeight: font.fontWeight,
    fontFamily: font.fontFamily,
    maxWidth: width,
    lineHeight: titleLineHeight,
    maxLines,
  });
  return { height: measured.height, lineCount: measured.lineCount };
}

// 标签容器的水平 gap，对应 CSS `gap-[var(--spacingHorizontalXXS)]`
const TAG_GAP = 2;
// 标签的水平内边距总和，对应 CSS `px-[var(--spacingHorizontalXS)]`
const TAG_HORIZONTAL_PADDING = 8;

function computeTagLines(
  tags: PixivNovel["tags"],
  maxWidth: number,
  font: FontConfig,
  maxLines: number,
  lineHeight: number,
): { lineCount: number; height: number } {
  if (tags.length === 0) {
    return { lineCount: 0, height: 0 };
  }
  if (maxWidth <= 0) {
    return { lineCount: maxLines, height: maxLines * lineHeight };
  }

  let lineCount: number;
  if (isPretextSupported()) {
    let currentLineWidth = 0;
    lineCount = 1;
    for (const tag of tags) {
      const text = tag.translated_name ?? tag.name;
      const tagWidth =
        measureTextWidth(text, font.fontSize, font.fontWeight, font.fontFamily) +
        TAG_HORIZONTAL_PADDING;
      if (currentLineWidth === 0) {
        currentLineWidth = tagWidth;
      } else if (currentLineWidth + TAG_GAP + tagWidth <= maxWidth) {
        currentLineWidth += TAG_GAP + tagWidth;
      } else {
        lineCount++;
        currentLineWidth = tagWidth;
      }
    }
  } else {
    // 降级：按每行平均 3 个标签估算
    lineCount = Math.max(1, Math.ceil(tags.length / 3));
  }

  const clampedLineCount = Math.min(lineCount, maxLines);
  return { lineCount: clampedLineCount, height: clampedLineCount * lineHeight };
}

function computeListCardMetrics(
  novel: PixivNovel,
  width: number,
  style: StyleMetrics,
  titleFont: FontConfig,
  tagFont: FontConfig,
  maxTitleLines: number,
  maxTagLines: number,
): ComputedTextCardMetrics {
  // 可用信息区宽度：卡片内边距 20px + 封面 128px + 两个 gap 24px + 收藏按钮 28px
  const contentWidth = Math.max(0, width - 200);
  const titleLayout = measureTitle(
    novel.title,
    contentWidth,
    titleFont,
    maxTitleLines,
    style.titleLineHeight,
  );
  const tagMetrics = computeTagLines(
    novel.tags,
    contentWidth,
    tagFont,
    maxTagLines,
    style.tagLineHeight,
  );

  const authorHeight = style.authorLineHeight ?? 0;
  const statsHeight = style.statsLineHeight ?? 0;
  const bottomHeight = style.bottomLineHeight ?? 0;
  const sectionGap = style.sectionGap ?? 0;
  // 信息区：title + author + stats + tags + bottom + 4 个 gap
  const infoHeight =
    titleLayout.height +
    authorHeight +
    statsHeight +
    tagMetrics.height +
    bottomHeight +
    sectionGap * 4;

  return {
    height: infoHeight,
    titleHeight: titleLayout.height,
    titleLineCount: titleLayout.lineCount,
    tagHeight: tagMetrics.height,
    tagLineCount: tagMetrics.lineCount,
  };
}

function computeTextListOrCoverWallMetrics(
  novel: PixivNovel,
  width: number,
  style: StyleMetrics,
  titleFont: FontConfig,
  tagFont: FontConfig,
  maxTitleLines: number,
  maxTagLines: number,
): ComputedTextCardMetrics {
  // 可用内容区宽度：卡片内边距 32px + 收藏按钮 40px + 间隙 12px
  const contentWidth = Math.max(0, width - 84);
  const titleLayout = measureTitle(
    novel.title,
    contentWidth,
    titleFont,
    maxTitleLines,
    style.titleLineHeight,
  );
  const tagMetrics = computeTagLines(
    novel.tags,
    contentWidth,
    tagFont,
    maxTagLines,
    style.tagLineHeight,
  );

  const height =
    style.paddingTop +
    titleLayout.height +
    (style.metaMarginTop ?? 0) +
    (style.metaHeight ?? 0) +
    (hasBadges(novel) ? (style.badgeMarginTop ?? 0) + (style.badgeHeight ?? 0) : 0) +
    (hasTags(novel) ? (style.tagMarginTop ?? 0) + tagMetrics.height : 0) +
    style.paddingBottom;

  return {
    height,
    titleHeight: titleLayout.height,
    titleLineCount: titleLayout.lineCount,
    tagHeight: tagMetrics.height,
    tagLineCount: tagMetrics.lineCount,
  };
}

function computeCardMetrics(
  novel: PixivNovel,
  width: number,
  preset: TextCardStylePreset,
  style: StyleMetrics,
  titleFont: FontConfig,
  tagFont: FontConfig,
  maxTitleLines: number,
  maxTagLines: number,
): ComputedTextCardMetrics {
  if (preset === "list") {
    return computeListCardMetrics(
      novel,
      width,
      style,
      titleFont,
      tagFont,
      maxTitleLines,
      maxTagLines,
    );
  }
  return computeTextListOrCoverWallMetrics(
    novel,
    width,
    style,
    titleFont,
    tagFont,
    maxTitleLines,
    maxTagLines,
  );
}

function buildCacheKey(
  novels: PixivNovel[],
  width: number,
  preset: TextCardStylePreset,
  titleFont: FontConfig,
  tagFont: FontConfig,
  maxTitleLines: number,
  maxTagLines: number,
): string {
  return JSON.stringify({
    novelIds: novels.map((n) => n.id),
    width,
    preset,
    titleFont,
    tagFont,
    maxTitleLines,
    maxTagLines,
  });
}

/**
 * 纯计算的小说卡片信息区高度。
 *
 * 基于 pretext 精确测量标题与标签行数，结合样式预设的固定区域高度，
 * 输出 textList / coverWall / list 三种模式下的信息区 metrics。
 */
export function createComputedTextCard(
  options: CreateComputedTextCardOptions,
): ComputedTextCardResult {
  const stylePreset = () => options.stylePreset?.() ?? "textList";

  let cacheKey: string | null = null;
  let cachedMap: Map<number, ComputedTextCardMetrics> | null = null;

  function getMetricsMap(): Map<number, ComputedTextCardMetrics> {
    const novels = options.novels();
    const width = options.containerWidth();
    const preset = stylePreset();
    const style = PRESETS[preset];
    const titleFont = options.titleFont();
    const tagFont = options.tagFont();
    const key = buildCacheKey(
      novels,
      width,
      preset,
      titleFont,
      tagFont,
      options.maxTitleLines,
      options.maxTagLines,
    );

    if (cacheKey === key && cachedMap != null) {
      return cachedMap;
    }

    const map = new Map<number, ComputedTextCardMetrics>();
    if (width > 0) {
      for (const novel of novels) {
        const metrics = computeCardMetrics(
          novel,
          width,
          preset,
          style,
          titleFont,
          tagFont,
          options.maxTitleLines,
          options.maxTagLines,
        );
        map.set(novel.id, metrics);
      }
    }

    cacheKey = key;
    cachedMap = map;
    return map;
  }

  function getMetrics(novelId: number): ComputedTextCardMetrics | undefined {
    return getMetricsMap().get(novelId);
  }

  function getInfoHeight(novelId: number): number {
    return getMetrics(novelId)?.height ?? 0;
  }

  return { getMetrics, getInfoHeight };
}
