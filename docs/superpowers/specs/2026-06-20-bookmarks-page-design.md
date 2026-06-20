# Bookmarks Page Design

**Date:** 2026-06-20
**Status:** Approved

## Overview

Replace the static placeholder on `/bookmarks` with a fully functional bookmarks page: API integration, data store, public/private toggle, pagination, pull-to-refresh, and standard error/empty states. Reuses the existing `VirtualFeed` component for the waterfall layout.

## Architecture

### New / Changed Files

| File                             | Change                                                          |
| -------------------------------- | --------------------------------------------------------------- |
| `src/api/illust.ts`              | Add `loadBookmarks(restrict, tag?)` → `PixivIllustListResponse` |
| `src/stores/bookmarkStore.ts`    | **New.** Independent store mirroring feedStore pattern          |
| `src/routes/Bookmarks.tsx`       | Rewrite: wire store + VirtualFeed + restrict toggle             |
| `src/components/VirtualFeed.tsx` | Add optional `emptyText` prop (default: "暂无新作品")           |
| `src/components/NavBar.tsx`      | No changes (bookmarks tab already wired)                        |
| `src/App.tsx`                    | No changes (route already registered)                           |

### Rationale: Independent Store

A dedicated `bookmarkStore.ts` is chosen over extending `feedStore.ts` for three reasons:

1. **Single responsibility** — Feed and Bookmarks are conceptually distinct; bookmarks is a user-curated collection, not a timeline.
2. **Performance** — Bookmark store signals are only subscribed when the page is mounted; no memory overhead on other pages.
3. **Maintainability** — Changes to bookmark logic (sorting, filtering, tag support) won't risk breaking Feed, and vice versa.

The code follows the exact same patterns as `feedStore.ts` — it's a parallel implementation, not a duplication without purpose.

---

## API Layer

### `loadBookmarks`

```ts
// src/api/illust.ts
export async function loadBookmarks(
  restrict: "public" | "private",
  tag?: string,
): Promise<PixivIllustListResponse>;
```

- Calls `GET /v1/user/bookmarks/illust` with params: `restrict` (required), `tag` (optional)
- Returns `PixivIllustListResponse` — the existing type: `{ illusts: PixivIllust[], next_url: string | null }`
- Pagination reuses the existing `loadNext(nextUrl)` function, which works with any Pixiv pagination URL
- Tag filtering is accepted as an optional parameter but not exposed in the UI for v1

### Error Handling

- Network errors thrown as `ApiError`, caught by the store and surfaced as `error` signal
- 401/unauthorized → store sets error; `App.tsx` interceptor already handles redirect to login

---

## Store: `bookmarkStore.ts`

### Signals

| Signal     | Type                    | Default    | Purpose                                                           |
| ---------- | ----------------------- | ---------- | ----------------------------------------------------------------- |
| `illusts`  | `PixivIllust[]`         | `[]`       | Current list of bookmarked illustrations                          |
| `nextUrl`  | `string \| null`        | `null`     | URL for next page; `null` = no more pages                         |
| `loading`  | `boolean`               | `false`    | Data loading in progress (initial + pagination + pull-to-refresh) |
| `error`    | `string \| null`        | `null`     | Last error message                                                |
| `restrict` | `'public' \| 'private'` | `'public'` | Current visibility toggle                                         |

### Derived

- `hasMore`: computed inline as `nextUrl() !== null` (boolean, passed directly to VirtualFeed)
- `isEmpty`: `() => !loading() && illusts().length === 0`

### Actions

| Action           | Behavior                                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ensureLoaded()` | If `illusts` is empty and not already loading or errored, call `loadBookmarks(restrict())` and populate signals. No-op otherwise.                                                                                         |
| `fetchMore()`    | If `nextUrl` is present and not already loading, call `loadNext(nextUrl())`, append results to `illusts`, update `nextUrl`.                                                                                               |
| `refresh()`      | Set `loading=true`, re-fetch page 1 via `loadBookmarks(restrict())`, replace `illusts` entirely, reset `nextUrl`, set `loading=false`. VirtualFeed uses its internal pullPhase + `!loading` to know when refresh is done. |
| `setRestrict(r)` | If `restrict()` changes, set it, clear `illusts`/`nextUrl`/`error`, then call `ensureLoaded()`.                                                                                                                           |

### Scroll Position Persistence

Unlike Feed (which has per-tab scroll caching), Bookmarks stores a single scroll position:

- `scrollY` signal (number, default 0)
- Saved on `onCleanup` via the page component
- Restored on `onMount`

---

## Page Component: `Bookmarks.tsx`

### Structure

```
┌──────────────────────────────┐
│          NavBar              │  ← shared; no changes
├──────────────────────────────┤
│  Segmented: 公开收藏 | 非公开  │  ← restrict toggle
├──────────────────────────────┤
│                              │
│     VirtualFeed              │  ← reused; props from store
│                              │
└──────────────────────────────┘
```

### Lifecycle

1. `onMount` — restore `scrollY` to window
2. `onCleanup` — save `window.scrollY` to store
3. `createEffect` — track `restrict()`; when it changes, call `ensureLoaded()`

### VirtualFeed Props

```tsx
<VirtualFeed
  illusts={illusts()}
  loading={loading()}
  error={error()}
  hasMore={nextUrl() !== null}
  onIllustClick={(id) => navigate(`/illust/${id}`)}
  onLoadMore={fetchMore}
  onRefresh={refresh}
  emptyText={restrict() === "public" ? "公开收藏夹为空" : "非公开收藏夹为空"}
  skipAnimation={true}
/>
```

### Segmented Toggle

A simple two-segment control styled with Fluent tokens:

- Track: `var(--colorNeutralBackground4)`, rounded pill shape
- Selected segment: `var(--colorBrandBackground)` background, white text
- Unselected: transparent, `var(--colorNeutralForeground2)` text
- Clicking a segment calls `setRestrict('public')` or `setRestrict('private')`

### States

| State               | Display                                                           |
| ------------------- | ----------------------------------------------------------------- |
| **Loading**         | `VirtualFeed` shows skeleton cards via its built-in loading state |
| **Empty (public)**  | VirtualFeed shows "公开收藏夹为空" via `emptyText` prop           |
| **Empty (private)** | VirtualFeed shows "非公开收藏夹为空" via `emptyText` prop         |
| **Error**           | VirtualFeed's built-in error banner (no change needed)            |
| **Loaded**          | Waterfall grid of `ImageCard` components via `VirtualFeed`        |

---

## Out of Scope (v1)

- **Tag filtering** — API supports `tag` param but no UI control in this version
- **Bookmark add/remove from detail page** — `IllustDetail.tsx` displays `total_bookmarks` but has no toggle; separate feature
- **Batch operations** — multi-select, batch un-bookmark
- **Sort options** — bookmark date is the only ordering for v1

---

## Testing Considerations

- Unit test `loadBookmarks` returns correctly shaped data
- Store: verify `setRestrict` clears data and reloads
- Store: verify `fetchMore` appends and updates `nextUrl`
- Store: verify `ensureLoaded` is idempotent (no duplicate requests)
- Page: verify restrict toggle switches between public/private lists
- Page: verify empty state messages differ per restrict value
