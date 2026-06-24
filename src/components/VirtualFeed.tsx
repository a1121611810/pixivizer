import { onMount, onCleanup, createSignal, createEffect, For } from "solid-js";
import type { Component } from "solid-js";
import Masonry from "masonry-layout";
import ImageCard from "./ImageCard";
import LazyImageCard from "./LazyImageCard";
import LoadingSpinner from "./LoadingSpinner";
import SkeletonCard from "./SkeletonCard";
import PullIndicator from "./PullIndicator";
import type { PullZone } from "./PullIndicator";
import type { PixivIllust } from "../api/types";

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
  let gridRef: HTMLDivElement | undefined;
  let masonry: Masonry | undefined;
  let prevCount = 0;

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

  // Masonry 布局同步
  function initMasonry() {
    if (!gridRef || masonry) return;
    masonry = new Masonry(gridRef, {
      itemSelector: ".masonry-item",
      columnWidth: ".masonry-sizer",
      percentPosition: true,
      gutter: 12,
      transitionDuration: 0,
    });
  }

  function relayout() {
    if (!masonry) return initMasonry();
    const cells = gridRef?.querySelectorAll(".masonry-item");
    if (!cells) return;
    const currCount = cells.length;

    if (currCount === 0 || prevCount === 0 || currCount < prevCount) {
      // 首次渲染或数据被替换 → 全量重排
      masonry.reloadItems();
      masonry.layout();
    } else if (currCount > prevCount) {
      // 追加 → 只排布新增元素
      const newCells = Array.from(cells).slice(prevCount);
      masonry.appended(newCells as HTMLElement[]);
    }
    // currCount === prevCount → 无变化，跳过

    prevCount = currCount;
  }

  createEffect(() => {
    // 追踪 illusts 变化触发 relayout
    props.illusts;
    // 下一帧 DOM 已更新
    requestAnimationFrame(() => relayout());
  });

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && props.hasMore && !props.loading) {
          props.onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );
    if (sentinel) observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });

  onCleanup(() => {
    masonry?.destroy();
    masonry = undefined;
    prevCount = 0;
  });

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <PullIndicator
        zone={pullPhase()}
        distance={pullDistance()}
        refreshThreshold={PULL_THRESHOLD}
        settingsThreshold={SETTINGS_THRESHOLD}
      />

      <div class="px-3 py-4">
        {props.error && (
          <div class="text-center py-4 px-4 mb-3 rounded-[var(--borderRadiusMedium)] mx-3 bg-[var(--colorStatusDangerBackground2)] text-[var(--colorStatusDangerForeground1)]">
            <p class="[font-size:var(--fontSizeBase200)] leading-relaxed">{props.error}</p>
          </div>
        )}

        {props.loading && props.illusts.length === 0 && pullPhase() !== "refreshing" && (
          <div class="flex gap-3">
            {Array.from({ length: 10 }).map(() => (
              <SkeletonCard />
            ))}
          </div>
        )}

        {props.illusts.length > 0 && (
          <div ref={gridRef} class="relative">
            {/* Masonry column width reference (50% - gap) */}
            <div class="masonry-sizer" style={{ width: "calc(50% - 6px)" }} />
            <For each={props.illusts}>
              {(illust, index) => {
                const eager = index() < 4;
                return (
                  <div
                    class="masonry-item"
                    style={{
                      width: "calc(50% - 6px)",
                      ...(props.skipAnimation
                        ? {}
                        : {
                            animation: `fluent-list-enter var(--durationGentle) var(--curveDecelerateMid) both`,
                            "animation-delay": `${index() * 60}ms`,
                          }),
                    }}
                  >
                    {eager ? (
                      <ImageCard illust={illust} onClick={props.onIllustClick} />
                    ) : (
                      <LazyImageCard illust={illust} onClick={props.onIllustClick} />
                    )}
                  </div>
                );
              }}
            </For>
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
