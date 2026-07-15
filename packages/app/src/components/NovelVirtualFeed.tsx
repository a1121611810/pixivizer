import { createSignal, createEffect, For, createMemo } from "solid-js";
import type { Component } from "solid-js";
import NovelCard, { NovelCoverCard } from "./NovelCard";
import NovelTextListCard from "./NovelTextListCard";
import SkeletonCard from "./SkeletonCard";
import LoadingSpinner from "./LoadingSpinner";
import ErrorDisplay from "./ErrorDisplay";
import PullIndicator from "./PullIndicator";
import type { PixivNovel, ApiError } from "../api/types";
import { createSentinelPaginator } from "../primitives/createSentinelPaginator";
import { createVirtualScroll } from "../primitives/createVirtualScroll";
import { createScrollRestoration } from "../primitives/createScrollRestoration";
import { createComputedTextCard } from "../primitives/createComputedTextCard";
import type { MasonryLayout } from "../primitives/types";
import type { NovelLayoutMode } from "../stores/uiStore";

const GAP = 12;

interface Props {
  novels: PixivNovel[];
  loading: boolean;
  error: ApiError | null;
  hasMore: boolean;
  onNovelClick: (id: number) => void;
  onLoadMore: () => void;
  onRefresh: () => Promise<void> | void;
  onSeriesClick?: (seriesId: number) => void;
  onAuthorClick?: (userId: number) => void;
  restoreScrollTop?: number;
  layoutMode?: NovelLayoutMode;
}

const NovelVirtualFeed: Component<Props> = (props) => {
  const mode = () => props.layoutMode ?? "list";

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

  // 单列布局：封面固定 128px + padding 20px，信息区高度由 createComputedTextCard 动态计算
  const COVER_HEIGHT = 128;
  const listCardMetrics = createComputedTextCard({
    novels: () => props.novels,
    containerWidth,
    titleFont: () => ({
      fontSize: 12,
      fontWeight: 600,
      fontFamily: "system-ui",
      lineHeight: 1.25,
    }),
    tagFont: () => ({
      fontSize: 10,
      fontWeight: 400,
      fontFamily: "system-ui",
      lineHeight: 1.4,
    }),
    maxTitleLines: 3,
    maxTagLines: 3,
    stylePreset: () => "list",
  });

  const layout = createMemo((): MasonryLayout => {
    const cw = containerWidth();
    if (cw <= 0) {
      return { items: [], totalHeight: 0, columns: 1, columnWidth: 0, gap: GAP, columnGap: 0 };
    }
    let y = 0;
    const items = props.novels.map((novel, i) => {
      const infoHeight = listCardMetrics.getInfoHeight(novel.id);
      const height = Math.max(COVER_HEIGHT, infoHeight) + 20;
      const item = { index: i, x: 0, y, width: cw, height, column: 0 };
      y += height + GAP;
      return item;
    });
    const totalHeight = items.length > 0 ? y - GAP : 0;
    return {
      items,
      totalHeight,
      columns: 1,
      columnWidth: cw,
      gap: GAP,
      columnGap: 0,
    };
  });

  // 文本列表布局：纯计算卡片信息区高度，无 ResizeObserver
  const textListCardMetrics = createComputedTextCard({
    novels: () => props.novels,
    containerWidth,
    titleFont: () => ({
      fontSize: 16,
      fontWeight: 600,
      fontFamily: "system-ui",
      lineHeight: 1.5,
    }),
    tagFont: () => ({
      fontSize: 10,
      fontWeight: 400,
      fontFamily: "system-ui",
      lineHeight: 1.4,
    }),
    maxTitleLines: 2,
    maxTagLines: 2,
  });

  const textListLayout = createMemo((): MasonryLayout => {
    const cw = containerWidth();
    if (cw <= 0) {
      return { items: [], totalHeight: 0, columns: 1, columnWidth: 0, gap: 20, columnGap: 0 };
    }
    const gap = 20;
    let y = 0;
    const items = props.novels.map((novel, index) => {
      const height = textListCardMetrics.getInfoHeight(novel.id);
      const item = { index, x: 0, y, width: cw, height, column: 0 };
      y += height + gap;
      return item;
    });
    const totalHeight = items.length > 0 ? y - gap : 0;
    return { items, totalHeight, columns: 1, columnWidth: cw, gap, columnGap: 0 };
  });

  // 封面墙布局：2列瀑布流，信息区高度动态计算
  const coverWallCardMetrics = createComputedTextCard({
    novels: () => props.novels,
    containerWidth: () => {
      const cw = containerWidth();
      return cw > 0 ? (cw - GAP) / 2 : 0;
    },
    titleFont: () => ({
      fontSize: 14,
      fontWeight: 600,
      fontFamily: "system-ui",
      lineHeight: 1.25,
    }),
    tagFont: () => ({
      fontSize: 10,
      fontWeight: 400,
      fontFamily: "system-ui",
      lineHeight: 1.2,
    }),
    maxTitleLines: 2,
    maxTagLines: 2,
    stylePreset: () => "coverWall",
  });

  const coverWallLayout = createMemo((): MasonryLayout => {
    const cw = containerWidth();
    if (cw <= 0) {
      return { items: [], totalHeight: 0, columns: 2, columnWidth: 0, gap: GAP, columnGap: GAP };
    }
    const columnWidth = (cw - GAP) / 2;
    const nextY = [0, 0];
    const items = props.novels.map((novel, i) => {
      const col = nextY[0] <= nextY[1] ? 0 : 1;
      const y = nextY[col];
      const infoHeight = coverWallCardMetrics.getInfoHeight(novel.id);
      const cardHeight = columnWidth + infoHeight;
      nextY[col] = y + cardHeight + GAP;
      return {
        index: i,
        x: col * (columnWidth + GAP),
        y,
        width: columnWidth,
        height: cardHeight,
        column: col,
      };
    });

    const totalHeight = items.length > 0 ? Math.max(...nextY) - GAP : 0;
    return { items, totalHeight, columns: 2, columnWidth, gap: GAP, columnGap: GAP };
  });

  const activeLayout = createMemo(() => {
    const m = mode();
    if (m === "textList") return textListLayout();
    return m === "coverWall" ? coverWallLayout() : layout();
  });
  const vs = createVirtualScroll({
    layout: activeLayout,
    overscan: 400,
    useWindowScroll: true,
  });

  // ── Scroll restoration ──
  createScrollRestoration({
    restoreScrollTop: () => props.restoreScrollTop,
    layout: activeLayout,
    containerWidth,
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

      {props.loading &&
        props.novels.length === 0 &&
        pullPhase() !== "refreshing" &&
        mode() !== "textList" && (
          <div class="flex flex-col gap-3">
            {Array.from({ length: 3 }).map(() => (
              <SkeletonCard width={containerWidth() || 400} height={140} />
            ))}
          </div>
        )}

      {props.loading &&
        props.novels.length === 0 &&
        pullPhase() !== "refreshing" &&
        mode() === "textList" && (
          <div class="flex flex-col gap-4">
            {Array.from({ length: 6 }).map(() => (
              <div class="h-20 bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusLarge)] animate-pulse" />
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
                {mode() === "textList" ? (
                  <NovelTextListCard
                    novel={novel}
                    onClick={props.onNovelClick}
                    onAuthorClick={props.onAuthorClick}
                    onSeriesClick={props.onSeriesClick}
                  />
                ) : mode() === "coverWall" ? (
                  <NovelCoverCard
                    novel={novel}
                    onClick={props.onNovelClick}
                    onSeriesClick={props.onSeriesClick}
                  />
                ) : (
                  <NovelCard
                    novel={novel}
                    onClick={props.onNovelClick}
                    onSeriesClick={props.onSeriesClick}
                  />
                )}
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
