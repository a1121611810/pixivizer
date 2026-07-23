import { createRoot } from "solid-js";
import { createInfiniteQuery } from "@tanstack/solid-query";
import { loadRecommended, loadFollow } from "../api/illust";
import type { PixivIllust, ApiError } from "../api/types";
import { currentTab } from "./uiStore";
import { filterFeedIllusts } from "../utils/r18Filter";
import { apiClient } from "../api/client";
import { queryClient } from "../api/queryClient";
import { normalizeQueryError } from "../api/normalizeQueryError";
import { scrollRestoreGlobal } from "../primitives/createScrollRestore";
import type { ScrollRestoreState } from "../primitives/createScrollRestore";

export type RecommendSubTab = "mixed" | "illust" | "manga";

// ── Sub-tab signals (kept for backward compatibility) ──
import { createSignal, batch } from "solid-js";

const [followTabState, setFollowTab] = createSignal<"all" | "public" | "private">("all");
const [recommendSubTabState, setRecommendSubTabRaw] = createSignal<RecommendSubTab>("mixed");

export const followTab = followTabState;
export { setFollowTab };
export const recommendSubTab = recommendSubTabState;

export function setRecommendSubTab(t: RecommendSubTab) {
  batch(() => {
    setRecommendSubTabRaw(t);
  });
}

// ── TQ Infinite Queries ──
// 每个数据源一个独立查询，enable 由当前 tab + 子标签控制

function onFollowTab(...allowed: ("all" | "public" | "private")[]) {
  return () => currentTab() === "follow" && allowed.includes(followTabState());
}

function onRecommendedSubTab(...allowed: RecommendSubTab[]) {
  return () => currentTab() === "recommended" && allowed.includes(recommendSubTabState());
}

// Query 1: follow_public
const followPublicQuery = createRoot(() =>
  createInfiniteQuery(
    () => ({
      queryKey: ["feed", "follow_public"] as const,
      queryFn: ({ pageParam, signal }) => {
        if (pageParam) {
          return apiClient.get<{ illusts: PixivIllust[]; next_url: string | null }>(
            pageParam as string,
            undefined,
            signal,
          );
        }
        return loadFollow("public", signal);
      },
      getNextPageParam: (last) => last.next_url ?? undefined,
      initialPageParam: undefined as string | undefined,
      enabled: onFollowTab("all", "public")(),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }),
    () => queryClient,
  ),
);

// Query 2: follow_private
const followPrivateQuery = createRoot(() =>
  createInfiniteQuery(
    () => ({
      queryKey: ["feed", "follow_private"] as const,
      queryFn: ({ pageParam, signal }) => {
        if (pageParam) {
          return apiClient.get<{ illusts: PixivIllust[]; next_url: string | null }>(
            pageParam as string,
            undefined,
            signal,
          );
        }
        return loadFollow("private", signal);
      },
      getNextPageParam: (last) => last.next_url ?? undefined,
      initialPageParam: undefined as string | undefined,
      enabled: onFollowTab("all", "private")(),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }),
    () => queryClient,
  ),
);

// Query 3: recommended_illust
const recommendedIllustQuery = createRoot(() =>
  createInfiniteQuery(
    () => ({
      queryKey: ["feed", "recommended_illust"] as const,
      queryFn: ({ pageParam, signal }) => {
        if (pageParam) {
          return apiClient.get<{ illusts: PixivIllust[]; next_url: string | null }>(
            pageParam as string,
            undefined,
            signal,
          );
        }
        return loadRecommended("illust", signal);
      },
      getNextPageParam: (last) => last.next_url ?? undefined,
      initialPageParam: undefined as string | undefined,
      enabled: onRecommendedSubTab("mixed", "illust")(),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }),
    () => queryClient,
  ),
);

// Query 4: recommended_manga
const recommendedMangaQuery = createRoot(() =>
  createInfiniteQuery(
    () => ({
      queryKey: ["feed", "recommended_manga"] as const,
      queryFn: ({ pageParam, signal }) => {
        if (pageParam) {
          return apiClient.get<{ illusts: PixivIllust[]; next_url: string | null }>(
            pageParam as string,
            undefined,
            signal,
          );
        }
        return loadRecommended("manga", signal);
      },
      getNextPageParam: (last) => last.next_url ?? undefined,
      initialPageParam: undefined as string | undefined,
      enabled: onRecommendedSubTab("mixed", "manga")(),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }),
    () => queryClient,
  ),
);

// ── Helper: flatten TQ pages → array ──

function flattenIllusts(query: { data?: { pages: { illusts: PixivIllust[] }[] } }): PixivIllust[] {
  if (!query.data?.pages) return [];
  return query.data.pages.flatMap((p) => p.illusts);
}

// ── Helper: get next_url from a query's last page ──

function getLastNextUrl(query: { data?: { pages: { next_url: string | null }[] } }): string | null {
  if (!query.data?.pages?.length) return null;
  return query.data.pages[query.data.pages.length - 1].next_url ?? null;
}

// ── Merge helpers ──

function mergeAndSort(a: PixivIllust[], b: PixivIllust[]): PixivIllust[] {
  const result: PixivIllust[] = [];
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

function removeDuplicates(illusts: PixivIllust[]): PixivIllust[] {
  const seen = new Set<number>();
  return illusts.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

// ── Derived state ──

/** 当前活跃的查询列表（取决于 tab + 子标签） */
function activeQueries(): (typeof followPublicQuery)[] {
  const tab = currentTab();
  if (tab === "follow") {
    const ft = followTabState();
    if (ft === "public") return [followPublicQuery];
    if (ft === "private") return [followPrivateQuery];
    return [followPublicQuery, followPrivateQuery];
  }
  if (tab === "recommended") {
    const st = recommendSubTabState();
    if (st === "illust") return [recommendedIllustQuery];
    if (st === "manga") return [recommendedMangaQuery];
    return [recommendedIllustQuery, recommendedMangaQuery];
  }
  return [];
}

export const illusts = (): PixivIllust[] => {
  const tab = currentTab();
  if (tab === "follow") {
    const ft = followTabState();
    if (ft === "public") return filterFeedIllusts(flattenIllusts(followPublicQuery));
    if (ft === "private") return filterFeedIllusts(flattenIllusts(followPrivateQuery));
    const pub = flattenIllusts(followPublicQuery);
    const priv = flattenIllusts(followPrivateQuery);
    if (pub.length === 0) return filterFeedIllusts(priv);
    if (priv.length === 0) return filterFeedIllusts(pub);
    return filterFeedIllusts(mergeAndSort(pub, priv));
  }
  if (tab === "recommended") {
    const st = recommendSubTabState();
    if (st === "illust") return filterFeedIllusts(flattenIllusts(recommendedIllustQuery));
    if (st === "manga") return filterFeedIllusts(flattenIllusts(recommendedMangaQuery));
    // Mixed: merge + deduplicate
    const illust = flattenIllusts(recommendedIllustQuery);
    const manga = flattenIllusts(recommendedMangaQuery);
    if (illust.length === 0) return filterFeedIllusts(manga);
    if (manga.length === 0) return filterFeedIllusts(illust);
    return filterFeedIllusts(
      removeDuplicates(
        mergeAndSort(
          [...illust].sort((a, b) => b.create_date.localeCompare(a.create_date)),
          [...manga].sort((a, b) => b.create_date.localeCompare(a.create_date)),
        ),
      ),
    );
  }
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
  if (tab === "recommended") {
    const st = recommendSubTabState();
    if (st === "illust") return getLastNextUrl(recommendedIllustQuery);
    if (st === "manga") return getLastNextUrl(recommendedMangaQuery);
    return getLastNextUrl(recommendedIllustQuery) || getLastNextUrl(recommendedMangaQuery);
  }
  return null;
};

export const loading = (): boolean => {
  return activeQueries().some((q) => q.isFetching);
};

export const refreshing = (): boolean => {
  return activeQueries().some((q) => q.isFetching);
};

// ── Error state: pick most specific error from active queries ──

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
  const qs = activeQueries();
  const errs = qs.map((q) => normalizeQueryError(q.error));
  // 双源模式下（mixed/all），仅当全部数据源都失败时才显示错误
  // 单源模式下，有错就显示
  if (qs.length <= 1) return pickBestError(...errs);
  const allFailed = errs.length > 0 && errs.every((e) => e !== null);
  return allFailed ? pickBestError(...errs) : null;
};

// ── Tab cache helpers (backward-compatible) ──

export function isFeedCached(tab?: string): boolean {
  const t = tab ?? currentTab();
  if (t === "follow") {
    return (
      (followPublicQuery.data?.pages?.length ?? 0) > 0 ||
      (followPrivateQuery.data?.pages?.length ?? 0) > 0
    );
  }
  if (t === "recommended") {
    const st = recommendSubTabState();
    if (st === "mixed") {
      return (
        (recommendedIllustQuery.data?.pages?.length ?? 0) > 0 ||
        (recommendedMangaQuery.data?.pages?.length ?? 0) > 0
      );
    }
    if (st === "illust") return (recommendedIllustQuery.data?.pages?.length ?? 0) > 0;
    if (st === "manga") return (recommendedMangaQuery.data?.pages?.length ?? 0) > 0;
  }
  return false;
}

export function markFeedMounted() {
  // No-op: lifecycle hook for Feed component
}

// ── Actions ──

/** 获取当前活跃数据源的 queryKey 列表 */
function activeQueryKeys(): string[] {
  const tab = currentTab();
  if (tab === "follow") {
    const ft = followTabState();
    if (ft === "public") return ["follow_public"];
    if (ft === "private") return ["follow_private"];
    return ["follow_public", "follow_private"];
  }
  if (tab === "recommended") {
    const st = recommendSubTabState();
    if (st === "illust") return ["recommended_illust"];
    if (st === "manga") return ["recommended_manga"];
    return ["recommended_illust", "recommended_manga"];
  }
  return [];
}

const queryOptionsMap: Record<string, any> = {
  follow_public: {
    queryKey: ["feed", "follow_public"] as const,
    queryFn: ({ signal }: { signal?: AbortSignal }) => loadFollow("public", signal),
    getNextPageParam: (last: { next_url: string | null }) => last.next_url ?? undefined,
    initialPageParam: undefined,
  },
  follow_private: {
    queryKey: ["feed", "follow_private"] as const,
    queryFn: ({ signal }: { signal?: AbortSignal }) => loadFollow("private", signal),
    getNextPageParam: (last: { next_url: string | null }) => last.next_url ?? undefined,
    initialPageParam: undefined,
  },
  recommended_illust: {
    queryKey: ["feed", "recommended_illust"] as const,
    queryFn: ({ signal }: { signal?: AbortSignal }) => loadRecommended("illust", signal),
    getNextPageParam: (last: { next_url: string | null }) => last.next_url ?? undefined,
    initialPageParam: undefined,
  },
  recommended_manga: {
    queryKey: ["feed", "recommended_manga"] as const,
    queryFn: ({ signal }: { signal?: AbortSignal }) => loadRecommended("manga", signal),
    getNextPageParam: (last: { next_url: string | null }) => last.next_url ?? undefined,
    initialPageParam: undefined,
  },
};

export async function ensureLoaded(_signal?: AbortSignal): Promise<void> {
  const keys = activeQueryKeys();
  await Promise.all(
    keys.map((key) =>
      queryClient.ensureInfiniteQueryData({
        ...queryOptionsMap[key],
        staleTime: 30_000,
      } as any),
    ),
  );
}

export async function refresh(_signal?: AbortSignal): Promise<void> {
  const qs = activeQueries();
  await Promise.all(qs.map((q) => (q as any).refetch()));
}

export async function fetchMore(_signal?: AbortSignal): Promise<void> {
  const qs = activeQueries();
  for (const q of qs) {
    if ((q as any).hasNextPage && !(q as any).isFetchingNextPage) {
      await (q as any).fetchNextPage();
    }
  }
}

// ── Scroll position (unchanged) ──

export function saveTabScroll(tab: string) {
  if (tab === "follow") {
    scrollRestoreGlobal.saveSimple(tab);
    return;
  }
  if (tab === "recommended") {
    const key = `recommended_${recommendSubTabState()}`;
    scrollRestoreGlobal.saveSimple(key);
    return;
  }
  scrollRestoreGlobal.saveSimple(tab);
}

export function getFeedScrollY(tab?: string): number {
  const t = tab ?? currentTab();
  if (t === "recommended") {
    return scrollRestoreGlobal.getSimple(`recommended_${recommendSubTabState()}`) ?? 0;
  }
  return scrollRestoreGlobal.getSimple(t) ?? 0;
}

export { type ScrollRestoreState };

// ── TanStack Virtual 滚动状态 API ──

function getScrollStateKey(tab?: string): string {
  const t = tab ?? currentTab();
  if (t === "recommended") {
    return `recommended_${recommendSubTabState()}`;
  }
  return t;
}

export function saveFeedScrollState(tab: string, st: ScrollRestoreState) {
  scrollRestoreGlobal.saveVirtual(getScrollStateKey(tab), st);
}

export function getFeedScrollState(tab?: string): ScrollRestoreState | null {
  return scrollRestoreGlobal.getVirtual(getScrollStateKey(tab)) ?? null;
}

// ── Legacy fetch functions (kept for backward compatibility) ──
// These are no longer primary data paths; TQ handles all fetching.
// Consumers should use ensureLoaded + refresh + fetchMore instead.
