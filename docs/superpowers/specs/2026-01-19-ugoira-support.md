# Ugoira (Animated Illustration) Support

**Date**: 2026-01-19  
**Status**: Approved

## Overview

Add support for Pixiv ugoira (animated illustrations). These are ZIP archives containing JPEG frames + timing metadata. Currently they display as static/broken images because the original URL points to a ZIP file.

## Scope

- Detect `type === 'ugoira'` in IllustDetail
- New `UgoiraViewer` component: download ZIP → extract frames → play with correct timing
- New API function: `loadUgoiraMetadata(illustId)`
- Extend `PixivIllust.type` to include `'ugoira'`
- Feed thumbnails: unchanged (ugoira thumbnails are static JPEGs)

## Out of Scope

- Canvas-based rendering (use img tag rotation for simplicity)
- GIF export / download
- Frame-by-frame seeking
- Playback speed control

## Technical Spec

### 1. Types (`src/api/types.ts`)

`PixivIllust.type` extended: `'illust' | 'manga' | 'ugoira'`

### 2. API (`src/api/illust.ts`)

New function:

```ts
interface UgoiraMetadata {
  zip_urls: { medium: string }; // ZIP download URL
  frames: { file: string; delay: number }[]; // frame filenames + delays (ms)
}

export function loadUgoiraMetadata(illustId: number): Promise<UgoiraMetadata>;
// calls GET /v1/ugoira/metadata?illust_id={id}
```

### 3. UgoiraViewer (`src/components/UgoiraViewer.tsx`)

Props: `illustId: number`, `coverUrl: string` (thumbnail as fallback), `onClose: () => void`

Behavior:

1. Mount → show cover image + "加载动图中..." overlay
2. `loadUgoiraMetadata(id)` → get zip URL + frame delays
3. Fetch ZIP blob → `JSZip.loadAsync(blob)` → extract each frame's JPEG as base64 or blob URL
4. Store frames as `{ url: string, delay: number }[]`
5. Start playback: show first frame, `setTimeout` to next frame based on delay
6. Loop: when all frames shown, restart from frame 1
7. Click → toggle pause/play

UI: fullscreen overlay, same style as ImageViewer (dark backdrop, close button top-left)

### 4. IllustDetail (`src/routes/IllustDetail.tsx`)

In the viewer section, detect `illust()!.type === 'ugoira'` → render `<UgoiraViewer>` instead of `<ImageViewer>`.

Cover image (for the "tap to view" area) remains `imageUrls()[0]` — for ugoira this is the static thumbnail JPEG.

### 5. Dependency

Add `jszip` to `package.json`:

```bash
pnpm add jszip
```

JSZip is ~100KB gzipped, zero dependencies, used by pixivpy and other Pixiv clients.

## Files Changed

| File                              | Change                          |
| --------------------------------- | ------------------------------- |
| `src/api/types.ts`                | Extend type union               |
| `src/api/illust.ts`               | Add `loadUgoiraMetadata`        |
| `src/components/UgoiraViewer.tsx` | New component                   |
| `src/routes/IllustDetail.tsx`     | Conditional render UgoiraViewer |
| `package.json`                    | Add `jszip` dependency          |

## Verification

- Open a ugoira work → viewer shows animated playback
- Frame timing matches metadata delays
- Click to pause/resume
- Close button works
- Non-ugoira works remain unchanged
- Build passes
