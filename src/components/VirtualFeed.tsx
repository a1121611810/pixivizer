import { onMount, onCleanup, createSignal, createEffect } from 'solid-js';
import type { Component } from 'solid-js';
import ImageCard from './ImageCard';
import LoadingSpinner from './LoadingSpinner';
import SkeletonCard from './SkeletonCard';
import PullIndicator from './PullIndicator';
import type { PullZone } from './PullIndicator';
import type { PixivIllust } from '../api/types';

interface Props {
  illusts: PixivIllust[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onIllustClick: (id: number) => void;
  onLoadMore: () => void;
  onRefresh: () => Promise<void> | void;
  onSettingsOpen?: () => void;
  skipAnimation?: boolean;
}

const VirtualFeed: Component<Props> = (props) => {
  let sentinel: HTMLDivElement | undefined;

  const PULL_THRESHOLD = 60;
  const SETTINGS_THRESHOLD = 130;
  const MAX_PULL = 200;
  const [pullDistance, setPullDistance] = createSignal(0);
  const [pullPhase, setPullPhase] = createSignal<PullZone>('idle');
  let touchStartY = 0;

  createEffect(() => {
    if (pullPhase() === 'refreshing' && !props.loading) {
      setPullDistance(0);
      setPullPhase('idle');
    }
  });

  function handleTouchStart(e: TouchEvent) {
    if (props.loading) return;
    if (window.scrollY > 5) return;
    touchStartY = e.touches[0].clientY;
    setPullPhase('pulling');
  }

  function handleTouchMove(e: TouchEvent) {
    if (pullPhase() === 'idle' || pullPhase() === 'refreshing') return;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (deltaY < 0) {
      setPullDistance(0);
      setPullPhase('idle');
      return;
    }
    const damped = Math.min(deltaY * 0.5, MAX_PULL);
    setPullDistance(damped);
    if (damped >= SETTINGS_THRESHOLD) {
      setPullPhase('settings-ready');
    } else if (damped >= PULL_THRESHOLD) {
      setPullPhase('refresh-ready');
    } else {
      setPullPhase('pulling');
    }
  }

  function handleTouchEnd() {
    if (pullPhase() === 'settings-ready') {
      setPullDistance(0);
      setPullPhase('idle');
      props.onSettingsOpen?.();
    } else if (pullPhase() === 'refresh-ready') {
      setPullPhase('refreshing');
      setPullDistance(PULL_THRESHOLD * 0.6);
      props.onRefresh();
    } else {
      setPullDistance(0);
      setPullPhase('idle');
    }
  }

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && props.hasMore && !props.loading) {
          props.onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );
    if (sentinel) observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
          <div
            class="text-center py-4 px-4 mb-3 rounded-[var(--borderRadiusMedium)] mx-3"
            classList={{
              'bg-[var(--colorStatusDangerBackground2)] text-[var(--colorStatusDangerForeground1)]':
                props.error.includes('失败') || props.error.includes('错误') || props.error.includes('登录') || props.error.includes('网络') || props.error.includes('权限'),
              'bg-[var(--colorBrandStroke2)] text-[var(--colorNeutralForeground1)]':
                !(props.error.includes('失败') || props.error.includes('错误') || props.error.includes('登录') || props.error.includes('网络') || props.error.includes('权限')),
            }}
          >
            <p class="[font-size:var(--fontSizeBase200)] leading-relaxed">{props.error}</p>
          </div>
        )}

        {/* Skeleton cards — shown when loading an uncached tab */}
        {props.loading && props.illusts.length === 0 && pullPhase() !== 'refreshing' && (
          <div class="columns-2 sm:columns-3 gap-3">
            {Array.from({ length: 10 }).map(() => (
              <SkeletonCard />
            ))}
          </div>
        )}

        {/* Real cards */}
        <div class="columns-2 sm:columns-3 gap-3">
          {props.illusts.map((illust, i) => (
            <div
              class="break-inside-avoid"
              style={props.skipAnimation
                ? {}
                : {
                    animation: `fluent-list-enter var(--durationGentle) var(--curveDecelerateMid) both`,
                    'animation-delay': `${i * 40}ms`,
                  }
              }
            >
              <ImageCard illust={illust} onClick={props.onIllustClick} />
            </div>
          ))}
        </div>

        {props.loading && props.illusts.length > 0 && pullPhase() !== 'refreshing' && <LoadingSpinner text="加载中..." />}

        {!props.hasMore && props.illusts.length > 0 && (
          <p class="text-[var(--colorNeutralForeground3)] text-center py-4 [font-size:var(--fontSizeBase200)]">
            已经到底了
          </p>
        )}

        {props.illusts.length === 0 && !props.loading && !props.error && (
          <p class="text-[var(--colorNeutralForeground2)] text-center py-16 [font-size:var(--fontSizeBase300)]">
            暂无新作品
          </p>
        )}

        <div ref={sentinel} class="h-1" />
      </div>
    </div>
  );
};

export default VirtualFeed;
