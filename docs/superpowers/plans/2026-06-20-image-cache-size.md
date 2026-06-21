# Image Cache Size Setting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable image cache size (200/400/600/1000) to the settings panel, replacing the hardcoded MAX_CACHE_SIZE in imageLoader.

**Architecture:** Export a `setMaxCacheSize(n)` function from imageLoader that updates a module-level limit and evicts excess entries. Add a `cacheSize` signal to uiStore with a `createEffect` that calls `setMaxCacheSize` whenever the signal changes. Add a segmented four-button row to SettingsSheet.

**Tech Stack:** Solid.js, TypeScript, UnoCSS, Fluent Design 2 tokens

## Global Constraints

- Default cache size is 600 (preserves current behavior)
- Values: 200, 400, 600, 1000
- When cache limit is lowered, immediately evict oldest entries
- No persistence across app restarts (v1)
- Hint text: "缓存数越大，图片加载越快，但占用的内存也越多。推荐 400~600。"

---

### Task 1: Make imageLoader cache limit dynamic

**Files:**
- Modify: `src/utils/imageLoader.ts`

**Interfaces:**
- Produces: `setMaxCacheSize(n: number): void` — exported function
- Consumes: nothing from other tasks

---

- [ ] **Step 1: Replace hardcoded MAX_CACHE_SIZE with dynamic limit + export setMaxCacheSize**

In `src/utils/imageLoader.ts`, make these changes:

**Change 1 — Replace const with mutable variable:**
```diff
-const MAX_CACHE_SIZE = 600;
+let maxCacheSize = 600;
```

**Change 2 — Add setter + eviction function:**
```typescript
/** Update the cache size limit. If lowered, evict oldest entries immediately. */
export function setMaxCacheSize(n: number): void {
  maxCacheSize = n;
  // Evict excess entries
  while (cache.size > maxCacheSize) {
    let oldestKey = "";
    let oldestTime = Infinity;
    for (const [k, v] of cache) {
      if (v.lastAccess < oldestTime) {
        oldestTime = v.lastAccess;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      const old = cache.get(oldestKey);
      if (old) URL.revokeObjectURL(old.blobUrl);
      cache.delete(oldestKey);
    } else {
      break; // safety: shouldn't happen, but avoid infinite loop
    }
  }
}
```

**Change 3 — Update cacheSet to use the variable:**
```diff
-  if (cache.size >= MAX_CACHE_SIZE) {
+  if (cache.size >= maxCacheSize) {
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit src/utils/imageLoader.ts`
Expected: No errors in imageLoader.ts.

- [ ] **Step 3: Commit**

```bash
git add src/utils/imageLoader.ts
git commit -m "feat: make image cache limit dynamic with setMaxCacheSize()"
```

---

### Task 2: Add cacheSize signal and sync to imageLoader

**Files:**
- Modify: `src/stores/uiStore.ts`

**Interfaces:**
- Consumes: `setMaxCacheSize` from `src/utils/imageLoader.ts` (Task 1)
- Produces: `CacheSize` type, `cacheSize` signal, `setCacheSize` setter

---

- [ ] **Step 1: Add type, signal, setter, and effect**

Apply these edits to `src/stores/uiStore.ts`:

**Edit 1 — Add import:**
```diff
 import { createSignal, createEffect } from "solid-js";
+import { setMaxCacheSize } from "../utils/imageLoader";
```

**Edit 2 — Add type and signal:**
```diff
 export type ImageQuality = "medium" | "large" | "original";
+export type CacheSize = 200 | 400 | 600 | 1000;

 const [currentTab, setCurrentTab] = createSignal<Tab>("recommended");
 const [theme, setTheme] = createSignal<Theme>("light");
 const [showSettingsSheet, setShowSettingsSheet] = createSignal(false);
 const [listQuality, setListQuality] = createSignal<ImageQuality>("medium");
 const [detailQuality, setDetailQuality] = createSignal<ImageQuality>("medium");
+const [cacheSize, setCacheSize] = createSignal<CacheSize>(600);
```

**Edit 3 — Add sync effect (after existing effects):**
```diff
+// Sync cache size limit to imageLoader whenever it changes
+createEffect(() => {
+  setMaxCacheSize(cacheSize());
+});
```

**Edit 4 — Update export:**
```diff
 export {
   currentTab, setCurrentTab,
   theme, setTheme,
   showSettingsSheet, setShowSettingsSheet,
   listQuality, setListQuality,
   detailQuality, setDetailQuality,
+  cacheSize, setCacheSize,
 };
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit src/stores/uiStore.ts`
Expected: No errors in uiStore.ts.

- [ ] **Step 3: Commit**

```bash
git add src/stores/uiStore.ts
git commit -m "feat: add cacheSize signal synced to imageLoader"
```

---

### Task 3: Add cache size row to SettingsSheet

**Files:**
- Modify: `src/components/SettingsSheet.tsx`

**Interfaces:**
- Consumes: `cacheSize`, `setCacheSize`, `CacheSize` from uiStore (Task 2)

---

- [ ] **Step 1: Add imports**

In `src/components/SettingsSheet.tsx`, update the uiStore import:

```diff
   detailQuality,
   setDetailQuality,
   type ImageQuality,
+  cacheSize,
+  setCacheSize,
+  type CacheSize,
 } from '../stores/uiStore';
```

- [ ] **Step 2: Insert cache size row before the version footer**

Insert after the detail quality row's closing `</div>` (before the `{/* Divider */}` that precedes the version footer):

```tsx
            {/* Divider before cache size */}
            <div class="divider my-3" />

            {/* Image cache size */}
            <div class="py-2">
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug mb-2">
                💾 图片缓存数
              </p>
              <div class="flex [background-color:var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
                {([200, 400, 600, 1000] as CacheSize[]).map((n) => (
                  <button
                    class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                    classList={{
                      '[background-color:var(--colorNeutralBackground1)] [color:var(--colorNeutralForeground1)] shadow-[var(--elevation2)]': cacheSize() === n,
                      '[background-color:transparent] [color:var(--colorNeutralForeground2)]': cacheSize() !== n,
                    }}
                    onClick={() => setCacheSize(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p class="mt-1 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                缓存数越大，图片加载越快，但占用的内存也越多。推荐 400~600。
              </p>
            </div>
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit src/components/SettingsSheet.tsx`
Expected: No errors in SettingsSheet.tsx.

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsSheet.tsx
git commit -m "feat: add image cache size selector to settings panel"
```

---

## Self-Review Summary

1. **Spec coverage:** All requirements covered — dynamic cache limit (Task 1), signal + sync (Task 2), segmented row + hint text (Task 3). Default 600 preserved. Eviction on shrink handled by `setMaxCacheSize`. Non-goals respected (no persistence, no TTL, no stats).

2. **Placeholder scan:** No TBD, TODO, or vague instructions. All code shown in full.

3. **Type consistency:**
   - `CacheSize` defined in Task 2, consumed in Task 3 — type name matches.
   - `setMaxCacheSize(n: number)` exported from Task 1, called in Task 2 — signature consistent.
   - `cacheSize`, `setCacheSize` exported from Task 2, consumed in Task 3 — names match.
