import { createSignal, createEffect, For, createMemo } from "solid-js";
import type { Component } from "solid-js";
import ImageCard from "./ImageCard";
import LazyImageCard from "./LazyImageCard";
import SkeletonCard from "./SkeletonCard";
import GridCard from "./GridCard";
import LoadingSpinner from "./LoadingSpinner";
import PullIndicator from "./PullIndicator";
import type { PixivIllust } from "../api/types";
import type { LayoutMode } from "../primitives/types";
import type { ComputeMasonryInput } from "../primitives/computeMasonryLayout";
import { computeMasonryLayout } from "../primitives/computeMasonryLayout";
import { createSentinelPaginator } from "../primitives/createSentinelPaginator";
import { createVirtualScroll } from "../primitives/createVirtualScroll";
import { createLayout } from "./LayoutEngine";
import { loadImage, checkImageCache } from "../utils/imageLoader";
import { isImageHostEnabled } from "../stores/imageHostStore";
import { imageCachePrefetch } from "../stores/uiStore";

interface Props {
  illusts: PixivIllust[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onIllustClick: (id: number) => void;
  onLoadMore: () => void;
  onRefresh: () => Promise<void> | void;
  emptyText?: string;
  skipAnimation?: boolean;
  layoutMode?: LayoutMode;
  /** Scroll restoration offset (from feedStore.getFeedScrollY), applied on mount */
  restoreScrollTop?: number;
}

const LAYOUT_COLUMNS: Record<LayoutMode, number> = {
  waterfall: 2,
  single: 1,
  grid: 3,
};

const GAP = 12; // horizontal gap between columns
const VERTICAL_GAP = 12; // vertical gap between cards (same as horizontal)

const VirtualFeed: Component<Props> = (props) => {
  const { attach: sentinelAttach } = createSentinelPaginator({
    rootMargin: "0px 0px 30% 0px",
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
  let initialRestored = false;

  createEffect(() => {
    if (pullPhase() === "refreshing" && !props.loading) {
      setPullDistance(0);
      setPullPhase("idle");
    }
  });

  function handleTouchStart(e: TouchEvent) {
    if (props.loading) return;
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
    if (!el) return;
    setContainerWidth(el.clientWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
  }

  // ── Layout computation ──
  const layoutMode = createMemo(() => props.layoutMode ?? "waterfall");
  const columnCount = createMemo(() => LAYOUT_COLUMNS[layoutMode()]);
  const columnWidth = createMemo(() => {
    const cc = columnCount();
    const cw = containerWidth();
    return cw > 0 ? (cw - GAP * (cc - 1)) / cc : 150; // fallback width
  });

  const layout = createLayout(
    () => props.illusts,
    columnWidth,
    columnCount,
    () => VERTICAL_GAP,
    () => GAP,
    layoutMode,
  );

  // ── Virtual scroll (window scroll mode) ──
  const vs = createVirtualScroll({
    layout,
    overscan: 400,
    useWindowScroll: true,
  });

  // ── Skeleton layout for initial loading state ──
  const SKELETON_ITEM_HEIGHT = 300;
  const skeletonCount = createMemo(() => {
    const cc = columnCount();
    const rows = Math.ceil(window.innerHeight / SKELETON_ITEM_HEIGHT) + 1;
    return cc * rows;
  });
  const skeletonLayout = createMemo(() => {
    const cc = columnCount();
    const cw = columnWidth();
    const count = skeletonCount();
    if (count === 0 || cw <= 0) {
      return {
        items: [],
        totalHeight: 0,
        columns: cc,
        columnWidth: cw,
        gap: VERTICAL_GAP,
        columnGap: GAP,
      };
    }
    const input: ComputeMasonryInput = {
      items: Array.from({ length: count }, () => ({ width: 400, height: SKELETON_ITEM_HEIGHT })),
      columnWidth: cw,
      columnCount: cc,
      gap: VERTICAL_GAP,
      columnGap: GAP,
    };
    return computeMasonryLayout(input);
  });

  // ── Scroll prediction: prefetch images just outside visible window ──
  createEffect(() => {
    const range = vs.visibleRange();
    if (range.endIndex < 0) return;
    // 代理模式下预加载的请求不会被 SW 缓存，跳过以避免浪费带宽
    if (isImageHostEnabled()) return;
    if (!imageCachePrefetch()) return;
    const illustsList = props.illusts;
    // Prefetch next 10 items beyond visible window
    const preloadEnd = Math.min(range.endIndex + 10, illustsList.length);
    for (let i = range.endIndex + 1; i < preloadEnd; i++) {
      const ill = illustsList[i];
      if (!ill) break;
      const url = ill.image_urls.medium || ill.image_urls.large;
      if (url) {
        // 仅在 LRU 缓存未命中时预取，避免重复网络请求和 Blob 创建
        if (!checkImageCache(url)) {
          loadImage(url).catch(() => {});
        }
      }
    }
  });

  // ── Scroll restoration ──
  createEffect(() => {
    const restore = props.restoreScrollTop;
    if (!initialRestored && restore && restore > 0) {
      initialRestored = true;
      requestAnimationFrame(() => {
        window.scrollTo(0, restore);
      });
    } else if (!initialRestored && props.restoreScrollTop === undefined) {
      initialRestored = true; // no restore needed
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

      {props.error && (
        <div class="text-center py-4 px-4 mb-3 rounded-[var(--borderRadiusMedium)] mx-3 bg-[var(--colorStatusDangerBackground2)] text-[var(--colorStatusDangerForeground1)]">
          <p class="[font-size:var(--fontSizeBase200)] leading-relaxed">{props.error}</p>
        </div>
      )}

      {props.loading && props.illusts.length === 0 && pullPhase() !== "refreshing" && (
        <div class="px-3">
          <div
            style={{
              position: "relative",
              width: "100%",
              height: `${skeletonLayout().totalHeight || 1}px`,
            }}
          >
            <For each={skeletonLayout().items}>
              {(item) => (
                <div
                  style={{
                    position: "absolute",
                    top: `${item.y}px`,
                    left: `${item.x}px`,
                    width: `${item.width}px`,
                    height: `${item.height}px`,
                  }}
                >
                  <SkeletonCard width={400} height={SKELETON_ITEM_HEIGHT} />
                </div>
              )}
            </For>
          </div>
        </div>
      )}

      {/* Virtualized items container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: `${vs.totalHeight() || 1}px`,
        }}
      >
        <For
          each={
            vs.visibleRange().endIndex >= vs.visibleRange().startIndex
              ? props.illusts.slice(vs.visibleRange().startIndex, vs.visibleRange().endIndex + 1)
              : []
          }
        >
          {(illust, i) => {
            const baseIndex = vs.visibleRange().startIndex;
            const realIndex = baseIndex + i();
            return (
              <div
                style={vs.getItemStyle(realIndex)}
                class="bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] shadow-[var(--elevation2)]"
                classList={{
                  "overflow-hidden": layoutMode() === "grid",
                  "h-full": layoutMode() === "grid",
                }}
              >
                {layoutMode() === "grid" ? (
                  <GridCard illust={illust} onClick={props.onIllustClick} />
                ) : realIndex < 4 ? (
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
