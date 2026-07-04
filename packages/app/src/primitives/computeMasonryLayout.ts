import type { MasonryItemLayout, MasonryLayout, ScrollWindow } from "./types";

export interface TagHeightEstimateOptions {
  /** Width of a single character in pixels for small tag text (fontSizeBase100 ~10px) */
  charWidth: number;
  /** Horizontal gap between tags in pixels */
  tagGap: number;
  /** Horizontal padding inside a tag pill in pixels */
  tagPaddingX: number;
  /** Line height of one tag row in pixels */
  lineHeight: number;
  /** Vertical gap between tag rows */
  rowGap: number;
}

const defaultTagOptions: TagHeightEstimateOptions = {
  charWidth: 6, // small font ~10px, conservative CJK width estimate
  tagGap: 4, // matches spacingHorizontalXXS
  tagPaddingX: 8, // matches spacingHorizontalXS * 2
  lineHeight: 18, // lineHeightBase100 * 10px ≈ 14px + vertical padding
  rowGap: 4, // matches spacingVerticalXXS
};

/**
 * Estimate the height of the tag area for a single card.
 * Tags are laid out as rounded pills that wrap within the card width.
 * The estimate is intentionally conservative to avoid underestimating height.
 */
export function estimateTagAreaHeight(
  tags: ReadonlyArray<{ name: string; translated_name?: string }> | undefined,
  columnWidth: number,
  options: Partial<TagHeightEstimateOptions> = {},
): number {
  if (!tags || tags.length === 0 || columnWidth <= 0) return 0;

  const opts = { ...defaultTagOptions, ...options };
  const availableWidth = Math.max(0, columnWidth - 16); // subtract card horizontal padding (UnoCSS p-2.5 = 0.625rem ≈ 10px each side, rounded to 16px total)

  let currentRowWidth = 0;
  let rows = 1;

  for (const tag of tags) {
    const text = tag.translated_name ?? tag.name;
    const textWidth = text.length * opts.charWidth;
    const tagWidth = textWidth + opts.tagPaddingX * 2;

    if (currentRowWidth + tagWidth > availableWidth && currentRowWidth > 0) {
      rows++;
      currentRowWidth = tagWidth;
    } else {
      currentRowWidth += tagWidth + opts.tagGap;
    }
  }

  return rows * opts.lineHeight + (rows - 1) * opts.rowGap;
}

export interface ComputeMasonryInput {
  items: ReadonlyArray<{
    width: number;
    height: number;
    tags?: { name: string; translated_name?: string }[];
  }>;
  columnWidth: number;
  columnCount: number;
  gap: number; // vertical gap between items
  columnGap?: number; // horizontal gap between columns (defaults to gap)
}

/**
 * Shortest-column placement for waterfall layout.
 * Input `items` each have width/height to derive aspect ratio.
 * Returns full MasonryLayout.
 */
/** Height of the info section below each image card (title + user name + follow button + padding) */
export const CARD_INFO_HEIGHT = 80;

export function computeMasonryLayout(input: ComputeMasonryInput): MasonryLayout {
  const { items, columnWidth, columnCount, gap, columnGap } = input;
  const hGap = columnGap ?? gap;
  const nextY = Array.from<number>({ length: columnCount }).fill(0);
  const result: MasonryItemLayout[] = Array.from({ length: items.length });

  for (let i = 0; i < items.length; i++) {
    const { width, height } = items[i];

    // Find shortest column
    let minCol = 0;
    for (let c = 1; c < columnCount; c++) {
      if (nextY[c] < nextY[minCol]) minCol = c;
    }

    const aspectRatio = width > 0 && height > 0 ? width / height : 1;
    const tagHeight = estimateTagAreaHeight(items[i].tags, columnWidth);
    const cardHeight = columnWidth / aspectRatio + CARD_INFO_HEIGHT + tagHeight;

    result[i] = {
      index: i,
      x: minCol * (columnWidth + hGap),
      y: nextY[minCol],
      width: columnWidth,
      height: cardHeight,
      column: minCol,
    };

    nextY[minCol] += cardHeight + gap;
  }

  return {
    items: result,
    totalHeight: Math.max(...nextY),
    columns: columnCount,
    columnWidth,
    gap,
    columnGap: hGap,
  };
}

/**
 * Incremental append: recover column tails from existing layout,
 * then continue shortest-column placement for new items.
 */
export function appendToLayout(
  existing: MasonryLayout,
  newItems: ReadonlyArray<{
    width: number;
    height: number;
    tags?: { name: string; translated_name?: string }[];
  }>,
): MasonryLayout {
  if (existing.items.length === 0) {
    return computeMasonryLayout({
      items: newItems,
      columnWidth: existing.columnWidth,
      columnCount: existing.columns,
      gap: existing.gap,
      columnGap: existing.columnGap,
    });
  }

  const colCount = existing.columns;
  const hGap = existing.columnGap ?? existing.gap;
  const nextY = Array.from<number>({ length: colCount }).fill(0);

  // Recover column tails from last item per column
  for (const item of existing.items) {
    const bottom = item.y + item.height + existing.gap;
    if (bottom > nextY[item.column]) {
      nextY[item.column] = bottom;
    }
  }

  const appended: MasonryItemLayout[] = [];
  const startIndex = existing.items.length;

  for (let i = 0; i < newItems.length; i++) {
    const { width, height } = newItems[i];

    let minCol = 0;
    for (let c = 1; c < colCount; c++) {
      if (nextY[c] < nextY[minCol]) minCol = c;
    }

    const aspectRatio = width > 0 && height > 0 ? width / height : 1;
    const tagHeight = estimateTagAreaHeight(newItems[i].tags, existing.columnWidth);
    const cardHeight = existing.columnWidth / aspectRatio + CARD_INFO_HEIGHT + tagHeight;
    const idx = startIndex + i;

    appended.push({
      index: idx,
      x: minCol * (existing.columnWidth + hGap),
      y: nextY[minCol],
      width: existing.columnWidth,
      height: cardHeight,
      column: minCol,
    });

    nextY[minCol] += cardHeight + existing.gap;
  }

  return {
    items: [...existing.items, ...appended],
    totalHeight: Math.max(existing.totalHeight, ...nextY),
    columns: existing.columns,
    columnWidth: existing.columnWidth,
    gap: existing.gap,
    columnGap: hGap,
  };
}

/**
 * Binary search: find the range of visible items within
 * [scrollTop - overscan, scrollTop + viewportHeight + overscan].
 */
export function computeWindow(
  layout: MasonryLayout,
  scrollTop: number,
  viewportHeight: number,
  overscan: number = 400,
): ScrollWindow {
  if (layout.items.length === 0) return { startIndex: 0, endIndex: -1 };

  const minY = scrollTop - overscan;
  const maxY = scrollTop + viewportHeight + overscan;

  // Binary search for first item with y + height > minY
  let lo = 0;
  let hi = layout.items.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (layout.items[mid].y + layout.items[mid].height > minY) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  const startIndex = lo;

  // Linear scan forward for end
  let endIndex = startIndex;
  while (endIndex < layout.items.length && layout.items[endIndex].y < maxY) {
    endIndex++;
  }

  return { startIndex, endIndex: endIndex - 1 };
}
