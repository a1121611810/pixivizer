# Fluent Design Navigation Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild bottom navigation as a Fluent floating pill with 3 tabs (推荐/关注/收藏), crossfade Fluent UI icons, and active pill background. Add a Bookmarks placeholder page.

**Architecture:** The NavBar becomes a fixed floating capsule with elevation8 shadow and rounded-2xl corners. Three tabs use official Fluent UI System Icons (Home/People/Bookmark) with filled↔regular crossfade. Bookmarks tab navigates to a new placeholder route.

**Tech Stack:** SolidJS, UnoCSS (utility classes + bracket CSS syntax), @solidjs/router

## Global Constraints

- Build must pass with `npx vite build`
- Follow API endpoint must remain `/v2/illust/follow` (fixed in prior commit)
- Bookmarks page is a placeholder only — "收藏功能开发中"
- Top App Bar remains unchanged (acrylic, 48px, "Pixivizer" title)
- All Fluent 2 CSS custom properties from `index.html` are available

---

### Task 1: Extend UI Store Tab Type

**Files:**

- Modify: `src/stores/uiStore.ts`

**Interfaces:**

- Produces: `Tab = 'recommended' | 'follow' | 'bookmarks'` — consumed by NavBar, Feed, feedStore

- [ ] **Step 1: Add `'bookmarks'` to the Tab type**

```ts
// src/stores/uiStore.ts — change line 3 from:
type Tab = "recommended" | "follow";
// to:
type Tab = "recommended" | "follow" | "bookmarks";
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: PASS — no TypeScript errors on the new union member

- [ ] **Step 3: Commit**

```bash
git add src/stores/uiStore.ts
git commit -m "feat: extend Tab type with bookmarks"
```

---

### Task 2: Create Bookmarks Placeholder Page

**Files:**

- Create: `src/routes/Bookmarks.tsx`

**Interfaces:**

- Produces: `Bookmarks` component (default export) — used by App.tsx route registration

- [ ] **Step 1: Write the page component**

```tsx
// src/routes/Bookmarks.tsx
import type { Component } from "solid-js";
import PageTransition from "../components/PageTransition";

const Bookmarks: Component = () => (
  <PageTransition>
    <div class="page flex flex-col items-center justify-center gap-4 px-6 min-h-screen">
      <div class="surface-card p-8 flex flex-col items-center gap-4 max-w-sm w-full text-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="var(--colorBrandForeground1)"
          aria-hidden="true"
        >
          <path d="M6.19 21.85a.75.75 0 0 1-.94-1.13l6.26-5.2a.5.5 0 0 1 .59 0l6.26 5.2a.75.75 0 0 1-.93 1.13L12 16.65l-5.81 5.2zM5 6.25C5 4.45 6.46 3 8.25 3h7.5C17.55 3 19 4.45 19 6.25v15c0 .61-.69.96-1.19.61L12 17.67l-5.81 4.18A.75.75 0 0 1 5 21.25v-15z" />
        </svg>
        <h2 class="text-[var(--colorNeutralForeground1)] font-semibold [font-size:var(--fontSizeBase400)]">
          收藏
        </h2>
        <p class="text-[var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase300)]">
          收藏功能开发中
        </p>
        <p class="text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase200)]">
          即将上线，敬请期待
        </p>
      </div>
    </div>
  </PageTransition>
);

export default Bookmarks;
```

- [ ] **Step 2: Verify build compiles**

Run: `npx vite build`
Expected: PASS — no errors

- [ ] **Step 3: Commit**

```bash
git add src/routes/Bookmarks.tsx
git commit -m "feat: add bookmarks placeholder page"
```

---

### Task 3: Register Bookmarks Route

**Files:**

- Modify: `src/App.tsx`

**Interfaces:**

- Consumes: `Bookmarks` component from `src/routes/Bookmarks.tsx`
- Produces: `/bookmarks` route — used by NavBar navigation

- [ ] **Step 1: Add import and route**

In `src/App.tsx`, add after the DebugImage import line:

```tsx
import Bookmarks from "./routes/Bookmarks";
```

Then add after the existing routes:

```tsx
<Route path="/bookmarks" component={Bookmarks} />
```

Full routes block should be:

```tsx
<Route path="/login" component={Login} />
<Route path="/feed" component={Feed} />
<Route path="/illust/:id" component={IllustDetail} />
<Route path="/debug" component={DebugImage} />
<Route path="/bookmarks" component={Bookmarks} />
<Route path="*" component={Login} />
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: PASS — 56 modules (one more than before)

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register /bookmarks route"
```

---

### Task 4: Rewrite NavBar with Floating Pill + 3 Tabs + Crossfade Icons

**Files:**

- Modify: `src/components/NavBar.tsx` (complete rewrite)

**Interfaces:**

- Consumes: `currentTab`, `setCurrentTab` from `../stores/uiStore`
- Consumes: `useNavigate` from `@solidjs/router`
- Produces: NavBar component — renders floating pill with 3 tabs

- [ ] **Step 1: Write the complete NavBar component**

```tsx
// src/components/NavBar.tsx
import type { Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { currentTab, setCurrentTab } from "../stores/uiStore";

/* ═══════════════════════════════════════════════════════
   Fluent UI System Icons — official Microsoft paths
   Each icon renders regular + filled variants stacked
   with crossfade by opacity transition.
   ═══════════════════════════════════════════════════════ */

interface IconProps {
  active: boolean;
}

/** Home 24 */
const IconHome: Component<IconProps> = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M10.55 2.53a2.25 2.25 0 0 1 2.9 0l6.75 5.7c.5.42.8 1.05.8 1.71v9.31c0 .97-.78 1.75-1.75 1.75h-3.5a.75.75 0 0 1-.75-.75v-5.01c0-.13-.11-.25-.25-.25h-3.5c-.14 0-.25.12-.25.25v5.01c0 .41-.34.75-.75.75h-3.5c-.97 0-1.75-.78-1.75-1.75V9.94c0-.66.3-1.29.8-1.71l6.75-5.7zM12.48 3.68a.75.75 0 0 0-.96 0l-6.75 5.69a.75.75 0 0 0-.27.57v9.31c0 .14.11.25.25.25h3.5c.14 0 .25-.11.25-.25v-5.01c0-.97.78-1.75 1.75-1.75h3.5c.97 0 1.75.78 1.75 1.75v5.01c0 .14.11.25.25.25h3.5c.14 0 .25-.11.25-.25V9.94a.75.75 0 0 0-.27-.57l-6.75-5.69z"
      fill="currentColor"
      class="transition-opacity duration-[var(--durationFast)]"
      style={{ opacity: props.active ? 0 : 1 }}
    />
    <path
      d="M13.45 2.53a2.25 2.25 0 0 0-2.9 0L3.8 8.23A1.75 1.75 0 0 0 3 9.95v9.3C3 20.22 3.78 21 4.75 21h3c.97 0 1.75-.78 1.75-1.75V15.25c0-.68.54-1.23 1.22-1.25h2.56c.68.02 1.22.57 1.22 1.25v4c0 .97.78 1.75 1.75 1.75h3c.97 0 1.75-.78 1.75-1.75v-9.3c0-.67-.3-1.3-.8-1.72l-6.75-5.7z"
      fill="currentColor"
      class="transition-opacity duration-[var(--durationFast)]"
      style={{ opacity: props.active ? 1 : 0 }}
    />
  </svg>
);

/** People 24 */
const IconPeople: Component<IconProps> = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5.5 8a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zM8 4a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0-4-4zm7.5 5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zM17 6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zM4.25 14A2.25 2.25 0 0 0 2 16.25v.25S2 21 8 21s6-4.5 6-4.5v-.25A2.25 2.25 0 0 0 11.75 14h-7.5zm-.75 2.25a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 .75.75v.24a14.5 14.5 0 0 1-4.5.51 14.5 14.5 0 0 1-4.5-.51v-.24z"
      fill="currentColor"
      class="transition-opacity duration-[var(--durationFast)]"
      style={{ opacity: props.active ? 0 : 1 }}
    />
    <path
      d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm9-6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4.25 14A2.25 2.25 0 0 0 2 16.25v.25S2 21 8 21s6-4.5 6-4.5v-.25A2.25 2.25 0 0 0 11.75 14h-7.5zm12.75 5.5c-1.17 0-2.07-.18-2.75-.46.34-.57.53-1.12.63-1.56.06-.26.09-.48.11-.65a3.5 3.5 0 0 1 .02-.23l.0003-.058.0001-.028v-.005l.0001-.003L15 16.5v-.25A2.25 2.25 0 0 0 14.1 14h.1a2.2 2.2 0 0 1 2.2 2.2V16.5s0 3.5-2.8 3.5H17z"
      fill="currentColor"
      class="transition-opacity duration-[var(--durationFast)]"
      style={{ opacity: props.active ? 1 : 0 }}
    />
  </svg>
);

/** Bookmark 24 — official Fluent paths */
const IconBookmark: Component<IconProps> = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {/* Regular */}
    <path
      d="M6.19 21.85a.75.75 0 0 1-1.19-.6V6.25A3.25 3.25 0 0 1 8.25 3h7.5A3.25 3.25 0 0 1 19 6.25v15a.75.75 0 0 1-1.19.6l-5.81-4.18-5.81 4.18zM17.5 6.25a1.75 1.75 0 0 0-1.75-1.75h-7.5a1.75 1.75 0 0 0-1.75 1.75v13.53l5.06-3.64a.5.5 0 0 1 .58 0l5.06 3.64V6.25z"
      fill="currentColor"
      class="transition-opacity duration-[var(--durationFast)]"
      style={{ opacity: props.active ? 0 : 1 }}
    />
    {/* Filled */}
    <path
      d="M6.19 21.85a.75.75 0 0 1-1.19-.6V6.25A3.25 3.25 0 0 1 8.25 3h7.5A3.25 3.25 0 0 1 19 6.25v15a.75.75 0 0 1-1.19.6l-5.81-4.18-5.81 4.18z"
      fill="currentColor"
      class="transition-opacity duration-[var(--durationFast)]"
      style={{ opacity: props.active ? 1 : 0 }}
    />
  </svg>
);

/* ═══════════════════════════════════════════════════════
   Bottom Navigation
   Fluent 2 floating pill — 3 tabs with crossfade icons.
   ═══════════════════════════════════════════════════════ */

const tabs = [
  { key: "recommended" as const, label: "推荐", icon: IconHome, route: "/feed" },
  { key: "follow" as const, label: "关注", icon: IconPeople, route: "/feed" },
  { key: "bookmarks" as const, label: "收藏", icon: IconBookmark, route: "/bookmarks" },
];

const NavBar: Component = () => {
  const navigate = useNavigate();

  const handleTabClick = (tab: (typeof tabs)[number]) => {
    setCurrentTab(tab.key);
    navigate(tab.route);
  };

  return (
    <nav class="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
      <div class="pointer-events-auto mx-4 mb-3 flex items-center bg-[var(--colorNeutralBackground1)] border border-[var(--colorNeutralStroke2)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation8)] px-1 py-1">
        {tabs.map((tab) => {
          const active = currentTab() === tab.key;
          return (
            <button
              class="relative flex flex-col items-center justify-center gap-0.5 min-w-[80px] h-12 px-3 rounded-[var(--borderRadiusXLarge)] transition-all duration-[var(--durationFast)] select-none active:scale-95"
              classList={{
                "text-[var(--colorCompoundBrandForeground1)]": active,
                "text-[var(--colorNeutralForeground3)] hover:text-[var(--colorNeutralForeground2)]":
                  !active,
              }}
              onClick={() => handleTabClick(tab)}
            >
              {/* Active pill background */}
              <div
                class="absolute inset-1 rounded-lg bg-[var(--colorBrandStroke2)] transition-opacity duration-[var(--durationFast)]"
                style={{ opacity: active ? 1 : 0 }}
              />
              <div class="relative z-10">{tab.icon({ active })}</div>
              <span
                class="relative z-10 [font-size:var(--fontSizeBase200)] font-medium transition-all duration-[var(--durationFast)]"
                classList={{ "font-semibold": active }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavBar;
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: PASS — no errors, JS bundle includes new Bookmark icon paths

- [ ] **Step 3: Commit**

```bash
git add src/components/NavBar.tsx
git commit -m "feat: rebuild NavBar with Fluent floating pill, 3 tabs, crossfade icons"
```

---

### Task 5: Update Feed to Handle Bookmarks Tab Navigation

**Files:**

- Modify: `src/routes/Feed.tsx`

**Interfaces:**

- Consumes: `currentTab` from `../stores/uiStore` — when it changes to 'bookmarks', redirect

- [ ] **Step 1: Add bookmarks redirect in createEffect**

Change the `createEffect` in Feed.tsx from:

```tsx
createEffect(() => {
  void currentTab();
  ensureLoaded();
});
```

to:

```tsx
createEffect(() => {
  const tab = currentTab();
  if (tab === "bookmarks") return; // handled by NavBar navigation
  ensureLoaded();
});
```

This ensures `ensureLoaded()` is only called for 'recommended' and 'follow' tabs. The 'bookmarks' tab navigates to `/bookmarks` directly from NavBar's `handleTabClick`.

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/routes/Feed.tsx
git commit -m "fix: skip ensureLoaded for bookmarks tab"
```

---

### Task 6: Final Build Verification

- [ ] **Step 1: Clean build**

```bash
npx vite build
```

Expected:

- Build passes with zero errors
- CSS includes elevation8 shadow, rounded-2xl, active pill bg classes
- JS includes all three icon paths (Home, People, Bookmark)
- Module count: 57 (added Bookmarks.tsx)

- [ ] **Step 2: Quick visual inspection**

Verify the generated CSS contains:

- `.shadow-\[var\(--elevation8\)\]` — floating pill shadow
- `.rounded-\[var\(--borderRadius2XLarge\)\]` — 12px container radius
- `.rounded-\[var\(--borderRadiusXLarge\)\]` — 8px tab button radius

Run: `grep -c 'elevation8\|borderRadius2XLarge\|borderRadiusXLarge' dist/assets/index-*.css`

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final verification build for Fluent nav redesign"
```
