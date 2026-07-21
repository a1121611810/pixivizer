import { createSignal, createEffect, For, createMemo, onCleanup, onMount } from "solid-js";
import type { Component } from "solid-js";
import {
  Virtualizer,
  observeWindowRect,
  observeWindowOffset,
  windowScroll,
} from "@tanstack/solid-virtual";
import type { VirtualItem } from "@tanstack/solid-virtual";
import ImageCard from "./ImageCard";
import LazyImageCard from "./LazyImageCard";
import SkeletonCard from "./SkeletonCard";
import GridCard from "./GridCard";
import LoadingSpinner from "./LoadingSpinner";
import PullIndicator from "./PullIndicator";
import ErrorDisplay from "./ErrorDisplay";
import type { PixivIllust, ApiError } from "../api/types";
import type { LayoutMode } from "../primitives/types";
import { VIRTUAL_SCROLL_MARGIN } from "../primitives/rootMargins";
import { createSentinelPaginator } from "../primitives/createSentinelPaginator";
import { loadImage, checkImageCache } from "../utils/imageLoader";
import { isImageHostEnabled } from "../stores/imageHostStore";
import { imageCachePrefetch } from "../stores/uiStore";
import {
  saveFeedScrollState,
  getFeedScrollState,
  type ScrollRestoreState,
} from "../stores/feedStore";
import { createVirtualScrollRestore } from "../primitives/createVirtualScrollRestore";

interface Props {
  illusts: PixivIllust[];
  loading: boolean;
  error: ApiError | null;
  hasMore: boolean;
  onIllustClick: (id: number) => void;
  onLoadMore: () => void;
  onRefresh: () => Promise<void> | void;
  emptyText?: string;
  skipAnimation?: boolean;
  layoutMode?: LayoutMode;
  scrollKey?: string;
  initialScrollState?: ScrollRestoreState;
  onScrollStateChange?: (state: ScrollRestoreState) => void;
  // 程序性滚动恢复期间抑制 header 显隐切换
  suppressHeaderVisibility?: (durationMs?: number) => void;
}

const LAYOUT_COLUMNS: Record<LayoutMode, number> = {
  waterfall: 2,
  single: 1,
  grid: 3,
};

const GAP = 12;
const VERTICAL_GAP = 12;
const CARD_INFO_HEIGHT = 140;

const VirtualFeed: Component<Props> = (props) => {
  const { attach: sentinelAttach } = createSentinelPaginator({
    rootMargin: VIRTUAL_SCROLL_MARGIN,
    enabled: () => props.hasMore && !props.loading,
    onTrigger: () => props.onLoadMore(),
  });

  // ── Pull-to-refresh state ──
  const PULL_THRESHOLD = 60;
  const MAX_PULL = 100;
  const [pullDistance, setPullDistance] = createSignal(0);
  const [pullPhase, setPullPhase] = createSignal<
    "idle" | "pulling" | "refresh-ready" | "refreshing"
  >("idle");
  let touchStartY = 0;

  createEffect(() => {
    if (pullPhase() === "refreshing" && !props.loading) {
      setPullDistance(0);
      setPullPhase("idle");
    }
  });

  function handleTouchStart(e: TouchEvent) {
    if (props.loading) {
      return;
    }
    if (window.scrollY > 5) {
      return;
    }
    touchStartY = e.touches[0].clientY;
    setPullPhase("pulling");
  }

  function handleTouchMove(e: TouchEvent) {
    if (pullPhase() === "idle" || pullPhase() === "refreshing") {
      return;
    }
    const deltaY = e.touches[0].clientY - touchStartY;
    if (deltaY < 0) {
      setPullDistance(0);
      setPullPhase("idle");
      return;
    }
    const damped = Math.min(deltaY * 0.5, MAX_PULL);
    setPullDistance(damped);
    if (damped >= PULL_THRESHOLD) {
      setPullPhase("refresh-ready");
    } else {
      setPullPhase("pulling");
    }
  }

  function handleTouchEnd() {
    if (pullPhase() === "refresh-ready") {
      setPullPhase("refreshing");
      setPullDistance(PULL_THRESHOLD * 0.6);
      props.onRefresh();
    } else {
      setPullDistance(0);
      setPullPhase("idle");
    }
  }

  // ── Container width ──
  const [containerWidth, setContainerWidth] = createSignal(0);

  function onContainerRef(el: HTMLDivElement) {
    if (!el) {
      return;
    }
    setContainerWidth(el.clientWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
  }

  // ── Layout config ──
  const layoutMode = createMemo(() => props.layoutMode ?? "waterfall");
  const columnCount = createMemo(() => LAYOUT_COLUMNS[layoutMode()]);
  const columnWidth = createMemo(() => {
    const cc = columnCount();
    const cw = containerWidth();
    return cw > 0 ? (cw - GAP * (cc - 1)) / cc : 150;
  });

  // ── estimateSize ──
  const estimateSize = (index: number) => {
    const ill = props.illusts[index];
    if (!ill) {
      return 200;
    }
    const mode = layoutMode();
    if (mode === "grid") {
      return 200 + CARD_INFO_HEIGHT;
    }
    const effH = ill.type === "ugoira" ? Math.round(ill.height * 0.75) : ill.height;
    const aspectRatio = effH > 0 ? ill.width / effH : 1;
    return columnWidth() / aspectRatio + CARD_INFO_HEIGHT;
  };

  // ── Scroll restoration（显式恢复，见 ADR 0010） ──
  const scrollRestore = createVirtualScrollRestore({
    getVirtualizer: () => instance,
    getState: () =>
      props.scrollKey
        ? (getFeedScrollState(props.scrollKey) ?? undefined)
        : props.initialScrollState,
    saveState: (state) => {
      if (props.scrollKey) {
        saveFeedScrollState(props.scrollKey, state);
      } else {
        props.onScrollStateChange?.(state);
      }
    },
  });

  // ── TanStack Virtual: native Virtualizer + Solid reactive bindings ──
  const [virtualItems, setVirtualItems] = createSignal<VirtualItem[]>([]);
  const [totalSize, setTotalSize] = createSignal(0);

  const instance = new Virtualizer<Window, HTMLElement>({
    count: props.illusts.length,
    estimateSize,
    lanes: columnCount(),
    overscan: 2,
    gap: VERTICAL_GAP,
    getItemKey: (i: number) => props.illusts[i]?.id ?? i,
    getScrollElement: () => (typeof window !== "undefined" ? window : null),
    observeElementRect: observeWindowRect,
    observeElementOffset: observeWindowOffset,
    scrollToFn: windowScroll,
    initialOffset: scrollRestore.initialOffset,
    initialMeasurementsCache: scrollRestore.initialMeasurementsCache,
  } as any);

  createEffect(() => {
    const count = props.illusts.length;
    const cc = columnCount();
    instance.setOptions({
      count,
      estimateSize,
      lanes: cc,
      overscan: 2,
      gap: VERTICAL_GAP,
      getItemKey: (i: number) => props.illusts[i]?.id ?? i,
      getScrollElement: () => (typeof window !== "undefined" ? window : null),
      observeElementRect: observeWindowRect,
      observeElementOffset: observeWindowOffset,
      scrollToFn: windowScroll,
    } as any);
    instance.measure();
    setVirtualItems([...instance.getVirtualItems()] as any);
    setTotalSize(instance.getTotalSize());
  });

  onMount(() => {
    const cleanup = instance._didMount();
    instance._willUpdate();
    setVirtualItems([...instance.getVirtualItems()] as any);
    setTotalSize(instance.getTotalSize());
    onCleanup(() => cleanup?.());

    // ── 滚动恢复：三层兜底（实现见 createVirtualScrollRestore） ──
    // 恢复滚动前抑制 header 显隐，避免闪烁
    props.suppressHeaderVisibility?.();
    scrollRestore.restoreScroll();
  });

  createEffect(() => {
    const onScroll = () => {
      instance._willUpdate();
      setVirtualItems([...instance.getVirtualItems()] as any);
      setTotalSize(instance.getTotalSize());
    };
    const onResize = () => {
      instance._willUpdate();
      setVirtualItems([...instance.getVirtualItems()] as any);
      setTotalSize(instance.getTotalSize());
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onCleanup(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    });
  });

  // ── Skeleton layout for initial loading state ──
  const SKELETON_ITEM_HEIGHT = 300;
  const skeletonCount = createMemo(() => {
    const cc = columnCount();
    const rows = Math.ceil(window.innerHeight / SKELETON_ITEM_HEIGHT) + 1;
    return cc * rows;
  });

  function skeletonStyle(i: number) {
    const cc = columnCount();
    const cw = columnWidth();
    const col = i % cc;
    const row = Math.floor(i / cc);
    return {
      position: "absolute" as const,
      top: `${row * (SKELETON_ITEM_HEIGHT + VERTICAL_GAP)}px`,
      left: `${col * (cw + GAP)}px`,
      width: `${cw}px`,
      height: `${SKELETON_ITEM_HEIGHT}px`,
    };
  }

  // ── Scroll prediction: prefetch images just outside visible window ──
  createEffect(() => {
    const items = virtualItems();
    if (items.length === 0) {
      return;
    }
    if (isImageHostEnabled()) {
      return;
    }
    if (!imageCachePrefetch()) {
      return;
    }
    const illustsList = props.illusts;
    const lastIdx = items[items.length - 1].index;
    const preloadEnd = Math.min(lastIdx + 10, illustsList.length);
    for (let i = lastIdx + 1; i < preloadEnd; i++) {
      const ill = illustsList[i];
      if (!ill) {
        break;
      }
      const url = ill.image_urls.medium || ill.image_urls.large;
      if (url) {
        if (!checkImageCache(url)) {
          loadImage(url).catch(() => {});
        }
      }
    }
  });

  return (
    <div
      ref={onContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      class="px-3"
    >
      <PullIndicator
        zone={pullPhase()}
        distance={pullDistance()}
        refreshThreshold={PULL_THRESHOLD}
      />

      {props.error && <ErrorDisplay error={props.error} onRetry={() => props.onRefresh()} />}

      {props.loading && props.illusts.length === 0 && pullPhase() !== "refreshing" && (
        <div class="px-3">
          <div
            style={{
              position: "relative",
              width: "100%",
              height: `${skeletonCount() > 0 ? Math.ceil(skeletonCount() / columnCount()) * (SKELETON_ITEM_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP : 1}px`,
            }}
          >
            <For each={Array.from({ length: skeletonCount() })}>
              {(_item, i) => (
                <div style={skeletonStyle(i())}>
                  <SkeletonCard width={400} height={SKELETON_ITEM_HEIGHT} />
                </div>
              )}
            </For>
          </div>
        </div>
      )}

      <div
        style={{
          position: "relative",
          width: "100%",
          height: `${totalSize() || 1}px`,
        }}
      >
        <For each={virtualItems()}>
          {(vItem) => {
            const illust = props.illusts[vItem.index];
            if (!illust) {
              return null;
            }
            return (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${(vItem.lane ?? 0) * (columnWidth() + GAP)}px`,
                  width: `${columnWidth()}px`,
                  height: `${vItem.size}px`,
                  transform: `translateY(${vItem.start}px)`,
                }}
                class="bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] shadow-[var(--elevation2)]"
                classList={{
                  "overflow-hidden": layoutMode() === "grid",
                }}
              >
                {layoutMode() === "grid" ? (
                  <GridCard illust={illust} onClick={props.onIllustClick} />
                ) : vItem.index < 4 ? (
                  <ImageCard illust={illust} onClick={props.onIllustClick} />
                ) : (
                  <LazyImageCard illust={illust} onClick={props.onIllustClick} />
                )}
              </div>
            );
          }}
        </For>
      </div>

      {props.loading && props.illusts.length > 0 && pullPhase() !== "refreshing" && (
        <LoadingSpinner text="加载中..." />
      )}

      {!props.hasMore && props.illusts.length > 0 && (
        <p class="text-[var(--colorNeutralForeground3)] text-center py-4 [font-size:var(--fontSizeBase200)]">
          已经到底了
        </p>
      )}

      {props.illusts.length === 0 && !props.loading && !props.error && (
        <p class="text-[var(--colorNeutralForeground2)] text-center py-16 [font-size:var(--fontSizeBase300)]">
          {props.emptyText ?? "暂无新作品"}
        </p>
      )}

      <div ref={sentinelAttach} class="h-1" />
    </div>
  );
};

export default VirtualFeed;
