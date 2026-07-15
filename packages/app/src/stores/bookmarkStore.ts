import { createRoot, createSignal } from "solid-js";
import { createInfiniteQuery } from "@tanstack/solid-query";
import { loadBookmarks } from "../api/illust";
import { user } from "./authStore";
import type { PixivIllust, RestrictType, ApiError } from "../api/types";
import { filterFeedIllusts } from "../utils/r18Filter";
import { queryKeys } from "../api/queryKeys";
import { normalizeQueryError } from "../api/normalizeQueryError";
import { apiClient } from "../api/client";
import { queryClient } from "../api/queryClient";

// ── Restrict signal (unchanged) ──
const [restrict, setRestrictSignal] = createSignal<RestrictType>("public");

// ── TQ Infinite Query ──
const query = createRoot(() =>
  createInfiniteQuery(
    () => ({
      queryKey: queryKeys.bookmarks(user()?.id ?? 0, restrict()),
      queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
        if (pageParam) {
          return apiClient.get<{ illusts: PixivIllust[]; next_url: string | null }>(pageParam);
        }
        return loadBookmarks(user()?.id ?? 0, restrict());
      },
      getNextPageParam: (lastPage) => lastPage.next_url ?? undefined,
      initialPageParam: undefined as string | undefined,
      enabled: !!user()?.id,
    }),
    () => queryClient,
  ),
);

// ── Derived exports (interface unchanged) ──

/** Filtered illusts (R18/R18G + blocked users applied) */
export const illusts = () => {
  const data = query.data;
  if (!data) return [] as PixivIllust[];
  const all = data.pages.flatMap((p) => p.illusts);
  return filterFeedIllusts(all);
};

/** Next page URL for pagination */
export const nextUrl = (): string | null => {
  const data = query.data;
  if (!data) return null;
  return data.pages[data.pages.length - 1]?.next_url ?? null;
};

/** Whether the main fetch is in progress */
export const loading = () => query.isFetching;

/**
 * Normalized error message.
 * Maps known Pixiv API errors to user-friendly Chinese messages.
 */
export const error = (): ApiError | null => normalizeQueryError(query.error);

export { restrict };

// ── Scroll persistence (unchanged) ──
let scrollY = 0;

export function saveBookmarkScroll() {
  scrollY = window.scrollY;
}

export function getBookmarkScrollY(): number {
  return scrollY;
}

// ── Actions ──

/**
 * TQ 响应式查询已接管数据获取（queryKey 随 user/restrict 自动变化）。
 * 保留此函数仅用于向后兼容。
 */
export function ensureLoaded() {
  // TQ 响应式查询已自动处理 queryKey 变化；保留空函数用于向后兼容
}

/**
 * Load next page of bookmarks.
 * Delegates to TQ's fetchNextPage which manages pagination state.
 */
export const fetchMore = () => {
  if (!query.hasNextPage || query.isFetchingNextPage) return;
  return query.fetchNextPage();
};

/**
 * Pull-to-refresh: re-fetch the first page, replacing all data.
 * Delegates to TQ's refetch which cancels current query and re-fetches.
 */
export const refresh = () => query.refetch();

/**
 * Switch between public/private bookmarks.
 * Changing restrict signal updates the queryKey, triggering auto-refetch via TQ.
 */
export function setRestrict(r: RestrictType) {
  if (restrict() === r) return;
  setRestrictSignal(r);
}
