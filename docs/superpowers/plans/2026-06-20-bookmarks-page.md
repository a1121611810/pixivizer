# Bookmarks Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static placeholder on `/bookmarks` with a fully functional bookmarks page with public/private toggle, pagination, pull-to-refresh, and custom empty states.

**Architecture:** Independent `bookmarkStore.ts` mirrors the `feedStore.ts` pattern — signals for `illusts` / `nextUrl` / `loading` / `error` / `restrict`, actions for `ensureLoaded` / `fetchMore` / `refresh` / `setRestrict`. New `loadBookmarks` API function hits `GET /v1/user/bookmarks/illust`. `Bookmarks.tsx` renders a segmented restrict toggle + the existing `VirtualFeed` component (with a new `emptyText` prop).

**Tech Stack:** SolidJS + TypeScript (strict) + UnoCSS + Pixiv API (via `src/api/client.ts`)

## Global Constraints

- TypeScript strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`)
- SolidJS function components with `Component<Props>` type annotation, default export
- UnoCSS with Fluent Design System 2 tokens via bracket syntax
- Path alias: `@/` → `src/`
- Chinese comments where appropriate; API layer uses English comments
- No auto-commit (user reviews all changes manually)

---

### Task 1: Add `loadBookmarks` API function

**Files:**

- Modify: `src/api/illust.ts`

**Interfaces:**

- Consumes: `apiClient.get<PixivIllustListResponse>()` from `./client`, `RestrictType` from `./types`
- Produces: `loadBookmarks(restrict: RestrictType, tag?: string): Promise<PixivIllustListResponse>`

- [ ] **Step 1: Add the `loadBookmarks` function**

Open `src/api/illust.ts` and add the following function after the existing `loadFollow` function (after line 23):

```ts
/**
 * 获取用户收藏的作品列表
 * GET /v1/user/bookmarks/illust
 * @param restrict - 'public' 公开收藏 / 'private' 非公开收藏
 * @param tag - 可选，按用户收藏标签筛选
 */
export function loadBookmarks(
  restrict: RestrictType = "public",
  tag?: string,
): Promise<PixivIllustListResponse> {
  const params: Record<string, string> = { restrict };
  if (tag) params.tag = tag;
  return apiClient.get<PixivIllustListResponse>("/v1/user/bookmarks/illust", params);
}
```

- [ ] **Step 2: Run TypeScript type check**

```bash
pnpm check
```

Expected: PASS (no errors in `src/api/illust.ts`).

---

### Task 2: Add `emptyText` prop to VirtualFeed

**Files:**

- Modify: `src/components/VirtualFeed.tsx`

**Interfaces:**

- Consumes: none (this is the producer)
- Produces: `emptyText?: string` prop (default: `'暂无新作品'`)

- [ ] **Step 1: Add `emptyText` to the Props interface and use it in the empty state**

In `src/components/VirtualFeed.tsx`, make two edits:

**Edit A:** Add the prop to the `Props` interface (after line 18, before the closing `}`):

At line 18 (`onSettingsOpen?: () => void;`), add the new prop line after it:

```ts
  emptyText?: string;
```

**Edit B:** Replace the hardcoded empty text (line 160, `暂无新作品`) with the prop:

Change line 160 from:

```tsx
暂无新作品;
```

to:

```tsx
{
  props.emptyText ?? "暂无新作品";
}
```

- [ ] **Step 2: Run TypeScript type check**

```bash
pnpm check
```

Expected: PASS (no errors in `src/components/VirtualFeed.tsx`).

---

### Task 3: Create `bookmarkStore.ts`

**Files:**

- Create: `src/stores/bookmarkStore.ts`

**Interfaces:**

- Consumes: `loadBookmarks` from `../api/illust`, `loadNext` from `../api/illust`, `PixivIllust` / `RestrictType` from `../api/types`
- Produces:
  - Signals: `illusts`, `nextUrl`, `loading`, `error`, `restrict`
  - Actions: `ensureLoaded()`, `fetchMore()`, `refresh()`, `setRestrict(r)`
  - Scroll helpers: `saveBookmarkScroll()`, `getBookmarkScrollY()`

- [ ] **Step 1: Create the store file**

Create `src/stores/bookmarkStore.ts` with the following content:

```ts
import { createSignal } from "solid-js";
import { loadBookmarks, loadNext } from "../api/illust";
import type { PixivIllust, RestrictType } from "../api/types";

// ── Signals ──
const [illusts, setIllusts] = createSignal<PixivIllust[]>([]);
const [nextUrl, setNextUrl] = createSignal<string | null>(null);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);
const [restrict, setRestrictSignal] = createSignal<RestrictType>("public");

// ── Scroll persistence ──
let scrollY = 0;

export { illusts, nextUrl, loading, error, restrict };

export function saveBookmarkScroll() {
  scrollY = window.scrollY;
}

export function getBookmarkScrollY(): number {
  return scrollY;
}

// ── Actions ──

/** 确保数据已加载（无数据时自动加载，有数据时 no-op） */
export function ensureLoaded() {
  if (illusts().length > 0 || loading() || error()) return;
  forceLoad();
}

async function forceLoad() {
  if (loading()) return;
  setLoading(true);
  setError(null);
  try {
    const data = await loadBookmarks(restrict());
    setIllusts(data.illusts);
    setNextUrl(data.next_url);
    setLoading(false);
  } catch (e) {
    const msg = (e as { message?: string }).message ?? "加载失败";
    if (msg.includes("401") || msg.includes("UNAUTHORIZED")) {
      setError("登录已过期，请重新登录");
    } else if (msg.includes("NETWORK") || msg.includes("网络")) {
      setError("网络连接失败，请检查网络后重试");
    } else {
      setError(`加载收藏列表失败: ${msg}`);
    }
    setLoading(false);
  }
}

/** 加载下一页 */
export async function fetchMore() {
  if (!nextUrl() || loading()) return;
  setLoading(true);
  try {
    const data = await loadNext(nextUrl()!);
    setIllusts([...illusts(), ...data.illusts]);
    setNextUrl(data.next_url);
    setLoading(false);
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
    setLoading(false);
  }
}

/** 下拉刷新：重新加载第一页并替换全部数据 */
export async function refresh() {
  setLoading(true);
  setError(null);
  try {
    const data = await loadBookmarks(restrict());
    setIllusts(data.illusts);
    setNextUrl(data.next_url);
    setLoading(false);
  } catch (e) {
    const msg = (e as { message?: string }).message ?? "加载失败";
    setError(`刷新失败: ${msg}`);
    setLoading(false);
  }
}

/** 切换公开/非公开收藏，清空列表并重新加载 */
export function setRestrict(r: RestrictType) {
  if (restrict() === r) return;
  setRestrictSignal(r);
  setIllusts([]);
  setNextUrl(null);
  setError(null);
  ensureLoaded();
}
```

- [ ] **Step 2: Run TypeScript type check**

```bash
pnpm check
```

Expected: PASS (no errors — the new file is within the tsconfig scope).

---

### Task 4: Rewrite `Bookmarks.tsx`

**Files:**

- Modify: `src/routes/Bookmarks.tsx`

**Interfaces:**

- Consumes: All exported signals and actions from `../stores/bookmarkStore`; `VirtualFeed` from `../components/VirtualFeed`; `NavBar` from `../components/NavBar`; `PageTransition` from `../components/PageTransition`
- Produces: Routed page component at `/bookmarks`

- [ ] **Step 1: Rewrite the Bookmarks component**

Replace the entire content of `src/routes/Bookmarks.tsx` with:

```tsx
import { type Component, createEffect, onMount, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  illusts,
  nextUrl,
  loading,
  error,
  restrict,
  ensureLoaded,
  fetchMore,
  refresh,
  setRestrict,
  saveBookmarkScroll,
  getBookmarkScrollY,
} from "../stores/bookmarkStore";
import VirtualFeed from "../components/VirtualFeed";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";

const Bookmarks: Component = () => {
  const navigate = useNavigate();

  // Restore scroll position when returning to this page
  onMount(() => {
    const savedY = getBookmarkScrollY();
    if (savedY > 0) {
      requestAnimationFrame(() => window.scrollTo(0, savedY));
    }
  });

  // Save scroll position when leaving
  onCleanup(() => {
    saveBookmarkScroll();
  });

  // Load data when restrict changes or on initial mount
  createEffect(() => {
    restrict(); // track restrict changes
    ensureLoaded();
  });

  return (
    <>
      <PageTransition>
        <div class="pb-16">
          <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4">
            <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none">
              收藏
            </h1>
          </header>

          {/* Segmented: 公开收藏 / 非公开收藏 */}
          <div class="flex justify-center py-3 px-4">
            <div
              class="inline-flex rounded-[var(--borderRadiusMedium)] p-0.5"
              style={{ background: "var(--colorNeutralBackground4)" }}
            >
              <button
                class="px-4 py-1.5 rounded-[var(--borderRadiusSmall)] text-sm font-medium transition-colors"
                classList={{
                  "bg-[var(--colorBrandBackground)] text-white": restrict() === "public",
                  "text-[var(--colorNeutralForeground2)]": restrict() !== "public",
                }}
                onClick={() => setRestrict("public")}
              >
                公开收藏
              </button>
              <button
                class="px-4 py-1.5 rounded-[var(--borderRadiusSmall)] text-sm font-medium transition-colors"
                classList={{
                  "bg-[var(--colorBrandBackground)] text-white": restrict() === "private",
                  "text-[var(--colorNeutralForeground2)]": restrict() !== "private",
                }}
                onClick={() => setRestrict("private")}
              >
                非公开收藏
              </button>
            </div>
          </div>

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
        </div>
      </PageTransition>

      <NavBar />
    </>
  );
};

export default Bookmarks;
```

- [ ] **Step 2: Run TypeScript type check**

```bash
pnpm check
```

Expected: PASS (no errors in `src/routes/Bookmarks.tsx`).

- [ ] **Step 3: Run dev server and verify visually**

```bash
pnpm dev
```

Open the app, navigate to the 收藏 tab. Verify:

- The segmented toggle shows (公开收藏 / 非公开收藏)
- Switching segments clears and reloads the list
- The waterfall grid loads bookmarked illustrations
- Pull-to-refresh works
- Scrolling down triggers pagination (loads more)
- Empty state shows the correct message per restrict value
