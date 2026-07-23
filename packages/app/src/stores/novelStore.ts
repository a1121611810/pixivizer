import { createRoot } from "solid-js";
import { createInfiniteQuery } from "@tanstack/solid-query";
import { loadRecommended, loadBookmarks, loadFollow } from "../api/novel";
import type { PixivNovel, RestrictType, ApiError } from "../api/types";
import { ApiErrorType } from "../api/types";
import { filterNovels } from "../utils/r18Filter";
import { normalizeQueryError } from "../api/normalizeQueryError";
import { currentTab } from "./uiStore";
import { user } from "./authStore";
import { apiClient } from "../api/client";
import { queryClient } from "../api/queryClient";
import { scrollRestoreGlobal } from "../primitives/createScrollRestore";
import type { ScrollRestoreState } from "../primitives/createScrollRestore";

// ── Signals (kept for backward compatibility) ──
import { createSignal } from "solid-js";

const [followTabState, setNovelFollowTab] = createSignal<"all" | "public" | "private">("all");
const [bookmarkRestrictState, setBookmarkRestrict] = createSignal<RestrictType>("public");
/** 非 TQ 错误兜底（如未登录提示），error() 会将其纳入 */
const [fallbackError, setFallbackError] = createSignal<ApiError | null>(null);

export const novelFollowTab = followTabState;
export { setNovelFollowTab };
export { bookmarkRestrictState as bookmarkRestrict, setBookmarkRestrict };

// ── TQ Infinite Queries ──

// Query 1: follow_novel_public
const followPublicQuery = createRoot(() =>
  createInfiniteQuery(
    () => ({
      queryKey: ["novel", "follow_public"] as const,
      queryFn: ({ pageParam, signal }: { pageParam?: string; signal?: AbortSignal }) => {
        if (pageParam) {
          return apiClient.get<{ novels: PixivNovel[]; next_url: string | null }>(
            pageParam,
            undefined,
            signal,
          );
        }
        return loadFollow("public");
      },
      getNextPageParam: (last: { next_url: string | null }) => last.next_url ?? undefined,
      initialPageParam: undefined as string | undefined,
      enabled:
        currentTab() === "follow" && (followTabState() === "all" || followTabState() === "public"),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }),
    () => queryClient,
  ),
);

// Query 2: follow_novel_private
const followPrivateQuery = createRoot(() =>
  createInfiniteQuery(
    () => ({
      queryKey: ["novel", "follow_private"] as const,
      queryFn: ({ pageParam, signal }: { pageParam?: string; signal?: AbortSignal }) => {
        if (pageParam) {
          return apiClient.get<{ novels: PixivNovel[]; next_url: string | null }>(
            pageParam,
            undefined,
            signal,
          );
        }
        return loadFollow("private");
      },
      getNextPageParam: (last: { next_url: string | null }) => last.next_url ?? undefined,
      initialPageParam: undefined as string | undefined,
      enabled:
        currentTab() === "follow" && (followTabState() === "all" || followTabState() === "private"),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }),
    () => queryClient,
  ),
);

// Query 3: recommended_novel
const recommendedQuery = createRoot(() =>
  createInfiniteQuery(
    () => ({
      queryKey: ["novel", "recommended"] as const,
      queryFn: ({ pageParam, signal }: { pageParam?: string; signal?: AbortSignal }) => {
        if (pageParam) {
          return apiClient.get<{ novels: PixivNovel[]; next_url: string | null }>(
            pageParam,
            undefined,
            signal,
          );
        }
        return loadRecommended();
      },
      getNextPageParam: (last: { next_url: string | null }) => last.next_url ?? undefined,
      initialPageParam: undefined as string | undefined,
      enabled: currentTab() === "recommended",
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }),
    () => queryClient,
  ),
);

// Query 4: bookmark_novel (with restrict in queryKey for separate caching)
const bookmarkQuery = createRoot(() =>
  createInfiniteQuery(
    () => {
      const u = user();
      const r = bookmarkRestrictState();
      return {
        queryKey: ["novel", "bookmarks", u?.id ?? 0, r] as const,
        queryFn: ({ pageParam, signal }: { pageParam?: string; signal?: AbortSignal }) => {
          if (pageParam) {
            return apiClient.get<{ novels: PixivNovel[]; next_url: string | null }>(
              pageParam,
              undefined,
              signal,
            );
          }
          return loadBookmarks(u?.id ?? 0, r);
        },
        getNextPageParam: (last: { next_url: string | null }) => last.next_url ?? undefined,
        initialPageParam: undefined as string | undefined,
        enabled: currentTab() === "bookmarks" && !!u?.id,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
      };
    },
    () => queryClient,
  ),
);

// ── Helpers ──

function flattenNovels(query: { data?: { pages: { novels: PixivNovel[] }[] } }): PixivNovel[] {
  if (!query.data?.pages) return [];
  return query.data.pages.flatMap((p) => p.novels);
}

function getLastNextUrl(query: { data?: { pages: { next_url: string | null }[] } }): string | null {
  if (!query.data?.pages?.length) return null;
  return query.data.pages[query.data.pages.length - 1].next_url ?? null;
}

function mergeAndSort(a: PixivNovel[], b: PixivNovel[]): PixivNovel[] {
  const result: PixivNovel[] = [];
  let i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].create_date >= b[j].create_date) {
      result.push(a[i++]);
    } else {
      result.push(b[j++]);
    }
  }
  result.push(...a.slice(i), ...b.slice(j));
  return result;
}

// ── Derived state ──

function activeQueries(): any[] {
  const tab = currentTab();
  if (tab === "follow") {
    const ft = followTabState();
    if (ft === "public") return [followPublicQuery];
    if (ft === "private") return [followPrivateQuery];
    return [followPublicQuery, followPrivateQuery];
  }
  if (tab === "recommended") return [recommendedQuery];
  if (tab === "bookmarks") return [bookmarkQuery];
  return [];
}

export const novels = (): PixivNovel[] => {
  const tab = currentTab();
  if (tab === "follow") {
    const ft = followTabState();
    if (ft === "public") return filterNovels(flattenNovels(followPublicQuery));
    if (ft === "private") return filterNovels(flattenNovels(followPrivateQuery));
    const pub = flattenNovels(followPublicQuery);
    const priv = flattenNovels(followPrivateQuery);
    if (pub.length === 0) return filterNovels(priv);
    if (priv.length === 0) return filterNovels(pub);
    return filterNovels(mergeAndSort(pub, priv));
  }
  if (tab === "recommended") return filterNovels(flattenNovels(recommendedQuery));
  if (tab === "bookmarks") return filterNovels(flattenNovels(bookmarkQuery));
  return [];
};

export const nextUrl = (): string | null => {
  const tab = currentTab();
  if (tab === "follow") {
    const ft = followTabState();
    if (ft === "public") return getLastNextUrl(followPublicQuery);
    if (ft === "private") return getLastNextUrl(followPrivateQuery);
    return getLastNextUrl(followPublicQuery) || getLastNextUrl(followPrivateQuery);
  }
  if (tab === "recommended") return getLastNextUrl(recommendedQuery);
  if (tab === "bookmarks") return getLastNextUrl(bookmarkQuery);
  return null;
};

export const loading = (): boolean => activeQueries().some((q) => q.isFetching);
export const refreshing = (): boolean => activeQueries().some((q) => q.isFetching);

const ERROR_TYPE_PRIORITY = [
  "PROXY",
  "NETWORK",
  "UNAUTHORIZED",
  "RATE_LIMIT",
  "SERVER",
  "UNKNOWN",
] as const;

function pickBestError(...errors: (ApiError | null)[]): ApiError | null {
  const filtered = errors.filter((e): e is ApiError => e !== null);
  if (filtered.length === 0) return null;
  for (const priority of ERROR_TYPE_PRIORITY) {
    const match = filtered.find((e) => e.type === priority);
    if (match) return match;
  }
  return filtered[0];
}

export const error = (): ApiError | null => {
  const fb = fallbackError();
  if (fb) return fb;
  const qs = activeQueries();
  const errs = qs.map((q) => normalizeQueryError(q.error));
  if (qs.length <= 1) return pickBestError(...errs);
  const allFailed = errs.length > 0 && errs.every((e) => e !== null);
  return allFailed ? pickBestError(...errs) : null;
};

// ── Actions ──

export async function ensureLoaded(): Promise<void> {
  setFallbackError(null); // 清除兜底错误，允许 TQ 错误自然生效
  const tab = currentTab();
  if (tab === "follow") {
    const ft = followTabState();
    const keys: string[] = [];
    if (ft === "all" || ft === "public") keys.push("follow_public");
    if (ft === "all" || ft === "private") keys.push("follow_private");
    await Promise.all(
      keys.map((k) =>
        queryClient.ensureInfiniteQueryData({
          queryKey: ["novel", k] as const,
          queryFn: () => loadFollow(k as "public" | "private"),
          getNextPageParam: (last: any) => last.next_url ?? undefined,
          initialPageParam: undefined,
        }),
      ),
    );
    return;
  }
  if (tab === "recommended") {
    await queryClient.ensureInfiniteQueryData({
      queryKey: ["novel", "recommended"] as const,
      queryFn: () => loadRecommended(),
      getNextPageParam: (last: any) => last.next_url ?? undefined,
      initialPageParam: undefined,
    });
    return;
  }
  if (tab === "bookmarks") {
    const u = user();
    if (!u) {
      setFallbackError({ type: ApiErrorType.UNAUTHORIZED, message: "未登录" });
      return;
    }
    await queryClient.ensureInfiniteQueryData({
      queryKey: ["novel", "bookmarks", u.id, bookmarkRestrictState()] as const,
      queryFn: () => loadBookmarks(u.id, bookmarkRestrictState()),
      getNextPageParam: (last: any) => last.next_url ?? undefined,
      initialPageParam: undefined,
    });
  }
}

export async function refresh(): Promise<void> {
  const qs = activeQueries();
  await Promise.all(qs.map((q) => q.refetch()));
}

export async function fetchMore(): Promise<void> {
  const qs = activeQueries();
  for (const q of qs) {
    if (q.hasNextPage && !q.isFetchingNextPage) {
      await q.fetchNextPage();
    }
  }
}

// ── Cache check ──

export function isNovelCached(tab?: string): boolean {
  const t = tab ?? currentTab();
  if (t === "follow") {
    return (
      (followPublicQuery.data?.pages?.length ?? 0) > 0 ||
      (followPrivateQuery.data?.pages?.length ?? 0) > 0
    );
  }
  if (t === "recommended") return (recommendedQuery.data?.pages?.length ?? 0) > 0;
  if (t === "bookmarks") return (bookmarkQuery.data?.pages?.length ?? 0) > 0;
  return false;
}

// ── Scroll position (unchanged) ──

export function saveTabScroll(tab: string) {
  if (tab === "follow") {
    scrollRestoreGlobal.saveSimple(`novel_follow_${followTabState()}`);
    return;
  }
  scrollRestoreGlobal.saveSimple(`novel_${tab}`);
}

export function getFeedScrollY(tab?: string): number {
  const t = tab ?? currentTab();
  if (t === "follow") {
    return scrollRestoreGlobal.getSimple(`novel_follow_${followTabState()}`) ?? 0;
  }
  return scrollRestoreGlobal.getSimple(`novel_${t}`) ?? 0;
}

export { type ScrollRestoreState };

function getScrollStateKey(tab?: string): string {
  const t = tab ?? currentTab();
  if (t === "follow") return `novel_follow_${followTabState()}`;
  return `novel_${t}`;
}

export function saveNovelScrollState(tab: string, st: ScrollRestoreState) {
  scrollRestoreGlobal.saveVirtual(getScrollStateKey(tab), st);
}

export function getNovelScrollState(tab?: string): ScrollRestoreState | null {
  return scrollRestoreGlobal.getVirtual(getScrollStateKey(tab)) ?? null;
}
