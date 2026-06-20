# Pull-to-Reveal Settings Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hidden settings panel that reveals via pull-down gesture on the Feed page, with dark/light theme toggle as the v1 setting.

**Architecture:** Extend the existing pull-to-refresh in `VirtualFeed` with a dual-threshold mechanism (60px = refresh, 130px = settings). Extract the pull indicator into its own `PullIndicator` component. Create a new `SettingsSheet` top-sheet component with acrylic styling that slides down from the top. Wire everything through `uiStore` signals.

**Tech Stack:** Solid.js, TypeScript, UnoCSS, Fluent Design 2 tokens (CSS custom properties)

## Global Constraints

- All UI uses Fluent Design 2 CSS tokens defined in `index.html` — no hardcoded colors
- UnoCSS shortcuts defined in `uno.config.ts`; use bracket syntax for CSS variables
- Settings panel v1 contains only the dark/light theme toggle
- Zero UI footprint: no settings icon/button added to app bar or nav bar
- Gesture-only access via pull-down on Feed page
- Panel closes on: tap-scrim, back-button (Android), swipe-up (future enhancement)

---

## File Map

| File                               | Action | Responsibility                                                       |
| ---------------------------------- | ------ | -------------------------------------------------------------------- |
| `src/stores/uiStore.ts`            | Modify | Add `showSettingsSheet` signal                                       |
| `src/components/PullIndicator.tsx` | Create | Zone-aware pull indicator (extracted from VirtualFeed)               |
| `src/components/VirtualFeed.tsx`   | Modify | Dual-threshold pull logic, use PullIndicator, emit settings-open     |
| `src/components/SettingsSheet.tsx` | Create | Top-sheet panel with theme toggle, acrylic styling, spring animation |
| `src/routes/Feed.tsx`              | Modify | Render SettingsSheet, pass `onSettingsOpen` to VirtualFeed           |
| `src/App.tsx`                      | Modify | Handle Android back button when settings sheet is open               |
| `index.html`                       | Modify | Add `fluent-slide-down` and `fluent-slide-up` keyframes              |

---

### Task 1: Add `showSettingsSheet` signal to uiStore

**Files:**

- Modify: `src/stores/uiStore.ts`

**Interfaces:**

- Produces: `showSettingsSheet: Accessor<boolean>`, `setShowSettingsSheet: Setter<boolean>` (from `createSignal`)

---

- [ ] **Step 1: Add the signal and export it**

```diff
 import { createSignal, createEffect } from 'solid-js';

 type Tab = 'recommended' | 'follow' | 'bookmarks';
 export type Theme = 'dark' | 'light';

 const [currentTab, setCurrentTab] = createSignal<Tab>('recommended');
 const [theme, setTheme] = createSignal<Theme>('light');
+const [showSettingsSheet, setShowSettingsSheet] = createSignal(false);

 // Sync theme class to <html> whenever it changes
 createEffect(() => {
   const root = document.documentElement;
   if (theme() === 'dark') {
     root.classList.add('dark');
   } else {
     root.classList.remove('dark');
   }
 });

 // Log tab changes for debugging
 createEffect(() => {
 });

-export { currentTab, setCurrentTab, theme, setTheme };
+export { currentTab, setCurrentTab, theme, setTheme, showSettingsSheet, setShowSettingsSheet };
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/stores/uiStore.ts`
Expected: No errors (or only pre-existing errors unrelated to our change).

- [ ] **Step 3: Commit**

```bash
git add src/stores/uiStore.ts
git commit -m "feat: add showSettingsSheet signal to uiStore"
```

---

### Task 2: Create PullIndicator component

**Files:**

- Create: `src/components/PullIndicator.tsx`

**Interfaces:**

- Produces: `<PullIndicator>` component
- Props: `{ zone: PullZone, distance: number, refreshThreshold: number, settingsThreshold: number }`
- Type `PullZone`: `'idle' | 'pulling' | 'refresh-ready' | 'settings-ready' | 'refreshing'`

---

- [ ] **Step 1: Create the PullIndicator component**

Write `src/components/PullIndicator.tsx`:

```tsx
import type { Component } from "solid-js";
import { Show, Switch, Match } from "solid-js";

export type PullZone = "idle" | "pulling" | "refresh-ready" | "settings-ready" | "refreshing";

interface Props {
  zone: PullZone;
  distance: number;
  refreshThreshold: number;
  settingsThreshold: number;
}

const PullIndicator: Component<Props> = (props) => {
  const height = () => props.distance;
  const opacity = () => Math.min(props.distance / props.refreshThreshold, 1);

  return (
    <div
      class="flex justify-center overflow-hidden"
      style={{
        height: `${height()}px`,
        opacity: opacity(),
        transition:
          props.zone === "idle" ? "height var(--durationFast) var(--curveDecelerateMid)" : "none",
      }}
    >
      <div class="flex items-center gap-2 py-2 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground2)] select-none">
        <Switch>
          <Match when={props.zone === "refreshing"}>
            <span class="spinner w-4 h-4" />
            刷新中...
          </Match>
          <Match when={props.zone === "settings-ready"}>⚙️ 松手打开设置</Match>
          <Match when={props.zone === "refresh-ready"}>✨ 松开刷新</Match>
          <Match when={props.zone === "pulling"}>
            {props.distance < props.settingsThreshold ? "↓ 下拉刷新" : "⏣ 继续下拉打开设置"}
          </Match>
        </Switch>
      </div>
    </div>
  );
};

export default PullIndicator;
```

- [ ] **Step 2: Verify it compiles in isolation**

Run: `npx tsc --noEmit src/components/PullIndicator.tsx`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PullIndicator.tsx
git commit -m "feat: add PullIndicator component with zone-aware display"
```

---

### Task 3: Modify VirtualFeed for dual-threshold pull logic

**Files:**

- Modify: `src/components/VirtualFeed.tsx`

**Interfaces:**

- Consumes: `PullIndicator` component (Task 2), `PullZone` type (Task 2)
- Produces: `onSettingsOpen` prop on `VirtualFeed`
- New constants: `PULL_THRESHOLD = 60` (unchanged), `SETTINGS_THRESHOLD = 130`
- Phase transitions: `idle → pulling → refresh-ready → settings-ready`, `refresh-ready → refreshing`

---

- [ ] **Step 1: Replace inline pull indicator with PullIndicator component and add dual-threshold logic**

Apply these edits to `src/components/VirtualFeed.tsx`:

**Edit 1 — Add import for PullIndicator:**

```diff
 import ImageCard from './ImageCard';
 import LoadingSpinner from './LoadingSpinner';
 import SkeletonCard from './SkeletonCard';
+import PullIndicator from './PullIndicator';
+import type { PullZone } from './PullIndicator';
 import type { PixivIllust } from '../api/types';
```

**Edit 2 — Add `onSettingsOpen` to Props interface:**

```diff
 interface Props {
   illusts: PixivIllust[];
   loading: boolean;
   error: string | null;
   hasMore: boolean;
   onIllustClick: (id: number) => void;
   onLoadMore: () => void;
   onRefresh: () => Promise<void> | void;
+  onSettingsOpen?: () => void;
   skipAnimation?: boolean;
 }
```

**Edit 3 — Replace phase type and add SETTINGS_THRESHOLD:**

```diff
   let sentinel: HTMLDivElement | undefined;

   const PULL_THRESHOLD = 60;
-  const [pullDistance, setPullDistance] = createSignal(0);
-  const [pullPhase, setPullPhase] = createSignal<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
+  const SETTINGS_THRESHOLD = 130;
+  const MAX_PULL = 200;
+  const [pullDistance, setPullDistance] = createSignal(0);
+  const [pullPhase, setPullPhase] = createSignal<PullZone>('idle');
   let touchStartY = 0;
```

**Edit 4 — Update createEffect that resets after refresh:**

```diff
   createEffect(() => {
     if (pullPhase() === 'refreshing' && !props.loading) {
       setPullDistance(0);
       setPullPhase('idle');
     }
   });
```

(No change needed — this effect works with the new phase values since `'refreshing'` still exists.)

**Edit 5 — Update handleTouchMove to use dual thresholds:**

```diff
   function handleTouchMove(e: TouchEvent) {
     if (pullPhase() === 'idle' || pullPhase() === 'refreshing') return;
     const deltaY = e.touches[0].clientY - touchStartY;
     if (deltaY < 0) {
       setPullDistance(0);
       setPullPhase('idle');
       return;
     }
-    const damped = Math.min(deltaY * 0.5, 120);
+    const damped = Math.min(deltaY * 0.5, MAX_PULL);
     setPullDistance(damped);
-    setPullPhase(damped >= PULL_THRESHOLD ? 'ready' : 'pulling');
+    if (damped >= SETTINGS_THRESHOLD) {
+      setPullPhase('settings-ready');
+    } else if (damped >= PULL_THRESHOLD) {
+      setPullPhase('refresh-ready');
+    } else {
+      setPullPhase('pulling');
+    }
   }
```

**Edit 6 — Update handleTouchEnd for dual thresholds:**

```diff
   function handleTouchEnd() {
-    if (pullPhase() === 'ready') {
+    if (pullPhase() === 'settings-ready') {
+      setPullDistance(0);
+      setPullPhase('idle');
+      props.onSettingsOpen?.();
+    } else if (pullPhase() === 'refresh-ready') {
       setPullPhase('refreshing');
       setPullDistance(PULL_THRESHOLD * 0.6);
       props.onRefresh();
     } else {
       setPullDistance(0);
       setPullPhase('idle');
     }
   }
```

**Edit 7 — Replace the inline pull indicator JSX with PullIndicator component:**

```diff
       {/* Pull-to-refresh indicator */}
-      <div
-        class="flex justify-center overflow-hidden"
-        style={{
-          height: `${pullDistance()}px`,
-          opacity: Math.min(pullDistance() / PULL_THRESHOLD, 1),
-          transition: 'height var(--durationFast) var(--curveDecelerateMid)',
-        }}
-      >
-        <div class="flex items-center gap-2 py-2 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground2)] select-none">
-          {pullPhase() === 'refreshing' ? (
-            <>
-              <span class="spinner w-4 h-4" />
-              刷新中...
-            </>
-          ) : pullPhase() === 'ready' ? (
-            '✨ 松开刷新'
-          ) : (
-            '↓ 下拉刷新'
-          )}
-        </div>
-      </div>
+      <PullIndicator
+        zone={pullPhase()}
+        distance={pullDistance()}
+        refreshThreshold={PULL_THRESHOLD}
+        settingsThreshold={SETTINGS_THRESHOLD}
+      />
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/components/VirtualFeed.tsx`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/VirtualFeed.tsx
git commit -m "feat: add dual-threshold pull logic with settings-open callback"
```

---

### Task 4: Create SettingsSheet component

**Files:**

- Create: `src/components/SettingsSheet.tsx`

**Interfaces:**

- Consumes: `showSettingsSheet`, `setShowSettingsSheet`, `theme`, `setTheme` from `uiStore` (Task 1)
- Produces: `<SettingsSheet>` component (no props — self-contained, reads/writes uiStore)
- Global side effect: sets `(window as any).__settingsOpen` while mounted; listens for `closeSettings` custom event

---

- [ ] **Step 1: Create SettingsSheet component with full implementation**

Write `src/components/SettingsSheet.tsx`:

```tsx
import { type Component, Show, onMount, onCleanup, createSignal } from "solid-js";
import { showSettingsSheet, setShowSettingsSheet, theme, setTheme } from "../stores/uiStore";

const SettingsSheet: Component = () => {
  const [closing, setClosing] = createSignal(false);
  const [mounted, setMounted] = createSignal(false);

  // Animate in on mount
  onMount(() => {
    (window as any).__settingsOpen = true;
    requestAnimationFrame(() => setMounted(true));

    const handler = () => close();
    window.addEventListener("closeSettings", handler);

    onCleanup(() => {
      (window as any).__settingsOpen = false;
      window.removeEventListener("closeSettings", handler);
    });
  });

  function close() {
    setClosing(true);
    setTimeout(() => {
      setShowSettingsSheet(false);
      setClosing(false);
      setMounted(false);
    }, 250); // match --durationGentle
  }

  function handleScrimClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function toggleTheme() {
    setTheme(theme() === "dark" ? "light" : "dark");
  }

  // Prevent body scroll while sheet is open
  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
  }

  return (
    <Show when={showSettingsSheet()}>
      <div class="fixed inset-0 z-50" onClick={handleScrimClick} onTouchMove={handleTouchMove}>
        {/* Scrim */}
        <div
          class="absolute inset-0 transition-opacity"
          style={{
            "background-color": "rgba(0, 0, 0, 0.4)",
            opacity: mounted() && !closing() ? 1 : 0,
            transition: `opacity var(--durationGentle) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}`,
          }}
        />

        {/* Sheet — slides down from top */}
        <div
          class="absolute top-0 left-0 right-0 surface-appbar rounded-b-[var(--borderRadius4XLarge)] shadow-[var(--elevation28)]"
          style={{
            "max-height": "50vh",
            "overflow-y": "auto",
            transform: mounted() && !closing() ? "translateY(0)" : "translateY(-100%)",
            opacity: mounted() && !closing() ? 1 : 0,
            transition: `transform var(--durationGentle) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}, opacity var(--durationNormal) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}`,
          }}
        >
          {/* Drag handle (visual affordance, non-functional in v1) */}
          <div class="flex justify-center pt-2 pb-1">
            <div class="w-10 h-1 rounded-[var(--borderRadiusCircular)] bg-[var(--colorNeutralStroke1)]" />
          </div>

          {/* Header */}
          <div class="flex items-center justify-between px-5 pt-1 pb-2">
            <h2 class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
              设置
            </h2>
            <button class="btn-icon" onClick={close} aria-label="关闭设置">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M15.14 4.86a.67.67 0 0 0-.95 0L10 9.05 5.81 4.86a.67.67 0 0 0-.95.95L9.05 10l-4.19 4.19a.67.67 0 0 0 .95.95L10 10.95l4.19 4.19a.67.67 0 0 0 .95-.95L10.95 10l4.19-4.19a.67.67 0 0 0 0-.95z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div class="divider mx-5" />

          {/* ── Settings rows ── */}
          <div class="px-5 py-3 flex flex-col">
            {/* Theme toggle row */}
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <span class="text-xl leading-none select-none">
                  {theme() === "dark" ? "🌙" : "☀️"}
                </span>
                <div>
                  <p class="[font-size:var(--fontSizeBase300)] font-medium text-[var(--colorNeutralForeground1)] leading-snug">
                    深色模式
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    {theme() === "dark" ? "已开启" : "已关闭"}
                  </p>
                </div>
              </div>

              {/* Fluent-style toggle switch */}
              <button
                onClick={toggleTheme}
                role="switch"
                aria-checked={theme() === "dark"}
                aria-label="深色模式"
                class="relative flex-shrink-0 w-[42px] h-[24px] rounded-[var(--borderRadiusCircular)] border-0 outline-none cursor-pointer transition-colors duration-[var(--durationFast)] focus-visible:[box-shadow:0_0_0_var(--strokeWidthThick)_var(--colorStrokeFocus2),0_0_0_calc(var(--strokeWidthThick)+var(--strokeWidthThin))_var(--colorStrokeFocus1)]"
                style={{
                  "background-color":
                    theme() === "dark"
                      ? "var(--colorCompoundBrandBackground)"
                      : "var(--colorNeutralStrokeAccessible)",
                }}
              >
                <span
                  class="absolute top-[3px] w-[18px] h-[18px] rounded-[var(--borderRadiusCircular)] shadow-[var(--elevation4)] transition-transform duration-[var(--durationFast)]"
                  style={{
                    "background-color": "var(--colorNeutralBackground1)",
                    transform: theme() === "dark" ? "translateX(20px)" : "translateX(3px)",
                  }}
                />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div class="divider mx-5" />

          {/* Version footer */}
          <div class="px-5 py-4">
            <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForegroundDisabled)] text-center select-none">
              Pixivizer v0.1.0
            </p>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default SettingsSheet;
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/components/SettingsSheet.tsx`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsSheet.tsx
git commit -m "feat: add SettingsSheet component with theme toggle and acrylic styling"
```

---

### Task 5: Integrate SettingsSheet into Feed and App

**Files:**

- Modify: `src/routes/Feed.tsx`
- Modify: `src/App.tsx`

**Interfaces:**

- Consumes: `showSettingsSheet` from uiStore (Task 1), `VirtualFeed.onSettingsOpen` (Task 3), `SettingsSheet` component (Task 4)
- Modifies: `App.tsx` back-button handler to close settings sheet before other actions

---

- [ ] **Step 1: Modify Feed.tsx to import and render SettingsSheet, pass onSettingsOpen to VirtualFeed**

Apply these edits to `src/routes/Feed.tsx`:

**Edit 1 — Add imports:**

```diff
 import { currentTab } from '../stores/uiStore';
+import { showSettingsSheet, setShowSettingsSheet } from '../stores/uiStore';
 import VirtualFeed from '../components/VirtualFeed';
 import NavBar from '../components/NavBar';
 import PageTransition from '../components/PageTransition';
+import SettingsSheet from '../components/SettingsSheet';
```

**Edit 2 — Add onSettingsOpen to VirtualFeed:**

```diff
         <VirtualFeed
           illusts={illusts()}
           loading={loading() || refreshing()}
           error={error()}
           hasMore={nextUrl() !== null}
           onIllustClick={(id) => navigate(`/illust/${id}`)}
           onLoadMore={fetchMore}
           onRefresh={refresh}
+          onSettingsOpen={() => setShowSettingsSheet(true)}
           skipAnimation={cached}
         />
```

**Edit 3 — Render SettingsSheet at the end of the fragment, before closing `</>`:**

```diff
     </PageTransition>

     <NavBar />
+
+    <SettingsSheet />
     </>
   );
```

- [ ] **Step 2: Modify App.tsx to handle back button when settings sheet is open**

Apply this edit to `src/App.tsx`:

```diff
     CapApp.addListener('backButton', ({ canGoBack }) => {
+      // If settings sheet is open, close it instead of navigating back
+      if ((window as any).__settingsOpen) {
+        window.dispatchEvent(new CustomEvent('closeSettings'));
+        return;
+      }
       // If image viewer is open, close it instead of navigating back
       if ((window as any).__viewerOpen) {
         window.dispatchEvent(new CustomEvent('closeViewer'));
         return;
       }
       if (canGoBack) {
         window.history.back();
       } else {
         CapApp.exitApp();
       }
     });
```

- [ ] **Step 3: Verify both files compile**

Run:

```bash
npx tsc --noEmit src/routes/Feed.tsx src/App.tsx
```

Expected: No errors.

- [ ] **Step 4: Run dev server and smoke test**

Run: `pnpm dev` (or `npx vite`)

Manual smoke test:

1. Open the app in browser
2. Go to Feed page
3. Pull down past 130px — should see "⚙️ 松手打开设置"
4. Release — settings sheet slides down from top
5. Toggle dark mode — theme should switch immediately
6. Click scrim or ✕ button — sheet slides up and disappears
7. Pull to refresh still works normally at ~60px

- [ ] **Step 5: Commit**

```bash
git add src/routes/Feed.tsx src/App.tsx
git commit -m "feat: integrate SettingsSheet into Feed and handle back button"
```

---

### Task 6: Add slide animation keyframes to index.html

**Files:**

- Modify: `index.html`

**Rationale:** The SettingsSheet and future overlays benefit from dedicated slide-down/up keyframes. These are general-purpose Fluent motion primitives.

---

- [ ] **Step 1: Add keyframes after the existing animation block**

Insert after the `fluent-scale-exit` keyframe block in `index.html`:

```css
/* Sheet / panel entrance: slide down from top */
@keyframes fluent-slide-down {
  from {
    opacity: 0;
    transform: translateY(-16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Sheet / panel exit: slide up to top */
@keyframes fluent-slide-up {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-16px);
  }
}
```

- [ ] **Step 2: Verify the file is valid CSS**

Open `index.html` in browser or confirm no syntax errors visually. (The new keyframes follow the same pattern as existing ones.)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add fluent-slide-down and fluent-slide-up keyframes"
```

---

## Self-Review Summary

1. **Spec coverage:** All spec requirements covered — dual-threshold gesture (Task 3), pull indicator zones (Task 2), settings panel with theme toggle (Task 4), acrylic styling (Task 4), back button handling (Task 5), v1 scope with version footer (Task 4), no settings icon in nav/app bar (verified — no icon added anywhere).

2. **Placeholder scan:** No TBD, TODO, or vague instructions. All code shown in full. No "add appropriate error handling" patterns.

3. **Type consistency:**
   - `PullZone` type defined in Task 2, consumed by VirtualFeed in Task 3 — names match.
   - `showSettingsSheet`/`setShowSettingsSheet` exported from Task 1, consumed by Tasks 4 and 5 — names match throughout.
   - `onSettingsOpen` prop added to VirtualFeed in Task 3, consumed by Feed in Task 5 — signature `() => void` consistent.
   - `__settingsOpen` and `closeSettings` event used in Tasks 4 and 5 — same event name.
