import { createSignal, createEffect, For, createMemo } from "solid-js";
import type { Component } from "solid-js";
import ImageCard from "./ImageCard";
import LazyImageCard from "./LazyImageCard";
import LoadingSpinner from "./LoadingSpinner";
import SkeletonCard from "./SkeletonCard";
import PullIndicator from "./PullIndicator";
import type { PullZone } from "./PullIndicator";
import type { PixivIllust } from "../api/types";
import { createSentinelPaginator } from "../primitives/createSentinelPaginator";

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
  layoutMode?: "waterfall" | "single" | "grid";
}

/** layoutMode → CSS columns 值 */
const LAYOUT_COLUMNS: Record<string, string> = {
  waterfall: "2",
  single: "1",
  grid: "3",
};

const VirtualFeed: Component<Props> = (props) => {
  const { attach: sentinelAttach } = createSentinelPaginator({
    rootMargin: "0px 0px 30% 0px",
    enabled: () => props.hasMore && !props.loading,
    onTrigger: () => props.onLoadMore(),
  });

  const PULL_THRESHOLD = 60;
  const SETTINGS_THRESHOLD = 130;
  const MAX_PULL = 200;
  const [pullDistance, setPullDistance] = createSignal(0);
  const [pullPhase, setPullPhase] = createSignal<PullZone>("idle");
  let touchStartY = 0;

  const columnStyle = createMemo(() => {
    const cols = LAYOUT_COLUMNS[props.layoutMode ?? "waterfall"];
    return {
      columns: cols,
      "column-gap": "var(--spacingHorizontalM)",
    };
  });

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
          <div style={columnStyle()}>
            {Array.from({ length: 10 }).map(() => (
              <SkeletonCard />
            ))}
          </div>
        )}

        {props.illusts.length > 0 && (
          <div style={columnStyle()}>
            <For each={props.illusts}>
              {(illust, index) => (
                <div
                  style={{
                    "break-inside": "avoid",
                    "margin-bottom": "var(--spacingHorizontalM)",
                    ...(props.skipAnimation
                      ? {}
                      : {
                          animation: `fluent-list-enter var(--durationGentle) var(--curveDecelerateMid) both`,
                          "animation-delay": `${index() * 60}ms`,
                        }),
                  }}
                >
                  {index() < 4 ? (
                    <ImageCard illust={illust} onClick={props.onIllustClick} />
                  ) : (
                    <LazyImageCard illust={illust} onClick={props.onIllustClick} />
                  )}
                </div>
              )}
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

        <div ref={sentinelAttach} class="h-1" />
      </div>
    </div>
  );
};

export default VirtualFeed;
