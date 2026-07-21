import { createSignal, createEffect, onCleanup, onMount, on } from "solid-js";
import type { Accessor } from "solid-js";
import {
  Virtualizer,
  observeWindowRect,
  observeWindowOffset,
  windowScroll,
} from "@tanstack/solid-virtual";
import type { VirtualItem } from "@tanstack/solid-virtual";
import type { ApiError } from "../api/types";
import { createSentinelPaginator } from "./createSentinelPaginator";

// ─── Constants ───

const PULL_THRESHOLD = 60;
const MAX_PULL = 100;
const GAP = 12;

// ─── Types ───

export type PullPhase = "idle" | "pulling" | "refresh-ready" | "refreshing";

export interface FeedVirtualizerConfig<T> {
  /** Reactive list of items to virtualize */
  items: Accessor<T[]>;
  /** Whether a load/refresh operation is in progress */
  loading: Accessor<boolean>;
  /** Current error, if any */
  error: Accessor<ApiError | null>;
  /** Whether there are more items to load */
  hasMore: Accessor<boolean>;
  /** Called when the sentinel triggers (load more pages) */
  onLoadMore: () => void;
  /** Called when pull-to-refresh completes */
  onRefresh: () => Promise<void>;
  /** Number of virtual lanes (columns) */
  lanes: Accessor<number>;
  /** Estimate the height of the item at the given index */
  estimateSize: (index: number) => number;
  /** Get a unique key for the item at the given index */
  getItemKey: (index: number) => string | number;
  /** Optional custom empty state text */
  emptyText?: string;
}

export interface FeedVirtualizerResult {
  /** Ref callback for the outer container (handles ResizeObserver + touch events) */
  containerRef: (el: HTMLDivElement) => void;
  /** Ref callback for the sentinel element (triggers load-more) */
  sentinelAttach: (el: HTMLDivElement) => void;
  /** Current reactive virtual items */
  virtualItems: Accessor<VirtualItem[]>;
  /** Total height of the virtual list */
  totalSize: Accessor<number>;
  /** Container width (for column width calculations) */
  containerWidth: Accessor<number>;
  /** Current pull-to-refresh phase */
  pullPhase: Accessor<PullPhase>;
  /** Current pull distance in pixels */
  pullDistance: Accessor<number>;
  /** Expose the raw virtualizer instance for advanced use (e.g. scroll restoration) */
  getVirtualizer: () => Virtualizer<Window, HTMLElement>;
}

// ─── Hook ───

/**
 * Shared virtual scrolling primitive used by both VirtualFeed and NovelVirtualFeed.
 *
 * Encapsulates:
 * - Pull-to-refresh (touch event handling)
 * - Sentinel pagination (IntersectionObserver + load-more)
 * - TanStack Virtualizer lifecycle (creation, sync, mount, scroll/resize listeners)
 * - Container width tracking via ResizeObserver
 */
export function createFeedVirtualizer<T>(config: FeedVirtualizerConfig<T>): FeedVirtualizerResult {
  // ── Pull-to-refresh state ──
  const [pullDistance, setPullDistance] = createSignal(0);
  const [pullPhase, setPullPhase] = createSignal<PullPhase>("idle");
  let touchStartY = 0;

  // Reset pull state when refresh completes (loading transitions true→false)
  createEffect(
    on(
      () => config.loading(),
      (loading) => {
        if (pullPhase() === "refreshing" && !loading) {
          setPullDistance(0);
          setPullPhase("idle");
        }
      },
    ),
  );

  function handleTouchStart(e: TouchEvent) {
    if (config.loading()) return;
    if (window.scrollY > 5) return;
    touchStartY = e.touches[0].clientY;
    setPullPhase("pulling");
  }

  function handleTouchMove(e: TouchEvent) {
    if (pullPhase() === "idle" || pullPhase() === "refreshing") return;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (deltaY < 0) {
      setPullDistance(0);
      setPullPhase("idle");
      return;
    }
    const damped = Math.min(deltaY * 0.5, MAX_PULL);
    setPullDistance(damped);
    setPullPhase(damped >= PULL_THRESHOLD ? "refresh-ready" : "pulling");
  }

  function handleTouchEnd() {
    if (pullPhase() === "refresh-ready") {
      setPullPhase("refreshing");
      setPullDistance(PULL_THRESHOLD * 0.6);
      config.onRefresh();
    } else {
      setPullDistance(0);
      setPullPhase("idle");
    }
  }

  // ── Sentinel paginator ──
  const { attach: sentinelAttach } = createSentinelPaginator({
    rootMargin: "0px 0px 30% 0px",
    enabled: () => config.hasMore() && !config.loading(),
    onTrigger: () => config.onLoadMore(),
  });

  // ── Container width tracking ──
  const [containerWidth, setContainerWidth] = createSignal(0);

  function onContainerRef(el: HTMLDivElement) {
    if (!el) return;
    setContainerWidth(el.clientWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  }

  // ── Virtualizer ──
  const [virtualItems, setVirtualItems] = createSignal<VirtualItem[]>([]);
  const [totalSize, setTotalSize] = createSignal(0);

  // Create estimateSize closure that delegates to config
  const estimateSize = (index: number) => config.estimateSize(index);

  const instance = new Virtualizer<Window, HTMLElement>({
    count: config.items().length,
    estimateSize,
    lanes: config.lanes(),
    overscan: 2,
    gap: GAP,
    getItemKey: (i: number) => config.getItemKey(i),
    getScrollElement: () => (typeof window !== "undefined" ? window : null),
    observeElementRect: observeWindowRect,
    observeElementOffset: observeWindowOffset,
    scrollToFn: windowScroll,
    initialOffset: 0,
    initialMeasurementsCache: [],
  });

  // Sync options when items/count/lanes change
  createEffect(() => {
    const count = config.items().length;
    const cc = config.lanes();
    instance.setOptions({
      count,
      estimateSize,
      lanes: cc,
      overscan: 2,
      gap: GAP,
      getItemKey: (i: number) => config.getItemKey(i),
      getScrollElement: () => (typeof window !== "undefined" ? window : null),
      observeElementRect: observeWindowRect,
      observeElementOffset: observeWindowOffset,
      scrollToFn: windowScroll,
    } as any);
    instance.measure();
    setVirtualItems([...instance.getVirtualItems()] as VirtualItem[]);
    setTotalSize(instance.getTotalSize());
  });

  // Mount lifecycle
  onMount(() => {
    const cleanup = instance._didMount();
    instance._willUpdate();
    setVirtualItems([...instance.getVirtualItems()] as VirtualItem[]);
    setTotalSize(instance.getTotalSize());
    onCleanup(() => cleanup?.());
  });

  // Scroll + resize listeners for window mode
  createEffect(() => {
    const onScroll = () => {
      instance._willUpdate();
      setVirtualItems([...instance.getVirtualItems()] as VirtualItem[]);
      setTotalSize(instance.getTotalSize());
    };
    const onResize = () => {
      instance._willUpdate();
      setVirtualItems([...instance.getVirtualItems()] as VirtualItem[]);
      setTotalSize(instance.getTotalSize());
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onCleanup(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    });
  });

  // ── Result ──

  return {
    containerRef: (el: HTMLDivElement) => {
      // Set up touch events on the container
      if (!el) return;
      el.addEventListener("touchstart", handleTouchStart, { passive: true });
      el.addEventListener("touchmove", handleTouchMove, { passive: true });
      el.addEventListener("touchend", handleTouchEnd);
      onContainerRef(el);
    },
    sentinelAttach,
    virtualItems,
    totalSize,
    containerWidth,
    pullPhase,
    pullDistance,
    getVirtualizer: () => instance,
  };
}
