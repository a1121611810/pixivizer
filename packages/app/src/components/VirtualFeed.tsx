import { createSignal, createEffect, For, createMemo } from "solid-js"
import type { Component } from "solid-js"
import ImageCard from "./ImageCard"
import LazyImageCard from "./LazyImageCard"
import LoadingSpinner from "./LoadingSpinner"
import PullIndicator from "./PullIndicator"
import type { PullZone } from "./PullIndicator"
import type { PixivIllust } from "../api/types"
import type { LayoutMode } from "../primitives/types"
import { createSentinelPaginator } from "../primitives/createSentinelPaginator"
import { createVirtualScroll } from "../primitives/createVirtualScroll"
import { createLayout } from "./LayoutEngine"

interface Props {
  illusts: PixivIllust[]
  loading: boolean
  error: string | null
  hasMore: boolean
  onIllustClick: (id: number) => void
  onLoadMore: () => void
  onRefresh: () => Promise<void> | void
  onSettingsOpen?: () => void
  emptyText?: string
  skipAnimation?: boolean
  layoutMode?: LayoutMode
}

const LAYOUT_COLUMNS: Record<LayoutMode, number> = {
  waterfall: 2,
  single: 1,
  grid: 3,
}

const GAP = 12 // matches var(--spacingHorizontalM)

const VirtualFeed: Component<Props> = (props) => {
  const { attach: sentinelAttach } = createSentinelPaginator({
    rootMargin: "0px 0px 30% 0px",
    enabled: () => props.hasMore && !props.loading,
    onTrigger: () => props.onLoadMore(),
  })

  // ── Pull-to-refresh state ──
  const PULL_THRESHOLD = 60
  const SETTINGS_THRESHOLD = 130
  const MAX_PULL = 200
  const [pullDistance, setPullDistance] = createSignal(0)
  const [pullPhase, setPullPhase] = createSignal<PullZone>("idle")
  const [containerEl, setContainerEl] = createSignal<HTMLDivElement | undefined>()
  let touchStartY = 0

  createEffect(() => {
    if (pullPhase() === "refreshing" && !props.loading) {
      setPullDistance(0)
      setPullPhase("idle")
    }
  })

  function handleTouchStart(e: TouchEvent) {
    if (props.loading) return
    const el = containerEl()
    if (el && el.scrollTop > 5) return
    touchStartY = e.touches[0].clientY
    setPullPhase("pulling")
  }

  function handleTouchMove(e: TouchEvent) {
    if (pullPhase() === "idle" || pullPhase() === "refreshing") return
    const deltaY = e.touches[0].clientY - touchStartY
    if (deltaY < 0) {
      setPullDistance(0)
      setPullPhase("idle")
      return
    }
    const damped = Math.min(deltaY * 0.5, MAX_PULL)
    setPullDistance(damped)
    if (damped >= SETTINGS_THRESHOLD) {
      setPullPhase("settings-ready")
    } else if (damped >= PULL_THRESHOLD) {
      setPullPhase("refresh-ready")
    } else {
      setPullPhase("pulling")
    }
  }

  function handleTouchEnd() {
    if (pullPhase() === "settings-ready") {
      setPullDistance(0)
      setPullPhase("idle")
      props.onSettingsOpen?.()
    } else if (pullPhase() === "refresh-ready") {
      setPullPhase("refreshing")
      setPullDistance(PULL_THRESHOLD * 0.6)
      props.onRefresh()
    } else {
      setPullDistance(0)
      setPullPhase("idle")
    }
  }

  // ── Container width via ResizeObserver ──
  const [containerWidth, setContainerWidth] = createSignal(0)

  function onContainerRef(el: HTMLDivElement) {
    if (!el) return
    setContainerEl(el)
    setContainerWidth(el.clientWidth)

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
  }

  // ── Layout computation ──
  const layoutMode = createMemo(() => props.layoutMode ?? "waterfall")
  const columnCount = createMemo(() => LAYOUT_COLUMNS[layoutMode()])
  const columnWidth = createMemo(() => {
    const cc = columnCount()
    return (containerWidth() - GAP * (cc - 1)) / cc
  })

  const layout = createLayout(
    () => props.illusts,
    columnWidth,
    columnCount,
    () => GAP,
    layoutMode,
  )

  // ── Virtual scroll ──
  const vs = createVirtualScroll({
    layout,
    overscan: 400,
  })

  // Combine scroll container ref with container width tracking
  function combinedRef(el: HTMLDivElement) {
    vs.containerRef(el)
    onContainerRef(el)
  }

  return (
    <div
      ref={combinedRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      class="px-3 py-4"
      style={{
        overflow: "auto",
        contain: "strict",
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <PullIndicator
        zone={pullPhase()}
        distance={pullDistance()}
        refreshThreshold={PULL_THRESHOLD}
        settingsThreshold={SETTINGS_THRESHOLD}
      />

      {props.error && (
        <div class="text-center py-4 px-4 mb-3 rounded-[var(--borderRadiusMedium)] mx-3 bg-[var(--colorStatusDangerBackground2)] text-[var(--colorStatusDangerForeground1)]">
          <p class="[font-size:var(--fontSizeBase200)] leading-relaxed">{props.error}</p>
        </div>
      )}

      {props.loading && props.illusts.length === 0 && pullPhase() !== "refreshing" && (
        <div>加载中...</div>
      )}

      {/* Virtualized items container — only visible items rendered */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: `${vs.totalHeight()}px`,
        }}
      >
        <For each={props.illusts.slice(vs.visibleRange().startIndex, vs.visibleRange().endIndex + 1)}>
          {(illust, i) => {
            const realIndex = vs.visibleRange().startIndex + i()
            return (
              <div style={vs.getItemStyle(realIndex)}>
                {realIndex < 4 ? (
                  <ImageCard illust={illust} onClick={props.onIllustClick} />
                ) : (
                  <LazyImageCard illust={illust} onClick={props.onIllustClick} />
                )}
              </div>
            )
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

      {/* Sentinel for infinite scroll — placed at the end of content */}
      <div ref={sentinelAttach} style={{ height: "1px", width: "100%" }} />
    </div>
  )
}

export default VirtualFeed
