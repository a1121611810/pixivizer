# Image Quality Settings — Design Spec

**Date:** 2026-06-20  
**Status:** Draft  
**Scope:** Add image quality controls to the settings panel for list and detail views

## Overview

Add two independent three-tier image quality selectors to the SettingsSheet:
one for the feed list, one for the illustration detail page. Each offers
three quality levels using Pixiv's available image sizes.

## Motivation

Currently image quality is hardcoded per view:

- Feed cards use `image_urls.medium` (≤540px)
- Detail cover uses `image_urls.large` (≤600×1200)
- Viewer uses `original` where available

Users on high-bandwidth connections or high-DPI screens may want sharper
images in the list. Users on metered connections may want to keep the
default. Each view should be independently configurable.

## Quality Tiers

| Tier | Label    | Feed (list)                                              | Detail (cover)                                           |
| ---- | -------- | -------------------------------------------------------- | -------------------------------------------------------- |
| 默认 | medium   | `image_urls.medium` (≤540px)                             | `image_urls.medium`                                      |
| 高清 | large    | `image_urls.large` (≤600×1200)                           | `image_urls.large`                                       |
| 原图 | original | `meta_single_page.original_image_url` (fallback → large) | `meta_single_page.original_image_url` (fallback → large) |

- The image viewer always uses the best available resolution (original when available, large otherwise) — this is NOT configurable.
- Multi-page illustrations: per-page URLs come from `meta_pages[].image_urls`, which only have `large` and `medium`. Original is not available per page, so the "原图" tier for multi-page works falls back to `large`.

## UI

### Settings Panel Layout

Two rows added below the existing theme toggle, each with a segmented three-button control:

```
┌──────────────────────────────────────────┐
│  设置                                     │
│  ──────────────────────────────────────── │
│  🌙 深色模式                      [Toggle]│
│  ──────────────────────────────────────── │
│  🖼️ 列表画质                              │
│     [ 默认 ] [ 高清 ] [ 原图 ]            │
│  🖼️ 详情画质                              │
│     [ 默认 ] [ 高清 ] [ 原图 ]            │
│  ──────────────────────────────────────── │
│  Pixivizer v0.1.0                        │
└──────────────────────────────────────────┘
```

- Active segment uses `segmented-item-active` style (brand background highlight)
- Inactive segments use `segmented-item-inactive`
- Controls are independent — changing one does not affect the other

### Segmented Control

Reuses the existing `segmented` / `segmented-item-active` / `segmented-item-inactive` shortcuts from `uno.config.ts`. Each segment is a `<button>` with the appropriate class applied via `classList`.

## Data Model

```typescript
// src/stores/uiStore.ts
export type ImageQuality = "medium" | "large" | "original";

const [listQuality, setListQuality] = createSignal<ImageQuality>("medium");
const [detailQuality, setDetailQuality] = createSignal<ImageQuality>("medium");

// Defaults: 'medium' matches current behavior for both views
```

## Data Flow

```
uiStore.ts
  listQuality: ImageQuality     (default: 'medium')
  detailQuality: ImageQuality   (default: 'medium')

SettingsSheet.tsx
  reads: listQuality, detailQuality
  writes: setListQuality, setDetailQuality
  renders: two <Segmented> rows

ImageCard.tsx
  reads: listQuality from uiStore
  resolves: image URL based on quality tier
  renders: <PixivImage src={resolvedUrl} />

IllustDetail.tsx
  reads: detailQuality from uiStore
  resolves: cover image URL based on quality tier
  renders: cover <PixivImage src={resolvedUrl} />
  (viewer URLs unchanged — always best available)
```

### URL Resolution Logic

```typescript
function resolveImageUrl(illust: PixivIllust, quality: ImageQuality, pageIndex?: number): string {
  if (pageIndex !== undefined) {
    // Multi-page: use meta_pages[pageIndex].image_urls
    const page = illust.meta_pages?.[pageIndex];
    if (!page) return illust.image_urls.medium;
    if (quality === "medium") return page.image_urls.medium;
    return page.image_urls.large; // large or original fallback
  }

  // Single page
  switch (quality) {
    case "medium":
      return illust.image_urls.medium;
    case "large":
      return illust.image_urls.large;
    case "original":
      return illust.meta_single_page?.original_image_url ?? illust.image_urls.large;
  }
}
```

## Files Changed

| File                               | Change                                                             |
| ---------------------------------- | ------------------------------------------------------------------ |
| `src/stores/uiStore.ts`            | Add `ImageQuality` type, `listQuality` and `detailQuality` signals |
| `src/components/SettingsSheet.tsx` | Add two segmented quality rows                                     |
| `src/components/ImageCard.tsx`     | Read `listQuality`, resolve URL before passing to PixivImage       |
| `src/routes/IllustDetail.tsx`      | Read `detailQuality`, resolve cover URL                            |

## Non-Goals

- No per-image override or long-press context menu
- No network-aware automatic quality adjustment
- No quality persistence beyond in-memory (no Capacitor Preferences storage for quality settings in v1)
- Viewer quality is not configurable (always uses best available)
- No avatar quality control (avatars stay at `profile_image_urls.medium`)

## Design Decisions

- **Segmented control rather than dropdown**: matches existing Fluent Design language in the app, provides one-tap switching, and the three options are short enough for horizontal layout.
- **`original` fallback to `large`**: not all illustrations have `original_image_url` (especially multi-page works). The resolve function silently falls back to the next best available size.
- **Defaults to `medium`**: preserves current behavior as the default, so existing users see no change unless they explicitly choose a higher tier.
