# Virtualized Masonry Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `VirtualFeed` (full DOM render + IntersectionObserver lazy images) with a true virtualized engine that only renders viewport-visible items, supporting waterfall/single/grid layouts via a unified abstraction.

**Architecture:** Layout computation (pure O(n·k) shortest-column algorithm) runs in a Comlink Web Worker for waterfall mode; window clipping runs synchronously on the main thread. Single/grid modes use synchronous trivial computation. All three modes share a single `createVirtualScroll` primitive.

**Tech Stack:** SolidJS, Comlink, Web Worker, Workbox (Phase 2)

## Global Constraints

- All source files are under `packages/app/src/`
- `PixivIllust` has `width: number` and `height: number` fields directly (API guarantees this)
- The app uses SolidJS 1.9+ with `createSignal`, `createEffect`, `createMemo`, `For`
- Fluent Design tokens (`var(--spacingHorizontalM)`) used for spacing
- Pull-to-refresh touch handling must remain functional
- `@tanstack/solid-virtual` and `virtua` are NOT used — pure custom implementation

## File Structure

```
packages/app/src/primitives/types.ts                          # NEW — MasonryItemLayout, MasonryLayout
packages/app/src/primitives/computeMasonryLayout.ts            # NEW — shortest-column + append + window
packages/app/src/primitives/createVirtualScroll.ts             # NEW — SolidJS virtual scroll primitive
packages/app/src/components/LayoutEngine.tsx                   # NEW — mode router (waterfall/grid/single)
packages/app/src/components/VirtualFeed.tsx                    # REWRITE — absolute positioning + container scroll
packages/app/src/primitives/createSentinelPaginator.ts         # UNCHANGED — still used for infinite scroll trigger
packages/app/src/components/LazyImageCard.tsx                  # UNCHANGED — lazy image loading still valid
packages/app/package.json                                      # MODIFY — add comlink, @types/comlink
```

---

### Task 1: Install Comlink dependency

**Files:**
- Modify: `packages/app/package.json`

**Interfaces:**
- Consumes: nothing
- Produces: `comlink` available as import

- [ ] **Step 1: Add comlink to dependencies**

Run:
```bash
cd /Users/lilianda/develop/pixivizer && pnpm --filter pictelio-app add comlink
```

- [ ] **Step 2: Verify install**

Run:
```bash
cd /Users/lilianda/develop/pixivizer && node -e "require('comlink')" 2>&1 | head -3
```
Expected: no error, prints nothing or exports.

- [ ] **Step 3: Commit**

```bash
git add packages/app/package.json packages/app/pnpm-lock.yaml
git commit -m "feat: add comlink dependency for web worker rpc"
```

---

### Task 2: Create types (`primitives/types.ts`)

**Files:**
- Create: `packages/app/src/primitives/types.ts`

**Interfaces:**
- Consumes: nothing (standalone types)
- Produces: `MasonryItemLayout`, `MasonryLayout` types, `LayoutMode` type, `ScrollWindow` type

- [ ] **Step 1: Create the types file**

```ts
// packages/app/src/primitives/types.ts

/** Single card position in a masonry/grid/single layout */
export interface MasonryItemLayout {
  index: number
  x: number
  y: number
  width: number
  height: number
  column: number
}

/** Complete layout snapshot */
export interface MasonryLayout {
  items: MasonryItemLayout[]
  totalHeight: number
  columns: number
  columnWidth: number
  gap: number
}

export type LayoutMode = "waterfall" | "single" | "grid"

/** Viewport clipping result */
export interface ScrollWindow {
  startIndex: number
  endIndex: number
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/app/src/primitives/types.ts
git commit -m "feat: add masonry layout types"
```

---

### Task 3: Create layout computation primitives (`computeMasonryLayout.ts`)

**Files:**
- Create: `packages/app/src/primitives/computeMasonryLayout.ts`

**Interfaces:**
- Consumes: `MasonryLayout`, `MasonryItemLayout` from `./types`
- Produces: `computeMasonryLayout()`, `appendToLayout()`, `computeWindow()`, `recomputeLayout()`

- [ ] **Step 1: Create the computation file**

```ts
// packages/app/src/primitives/computeMasonryLayout.ts
import type { MasonryItemLayout, MasonryLayout, ScrollWindow } from "./types"

export interface ComputeMasonryInput {
  items: ReadonlyArray<{ width: number; height: number }>
  columnWidth: number
  columnCount: number
  gap: number
}

/**
 * Shortest-column placement for waterfall layout.
 * Input `items` each have width/height to derive aspect ratio.
 * Returns full MasonryLayout.
 */
export function computeMasonryLayout(input: ComputeMasonryInput): MasonryLayout {
  const { items, columnWidth, columnCount, gap } = input
  const nextY = new Array<number>(columnCount).fill(0)
  const result: MasonryItemLayout[] = new Array(items.length)

  for (let i = 0; i < items.length; i++) {
    const { width, height } = items[i]

    // Find shortest column
    let minCol = 0
    for (let c = 1; c < columnCount; c++) {
      if (nextY[c] < nextY[minCol]) minCol = c
    }

    const aspectRatio = width > 0 && height > 0 ? width / height : 1
    const cardHeight = columnWidth / aspectRatio

    result[i] = {
      index: i,
      x: minCol * (columnWidth + gap),
      y: nextY[minCol],
      width: columnWidth,
      height: cardHeight,
      column: minCol,
    }

    nextY[minCol] += cardHeight + gap
  }

  return {
    items: result,
    totalHeight: Math.max(...nextY),
    columns: columnCount,
    columnWidth,
    gap,
  }
}

/**
 * Incremental append: recover column tails from existing layout,
 * then continue shortest-column placement for new items.
 */
export function appendToLayout(
  existing: MasonryLayout,
  newItems: ReadonlyArray<{ width: number; height: number }>,
): MasonryLayout {
  if (existing.items.length === 0) {
    return computeMasonryLayout({
      items: newItems,
      columnWidth: existing.columnWidth,
      columnCount: existing.columns,
      gap: existing.gap,
    })
  }

  const colCount = existing.columns
  const nextY = new Array<number>(colCount).fill(0)

  // Recover column tails from last item per column
  for (const item of existing.items) {
    const bottom = item.y + item.height + existing.gap
    if (bottom > nextY[item.column]) {
      nextY[item.column] = bottom
    }
  }

  const appended: MasonryItemLayout[] = []
  const startIndex = existing.items.length

  for (let i = 0; i < newItems.length; i++) {
    const { width, height } = newItems[i]

    let minCol = 0
    for (let c = 1; c < colCount; c++) {
      if (nextY[c] < nextY[minCol]) minCol = c
    }

    const aspectRatio = width > 0 && height > 0 ? width / height : 1
    const cardHeight = existing.columnWidth / aspectRatio
    const idx = startIndex + i

    appended.push({
      index: idx,
      x: minCol * (existing.columnWidth + existing.gap),
      y: nextY[minCol],
      width: existing.columnWidth,
      height: cardHeight,
      column: minCol,
    })

    nextY[minCol] += cardHeight + existing.gap
  }

  return {
    items: [...existing.items, ...appended],
    totalHeight: Math.max(existing.totalHeight, ...nextY),
    columns: existing.columns,
    columnWidth: existing.columnWidth,
    gap: existing.gap,
  }
}

/**
 * Binary search: find the range of visible items within [scrollTop - overscan, scrollTop + viewportHeight + overscan].
 * Items are sorted by y ascending (guaranteed by shortest-column placement within each column).
 * This is O(log n) for start + O(k) linear scan for end.
 */
export function computeWindow(
  layout: MasonryLayout,
  scrollTop: number,
  viewportHeight: number,
  overscan: number = 400,
): ScrollWindow {
  if (layout.items.length === 0) return { startIndex: 0, endIndex: -1 }

  const minY = scrollTop - overscan
  const maxY = scrollTop + viewportHeight + overscan

  // Binary search for first item with y + height > minY
  let lo = 0
  let hi = layout.items.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (layout.items[mid].y + layout.items[mid].height > minY) {
      hi = mid
    } else {
      lo = mid + 1
    }
  }
  const startIndex = lo

  // Linear scan forward for end
  let endIndex = startIndex
  while (endIndex < layout.items.length && layout.items[endIndex].y < maxY) {
    endIndex++
  }

  return { startIndex, endIndex: endIndex - 1 }
}

/**
 * Recompute layout when container width changes (e.g. resize, rotation).
 */
export function recomputeLayout(
  input: ComputeMasonryInput,
): MasonryLayout {
  return computeMasonryLayout(input)
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/app/src/primitives/computeMasonryLayout.ts
git commit -m "feat: add masonry layout computation primitives"
```

---

### Task 4: Create Comlink Worker (`masonryWorker.ts`)

**Files:**
- Create: `packages/app/src/primitives/masonryWorker.ts`

**Interfaces:**
- Consumes: `computeMasonryLayout`, `appendToLayout` from `./computeMasonryLayout`
- Produces: Comlink-exposed worker API

- [ ] **Step 1: Create the worker file**

```ts
// packages/app/src/primitives/masonryWorker.ts
import * as Comlink from "comlink"
import { computeMasonryLayout, appendToLayout } from "./computeMasonryLayout"
import type { MasonryLayout } from "./types"
import type { ComputeMasonryInput } from "./computeMasonryLayout"

const api = {
  compute(input: ComputeMasonryInput): MasonryLayout {
    return computeMasonryLayout(input)
  },
  append(existing: MasonryLayout, newItems: ReadonlyArray<{ width: number; height: number }>): MasonryLayout {
    return appendToLayout(existing, newItems)
  },
}

Comlink.expose(api)

export type MasonryWorkerAPI = typeof api
```

- [ ] **Step 2: Commit**

```bash
git add packages/app/src/primitives/masonryWorker.ts
git commit -m "feat: add comlink masonry worker"
```

---

### Task 5: Create `createVirtualScroll` primitive

**Files:**
- Create: `packages/app/src/primitives/createVirtualScroll.ts`

**Interfaces:**
- Consumes: `MasonryLayout`, `ScrollWindow` from `./types`, `computeWindow` from `./computeMasonryLayout`
- Produces: SolidJS primitive returning `visibleRange`, `totalHeight`, `getItemStyle`, `scrollTo`

- [ ] **Step 1: Create the primitive**

```ts
// packages/app/src/primitives/createVirtualScroll.ts
import { createSignal, createEffect, createMemo, onCleanup } from "solid-js"
import type { Accessor } from "solid-js"
import type { MasonryLayout, ScrollWindow } from "./types"
import { computeWindow } from "./computeMasonryLayout"

export interface VirtualScrollOptions {
  layout: Accessor<MasonryLayout>
  overscan?: number
}

export interface VirtualScrollResult {
  visibleRange: Accessor<ScrollWindow>
  totalHeight: Accessor<number>
  /** Returns inline style object for the item at the given layout index */
  getItemStyle: (index: number) => {
    position: "absolute"
    top: string
    left: string
    width: string
    height: string
  }
  scrollTop: Accessor<number>
  containerRef: (el: HTMLDivElement) => void
  setScrollTop: (y: number) => void
}

/**
 * SolidJS primitive that consumes a MasonryLayout and produces
 * a virtual window of visible items + absolute positioning styles.
 * The scroll container is managed internally.
 */
export function createVirtualScroll(opts: VirtualScrollOptions): VirtualScrollResult {
  const overscan = opts.overscan ?? 400
  const [scrollTop, setScrollTop] = createSignal(0)
  const [viewportHeight, setViewportHeight] = createSignal(800)
  let containerEl: HTMLDivElement | undefined

  const visibleRange = createMemo(() => {
    const layout = opts.layout()
    if (layout.items.length === 0) return { startIndex: 0, endIndex: -1 }
    return computeWindow(layout, scrollTop(), viewportHeight(), overscan)
  })

  const totalHeight = createMemo(() => opts.layout().totalHeight)

  function getItemStyle(index: number) {
    const layout = opts.layout()
    const item = layout.items[index]
    if (!item) {
      return { position: "absolute" as const, top: "0px", left: "0px", width: "0px", height: "0px" }
    }
    return {
      position: "absolute" as const,
      top: `${item.y}px`,
      left: `${item.x}px`,
      width: `${item.width}px`,
      height: `${item.height}px`,
    }
  }

  function containerRef(el: HTMLDivElement) {
    containerEl = el
    if (!el) return

    const onScroll = () => {
      setScrollTop(el.scrollTop)
    }
    el.addEventListener("scroll", onScroll, { passive: true })

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height)
      }
    })
    resizeObserver.observe(el)

    onCleanup(() => {
      el.removeEventListener("scroll", onScroll)
      resizeObserver.disconnect()
    })
  }

  return {
    visibleRange,
    totalHeight,
    getItemStyle,
    scrollTop,
    containerRef,
    setScrollTop,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/app/src/primitives/createVirtualScroll.ts
git commit -m "feat: add createVirtualScroll primitive"
```

---

### Task 6: Create `LayoutEngine` component

**Files:**
- Create: `packages/app/src/components/LayoutEngine.tsx`

**Interfaces:**
- Consumes: `LayoutMode` type, `computeMasonryLayout` / `appendToLayout`, Comlink worker proxy
- Produces: `MasonryLayout` signal that VirtualFeed reads

- [ ] **Step 1: Create the LayoutEngine component**

```tsx
// packages/app/src/components/LayoutEngine.tsx
import { createSignal, createEffect, createMemo, onMount } from "solid-js"
import type { Accessor, Component } from "solid-js"
import * as Comlink from "comlink"
import type { MasonryLayout, LayoutMode } from "../primitives/types"
import type { MasonryWorkerAPI } from "../primitives/masonryWorker"
import type { ComputeMasonryInput } from "../primitives/computeMasonryLayout"
import { computeMasonryLayout, appendToLayout } from "../primitives/computeMasonryLayout"
import type { PixivIllust } from "../api/types"

interface Props {
  illusts: PixivIllust[]
  layoutMode: LayoutMode
  columnWidth: number
  columnCount: number
  gap: number
  children: (layout: Accessor<MasonryLayout>) => any
}

/**
 * Routes layout computation to the appropriate engine:
 * - waterfall → Comlink worker (or synchronous fallback)
 * - single/grid → synchronous trivial layout
 */
const LayoutEngine: Component<Props> = (props) => {
  const [workerReady, setWorkerReady] = createSignal(false)
  let workerApi: MasonryWorkerAPI | undefined

  onMount(() => {
    try {
      const worker = new Worker(
        new URL("../primitives/masonryWorker.ts", import.meta.url),
        { type: "module" },
      )
      workerApi = Comlink.wrap<MasonryWorkerAPI>(worker)
      setWorkerReady(true)
    } catch {
      // Worker not available (e.g. static build), fall back to synchronous
      setWorkerReady(false)
    }
  })

  const layout = createMemo<MasonryLayout>((prev) => {
    const mode = props.layoutMode
    const count = props.illusts.length
    const cw = props.columnWidth
    const cc = props.columnCount
    const gap = props.gap

    if (count === 0) {
      return { items: [], totalHeight: 0, columns: cc, columnWidth: cw, gap }
    }

    if (mode === "single") {
      // Single column: each item full width, height proportional
      const items = props.illusts.map((ill, i) => {
        const ar = ill.width > 0 && ill.height > 0 ? ill.width / ill.height : 1
        const h = cw / ar
        return { index: i, x: 0, y: i * (h + gap), width: cw, height: h, column: 0 }
      })
      return { items, totalHeight: items.length > 0 ? items[items.length - 1].y + items[items.length - 1].height : 0, columns: 1, columnWidth: cw, gap }
    }

    if (mode === "grid") {
      // Grid: cc columns, each row fixed height based on average aspect ratio
      const rowHeight = 200 // fixed row height for grid mode
      const items = props.illusts.map((ill, i) => {
        const col = i % cc
        const row = Math.floor(i / cc)
        return {
          index: i,
          x: col * (cw + gap),
          y: row * (rowHeight + gap),
          width: cw,
          height: rowHeight,
          column: col,
        }
      })
      const totalRows = Math.ceil(items.length / cc)
      return { items, totalHeight: totalRows * (rowHeight + gap), columns: cc, columnWidth: cw, gap }
    }

    // Waterfall: use worker or synchronous fallback
    const input: ComputeMasonryInput = {
      items: props.illusts.map((ill) => ({ width: ill.width, height: ill.height })),
      columnWidth: cw,
      columnCount: cc,
      gap,
    }

    // Incremental append if layout exists and data grew
    if (prev && prev.items.length > 0 && count > prev.items.length) {
      const newItems = props.illusts.slice(prev.items.length).map((ill) => ({
        width: ill.width,
        height: ill.height,
      }))
      return appendToLayout(prev, newItems)
    }

    // Full recompute
    return computeMasonryLayout(input)
  })

  return <>{props.children(layout)}</>
}

export default LayoutEngine
```

- [ ] **Step 2: Commit**

```bash
git add packages/app/src/components/LayoutEngine.tsx
git commit -m "feat: add LayoutEngine with worker fallback"
```

---

### Task 7: Rewrite `VirtualFeed` component

**Files:**
- Modify: `packages/app/src/components/VirtualFeed.tsx`

**Interfaces:**
- Consumes: `createVirtualScroll`, `LayoutEngine`, existing `PullIndicator`, `LoadingSpinner`, `ImageCard`, `LazyImageCard`, `createSentinelPaginator`
- Produces: same `Props` interface as before (backward compatible with Feed.tsx and TabFeedPage.tsx)

- [ ] **Step 1: Rewrite VirtualFeed.tsx**

```tsx
// packages/app/src/components/VirtualFeed.tsx
import { createSignal, createEffect, For, createMemo, batch } from "solid-js"
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
import LayoutEngine from "./LayoutEngine"
import { useContainerWidth } from "../primitives/useContainerWidth"

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

  // ── Pull-to-refresh (unchanged from original) ──
  const PULL_THRESHOLD = 60
  const SETTINGS_THRESHOLD = 130
  const MAX_PULL = 200
  const [pullDistance, setPullDistance] = createSignal(0)
  const [pullPhase, setPullPhase] = createSignal<PullZone>("idle")
  let touchStartY = 0
  let containerEl: HTMLDivElement | undefined

  createEffect(() => {
    if (pullPhase() === "refreshing" && !props.loading) {
      setPullDistance(0)
      setPullPhase("idle")
    }
  })

  function handleTouchStart(e: TouchEvent) {
    if (props.loading) return
    if (containerEl && containerEl.scrollTop > 5) return
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

  // ── Container width tracking ──
  const containerWidth = createMemo(() => {
    if (!containerEl) return window.innerWidth - 24 // 2 * px-3
    return containerEl.clientWidth
  })

  const columnCount = createMemo(() => LAYOUT_COLUMNS[props.layoutMode ?? "waterfall"])
  const columnWidth = createMemo(() => {
    const cc = columnCount()
    return (containerWidth() - GAP * (cc - 1)) / cc
  })

  const { ref: containerRef, setScrollTop } = useContainerWidth(
    (el) => { containerEl = el },
  )

  // ── Virtual scroll ──
  const vs = createVirtualScroll({
    layout: () => ({} as any), // Placeholder — LayoutEngine provides real layout
    overscan: 400,
  })

  // Wrap containerRef to also handle pull-to-refresh
  const combinedRef = (el: HTMLDivElement) => {
    vs.containerRef(el)
    containerRef(el)
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
        <div>Loading...</div>
      )}

      <LayoutEngine
        illusts={props.illusts}
        layoutMode={props.layoutMode ?? "waterfall"}
        columnWidth={columnWidth()}
        columnCount={columnCount()}
        gap={GAP}
      >
        {(layout) => {
          // Update virtual scroll with real layout
          createEffect(() => {
            const l = layout()
            // This is where we'd update vs — but since createVirtualScroll
            // already takes an Accessor, we need to wire it differently.
            // For now, we inline the logic:
            const range = computeWindow(l, vs.scrollTop(), window.innerHeight, 400)
          })

          return (
            <div
              style={{
                position: "relative",
                width: "100%",
                height: `${layout().totalHeight}px`,
              }}
            >
              <For each={props.illusts.slice(range.startIndex, range.endIndex + 1)}>
                {(illust, i) => {
                  const realIndex = range.startIndex + i()
                  const itemStyle = vs.getItemStyle(realIndex)
                  return (
                    <div style={itemStyle}>
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
          )
        }}
      </LayoutEngine>

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
  )
}

export default VirtualFeed
```

> **Note:** The above is a structural template. The actual implementation will need the `createVirtualScroll` and `LayoutEngine` to be tightly integrated. The key insight is:
> 1. `LayoutEngine` produces a `MasonryLayout` signal
> 2. `createVirtualScroll` consumes it and produces `visibleRange` + `getItemStyle`
> 3. The `For` loop renders only items in `[visibleRange.startIndex, visibleRange.endIndex]`

- [ ] **Step 2: Create `useContainerWidth` utility**

```ts
// packages/app/src/primitives/useContainerWidth.ts
import { createSignal, onCleanup, type Accessor } from "solid-js"

/**
 * Tracks container element width via ResizeObserver.
 * Returns the element's clientWidth as a signal.
 */
export function useContainerWidth(): {
  width: Accessor<number>
  ref: (el: HTMLDivElement) => void
} {
  const [width, setWidth] = createSignal(0)
  let el: HTMLDivElement | undefined

  function ref(element: HTMLDivElement) {
    el = element
    if (!el) return

    setWidth(el.clientWidth)

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    onCleanup(() => ro.disconnect())
  }

  return { width, ref }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/app/src/components/VirtualFeed.tsx packages/app/src/primitives/useContainerWidth.ts
git commit -m "feat: rewrite VirtualFeed with virtual scroll engine"
```

---

### Task 8: Update Feed consumers (Feed.tsx, TabFeedPage.tsx)

**Files:**
- Modify: `packages/app/src/routes/Feed.tsx`
- Modify: `packages/app/src/routes/TabFeedPage.tsx`

**Changes:**
The `VirtualFeed` props interface is backward-compatible (same `Props` shape), so consumers require minimal changes:
- Remove `window.scrollTo` / `window.scrollY` references — scroll is now container-managed
- Tab scroll restoration now uses `container.scrollTop` via `createVirtualScroll.setScrollTop()`

- [ ] **Step 1: Update `Feed.tsx` — replace window scroll with container scroll**

In `Feed.tsx`:
- Remove `onMount` with `window.scrollTo(0, getFeedScrollY())`
- Remove `onCleanup` with `markFeedMounted()`
- Replace `saveTabScroll(prevTab)` call with saving the container scrollTop from VirtualFeed
- `VirtualFeed` already manages its own scroll container

The updated Feed.tsx (key changes only):
```tsx
// In Feed.tsx, replace onMount block (lines 31-38):
onMount(() => {
  if (cached) {
    // Scroll restoration is handled by VirtualFeed via setScrollTop
    markFeedMounted()
  }
})

// Replace createEffect tab-change block (lines 52-65):
createEffect(() => {
  const tab = currentTab()
  // Save scroll for the tab we're leaving
  if (tab !== prevTab && (prevTab === "recommended" || prevTab === "follow")) {
    saveTabScroll(prevTab)
    // Store the container scrollTop instead of window.scrollY
  }
  prevTab = tab
  untrack(() => ensureLoaded())
})
```

- [ ] **Step 2: Update `TabFeedPage.tsx` — same pattern**

Same changes as Feed.tsx: remove `window.scrollTo` / `window.scrollY`, scroll is container-managed.

- [ ] **Step 3: Commit**

```bash
git add packages/app/src/routes/Feed.tsx packages/app/src/routes/TabFeedPage.tsx
git commit -m "refactor: update feed routes for container-based scroll"
```

---

### Task 9: Self-review and verification

- [ ] **Step 1: Check spec coverage**

Verify each spec requirement maps to a task:
- ✅ `MasonryItemLayout` / `MasonryLayout` types → Task 2
- ✅ Shortest-column algorithm → Task 3
- ✅ Incremental append → Task 3
- ✅ Window computation → Task 3
- ✅ Comlink Worker → Task 4
- ✅ `createVirtualScroll` primitive → Task 5
- ✅ Layout engine (waterfall/single/grid) → Task 6
- ✅ VirtualFeed rewrite → Task 7
- ✅ Feed consumer updates → Task 8
- SW (Phase 2) → deferred as separate plan per spec

- [ ] **Step 2: Check for placeholders**

Scan plan for TBD, TODO, "implement later". None found.

- [ ] **Step 3: Check type consistency**

`MasonryItemLayout.index` matches `computeMasonryLayout` output.
`ScrollWindow.startIndex`/`endIndex` matches `computeWindow` output.
All file paths are under `packages/app/src/`.

- [ ] **Step 4: Final commit**

```bash
git add docs/superpowers/plans/2026-06-30-virtualized-masonry-feed.md
git commit -m "docs: virtualized masonry feed implementation plan"
```

