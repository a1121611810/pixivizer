import { createSignal, createMemo, onMount, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";
import type { MasonryLayout, ScrollWindow } from "./types";
import { computeWindow } from "./computeMasonryLayout";

export interface VirtualScrollOptions {
  layout: Accessor<MasonryLayout>;
  overscan?: number;
  /** If true, use window scroll instead of a container element */
  useWindowScroll?: boolean;
}

export interface VirtualScrollResult {
  visibleRange: Accessor<ScrollWindow>;
  totalHeight: Accessor<number>;
  /** Returns inline style object for the item at the given layout index */
  getItemStyle: (index: number) => {
    position: "absolute";
    top: string;
    left: string;
    width: string;
    height: string;
  };
  scrollTop: Accessor<number>;
  /** Container ref for container scroll mode */
  containerRef: (el: HTMLDivElement) => void;
  /** Set scroll position (supports both modes) */
  setScrollTop: (y: number) => void;
}

/**
 * SolidJS primitive that consumes a MasonryLayout and produces
 * a virtual window of visible items + absolute positioning styles.
 *
 * Supports two modes:
 * - useWindowScroll=false (default): manages an internal scroll container
 * - useWindowScroll=true: listens to window scroll (Feed.tsx uses this)
 */
export function createVirtualScroll(opts: VirtualScrollOptions): VirtualScrollResult {
  const overscan = opts.overscan ?? 400;
  const useWindow = opts.useWindowScroll ?? false;
  const [scrollTop, setScrollTop] = createSignal(0);
  const [viewportHeight, setViewportHeight] = createSignal(
    typeof window !== "undefined" ? window.innerHeight : 800,
  );

  // ── Window scroll mode ──
  if (useWindow) {
    const onScroll = () => {
      setScrollTop(window.scrollY);
    };

    const onResize = () => {
      setViewportHeight(window.innerHeight);
    };

    onMount(() => {
      setScrollTop(window.scrollY);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
    });

    onCleanup(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    });
  }

  // ── Container scroll mode ──

  function containerRef(el: HTMLDivElement) {
    if (!el) return;

    const onScroll = () => {
      setScrollTop(el.scrollTop);
    };
    el.addEventListener("scroll", onScroll, { passive: true });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(el);

    onCleanup(() => {
      el.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    });
  }

  const visibleRange = createMemo(() => {
    const layout = opts.layout();
    if (layout.items.length === 0) return { startIndex: 0, endIndex: -1 };
    return computeWindow(layout, scrollTop(), viewportHeight(), overscan);
  });

  const totalHeight = createMemo(() => opts.layout().totalHeight);

  function getItemStyle(index: number) {
    const layout = opts.layout();
    const item = layout.items[index];
    if (!item) {
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
      top: `${item.y}px`,
      left: `${item.x}px`,
      width: `${item.width}px`,
      height: `${item.height}px`,
    };
  }

  return {
    visibleRange,
    totalHeight,
    getItemStyle,
    scrollTop,
    containerRef,
    setScrollTop,
  };
}
