import { createSignal, createEffect, createMemo, onCleanup, type Accessor } from "solid-js";
import type { ReaderSettings } from "@/stores/readerSettingsStore";
import type { NovelBlock, TextBlock } from "@/utils/novelBlocks";
import type { NovelImageDimensions } from "@/utils/novelImageDimensions";
import {
  createNovelTextLayout,
  type NovelTextLayoutResult,
  type ParagraphLayout,
} from "./createNovelTextLayout";
import { getNovelTextLayoutCache } from "./novelTextLayoutCache";
import { isPretextSupported } from "./isPretextSupported";

export interface CreateNovelVirtualLayoutOptions {
  /** 小说正文块序列（文本 / 图片 / 分页） */
  blocks: Accessor<NovelBlock[]>;
  /** 容器宽度 px */
  containerWidth: Accessor<number>;
  /** 阅读设置 */
  settings: Accessor<ReaderSettings>;
  /** 内嵌图片尺寸映射；id → {width, height}，null 表示加载失败 */
  imageDimensions: Accessor<NovelImageDimensions>;
  /** 容器 ref 回调函数（由外部通过返回值设置） */
  containerRef: (el: HTMLElement) => void;
  /** 上下缓冲区段落数，默认 5 */
  overscan?: number;
  /** 小说 ID，用于缓存 */
  novelId: Accessor<number>;
  /** 是否使用 window 滚动；默认 false（容器滚动） */
  useWindowScroll?: boolean;
}

export interface NovelVirtualLayoutResult {
  /** 全文总高度 px */
  totalHeight: Accessor<number>;
  /** 当前可见块索引数组 */
  visibleBlocks: Accessor<number[]>;
  /** 获取块绝对定位样式 */
  getBlockStyle(index: number): {
    position: "absolute";
    top: string;
    left: string;
    width: string;
    height: string;
  };
  /** 按字符索引滚动 */
  scrollToCharIndex(paragraphIndex: number, charIndex: number): void;
  /** 当前视口顶部对应的字符索引 */
  currentCharIndex: Accessor<{ paragraphIndex: number; charIndex: number }>;
  /** 底层文本布局结果，用于阅读进度等外部计算 */
  layoutResult: Accessor<NovelTextLayoutResult>;
  /** 容器 ref 设置函数，由 NovelDetail 在 ref 回调中调用 */
  containerRef: (el: HTMLElement) => void;
}

const DEFAULT_OVERSCAN = 5;
const IMAGE_FALLBACK_HEIGHT = 160;
const PAGEBREAK_HEIGHT_RATIO = 3;

interface BlockLayout {
  index: number;
  offset: number;
  height: number;
  block: NovelBlock;
  textParagraph?: ParagraphLayout;
}

function findFirstVisibleBlock(blocks: BlockLayout[], minY: number): number {
  let left = 0;
  let right = blocks.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const block = blocks[mid];
    if (block.offset + block.height > minY) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  return left;
}

function buildFallbackLayout(
  paragraphs: string[],
  settings: ReaderSettings,
  paragraphSpacing: number,
): NovelTextLayoutResult {
  const lineHeightPx = settings.fontSize * settings.lineHeight;
  const charsPerLine = Math.max(1, Math.floor(settings.fontSize * 20));
  const paragraphLayouts: ParagraphLayout[] = [];
  let offset = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i];
    const lineCount = Math.max(1, Math.ceil(text.length / charsPerLine));
    const height = lineCount * lineHeightPx;
    paragraphLayouts.push({
      index: i,
      offset,
      height,
      lineCount,
      lineRanges: [{ start: 0, end: text.length, width: 0 }],
    });
    offset += height + paragraphSpacing;
  }

  const totalHeight = paragraphs.length > 0 ? offset - paragraphSpacing : 0;

  return {
    paragraphs: paragraphLayouts,
    totalHeight,
    lineHeightPx,
    getOffsetByCharIndex: (paragraphIndex) => {
      const paragraph = paragraphLayouts[paragraphIndex];
      return paragraph ? paragraph.offset : 0;
    },
    getCharIndexByOffset: (targetOffset) => {
      for (let i = paragraphLayouts.length - 1; i >= 0; i--) {
        const paragraph = paragraphLayouts[i];
        if (targetOffset >= paragraph.offset) {
          return { paragraphIndex: i, charIndex: 0 };
        }
      }
      return { paragraphIndex: 0, charIndex: 0 };
    },
  };
}

/**
 * 小说正文虚拟化窗口管理。
 *
 * 基于 `createNovelTextLayout` 的文本布局结果，把图片块、分页标记与文本段落
 * 统一编排为绝对定位的块序列，只渲染视口内 + 缓冲区的块。
 */
export function createNovelVirtualLayout(
  options: CreateNovelVirtualLayoutOptions,
): NovelVirtualLayoutResult {
  const overscan = () => options.overscan ?? DEFAULT_OVERSCAN;
  const useWindowScroll = () => options.useWindowScroll ?? false;

  const [containerEl, setContainerEl] = createSignal<HTMLElement | undefined>();
  const [scrollTop, setScrollTop] = createSignal(0);
  const [viewportHeight, setViewportHeight] = createSignal(0);

  const paragraphSpacing = createMemo(() => {
    const settings = options.settings();
    return Math.max(settings.fontSize * 0.5, 8);
  });

  /** 纯文本段落的布局结果 */
  const textLayoutResult = createMemo<NovelTextLayoutResult>(() => {
    const blocks = options.blocks();
    const width = options.containerWidth();
    const settings = options.settings();
    const id = options.novelId();
    const spacing = paragraphSpacing();

    const textBlocks = blocks.filter((b): b is TextBlock => b.type === "text");
    const paragraphs = textBlocks.map((b) => b.text);

    if (width <= 0) {
      return {
        paragraphs: [],
        totalHeight: 0,
        lineHeightPx: settings.fontSize * settings.lineHeight,
        getOffsetByCharIndex: () => 0,
        getCharIndexByOffset: () => ({ paragraphIndex: 0, charIndex: 0 }),
      };
    }

    if (!isPretextSupported()) {
      return buildFallbackLayout(paragraphs, settings, spacing);
    }

    const cache = getNovelTextLayoutCache();
    const cached = cache.get(id, width, settings);
    if (cached) return cached;

    const result = createNovelTextLayout({
      paragraphs,
      containerWidth: width,
      fontSize: settings.fontSize,
      fontWeight: settings.fontWeight,
      fontFamily: settings.fontFamily,
      lineHeight: settings.lineHeight,
      paragraphSpacing: spacing,
      textIndent: settings.fontSize * 2,
    });

    cache.set(id, width, settings, result);
    return result;
  });

  const lineHeightPx = createMemo(() => textLayoutResult().lineHeightPx);

  /** 混合块（文本 / 图片 / 分页）的统一布局 */
  const blockLayouts = createMemo<BlockLayout[]>(() => {
    const blocks = options.blocks();
    const width = options.containerWidth();
    const dimensions = options.imageDimensions();
    const spacing = paragraphSpacing();
    const textLayout = textLayoutResult();

    if (width <= 0) return [];

    let offset = 0;
    let textIndex = 0;
    const layouts: BlockLayout[] = [];

    for (const block of blocks) {
      let height = 0;
      let textParagraph: ParagraphLayout | undefined;

      if (block.type === "text") {
        textParagraph = textLayout.paragraphs[textIndex++];
        height = textParagraph?.height ?? 0;
      } else if (block.type === "image") {
        const dim = dimensions[block.imageId];
        if (dim && dim.width > 0 && dim.height > 0) {
          height = (width * dim.height) / dim.width;
        } else {
          height = IMAGE_FALLBACK_HEIGHT;
        }
      } else {
        // pageBreak
        height = spacing * PAGEBREAK_HEIGHT_RATIO;
      }

      layouts.push({
        index: layouts.length,
        offset,
        height,
        block,
        textParagraph,
      });
      offset += height + spacing;
    }

    return layouts;
  });

  const totalHeight = createMemo(() => {
    const layouts = blockLayouts();
    if (layouts.length === 0) return 0;
    const last = layouts[layouts.length - 1];
    return last.offset + last.height;
  });

  const visibleBlocks = createMemo<number[]>(() => {
    const layouts = blockLayouts();
    if (layouts.length === 0) return [];

    const st = scrollTop();
    const vh = viewportHeight();
    const lh = lineHeightPx();
    const bufferLines = overscan();

    const minY = st - bufferLines * lh;
    const maxY = st + vh + bufferLines * lh;

    const startIndex = findFirstVisibleBlock(layouts, minY);
    const visible: number[] = [];

    for (let i = startIndex; i < layouts.length; i++) {
      const block = layouts[i];
      if (block.offset > maxY) break;
      visible.push(block.index);
    }

    return visible;
  });

  const currentCharIndex = createMemo(() => {
    const layouts = blockLayouts();
    const st = scrollTop();
    const textLayout = textLayoutResult();

    let target: BlockLayout | undefined;
    let nearest: BlockLayout | undefined;

    for (const layout of layouts) {
      if (layout.block.type !== "text" || !layout.textParagraph) continue;
      nearest = layout;
      if (st >= layout.offset && st < layout.offset + layout.height) {
        target = layout;
        break;
      }
    }

    const textBlock = target ?? nearest;
    if (!textBlock || !textBlock.textParagraph) {
      return { paragraphIndex: 0, charIndex: 0 };
    }

    const localOffset = st - textBlock.offset;
    const textOnlyOffset = textBlock.textParagraph.offset + localOffset;
    const { charIndex } = textLayout.getCharIndexByOffset(textOnlyOffset);
    return { paragraphIndex: textBlock.block.index, charIndex };
  });

  function getBlockStyle(index: number) {
    const layouts = blockLayouts();
    const block = layouts[index];
    if (!block) {
      return {
        position: "absolute" as const,
        top: "0px",
        left: "0px",
        width: "0px",
        height: "0px",
      };
    }
    return {
      position: "absolute" as const,
      top: `${block.offset}px`,
      left: "0px",
      width: "100%",
      height: `${block.height}px`,
    };
  }

  function scrollToCharIndex(paragraphIndex: number, charIndex: number) {
    const layouts = blockLayouts();
    const textLayout = textLayoutResult();
    const textParagraph = textLayout.paragraphs[paragraphIndex];
    if (!textParagraph) return;

    const block = layouts.find((l) => l.block.type === "text" && l.block.index === paragraphIndex);
    if (!block || !block.textParagraph) return;

    const charOffset =
      textLayout.getOffsetByCharIndex(paragraphIndex, charIndex) - textParagraph.offset;
    const offset = block.offset + charOffset;
    const el = containerEl();
    if (!el) return;

    if (useWindowScroll()) {
      const rect = el.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top + offset, behavior: "auto" });
    } else {
      el.scrollTo({ top: offset, behavior: "auto" });
    }
  }

  function updateViewportMetrics() {
    if (useWindowScroll()) {
      const el = containerEl();
      const containerOffsetTop = el ? el.getBoundingClientRect().top + window.scrollY : 0;
      setViewportHeight(window.innerHeight);
      setScrollTop(Math.max(0, window.scrollY - containerOffsetTop));
    } else {
      const el = containerEl();
      if (el) {
        setViewportHeight(el.clientHeight);
        setScrollTop(el.scrollTop);
      }
    }
  }

  createEffect(() => {
    const el = containerEl();
    if (useWindowScroll()) {
      const onScroll = () => updateViewportMetrics();
      const onResize = () => updateViewportMetrics();

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);

      onCleanup(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
      });
    } else if (el) {
      const onScroll = () => {
        setScrollTop(el.scrollTop);
      };
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setViewportHeight(entry.contentRect.height);
        }
      });
      ro.observe(el);

      el.addEventListener("scroll", onScroll, { passive: true });

      onCleanup(() => {
        el.removeEventListener("scroll", onScroll);
        ro.disconnect();
      });
    }

    updateViewportMetrics();
  });

  function containerRef(el: HTMLElement) {
    setContainerEl(el);
    options.containerRef(el);
  }

  return {
    totalHeight,
    visibleBlocks,
    getBlockStyle,
    scrollToCharIndex,
    currentCharIndex,
    layoutResult: textLayoutResult,
    containerRef,
  };
}
