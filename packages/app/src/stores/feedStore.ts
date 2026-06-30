import { createStore, produce } from "solid-js/store";
import { batch } from "solid-js";
import { loadRecommended, loadFollow, loadNext } from "../api/illust";
import type { PixivIllust, ContentType } from "../api/types";
import { currentTab } from "./uiStore";
import { filterFeedIllusts } from "../utils/r18Filter";

// ── Store: reactive UI-facing state ──
const [state, setState] = createStore({
  illusts: [] as PixivIllust[],
  nextUrl: null as string | null,
  loading: false,
  refreshing: false,
  error: null as string | null,
  followTab: "all" as "all" | "public" | "private",
});

// ── Tab cache (non-reactive data store) ──
// Caches raw API data per tab so tab switching doesn't re-fetch.
// Follow-specific keys used:
//   tabIllusts["follow_public"], tabNextUrl["follow_public"]
//   tabIllusts["follow_private"], tabNextUrl["follow_private"]
// Non-follow tabs keep using tabIllusts["recommended"] etc.
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

/**
 * 合并两个已按 create_date 降序排列的数组，保持全局时间降序。
 * 用于「全部」视图下合并 public + private 两路数据。
 */
function mergeAndSort(a: PixivIllust[], b: PixivIllust[]): PixivIllust[] {
  const result: PixivIllust[] = [];
  let i = 0, j = 0;
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

// ── Actions ──

export function ensureLoaded() {
  const tab = currentTab();
  if (tab === "follow") {
    // Follow tab: show cached data if available
    const pubCached = tabIllusts["follow_public"] !== undefined;
    const privCached = tabIllusts["follow_private"] !== undefined;
    if (pubCached || privCached) {
      setState("illusts", computeFollowIllusts());
      setState("nextUrl", tabNextUrl[tab] || null);
    }
    if (!tabLoaded[tab]) {
      if (!pubCached && !privCached) {
        setState("illusts", []);
      }
      fetchFollow();
      tabLoaded[tab] = true;
    }
    return;
  }

  // Non-follow tabs (recommended etc.)
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
  if (tab === "recommended") {
    fetchRecommended();
  }
  tabLoaded[tab] = true;
}

export async function refresh() {
  const tab = currentTab();
  setState("refreshing", true);
  try {
    if (tab === "recommended") {
      await fetchRecommended();
    } else if (tab === "follow") {
      await fetchFollow();
    }
  } finally {
    setState("refreshing", false);
  }
}

export function saveTabScroll(tab: string) {
  tabNextUrl[tab] = state.nextUrl;
  tabScrollY[tab] = window.scrollY;
}

export function markFeedMounted() {
  // no-op: lifecycle hook for Feed component
}

export function isFeedCached(tab?: string) {
  const t = tab ?? currentTab();
  return tabLoaded[t] || tabIllusts[t] !== undefined;
}

export function getFeedScrollY(tab?: string) {
  const t = tab ?? currentTab();
  return tabScrollY[t] || 0;
}

// ── Internal fetch functions ──

export async function fetchRecommended(contentType: ContentType = "illust") {
  setState("loading", true);
  setState("error", null);
  try {
    const data = await loadRecommended(contentType);
    // Cache raw data; illusts uses filtered version
    tabIllusts["recommended"] = data.illusts;
    tabNextUrl["recommended"] = data.next_url;
    if (currentTab() === "recommended") {
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
        setState("nextUrl", null);
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
  if (tab !== "follow") {
    // Non-follow tabs — existing behavior
    if (!state.nextUrl) return;
    setState("loading", true);
    try {
      const data = await loadNext(state.nextUrl);
      tabIllusts[tab] = [...(tabIllusts[tab] || []), ...data.illusts];
      batch(() => {
        setState(produce((s) => {
          s.illusts.push(...filterFeedIllusts(data.illusts));
          s.nextUrl = data.next_url;
        }));
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
      if (!pubNext) { setState("loading", false); return; }
      const data = await loadNext(pubNext);
      tabIllusts["follow_public"] = [...(tabIllusts["follow_public"] || []), ...data.illusts];
      tabNextUrl["follow_public"] = data.next_url;
      setState(produce((s) => {
        s.illusts.push(...filterFeedIllusts(data.illusts));
      }));
    } else if (fTab === "private") {
      // Load more for private only
      const privNext = tabNextUrl["follow_private"];
      if (!privNext) { setState("loading", false); return; }
      const data = await loadNext(privNext);
      tabIllusts["follow_private"] = [...(tabIllusts["follow_private"] || []), ...data.illusts];
      tabNextUrl["follow_private"] = data.next_url;
      setState(produce((s) => {
        s.illusts.push(...filterFeedIllusts(data.illusts));
      }));
    } else {
      // "all" mode — load the source with older tail first;
      // if that source is exhausted, fall through to the other.
      const pubIllusts = tabIllusts["follow_public"] || [];
      const privIllusts = tabIllusts["follow_private"] || [];
      const pubOldest = pubIllusts.length > 0 ? pubIllusts[pubIllusts.length - 1].create_date : null;
      const privOldest = privIllusts.length > 0 ? privIllusts[privIllusts.length - 1].create_date : null;

      if (pubOldest === null && privOldest === null) { setState("loading", false); return; }

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
        ? await loadSource("follow_public") || await loadSource("follow_private")
        : await loadSource("follow_private") || await loadSource("follow_public");

      if (loaded) {
        setState(produce((s) => {
          s.illusts = computeFollowIllusts();
        }));
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
