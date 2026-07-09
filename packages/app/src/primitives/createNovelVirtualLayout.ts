import { createSignal, createEffect, createMemo, onCleanup, type Accessor } from "solid-js";
import type { ReaderSettings } from "@/stores/readerSettingsStore";
import {
  createNovelTextLayout,
  type NovelTextLayoutResult,
  type ParagraphLayout,
} from "./createNovelTextLayout";
import { getNovelTextLayoutCache } from "./novelTextLayoutCache";
import { isPretextSupported } from "./isPretextSupported";

export interface CreateNovelVirtualLayoutOptions {
  /** 全文文本，按 \n\n 分段 */
  text: Accessor<string | null>;
  /** 容器宽度 px */
  containerWidth: Accessor<number>;
  /** 阅读设置 */
  settings: Accessor<ReaderSettings>;
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
  /** 当前可见段落索引数组 */
  visibleParagraphs: Accessor<number[]>;
  /** 获取段落绝对定位样式 */
  getParagraphStyle(index: number): {
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
  /** 底层布局结果，用于阅读进度等外部计算 */
  layoutResult: Accessor<NovelTextLayoutResult>;
  /** 容器 ref 设置函数，由 NovelDetail 在 ref 回调中调用 */
  containerRef: (el: HTMLElement) => void;
}

const DEFAULT_OVERSCAN = 5;

function findFirstVisibleParagraph(
  paragraphs: NovelTextLayoutResult["paragraphs"],
  minY: number,
): number {
  let left = 0;
  let right = paragraphs.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const paragraph = paragraphs[mid];
    if (paragraph.offset + paragraph.height > minY) {
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
 * 基于 `createNovelTextLayout` 的布局结果，只渲染视口内 + 缓冲区的段落，
 * 提供滚动到字符索引、当前阅读字符索引等能力。
 */
export function createNovelVirtualLayout(
  options: CreateNovelVirtualLayoutOptions,
): NovelVirtualLayoutResult {
  const overscan = () => options.overscan ?? DEFAULT_OVERSCAN;
  const useWindowScroll = () => options.useWindowScroll ?? false;

  const [containerEl, setContainerEl] = createSignal<HTMLElement | undefined>();
  const [scrollTop, setScrollTop] = createSignal(0);
  const [viewportHeight, setViewportHeight] = createSignal(0);

  const layoutResult = createMemo<NovelTextLayoutResult>(() => {
    const currentText = options.text();
    const width = options.containerWidth();
    const settings = options.settings();
    const id = options.novelId();

    if (!currentText || width <= 0) {
      return {
        paragraphs: [],
        totalHeight: 0,
        lineHeightPx: settings.fontSize * settings.lineHeight,
        getOffsetByCharIndex: () => 0,
        getCharIndexByOffset: () => ({ paragraphIndex: 0, charIndex: 0 }),
      };
    }

    const paragraphs = currentText.split(/\n+/).filter((p) => p.length > 0);
    const paragraphSpacing = Math.max(settings.fontSize * 0.5, 8);

    if (!isPretextSupported()) {
      return buildFallbackLayout(paragraphs, settings, paragraphSpacing);
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
      paragraphSpacing,
      textIndent: settings.fontSize * 2,
    });

    cache.set(id, width, settings, result);
    return result;
  });

  const totalHeight = createMemo(() => layoutResult().totalHeight);
  const lineHeightPx = createMemo(() => layoutResult().lineHeightPx);

  const visibleParagraphs = createMemo<number[]>(() => {
    const layout = layoutResult();
    const paragraphs = layout.paragraphs;
    if (paragraphs.length === 0) return [];

    const st = scrollTop();
    const vh = viewportHeight();
    const lh = lineHeightPx();
    const bufferLines = overscan();

    const minY = st - bufferLines * lh;
    const maxY = st + vh + bufferLines * lh;

    const startIndex = findFirstVisibleParagraph(paragraphs, minY);
    const visible: number[] = [];

    for (let i = startIndex; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      if (paragraph.offset > maxY) break;
      visible.push(paragraph.index);
    }

    return visible;
  });

  const currentCharIndex = createMemo(() => {
    const layout = layoutResult();
    return layout.getCharIndexByOffset(scrollTop());
  });

  function getParagraphStyle(index: number) {
    const layout = layoutResult();
    const paragraph = layout.paragraphs[index];
    if (!paragraph) {
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
      top: `${paragraph.offset}px`,
      left: "0px",
      width: "100%",
      height: `${paragraph.height}px`,
    };
  }

  function scrollToCharIndex(paragraphIndex: number, charIndex: number) {
    const layout = layoutResult();
    const offset = layout.getOffsetByCharIndex(paragraphIndex, charIndex);
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
      // 文本容器本身可能位于封面/元数据区域下方，window.scrollY 需要减去
      // 容器相对于文档顶部的偏移，才是文本内容内的有效滚动距离。
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

    // 初始同步一次视口尺寸
    updateViewportMetrics();
  });

  function containerRef(el: HTMLElement) {
    setContainerEl(el);
    options.containerRef(el);
  }

  return {
    totalHeight,
    visibleParagraphs,
    getParagraphStyle,
    scrollToCharIndex,
    currentCharIndex,
    layoutResult,
    containerRef,
  };
}
