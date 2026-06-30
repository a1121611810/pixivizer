# Virtualized Masonry Feed — Design Spec

## Overview

Replace the current `VirtualFeed` component (which renders all DOM nodes and only lazy-loads images via IntersectionObserver) with a true virtualized engine that only renders viewport-visible items. Support all three layout modes (waterfall, single, grid) through a unified abstraction, and offload layout computation to a Web Worker via Comlink.

## Motivation

The current `VirtualFeed` maintains every illust's DOM node in the tree; `LazyImageCard` defers only image loading, not element creation. On large feeds (200+ illusts) this causes:

- Excessive DOM nodes → jank on scroll/resize in Android WebView
- CSS `columns` waterfall layout prevents position precomputation, making true windowing impossible
- Tab-cache scroll restoration is manually managed and fragile

## Architecture

```
┌─ Main Thread ────────────────────────────────────┐
│                                                    │
│  Feed / TabFeedPage                                │
│    ↓ illusts[] + layoutMode                        │
│  LayoutEngine (mode switch)                        │
│    ├─ WaterfallEngine → Comlink worker.compute()   │
│    ├─ GridEngine      → synchronous                │
│    └─ SingleEngine    → synchronous                │
│    ↓ MasonryLayout                                  │
│  createVirtualScroll                                │
│    ↓ visibleRange + getItemStyle                    │
│  VirtualItems (only ~30 DOM nodes)                  │
│    ├─ ImageCard (first 4)                          │
│    └─ LazyImageCard (rest, lazy image load)        │
│                                                    │
│  ── Thread boundary (Comlink) ────                 │
│                                                    │
│  Web Worker                                        │
│    computeMasonryLayout()                          │
│    appendToLayout()                                │
│    (pure functions, no DOM access)                 │
└────────────────────────────────────────────────────┘
```

## Data Structures

### MasonryItemLayout

```ts
interface MasonryItemLayout {
  index: number    // illusts[] subscript
  x: number        // px from container left
  y: number        // px from container top
  width: number    // rendered width
  height: number   // rendered height
  column: number   // column index (0-based)
}
```

### MasonryLayout

```ts
interface MasonryLayout {
  items: MasonryItemLayout[]
  totalHeight: number   // tallest column
  columns: number
  columnWidth: number
  gap: number
}
```

## Algorithms

### Shortest-Column Placement (Waterfall)

```
For each illust in order:
  1. Find column with smallest current y-offset
  2. Compute card height = columnWidth / aspectRatio
  3. Record position (x, y) = (col * (columnWidth + gap), nextY[col])
  4. Advance nextY[col] += cardHeight + gap
```

Complexity: O(n·k) where k = columnCount (2-3). No sorting.

### Incremental Append

When `fetchMore()` returns new illusts, the existing layout's column-tail positions are recovered from the last item per column, and the shortest-column algorithm resumes from there. No full recomputation.

### Window Computation

```ts
function computeWindow(layout, scrollTop, viewportHeight, overscan):
  → { startIndex, endIndex, offset }
```

Binary search on layout items' `y` to find the first item entering `scrollTop - overscan` and the last item within `scrollTop + viewportHeight + overscan`.

## Components

### `primitives/computeMasonryLayout.ts`
- Pure functions: `computeMasonryLayout`, `appendToLayout`, `computeWindow`
- No framework imports; portable to Worker

### `primitives/createVirtualScroll.ts`
- SolidJS primitive (Accessor-based)
- Consumes `MasonryLayout` + scroll position
- Returns `visibleRange`, `totalHeight`, `getItemStyle`

### `components/VirtualFeed.tsx` (refactored)
- Replaces CSS `columns` with absolute positioning via `getItemStyle`
- Contains `<PullIndicator>`, sentinel paginator, empty/error states
- Uses `useContainerWidth()` ResizeObserver to react to layout mode changes

### `components/LayoutEngine.tsx`
- Routes `layoutMode` to the appropriate layout engine
- For waterfall: delegates to Comlink worker
- For grid/single: synchronous computation

## Layout Modes

| Mode | Columns | Layout Engine | Notes |
|---|---|---|---|
| `waterfall` | 2 (default) | Comlink worker | Absolute-positioned masonry |
| `single` | 1 | Synchronous | Simple stacked rows |
| `grid` | 3 | Synchronous | Equal-height rows, 3 per row |

## Scroll Management

Replace `window.scrollTo` / `window.scrollY` with a **scrollable container div** inside VirtualFeed. This eliminates sticky-header conflicts and simplifies touch handling for pull-to-refresh.

- Tab scroll restoration: store `container.scrollTop` per tab instead of `window.scrollY`
- Pull-to-refresh: listen to container scroll position (scrollTop <= 0 to trigger)

## Service Worker (Phase 2)

Add Workbox-powered SW for Pixiv image caching:

```ts
registerRoute(
  ({ url }) => isPixivImage(url),
  new CacheFirst({
    cacheName: 'pixiv-images',
    maxEntries: 500,
    maxAgeSeconds: 30 * 24 * 60 * 60,
  }),
)
```

Image prefetch triggered by scroll prediction: when the virtual window expands, the main thread pushes predicted URLs to the SW via `postMessage` for proactive caching.

## File Changes

| File | Action |
|---|---|
| `src/primitives/types.ts` | **New** — MasonryItemLayout, MasonryLayout types |
| `src/primitives/computeMasonryLayout.ts` | **New** — shortest-column + append + window |
| `src/primitives/createVirtualScroll.ts` | **New** — SolidJS virtual scroll primitive |
| `src/components/VirtualFeed.tsx` | **Rewrite** — absolute positioning, virtual window |
| `src/components/LayoutEngine.tsx` | **New** — mode router |
| `sw.ts` | **New** — Workbox SW (phase 2) |
| `package.json` | Add `comlink`, `workbox-*` deps |

## FAQ

**Why not TanStack Virtual or virtua?**
Neither supports masonry (waterfall) natively. Both require custom position computation for variable-height items in a multi-column layout—the same work as building it directly. virtua's zero-config dynamic sizing is attractive for single/grid modes but doesn't solve waterfall.

**Why Comlink instead of inline computation?**
Layout computation is a pure O(n·k) function with no DOM dependency. Offloading it to a Worker via Comlink prevents computation spikes (on fetchMore or window resize) from blocking scroll frames on low-end devices.

**Why container scroll instead of window scroll?**
Container scroll gives deterministic control over the scrollable area, avoids sticky header interference with the virtualizer, and makes touch gesture handling (pull-to-refresh) more reliable on Android WebView.
