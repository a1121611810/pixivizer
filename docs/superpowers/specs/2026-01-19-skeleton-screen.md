# Skeleton Screen for Uncached Tab Switch

**Date**: 2026-01-19  
**Status**: Approved

## Overview

When switching to a tab that has no cached data, immediately clear old illusts and show skeleton placeholder cards (shimmer) instead of keeping old data visible with a loading spinner. This provides instant visual feedback that a tab switch is in progress.

## Scope

- New `SkeletonCard` component
- `VirtualFeed` renders skeletons when `loading=true && illusts.length === 0`
- `feedStore.ensureLoaded()` clears `illusts` before async fetch for uncached tabs
- Fixed count of 10 skeleton cards (fills ~2 screens on mobile)

## Out of Scope

- Skeleton for cached tab switches (already instant)
- Skeleton for "load more" (keeps spinner)
- Skeleton for pull-to-refresh (keeps spinner)
- Dynamic skeleton count based on viewport

## Technical Spec

### 1. SkeletonCard (`src/components/SkeletonCard.tsx`)

Matches `ImageCard` layout exactly:

- Container: `image-card` class for border/radius/shadow consistency
- Image area: `aspect-ratio: 1/1` shimmer rectangle with `fluent-shimmer` animation (same gradient + timing as PixivImage placeholder)
- Text area: two shimmer lines (title ~60% width, author ~40% width), `h-3 rounded` shapes, `p-2.5` padding matching ImageCard

### 2. VirtualFeed (`src/components/VirtualFeed.tsx`)

Props unchanged. Rendering logic:

- `loading=true && illusts.length === 0` → render 10 `<SkeletonCard>` (no entrance animation)
- `loading=true && illusts.length > 0` → existing: real cards + spinner at bottom
- `!loading` → real cards

### 3. feedStore (`src/stores/feedStore.ts`)

`ensureLoaded()` uncached path:

```
setIllusts([])  // ← NEW: clear old data immediately
forceLoad()
```

`forceLoad()` already has `if (loading()) return` guard — prevents duplicate fetches.

### 4. Log cleanup

Remove all `console.log` added for debugging in previous rounds.

## Files Changed

| File                              | Change                                                  |
| --------------------------------- | ------------------------------------------------------- |
| `src/components/SkeletonCard.tsx` | New                                                     |
| `src/components/VirtualFeed.tsx`  | Render skeletons when loading + empty                   |
| `src/stores/feedStore.ts`         | Clear illusts on uncached tab switch; remove debug logs |

## Verification

- Build passes
- Switch to uncached tab → skeletons appear instantly (no old data visible)
- Switch to cached tab → real cards appear instantly (unchanged)
- Scroll load more → spinner at bottom (unchanged)
- Pull-to-refresh → spinner (unchanged)
