import { createSignal, createEffect, For, createMemo } from "solid-js";
import type { Component } from "solid-js";
import NovelCard from "./NovelCard";
import SkeletonCard from "./SkeletonCard";
import LoadingSpinner from "./LoadingSpinner";
import PullIndicator from "./PullIndicator";
import type { PixivNovel } from "../api/types";
import { createSentinelPaginator } from "../primitives/createSentinelPaginator";
import { createVirtualScroll } from "../primitives/createVirtualScroll";
import type { MasonryLayout } from "../primitives/types";

const GAP = 12;

interface Props {
  novels: PixivNovel[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onNovelClick: (id: number) => void;
  onLoadMore: () => void;
  onRefresh: () => Promise<void> | void;
  onSeriesClick?: (seriesId: number) => void;
  restoreScrollTop?: number;
}

const NovelVirtualFeed: Component<Props> = (props) => {
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
    setPullPhase(damped >= PULL_THRESHOLD ? "refresh-ready" : "pulling");
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

  // ── Single-column layout ──
  const [containerWidth, setContainerWidth] = createSignal(0);
  function onContainerRef(el: HTMLDivElement) {
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
  }

  // 单列固定高度布局（不使用 computeMasonryLayout，因其总是对图片卡片加 CARD_INFO_HEIGHT）
  const CARD_HEIGHT = 148; // p-2.5(10) + cover(128) + p-2.5(10)
  const layout = createMemo((): MasonryLayout => {
    const cw = containerWidth();
    if (cw <= 0) {
      return { items: [], totalHeight: 0, columns: 1, columnWidth: 0, gap: GAP, columnGap: 0 };
    }
    const items = props.novels.map((_, i) => ({
      index: i,
      x: 0,
      y: i * (CARD_HEIGHT + GAP),
      width: cw,
      height: CARD_HEIGHT,
      column: 0,
    }));
    const count = items.length;
    return {
      items,
      totalHeight: count > 0 ? count * CARD_HEIGHT + (count - 1) * GAP : 0,
      columns: 1,
      columnWidth: cw,
      gap: GAP,
      columnGap: 0,
    };
  });

  const vs = createVirtualScroll({
    layout,
    overscan: 400,
    useWindowScroll: true,
  });

  // ── Scroll restoration ──
  createEffect(() => {
    const restore = props.restoreScrollTop;
    if (!initialRestored && restore && restore > 0) {
      initialRestored = true;
      requestAnimationFrame(() => window.scrollTo(0, restore));
    } else if (!initialRestored && props.restoreScrollTop === undefined) {
      initialRestored = true;
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

      {props.loading && props.novels.length === 0 && pullPhase() !== "refreshing" && (
        <div class="flex flex-col gap-3">
          {Array.from({ length: 3 }).map(() => (
            <SkeletonCard width={containerWidth() || 400} height={140} />
          ))}
        </div>
      )}

      <div style={{ position: "relative", width: "100%", height: `${vs.totalHeight() || 1}px` }}>
        <For
          each={
            vs.visibleRange().endIndex >= vs.visibleRange().startIndex
              ? props.novels.slice(vs.visibleRange().startIndex, vs.visibleRange().endIndex + 1)
              : []
          }
        >
          {(novel, i) => {
            const baseIndex = vs.visibleRange().startIndex;
            const realIndex = baseIndex + i();
            return (
              <div style={vs.getItemStyle(realIndex)}>
                <NovelCard
                  novel={novel}
                  onClick={props.onNovelClick}
                  onSeriesClick={props.onSeriesClick}
                />
              </div>
            );
          }}
        </For>
      </div>

      {props.loading && props.novels.length > 0 && pullPhase() !== "refreshing" && (
        <LoadingSpinner text="加载中..." />
      )}

      {!props.hasMore && props.novels.length > 0 && (
        <p class="text-[var(--colorNeutralForeground3)] text-center py-4 [font-size:var(--fontSizeBase200)]">
          已经到底了
        </p>
      )}

      {props.novels.length === 0 && !props.loading && !props.error && (
        <p class="text-[var(--colorNeutralForeground2)] text-center py-16 [font-size:var(--fontSizeBase300)]">
          暂无小说
        </p>
      )}

      <div ref={sentinelAttach} class="h-1" />
    </div>
  );
};

export default NovelVirtualFeed;
