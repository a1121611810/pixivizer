import { createSignal, createResource } from "solid-js";
import { loadBookmarks, loadNext } from "../api/illust";
import { user } from "./authStore";
import type { PixivIllust, RestrictType } from "../api/types";
import { filterFeedIllusts } from "../utils/r18Filter";

// ── Restrict signal (user-controlled filter) ──
const [restrict, setRestrictSignal] = createSignal<RestrictType>("public");

// ── Retry helper: wraps Pixiv API call with 429 backoff ──
/* eslint-disable no-await-in-loop -- intentional sequential retry with backoff */
async function fetchBookmarksWithRetry(
  userId: string,
  restrictVal: RestrictType,
): Promise<{ illusts: PixivIllust[]; nextUrl: string | null }> {
  let attempt = 0;
  while (true) {
    try {
      const data = await loadBookmarks(userId, restrictVal);
      return { illusts: data.illusts, nextUrl: data.next_url };
    } catch (e) {
      const msg = (e as { message?: string }).message ?? "";
      // 429 Too Many Requests — retry up to 3 times with 3s delay
      if ((msg.includes("429") || msg.includes("频繁")) && attempt < 3) {
        attempt++;
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      throw e; // re-throw to set resource.error
    }
  }
}
/* eslint-enable no-await-in-loop */

// ── Resource: auto-fetches when user or restrict changes ──
const [bookmarkResource, { mutate, refetch }] = createResource(
  // Source: returns false when not logged in to prevent fetch
  () => {
    const u = user();
    if (!u?.id) return false;
    return { userId: u.id, restrict: restrict() };
  },
  // Fetcher: calls Pixiv API with 429 retry logic
  async ({ userId, restrict: restrictVal }) => {
    return fetchBookmarksWithRetry(userId, restrictVal);
  },
  { initialValue: { illusts: [] as PixivIllust[], nextUrl: null as string | null } },
);

// ── Derived exports (backward-compatible with previous signal API) ──

/** Filtered illusts (R18/R18G + blocked users applied) */
export const illusts = () => {
  const data = bookmarkResource();
  return data ? filterFeedIllusts(data.illusts) : [];
};

/** Next page URL for pagination */
export const nextUrl = () => bookmarkResource()?.nextUrl ?? null;

/** Whether the main fetch is in progress */
export const loading = () => bookmarkResource.loading;

/**
 * Normalized error message.
 * Maps known Pixiv API errors to user-friendly Chinese messages.
 */
export const error = () => {
  const err = bookmarkResource.error;
  if (!err) return null;
  const msg = (err as { message?: string }).message ?? String(err);
  if (msg.includes("401") || msg.includes("UNAUTHORIZED")) return "登录已过期，请重新登录";
  if (msg.includes("429") || msg.includes("频繁")) return "请求太频繁，3 秒后自动重试...";
  if (msg.includes("NETWORK") || msg.includes("网络")) return "网络连接失败，请检查网络后重试";
  return `加载收藏列表失败: ${msg}`;
};

export { restrict };

// ── Scroll persistence ──
let scrollY = 0;

export function saveBookmarkScroll() {
  scrollY = window.scrollY;
}

export function getBookmarkScrollY(): number {
  return scrollY;
}

// ── Actions ──

/**
 * Ensure data is loaded.
 * With createResource, this is mostly a no-op since the resource auto-fetches.
 * Only triggers a fetch if the resource hasn't started yet.
 */
export function ensureLoaded() {
  if (bookmarkResource.state === "unresolved" || bookmarkResource.state === "errored") {
    refetch();
  }
}

/**
 * Load next page of bookmarks.
 * Uses mutate to append data optimistically to the existing list.
 */
export async function fetchMore() {
  const current = bookmarkResource();
  if (!current?.nextUrl || bookmarkResource.loading) return;
  const data = await loadNext(current.nextUrl);
  mutate((prev) =>
    prev
      ? {
          illusts: [...prev.illusts, ...data.illusts],
          nextUrl: data.next_url,
        }
      : prev,
  );
}

/**
 * Pull-to-refresh: re-fetch the first page, replacing all data.
 * Delegates to createResource's refetch which re-runs the fetcher.
 */
export async function refresh() {
  refetch();
}

/**
 * Switch between public/private bookmarks.
 * Changing the restrict signal triggers auto-refetch via createResource's source tracking.
 */
export function setRestrict(r: RestrictType) {
  if (restrict() === r) return;
  setRestrictSignal(r);
  // Source change triggers automatic re-fetch — no manual action needed
}
