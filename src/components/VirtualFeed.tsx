import { onMount, onCleanup, createSignal, createEffect, createMemo, For } from "solid-js";
import type { Component } from "solid-js";
import ImageCard from "./ImageCard";
import LazyImageCard from "./LazyImageCard";
import LoadingSpinner from "./LoadingSpinner";
import SkeletonCard from "./SkeletonCard";
import PullIndicator from "./PullIndicator";
import type { PullZone } from "./PullIndicator";
import type { PixivIllust } from "../api/types";

// ─── 列分配工具 ───

const COLUMN_COUNT = 2;
const GAP_PX = 12; // gap-3 = 12px
const CARD_PADDING = 60; // 补偿卡片 margin/padding，近似值

interface ColumnItem {
  illust: PixivIllust;
  colIndex: number;
  rowIndex: number;
}

/**
 * 贪心最短列分配算法。
 * columnWidth = 单列内容的像素宽度（已扣除 gap）。
 * 返回两列，每列按从上到下顺序排列。
 */
function distributeToColumns(
  illusts: PixivIllust[],
  columnWidth: number,
): [ColumnItem[], ColumnItem[]] {
  if (columnWidth <= 0) {
    // 宽度未知时，简单交替分配（fallback）
    const left: ColumnItem[] = [];
    const right: ColumnItem[] = [];
    illusts.forEach((illust, i) => {
      const item: ColumnItem = {
        illust,
        colIndex: i % COLUMN_COUNT,
        rowIndex: Math.floor(i / COLUMN_COUNT),
      };
      (i % COLUMN_COUNT === 0 ? left : right).push(item);
    });
    return [left, right];
  }

  const columns: [ColumnItem[], ColumnItem[]] = [[], []];
  const heights = [0, 0];

  for (const illust of illusts) {
    // 找到当前最短的列
    const shortestCol = heights[0] <= heights[1] ? 0 : 1;

    // 估算该作品在此列的渲染高度
    const estHeight = columnWidth / (illust.width / illust.height) + CARD_PADDING;

    const item: ColumnItem = {
      illust,
      colIndex: shortestCol,
      rowIndex: columns[shortestCol].length,
    };

    columns[shortestCol].push(item);
    heights[shortestCol] += estHeight;
  }

  return columns;
}

interface Props {
  illusts: PixivIllust[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onIllustClick: (id: number) => void;
  onLoadMore: () => void;
  onRefresh: () => Promise<void> | void;
  onSettingsOpen?: () => void;
  emptyText?: string;
  skipAnimation?: boolean;
}

const VirtualFeed: Component<Props> = (props) => {
  let sentinel: HTMLDivElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  const [containerWidth, setContainerWidth] = createSignal(0);

  const PULL_THRESHOLD = 60;
  const SETTINGS_THRESHOLD = 130;
  const MAX_PULL = 200;
  const [pullDistance, setPullDistance] = createSignal(0);
  const [pullPhase, setPullPhase] = createSignal<PullZone>("idle");
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
    if (damped >= SETTINGS_THRESHOLD) {
      setPullPhase("settings-ready");
    } else if (damped >= PULL_THRESHOLD) {
      setPullPhase("refresh-ready");
    } else {
      setPullPhase("pulling");
    }
  }

  function handleTouchEnd() {
    if (pullPhase() === "settings-ready") {
      setPullDistance(0);
      setPullPhase("idle");
      props.onSettingsOpen?.();
    } else if (pullPhase() === "refresh-ready") {
      setPullPhase("refreshing");
      setPullDistance(PULL_THRESHOLD * 0.6);
      props.onRefresh();
    } else {
      setPullDistance(0);
      setPullPhase("idle");
    }
  }

  // 列宽和列分配
  const columnWidth = () => (containerWidth() > 0 ? (containerWidth() - GAP_PX) / COLUMN_COUNT : 0);

  const columns = createMemo(() => distributeToColumns(props.illusts, columnWidth()));

  onMount(() => {
    // IntersectionObserver — 加载更多
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && props.hasMore && !props.loading) {
          props.onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );
    if (sentinel) observer.observe(sentinel);

    // ResizeObserver — 容器宽度（列分配用）
    let resizeObserver: ResizeObserver | undefined;
    if (containerRef) {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const w = entry.contentRect.width;
          // Only update if width changed by >1px to prevent layout oscillation loops
          if (Math.abs(w - containerWidth()) > 1) {
            setContainerWidth(w);
          }
        }
      });
      resizeObserver.observe(containerRef);
    }

    onCleanup(() => {
      observer.disconnect();
      resizeObserver?.disconnect();
    });
  });

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Pull-to-refresh indicator */}
      <PullIndicator
        zone={pullPhase()}
        distance={pullDistance()}
        refreshThreshold={PULL_THRESHOLD}
        settingsThreshold={SETTINGS_THRESHOLD}
      />

      {/* Content */}
      <div class="px-3 py-4">
        {props.error && (
          <div class="text-center py-4 px-4 mb-3 rounded-[var(--borderRadiusMedium)] mx-3 bg-[var(--colorStatusDangerBackground2)] text-[var(--colorStatusDangerForeground1)]">
            <p class="[font-size:var(--fontSizeBase200)] leading-relaxed">{props.error}</p>
          </div>
        )}

        {/* Skeleton cards — shown when loading an uncached tab */}
        {props.loading && props.illusts.length === 0 && pullPhase() !== "refreshing" && (
          <div class="columns-2 sm:columns-3 gap-3">
            {Array.from({ length: 10 }).map(() => (
              <SkeletonCard />
            ))}
          </div>
        )}

        {/* Real cards — JS 最短列分布 + 按排 stagger 动画 */}
        {props.illusts.length > 0 && (
          <div ref={containerRef} class="flex gap-3">
            {columns().map((col) => (
              <div class="flex-1 flex flex-col gap-3 min-w-0">
                <For each={col}>
                  {(item) => {
                    const eager = item.rowIndex < 4;
                    return (
                      <div
                        style={
                          props.skipAnimation
                            ? {}
                            : {
                                animation: `fluent-list-enter var(--durationGentle) var(--curveDecelerateMid) both`,
                                "animation-delay": `${item.rowIndex * 60}ms`,
                              }
                        }
                      >
                        {eager ? (
                          <ImageCard illust={item.illust} onClick={props.onIllustClick} />
                        ) : (
                          <LazyImageCard illust={item.illust} onClick={props.onIllustClick} />
                        )}
                      </div>
                    );
                  }}
                </For>
              </div>
            ))}
          </div>
        )}

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

        <div ref={sentinel} class="h-1" />
      </div>
    </div>
  );
};

export default VirtualFeed;
