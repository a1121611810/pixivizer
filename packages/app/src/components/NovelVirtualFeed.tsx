import { createSignal, createEffect, For, createMemo, onCleanup, onMount } from "solid-js";
import type { Component } from "solid-js";
import { Virtualizer } from "@tanstack/solid-virtual";
import NovelCard, { NovelCoverCard } from "./NovelCard";
import NovelTextListCard from "./NovelTextListCard";
import SkeletonCard from "./SkeletonCard";
import LoadingSpinner from "./LoadingSpinner";
import ErrorDisplay from "./ErrorDisplay";
import PullIndicator from "./PullIndicator";
import type { PixivNovel, ApiError } from "../api/types";
import { VIRTUAL_SCROLL_MARGIN } from "../primitives/rootMargins";
import { createSentinel } from "@/primitives/visibility";
import type { NovelLayoutMode } from "../stores/uiStore";
import { saveNovelScrollState, getNovelScrollState } from "../stores/novelStore";
import { createVirtualScrollRestore } from "../primitives/createVirtualScrollRestore";
import { observeWindowRect, observeWindowOffset, windowScroll } from "@tanstack/solid-virtual";
import type { VirtualItem } from "@tanstack/solid-virtual";

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
  scrollKey?: string;
  layoutMode?: NovelLayoutMode;
  // 程序性滚动恢复期间抑制 header 显隐切换
  suppressHeaderVisibility?: (durationMs?: number) => void;
}

const NovelVirtualFeed: Component<Props> = (props) => {
  const mode = () => props.layoutMode ?? "list";

  const { attach: sentinelAttach } = createSentinel({
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

  // 单列布局
  const COVER_HEIGHT = 128;
  const CARD_VERTICAL_PADDING = 24; // p-[var(--spacingHorizontalM)] × 2 = 12×2

  // ── Layout config ──
  const columnCount = createMemo(() => (mode() === "coverWall" ? 2 : 1));
  const columnWidth = createMemo(() => {
    const cw = containerWidth();
    const cc = columnCount();
    return cw > 0 ? (cw - GAP * (cc - 1)) / cc : 150;
  });

  // ── estimateSize：粗估种子值，实际高度由 measureElement 实测纠正 ──
  const estimateSize = (index: number): number => {
    if (!props.novels[index]) return 100;
    const m = mode();
    if (m === "textList") {
      return 120;
    }
    if (m === "coverWall") {
      const cw = columnWidth();
      return cw + 300;
    }
    return Math.max(COVER_HEIGHT + CARD_VERTICAL_PADDING, 160);
  };

  // ── Scroll restoration（显式恢复，见 ADR 0010） ──
  const scrollRestore = createVirtualScrollRestore({
    getVirtualizer: () => instance,
    getState: () =>
      props.scrollKey ? (getNovelScrollState(props.scrollKey) ?? undefined) : undefined,
    saveState: (state) => {
      if (props.scrollKey) {
        saveNovelScrollState(props.scrollKey, state);
      }
    },
  });

  // ── TanStack Virtual: native Virtualizer + Solid reactive bindings ──
  const [virtualItems, setVirtualItems] = createSignal<VirtualItem[]>([]);
  const [totalSize, setTotalSize] = createSignal(0);

  const instance = new Virtualizer<Window, HTMLElement>({
    count: props.novels.length,
    estimateSize,
    lanes: columnCount(),
    overscan: 2,
    gap: GAP,
    getItemKey: (i: number) => props.novels[i]?.id ?? i,
    getScrollElement: () => (typeof window !== "undefined" ? window : null),
    observeElementRect: observeWindowRect,
    observeElementOffset: observeWindowOffset,
    scrollToFn: windowScroll,
    initialOffset: scrollRestore.initialOffset,
    initialMeasurementsCache: scrollRestore.initialMeasurementsCache,
    laneAssignmentMode: mode() === "coverWall" ? "measured" : "estimate",
  });

  // Sync count/lanes changes back to the virtualizer
  createEffect(() => {
    const count = props.novels.length;
    const cc = columnCount();
    instance.setOptions({
      count,
      estimateSize,
      lanes: cc,
      overscan: 2,
      gap: GAP,
      getItemKey: (i: number) => props.novels[i]?.id ?? i,
      getScrollElement: () => (typeof window !== "undefined" ? window : null),
      observeElementRect: observeWindowRect,
      observeElementOffset: observeWindowOffset,
      scrollToFn: windowScroll,
      laneAssignmentMode: mode() === "coverWall" ? "measured" : "estimate",
    } as any);
    instance.measure();
    setVirtualItems([...instance.getVirtualItems()] as any);
    setTotalSize(instance.getTotalSize());
  });

  // Mount: start observing
  onMount(() => {
    const cleanup = instance._didMount();
    instance._willUpdate();
    setVirtualItems([...instance.getVirtualItems()] as any);
    setTotalSize(instance.getTotalSize());
    onCleanup(() => {
      cleanup?.();
    });

    // ── 滚动恢复：三层兜底（实现见 createVirtualScrollRestore） ──
    // 恢复滚动前抑制 header 显隐，避免闪烁
    props.suppressHeaderVisibility?.();
    scrollRestore.restoreScroll();
  });

  // Scroll listener + resize for window mode
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
        settingsThreshold={120}
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

      <div
        style={{
          position: "relative",
          width: "100%",
          height: `${totalSize() || 1}px`,
        }}
      >
        <For each={virtualItems()}>
          {(vItem) => {
            const novel = props.novels[vItem.index];
            if (!novel) {
              return null;
            }
            return (
              <div
                ref={instance.measureElement}
                data-index={vItem.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${(vItem.lane ?? 0) * (columnWidth() + GAP)}px`,
                  width: mode() === "coverWall" ? `${columnWidth()}px` : "100%",
                  transform: `translateY(${vItem.start}px)`,
                }}
              >
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
