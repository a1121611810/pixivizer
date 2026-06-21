# Image Cache Size Setting — Design Spec

**Date:** 2026-06-20  
**Status:** Draft  
**Scope:** Add a configurable image cache size to the settings panel

## Overview

Add a fourth settings row that lets users choose the LRU image cache capacity
from four preset values. The image loader reads this value dynamically and
trims the cache when the limit is lowered.

## Motivation

The LRU image cache in `imageLoader.ts` is hardcoded at 600 entries. Users
on low-memory devices may want a smaller cache; users on high-end devices
may want a larger one for fewer re-fetches.

## UI

```
💾 图片缓存数     [ 200 | 400 | 600 | 1000 ]
  缓存数越大，图片加载越快，但占用的内存也越多。推荐 400~600。
```

- Segmented four-button control, same visual style as the existing quality rows.
- Active segment uses white bg + shadow; inactive segments are transparent.
- Hint text below in `--colorNeutralForeground3` at `fontSizeBase200`.

## Data Model

```typescript
// src/stores/uiStore.ts
export type CacheSize = 200 | 400 | 600 | 1000;
const [cacheSize, setCacheSize] = createSignal<CacheSize>(600);
```

## Data Flow

```
uiStore.ts
  cacheSize: CacheSize  (default: 600)

SettingsSheet.tsx
  reads: cacheSize
  writes: setCacheSize
  renders: segmented row + hint text

imageLoader.ts
  reads: cacheSize()
  on cacheSize change: if cache.size > cacheSize(), evict oldest entries
  cacheSet(): uses cacheSize() instead of hardcoded MAX_CACHE_SIZE
```

### Cache Eviction on Shrink

When `cacheSize` is lowered, the cache must immediately evict the oldest
entries until `cache.size <= cacheSize()`. This is done in a `createEffect`
or by wrapping the setter.

Simplest approach: in `imageLoader.ts`, replace the hardcoded `MAX_CACHE_SIZE`
constant with a function that reads `cacheSize()` from uiStore at eviction
time. The `cacheSet` function already iterates the cache to find the oldest
entry — it just needs to compare against the dynamic limit.

To avoid importing Solid reactivity into a plain module: export a
`setMaxCacheSize(n: number)` function that uiStore calls on change.

## Files Changed

| File | Change |
|------|--------|
| `src/stores/uiStore.ts` | Add `CacheSize` type, `cacheSize` signal, `setCacheSize` |
| `src/components/SettingsSheet.tsx` | Add cache size row with hint text |
| `src/utils/imageLoader.ts` | Replace `MAX_CACHE_SIZE` const with dynamic limit + `setMaxCacheSize()` |
| `src/stores/uiStore.ts` | Add `createEffect` that calls `setMaxCacheSize(cacheSize())` on change |

## Non-Goals

- No persistence of cache size setting across app restarts (v1)
- No per-image TTL or time-based eviction
- No cache statistics display
