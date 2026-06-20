# Fluent Design Global Navigation Redesign

**Date**: 2026-01-19  
**Status**: Approved

## Overview

Redesign the app's global navigation to fully comply with Microsoft Fluent Design 2 standards. Specifically: the bottom navigation bar (currently 2 tabs with emoji icons, acrylic background, not visually Fluent-compliant) and the addition of a third Bookmarks tab.

## Scope

- **Bottom Navigation Bar**: Full visual rebuild with Fluent 2 floating pill pattern
- **Bookmarks page**: Placeholder route + page component
- **Route + store updates**: Tab type extension for bookmarks
- **Follow API bugfix**: Already completed (`/v1` → `/v2` endpoint) — verify retention

## Out of Scope

- Search functionality
- Actual bookmarks API integration
- Navigation drawer / hamburger menu
- Top App Bar changes (remains as-is)

## Design Decisions

| Decision         | Choice                                                                             | Rationale                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Nav visual style | Floating pill hybrid (Option C)                                                    | Modern M365 look, elevation8 shadow, rounded-2xl container, brand-color pill active indicator |
| Number of tabs   | 3 (推荐 / 关注 / 收藏)                                                             | Minimum for Fluent bottom nav; fills floating pill naturally                                  |
| Bookmarks page   | Placeholder with "开发中" message                                                  | Enables the 3-tab layout now; real implementation deferred                                    |
| Top App Bar      | Keep existing Acrylic 48px                                                         | User confirmed; no changes needed                                                             |
| Icons            | Fluent UI System Icons (Home 24, People 24, Bookmark 24), filled/regular crossfade | Authentic Microsoft icon paths, opacity transition between variants                           |

## Technical Specification

### 1. Bottom Navigation (`src/components/NavBar.tsx`)

**Container:**

```css
position: fixed;
bottom: 0;
left: 0;
right: 0;
z-index: 30;
display: flex;
justify-content: center;
background: var(--colorNeutralBackground1);
border: 1px solid var(--colorNeutralStroke2);
border-radius: var(--borderRadius2XLarge); /* 12px */
box-shadow: var(--elevation8); /* dual-layer: 0 0 2px ambient + 0 4px 8px key */
margin: 0 16px 12px; /* mx-4 mb-3 */
```

**Tab Items (3 tabs):**

- Recommend (推荐) — Home icon
- Follow (关注) — People icon
- Bookmarks (收藏) — Bookmark icon

**Each Tab:**

- Min-width 80px, height 48px, rounded-xl
- Column layout: icon (24x24 SVG) + label (Caption 1, 12px)
- Active state: `colorCompoundBrandForeground1`, font-semibold
- Inactive state: `colorNeutralForeground3`, font-medium
- Active pill background: `brandStroke2`, rounded-lg, absolute positioned behind content, opacity 0→1 transition (150ms)
- Press: `active:scale-95`
- Hover (inactive): `fg2` text + `bg1Hover` background

**Icons:**

- Official Fluent UI System Icons SVG paths (sourced from microsoft/fluentui-system-icons)
- Each icon renders two `<path>` elements: regular (outline) + filled (solid), stacked
- Crossfade via CSS `opacity` transition (150ms, Fast duration)
- Active: filled=opacity 1, regular=opacity 0
- Inactive: filled=opacity 0, regular=opacity 1

### 2. Bookmarks Placeholder Page (`src/routes/Bookmarks.tsx`)

- Route: `/bookmarks`
- Content: Centered card with Fluent styling, bookmark icon, "收藏功能开发中" text, subtitle "即将上线，敬请期待"
- Wrapped in `PageTransition` for consistent fade-in
- App bar: same Top App Bar as Feed (reuse or inline)

### 3. Route Registration (`src/App.tsx`)

Add:

```tsx
import Bookmarks from "./routes/Bookmarks";
<Route path="/bookmarks" component={Bookmarks} />;
```

### 4. UI Store Extension (`src/stores/uiStore.ts`)

Extend `Tab` type:

```ts
type Tab = "recommended" | "follow" | "bookmarks";
```

### 5. Feed Integration (`src/routes/Feed.tsx`)

- `createEffect` already tracks `currentTab()` changes
- When tab changes to `'bookmarks'`, navigate to `/bookmarks` route
- Add navigation logic in `NavBar` onClick for bookmarks tab

### 6. NavBar onClick Logic

- Recommend → `setCurrentTab('recommended')` + navigate to `/feed`
- Follow → `setCurrentTab('follow')` + navigate to `/feed`
- Bookmarks → `setCurrentTab('bookmarks')` + navigate to `/bookmarks`

## Files Changed

| File                        | Change                                                                   |
| --------------------------- | ------------------------------------------------------------------------ |
| `src/components/NavBar.tsx` | Complete rewrite: 3 tabs, floating pill, crossfade icons, active pill bg |
| `src/routes/Bookmarks.tsx`  | New file: placeholder page                                               |
| `src/App.tsx`               | Add `/bookmarks` route                                                   |
| `src/stores/uiStore.ts`     | Extend Tab type to include `'bookmarks'`                                 |
| `src/routes/Feed.tsx`       | Add navigate for bookmarks tab                                           |

## Verification

- Build passes (`npx vite build`)
- NavBar renders 3 tabs with correct icons
- Active pill background visible on selected tab
- Icon crossfade works when switching tabs
- Bookmarks page shows placeholder
- Clicking bookmarks tab navigates to `/bookmarks`
- Follow API endpoint remains `/v2/illust/follow`
