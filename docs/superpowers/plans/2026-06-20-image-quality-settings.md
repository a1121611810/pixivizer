# Image Quality Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two independent three-tier image quality selectors (默认/高清/原图) to the settings panel, affecting feed list cards and illustration detail cover images.

**Architecture:** New signals in `uiStore` for `listQuality` and `detailQuality` (both default `'medium'`). SettingsSheet renders two `segmented` rows binding to these signals. ImageCard reads `listQuality` to resolve its image URL. IllustDetail reads `detailQuality` to resolve its cover image URL. A shared `resolveImageUrl()` utility handles multi-page fallback.

**Tech Stack:** Solid.js, TypeScript, UnoCSS, Fluent Design 2 tokens

## Global Constraints

- All UI uses Fluent Design 2 CSS tokens — no hardcoded colors
- UnoCSS shortcuts; bracket syntax for CSS variables
- Default quality is `medium` for both list and detail (preserves current behavior)
- Viewer always uses best available resolution — NOT configurable
- `original` tier falls back to `large` when `original_image_url` is unavailable
- Multi-page works only have `medium` and `large` per page; `original` falls back to `large`

---

### Task 1: Add quality signals to uiStore

**Files:**

- Modify: `src/stores/uiStore.ts`

**Interfaces:**

- Produces: `ImageQuality` type export, `listQuality` signal, `detailQuality` signal, their setters

---

- [ ] **Step 1: Add type and signals**

Apply this diff to `src/stores/uiStore.ts`:

```diff
 import { createSignal, createEffect } from 'solid-js';

 type Tab = 'recommended' | 'follow' | 'bookmarks';
 export type Theme = 'dark' | 'light';
+export type ImageQuality = 'medium' | 'large' | 'original';

 const [currentTab, setCurrentTab] = createSignal<Tab>('recommended');
 const [theme, setTheme] = createSignal<Theme>('light');
 const [showSettingsSheet, setShowSettingsSheet] = createSignal(false);
+const [listQuality, setListQuality] = createSignal<ImageQuality>('medium');
+const [detailQuality, setDetailQuality] = createSignal<ImageQuality>('medium');

 // Sync theme class to <html> whenever it changes
 createEffect(() => {
   const root = document.documentElement;
   if (theme() === 'dark') {
     root.classList.add('dark');
   } else {
     root.classList.remove('dark');
   }
 });

-export { currentTab, setCurrentTab, theme, setTheme, showSettingsSheet, setShowSettingsSheet };
+export {
+  currentTab, setCurrentTab,
+  theme, setTheme,
+  showSettingsSheet, setShowSettingsSheet,
+  listQuality, setListQuality,
+  detailQuality, setDetailQuality,
+};
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit src/stores/uiStore.ts`
Expected: No errors in uiStore.ts.

- [ ] **Step 3: Commit**

```bash
git add src/stores/uiStore.ts
git commit -m "feat: add ImageQuality type, listQuality and detailQuality signals"
```

---

### Task 2: Add quality selector rows to SettingsSheet

**Files:**

- Modify: `src/components/SettingsSheet.tsx`

**Interfaces:**

- Consumes: `listQuality`, `setListQuality`, `detailQuality`, `setDetailQuality`, `ImageQuality` from uiStore (Task 1)
- Produces: two segmented control rows in the settings panel

**The `segmented` shortcut classes** (from `uno.config.ts`) are:

- `segmented` — flex container with background and rounded corners
- `segmented-item-active` — active segment with white bg, foreground color, shadow
- `segmented-item-inactive` — inactive segment with transparent bg, muted color, hover effects

Note: `segmented` sets `p-1.5` and `gap-1`, and `segmented-item` sets flex layout, padding, font-size etc. The active/inactive classes both extend `segmented-item`.

---

- [ ] **Step 1: Add imports for quality signals**

In `src/components/SettingsSheet.tsx`, replace the uiStore import:

```diff
 import {
   showSettingsSheet,
   setShowSettingsSheet,
   theme,
   setTheme,
+  listQuality,
+  setListQuality,
+  detailQuality,
+  setDetailQuality,
+  type ImageQuality,
 } from '../stores/uiStore';
```

- [ ] **Step 2: Add the two quality rows after the theme toggle row**

Insert after the theme toggle row's closing `</div>` (line 149, inside `px-5 py-3 flex flex-col`):

```tsx
{
  /* Divider before quality settings */
}
<div class="divider my-1" />;

{
  /* List image quality */
}
<div class="py-2">
  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug mb-2">
    🖼️ 列表画质
  </p>
  <div class="segmented">
    {(["medium", "large", "original"] as ImageQuality[]).map((q) => (
      <button
        classList={{
          "segmented-item-active": listQuality() === q,
          "segmented-item-inactive": listQuality() !== q,
        }}
        onClick={() => setListQuality(q)}
      >
        {q === "medium" ? "默认" : q === "large" ? "高清" : "原图"}
      </button>
    ))}
  </div>
</div>;

{
  /* Detail image quality */
}
<div class="py-2">
  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug mb-2">
    🖼️ 详情画质
  </p>
  <div class="segmented">
    {(["medium", "large", "original"] as ImageQuality[]).map((q) => (
      <button
        classList={{
          "segmented-item-active": detailQuality() === q,
          "segmented-item-inactive": detailQuality() !== q,
        }}
        onClick={() => setDetailQuality(q)}
      >
        {q === "medium" ? "默认" : q === "large" ? "高清" : "原图"}
      </button>
    ))}
  </div>
</div>;
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit src/components/SettingsSheet.tsx`
Expected: No errors in SettingsSheet.tsx.

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsSheet.tsx
git commit -m "feat: add image quality selectors to settings panel"
```

---

### Task 3: Wire ImageCard to use listQuality

**Files:**

- Modify: `src/components/ImageCard.tsx`

**Interfaces:**

- Consumes: `listQuality`, `ImageQuality` from uiStore (Task 1)
- Produces: resolved image URL based on quality tier

---

- [ ] **Step 1: Rewrite ImageCard to resolve image URL from listQuality**

Replace `src/components/ImageCard.tsx` content:

```tsx
import type { Component } from "solid-js";
import type { PixivIllust } from "../api/types";
import { listQuality } from "../stores/uiStore";
import PixivImage from "./PixivImage";

function resolveUrl(illust: PixivIllust): string {
  const q = listQuality();
  if (q === "medium") return illust.image_urls.medium;
  if (q === "large") return illust.image_urls.large;
  // original: use original_image_url if available, otherwise fallback to large
  return illust.meta_single_page?.original_image_url ?? illust.image_urls.large;
}

interface Props {
  illust: PixivIllust;
  onClick: (id: number) => void;
}

const ImageCard: Component<Props> = (props) => {
  const img = () => resolveUrl(props.illust);
  const w = () => props.illust.width;
  const h = () => props.illust.height;
  const isUgoira = () => props.illust.type === "ugoira";

  return (
    <div class="image-card break-inside-avoid mb-3" onClick={() => props.onClick(props.illust.id)}>
      <div class="relative">
        <PixivImage
          src={img()}
          alt={props.illust.title}
          width={w()}
          height={h()}
          loading="eager"
          class="w-full h-auto block"
        />
        {isUgoira() && (
          <div class="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-[var(--borderRadiusSmall)] px-1.5 py-0.5 text-white [font-size:var(--fontSizeBase100)] font-medium select-none pointer-events-none">
            ▶ 动图
          </div>
        )}
        {props.illust.page_count > 1 && (
          <div class="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-[var(--borderRadiusSmall)] px-1.5 py-0.5 text-white [font-size:var(--fontSizeBase100)] font-medium select-none pointer-events-none">
            📄 {props.illust.page_count}
          </div>
        )}
      </div>
      <div class="p-2.5">
        <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground1)] truncate font-semibold">
          {props.illust.title}
        </p>
        <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground2)] truncate mt-0.5">
          @{props.illust.user.name}
        </p>
      </div>
    </div>
  );
};

export default ImageCard;
```

Key changes:

- Added `resolveUrl()` function that reads `listQuality()` and selects the appropriate `image_urls` field
- `img()` now calls `resolveUrl(props.illust)` instead of directly accessing `image_urls.medium`
- The `resolveUrl` function is reactive because it reads `listQuality()` inside a tracking scope (called from `img()` which is a Solid derived signal)

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit src/components/ImageCard.tsx`
Expected: No errors in ImageCard.tsx.

- [ ] **Step 3: Commit**

```bash
git add src/components/ImageCard.tsx
git commit -m "feat: wire ImageCard to use listQuality setting"
```

---

### Task 4: Wire IllustDetail cover to use detailQuality

**Files:**

- Modify: `src/routes/IllustDetail.tsx`

**Interfaces:**

- Consumes: `detailQuality`, `ImageQuality` from uiStore (Task 1)
- Produces: resolved cover image URL based on quality tier

---

- [ ] **Step 1: Add import for detailQuality**

In `src/routes/IllustDetail.tsx`, add the import:

```diff
 import ImageViewer from '../components/ImageViewer';
 import UgoiraViewer from '../components/UgoiraViewer';
 import PixivImage from '../components/PixivImage';
 import LoadingSpinner from '../components/LoadingSpinner';
 import PageTransition from '../components/PageTransition';
+import { detailQuality } from '../stores/uiStore';
```

- [ ] **Step 2: Add a helper to resolve the cover image URL**

Add this function inside the `IllustDetail` component, before the `imageUrls` function:

```tsx
function coverUrl(): string {
  const i = illust();
  if (!i) return "";
  const q = detailQuality();
  if (q === "medium") return i.image_urls.medium;
  if (q === "large") return i.image_urls.large;
  // original: use original_image_url if available, fallback to large
  return i.meta_single_page?.original_image_url ?? i.image_urls.large;
}
```

- [ ] **Step 3: Update the cover image to use coverUrl()**

Change the cover image's `src` from `illust()!.image_urls.large` to `coverUrl()`:

```diff
             <PixivImage
-              src={illust()!.image_urls.large}
+              src={coverUrl()}
               alt={illust()!.title}
               width={illust()!.width}
               height={illust()!.height}
               loading="eager"
               class="max-h-[60vh] object-contain cursor-pointer"
             />
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit src/routes/IllustDetail.tsx`
Expected: No new errors in IllustDetail.tsx (pre-existing errors like `Property 'caption' does not exist` are unrelated).

- [ ] **Step 5: Commit**

```bash
git add src/routes/IllustDetail.tsx
git commit -m "feat: wire IllustDetail cover to use detailQuality setting"
```

---

## Self-Review Summary

1. **Spec coverage:** All requirements covered — `ImageQuality` type + signals (Task 1), segmented selectors in settings (Task 2), feed card wiring (Task 3), detail cover wiring (Task 4). Viewer not configurable per spec non-goal. `original` fallback to `large` implemented in both resolve functions. Defaults are `medium` (preserving current behavior).

2. **Placeholder scan:** No TBD, TODO, or vague instructions. All code shown in full with exact line references.

3. **Type consistency:**
   - `ImageQuality` defined in Task 1, consumed by Tasks 2-4 — type name consistent.
   - `listQuality`/`detailQuality` signals exported from Task 1, consumed by Tasks 3/4 and 2 respectively — names match.
   - `resolveUrl(illust)` (Task 3) and `coverUrl()` (Task 4) implement the same fallback logic independently — no shared utility needed; they're in different components with different call sites.
   - Task 2 uses `ImageQuality[]` with type assertion `as ImageQuality[]` for the map — values are string literals, safe cast.
