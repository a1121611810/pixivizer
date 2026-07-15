import { createSignal, createResource } from "solid-js";
import { loadBookmarks, loadNext } from "../api/illust";
import { user } from "./authStore";
import type { PixivIllust, RestrictType, ApiError } from "../api/types";
import { ApiErrorType } from "../api/types";
import { filterFeedIllusts } from "../utils/r18Filter";

// ── Restrict signal (user-controlled filter) ──
const [restrict, setRestrictSignal] = createSignal<RestrictType>("public");

// ── Resource: auto-fetches when user or restrict changes ──
const [bookmarkResource, { mutate, refetch }] = createResource(
  // Source: returns false when not logged in to prevent fetch
  () => {
    const u = user();
    if (!u?.id) return false;
    return { userId: u.id, restrict: restrict() };
  },
  // Fetcher: 429 重试由 client.ts 的指数退避统一处理
  async ({ userId, restrict: restrictVal }) => {
    const data = await loadBookmarks(userId, restrictVal);
    return { illusts: data.illusts, nextUrl: data.next_url };
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
export const error = (): ApiError | null => {
  const err = bookmarkResource.error;
  if (!err) return null;
  // 如果来自 client.ts，已经是 ApiError 对象
  if ((err as ApiError).type) {
    return err as ApiError;
  }
  // 兜底：转换为 UNKNOWN 类型
  return {
    type: ApiErrorType.UNKNOWN,
    message: `加载收藏列表失败: ${(err as { message?: string }).message ?? String(err)}`,
  };
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
