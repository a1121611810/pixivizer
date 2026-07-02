import { createStore, produce } from "solid-js/store";
import { batch, createEffect, createRoot } from "solid-js";
import { loadRecommended, loadFollow, loadNext } from "../api/illust";
import type { PixivIllust, ContentType } from "../api/types";
import { currentTab } from "./uiStore";
import { filterFeedIllusts } from "../utils/r18Filter";

export type RecommendSubTab = "mixed" | "illust" | "manga";

// ── Store: reactive UI-facing state ──
const [state, setState] = createStore({
  illusts: [] as PixivIllust[],
  nextUrl: null as string | null,
  loading: false,
  refreshing: false,
  error: null as string | null,
  followTab: "all" as "all" | "public" | "private",
  recommendSubTab: "mixed" as RecommendSubTab,
});

// ── Tab cache (non-reactive data store) ──
// Caches raw API data per tab so tab switching doesn't re-fetch.
// Follow-specific keys used:
//   tabIllusts["follow_public"], tabNextUrl["follow_public"]
//   tabIllusts["follow_private"], tabNextUrl["follow_private"]
// Recommended sub-tab keys:
//   tabIllusts["recommended_mixed"], tabIllusts["recommended_illust"], tabIllusts["recommended_manga"]
const tabScrollY: Record<string, number> = {};
const tabIllusts: Record<string, PixivIllust[]> = {};
const tabNextUrl: Record<string, string | null> = {};
const tabLoaded: Record<string, boolean> = {};

// ── Backward-compatible exports ──

export const illusts = () => state.illusts;
export const nextUrl = () => state.nextUrl;
export const loading = () => state.loading;
export const refreshing = () => state.refreshing;
export const error = () => state.error;
export const followTab = () => state.followTab;
export const setFollowTab = (t: "all" | "public" | "private") => setState("followTab", t);
export const recommendSubTab = () => state.recommendSubTab;
export function setRecommendSubTab(t: RecommendSubTab) {
  batch(() => {
    setState("recommendSubTab", t);
    setState("error", null);
  });
}

/**
 * 合并两个已按 create_date 降序排列的数组，保持全局时间降序。
 * 用于「全部」视图下合并 public + private 两路数据。
 */
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

/**
 * 根据当前 followTab 和双缓存计算出当前视图应展示的作品列表。
 * 全部 → mergeAndSort(public, private) 后 filterFeedIllusts
 * 公开 → filterFeedIllusts(tabIllusts["follow_public"])
 * 非公开 → filterFeedIllusts(tabIllusts["follow_private"])
 */
export function computeFollowIllusts(): PixivIllust[] {
  const tab = currentTab();
  if (tab !== "follow") return filterFeedIllusts(tabIllusts[tab] ?? []);
  const fTab = state.followTab;
  if (fTab === "public") return filterFeedIllusts(tabIllusts["follow_public"] ?? []);
  if (fTab === "private") return filterFeedIllusts(tabIllusts["follow_private"] ?? []);
  // "all" — merge both sources
  const pub = tabIllusts["follow_public"] ?? [];
  const priv = tabIllusts["follow_private"] ?? [];
  if (pub.length === 0) return filterFeedIllusts(priv);
  if (priv.length === 0) return filterFeedIllusts(pub);
  return filterFeedIllusts(mergeAndSort(pub, priv));
}

const byCreateDateDesc = (a: PixivIllust, b: PixivIllust) =>
  b.create_date.localeCompare(a.create_date);

/**
 * 计算综合推荐：合并插画源和漫画源，按 create_date 降序排序后过滤。
 * 合并时按 illust.id 去重，避免 Pixiv API 两端返回同一作品导致的重复。
 */
export function computeMixedIllusts(): PixivIllust[] {
  const illust = tabIllusts["recommended_illust"] ?? [];
  const manga = tabIllusts["recommended_manga"] ?? [];
  // 同一作品可能在 illust 和 manga 中都出现，需按 id 去重
  const seen = new Set<number>();
  const combined: PixivIllust[] = [];
  const pushIfNotDuplicate = (item: PixivIllust) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      combined.push(item);
    }
  };
  // toSorted() is ES2023; use copied arrays + sort() for older runtimes.
  const sortedIllust = [...illust].sort(byCreateDateDesc); // oxlint-disable-line unicorn/no-array-sort
  const sortedManga = [...manga].sort(byCreateDateDesc); // oxlint-disable-line unicorn/no-array-sort
  // 按时间降序合并（归并），同时去重
  let i = 0, j = 0;
  while (i < sortedIllust.length && j < sortedManga.length) {
    if (sortedIllust[i].create_date >= sortedManga[j].create_date) {
      pushIfNotDuplicate(sortedIllust[i++]);
    } else {
      pushIfNotDuplicate(sortedManga[j++]);
    }
  }
  while (i < sortedIllust.length) pushIfNotDuplicate(sortedIllust[i++]);
  while (j < sortedManga.length) pushIfNotDuplicate(sortedManga[j++]);
  return filterFeedIllusts(combined);
}

// Recompute illusts when follow tab changes (filter tabs have no effect otherwise)
createRoot(() => {
  createEffect(() => {
    const tab = currentTab();
    if (tab === "follow") {
      batch(() => {
        setState("illusts", computeFollowIllusts());
      });
    }
  });
});

// Recompute illusts when recommended sub-tab changes
// (caller must have loaded the underlying source data first)
createRoot(() => {
  createEffect(() => {
    const tab = currentTab();
    const subTab = recommendSubTab();
    if (tab === "recommended") {
      batch(() => {
        if (subTab === "mixed") {
          setState("illusts", computeMixedIllusts());
          setState(
            "nextUrl",
            tabNextUrl["recommended_illust"] || tabNextUrl["recommended_manga"] || null,
          );
        } else {
          const sourceKey = subTab === "illust" ? "recommended_illust" : "recommended_manga";
          setState("illusts", filterFeedIllusts(tabIllusts[sourceKey] ?? []));
          setState("nextUrl", tabNextUrl[sourceKey] || null);
        }
      });
    }
  });
});

// ── Actions ──

export async function ensureLoaded(): Promise<void> {
  const tab = currentTab();
  if (tab === "follow") {
    // Follow tab: show cached data if available
    const pubCached = tabIllusts["follow_public"] !== undefined;
    const privCached = tabIllusts["follow_private"] !== undefined;
    if (pubCached || privCached) {
      setState("illusts", computeFollowIllusts());
      setState(
        "nextUrl",
        tab === "follow"
          ? (state.followTab === "public"
              ? tabNextUrl["follow_public"]
              : state.followTab === "private"
                ? tabNextUrl["follow_private"]
                : tabNextUrl["follow_public"] || tabNextUrl["follow_private"]) || null
          : tabNextUrl[tab] || null,
      );
    }
    if (!tabLoaded[tab]) {
      if (!pubCached && !privCached) {
        setState("illusts", []);
      }
      await fetchFollow();
      tabLoaded[tab] = true;
    }
    return;
  }

  // Recommended tab with sub-tabs
  if (tab === "recommended") {
    const subTab = recommendSubTab();

    if (subTab === "mixed") {
      const illustCached = tabIllusts["recommended_illust"] !== undefined;
      const mangaCached = tabIllusts["recommended_manga"] !== undefined;
      if (illustCached || mangaCached) {
        setState("illusts", computeMixedIllusts());
        setState(
          "nextUrl",
          tabNextUrl["recommended_illust"] || tabNextUrl["recommended_manga"] || null,
        );
      }
      if (!tabLoaded["recommended_mixed"]) {
        if (!illustCached && !mangaCached) {
          setState("illusts", []);
        }
        await fetchMixed();
        tabLoaded["recommended_mixed"] = true;
      }
      return;
    }

    const sourceKey = subTab === "illust" ? "recommended_illust" : "recommended_manga";
    if (tabLoaded[sourceKey]) {
      if (tabIllusts[sourceKey]) {
        batch(() => {
          setState("illusts", filterFeedIllusts(tabIllusts[sourceKey]));
          setState("nextUrl", tabNextUrl[sourceKey] || null);
        });
      }
      return;
    }
    if (tabIllusts[sourceKey]) {
      batch(() => {
        setState("illusts", filterFeedIllusts(tabIllusts[sourceKey]));
        setState("nextUrl", tabNextUrl[sourceKey] || null);
      });
      tabLoaded[sourceKey] = true;
      return;
    }
    setState("illusts", []);
    if (subTab === "illust") {
      await fetchRecommended("illust");
    } else {
      await fetchManga();
    }
    tabLoaded[sourceKey] = true;
    return;
  }

  // Non-follow, non-recommended tabs (bookmarks, etc.)
  if (tabLoaded[tab]) {
    if (tabIllusts[tab]) {
      batch(() => {
        setState("illusts", filterFeedIllusts(tabIllusts[tab]));
        setState("nextUrl", tabNextUrl[tab] || null);
      });
    }
    return;
  }
  if (tabIllusts[tab]) {
    batch(() => {
      setState("illusts", filterFeedIllusts(tabIllusts[tab]));
      setState("nextUrl", tabNextUrl[tab] || null);
    });
    tabLoaded[tab] = true;
    return;
  }
  setState("illusts", []);
  tabLoaded[tab] = true;
}

export async function refresh() {
  const tab = currentTab();
  setState("refreshing", true);
  try {
    if (tab === "recommended") {
      const subTab = recommendSubTab();
      if (subTab === "mixed") {
        await fetchMixed();
      } else if (subTab === "illust") {
        await fetchRecommended("illust");
      } else {
        await fetchManga();
      }
    } else if (tab === "follow") {
      await fetchFollow();
    }
  } finally {
    setState("refreshing", false);
  }
}

export function saveTabScroll(tab: string) {
  if (tab === "follow") {
    // Don't save tabNextUrl["follow"] — it's never used for follow
    // The per-source nextUrls are already maintained in tabNextUrl["follow_public"/"follow_private"]
    tabScrollY[tab] = window.scrollY;
    return;
  }
  if (tab === "recommended") {
    const key = `recommended_${recommendSubTab()}`;
    // For mixed sub-tab the source keys (recommended_illust / recommended_manga)
    // already hold the truth; state.nextUrl is just a derived value.
    if (recommendSubTab() !== "mixed") {
      tabNextUrl[key] = state.nextUrl;
    }
    tabScrollY[key] = window.scrollY;
    return;
  }
  tabNextUrl[tab] = state.nextUrl;
  tabScrollY[tab] = window.scrollY;
}

export function markFeedMounted() {
  // no-op: lifecycle hook for Feed component
}

export function isFeedCached(tab?: string) {
  const t = tab ?? currentTab();
  if (t === "recommended") {
    const subTab = recommendSubTab();
    if (subTab === "mixed") {
      return (
        tabLoaded["recommended_mixed"] ||
        tabIllusts["recommended_illust"] !== undefined ||
        tabIllusts["recommended_manga"] !== undefined
      );
    }
    const key = `recommended_${subTab}`;
    return tabLoaded[key] || tabIllusts[key] !== undefined;
  }
  return tabLoaded[t] || tabIllusts[t] !== undefined;
}

export function getFeedScrollY(tab?: string) {
  const t = tab ?? currentTab();
  if (t === "recommended") {
    return tabScrollY[`recommended_${recommendSubTab()}`] || 0;
  }
  return tabScrollY[t] || 0;
}

// ── Internal fetch functions ──

export async function fetchRecommended(contentType: ContentType = "illust") {
  setState("loading", true);
  setState("error", null);
  const sourceKey = contentType === "manga" ? "recommended_manga" : "recommended_illust";
  try {
    const data = await loadRecommended(contentType);
    // Cache raw data; illusts uses filtered version
    tabIllusts[sourceKey] = data.illusts;
    tabNextUrl[sourceKey] = data.next_url;
    if (
      currentTab() === "recommended" &&
      recommendSubTab() === (contentType === "manga" ? "manga" : "illust")
    ) {
      batch(() => {
        setState("illusts", filterFeedIllusts(data.illusts));
        setState("nextUrl", data.next_url);
      });
    }
  } catch (e) {
    setState("error", (e as { message?: string }).message ?? "加载失败");
  } finally {
    setState("loading", false);
  }
}

export async function fetchManga() {
  return fetchRecommended("manga");
}

export async function fetchMixed() {
  setState("loading", true);
  setState("error", null);
  const errors: string[] = [];

  try {
    const [illustResult, mangaResult] = await Promise.allSettled([
      loadRecommended("illust"),
      loadRecommended("manga"),
    ]);

    if (illustResult.status === "fulfilled") {
      tabIllusts["recommended_illust"] = illustResult.value.illusts;
      tabNextUrl["recommended_illust"] = illustResult.value.next_url;
    } else {
      errors.push((illustResult.reason as { message?: string }).message ?? "插画推荐加载失败");
    }

    if (mangaResult.status === "fulfilled") {
      tabIllusts["recommended_manga"] = mangaResult.value.illusts;
      tabNextUrl["recommended_manga"] = mangaResult.value.next_url;
    } else {
      errors.push((mangaResult.reason as { message?: string }).message ?? "漫画推荐加载失败");
    }

    if (currentTab() === "recommended" && recommendSubTab() === "mixed") {
      batch(() => {
        setState("illusts", computeMixedIllusts());
        setState(
          "nextUrl",
          tabNextUrl["recommended_illust"] || tabNextUrl["recommended_manga"] || null,
        );
      });
    }

    if (errors.length > 0) {
      if (errors.length === 2) {
        setState("error", errors.join("; "));
      } else {
        console.warn("fetchMixed: partial failure —", errors.join("; "));
      }
    }
  } finally {
    setState("loading", false);
  }
}

export async function fetchMoreMixed() {
  if (state.loading) return;
  setState("loading", true);
  setState("error", null);

  const illustsArr = tabIllusts["recommended_illust"] ?? [];
  const mangaArr = tabIllusts["recommended_manga"] ?? [];

  const illustOldest = illustsArr.length > 0 ? illustsArr[illustsArr.length - 1].create_date : null;
  const mangaOldest = mangaArr.length > 0 ? mangaArr[mangaArr.length - 1].create_date : null;

  const errors: string[] = [];

  const loadSource = async (key: "recommended_illust" | "recommended_manga"): Promise<boolean> => {
    const next = tabNextUrl[key];
    if (!next) return false;
    try {
      const data = await loadNext(next);
      tabIllusts[key] = [...(tabIllusts[key] || []), ...data.illusts];
      tabNextUrl[key] = data.next_url;
      return true;
    } catch (e) {
      errors.push((e as { message?: string }).message ?? "加载失败");
      return false;
    }
  };

  // 优先加载当前合并列表尾部时间较早的那一路
  const preferIllust =
    mangaOldest === null || (illustOldest !== null && illustOldest <= mangaOldest);

  const loaded = preferIllust
    ? (await loadSource("recommended_illust")) || (await loadSource("recommended_manga"))
    : (await loadSource("recommended_manga")) || (await loadSource("recommended_illust"));

  if (loaded && currentTab() === "recommended" && recommendSubTab() === "mixed") {
    batch(() => {
      setState("illusts", computeMixedIllusts());
      setState(
        "nextUrl",
        tabNextUrl["recommended_illust"] || tabNextUrl["recommended_manga"] || null,
      );
    });
  }

  if (errors.length > 0 && !loaded) {
    setState("error", errors.join("; "));
  }

  setState("loading", false);
}

export async function fetchFollow() {
  setState("loading", true);
  setState("error", null);
  let errors: string[] = [];
  try {
    const [publicResult, privateResult] = await Promise.allSettled([
      loadFollow("public"),
      loadFollow("private"),
    ]);
    // Process public result
    if (publicResult.status === "fulfilled") {
      tabIllusts["follow_public"] = publicResult.value.illusts;
      tabNextUrl["follow_public"] = publicResult.value.next_url;
    } else {
      errors.push((publicResult.reason as { message?: string }).message ?? "公开关注加载失败");
    }
    // Process private result
    if (privateResult.status === "fulfilled") {
      tabIllusts["follow_private"] = privateResult.value.illusts;
      tabNextUrl["follow_private"] = privateResult.value.next_url;
    } else {
      errors.push((privateResult.reason as { message?: string }).message ?? "非公开关注加载失败");
    }
    // Update display if current tab is follow (even if only one succeeded)
    if (currentTab() === "follow") {
      batch(() => {
        setState("illusts", computeFollowIllusts());
        const ft = state.followTab;
        const effectiveNext =
          ft === "public"
            ? tabNextUrl["follow_public"]
            : ft === "private"
              ? tabNextUrl["follow_private"]
              : tabNextUrl["follow_public"] || tabNextUrl["follow_private"];
        setState("nextUrl", effectiveNext);
      });
    }
    // Set error only when both failed; partial failure is a warning
    if (errors.length > 0) {
      if (errors.length === 2) {
        setState("error", errors.join("; "));
      } else {
        console.warn("fetchFollow: partial failure —", errors.join("; "));
      }
    }
  } finally {
    setState("loading", false);
  }
}

export async function fetchMore() {
  if (state.loading) return;
  const tab = currentTab();
  if (tab === "recommended" && recommendSubTab() === "mixed") {
    return fetchMoreMixed();
  }
  if (tab !== "follow") {
    const sourceKey =
      tab === "recommended"
        ? recommendSubTab() === "illust"
          ? "recommended_illust"
          : "recommended_manga"
        : tab;
    if (!state.nextUrl) return;
    setState("loading", true);
    try {
      const data = await loadNext(state.nextUrl);
      tabIllusts[sourceKey] = [...(tabIllusts[sourceKey] || []), ...data.illusts];
      tabNextUrl[sourceKey] = data.next_url;
      batch(() => {
        setState(
          produce((s) => {
            s.illusts.push(...filterFeedIllusts(data.illusts));
            s.nextUrl = data.next_url;
          }),
        );
      });
    } catch (e) {
      setState("error", (e as { message?: string }).message ?? "加载失败");
    } finally {
      setState("loading", false);
    }
    return;
  }

  // Follow tab — per-source pagination
  setState("loading", true);
  try {
    const fTab = state.followTab;
    if (fTab === "public") {
      // Load more for public only
      const pubNext = tabNextUrl["follow_public"];
      if (!pubNext) {
        setState("loading", false);
        return;
      }
      const data = await loadNext(pubNext);
      tabIllusts["follow_public"] = [...(tabIllusts["follow_public"] || []), ...data.illusts];
      tabNextUrl["follow_public"] = data.next_url;
      setState(
        produce((s) => {
          s.illusts.push(...filterFeedIllusts(data.illusts));
          s.nextUrl = tabNextUrl["follow_public"];
        }),
      );
    } else if (fTab === "private") {
      // Load more for private only
      const privNext = tabNextUrl["follow_private"];
      if (!privNext) {
        setState("loading", false);
        return;
      }
      const data = await loadNext(privNext);
      tabIllusts["follow_private"] = [...(tabIllusts["follow_private"] || []), ...data.illusts];
      tabNextUrl["follow_private"] = data.next_url;
      setState(
        produce((s) => {
          s.illusts.push(...filterFeedIllusts(data.illusts));
          s.nextUrl = tabNextUrl["follow_private"];
        }),
      );
    } else {
      // "all" mode — load the source with older tail first;
      // if that source is exhausted, fall through to the other.
      const pubIllusts = tabIllusts["follow_public"] || [];
      const privIllusts = tabIllusts["follow_private"] || [];
      const pubOldest =
        pubIllusts.length > 0 ? pubIllusts[pubIllusts.length - 1].create_date : null;
      const privOldest =
        privIllusts.length > 0 ? privIllusts[privIllusts.length - 1].create_date : null;

      if (pubOldest === null && privOldest === null) {
        setState("loading", false);
        return;
      }

      // Determine preferred source order
      const preferPublic = privOldest === null || (pubOldest !== null && pubOldest >= privOldest);

      const loadSource = async (key: "follow_public" | "follow_private"): Promise<boolean> => {
        const next = tabNextUrl[key];
        if (!next) return false;
        const data = await loadNext(next);
        tabIllusts[key] = [...(tabIllusts[key] || []), ...data.illusts];
        tabNextUrl[key] = data.next_url;
        return true;
      };

      const loaded = preferPublic
        ? (await loadSource("follow_public")) || (await loadSource("follow_private"))
        : (await loadSource("follow_private")) || (await loadSource("follow_public"));

      if (loaded) {
        setState(
          produce((s) => {
            s.illusts = computeFollowIllusts();
            s.nextUrl = tabNextUrl["follow_public"] || tabNextUrl["follow_private"];
          }),
        );
      } else {
        setState("loading", false);
        return;
      }
    }
  } catch (e) {
    setState("error", (e as { message?: string }).message ?? "加载失败");
  } finally {
    setState("loading", false);
  }
}
