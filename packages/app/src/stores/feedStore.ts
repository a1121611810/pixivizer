import { createStore, produce } from "solid-js/store";
import { batch } from "solid-js";
import { loadRecommended, loadFollow, loadNext } from "../api/illust";
import type { PixivIllust, ContentType, RestrictType } from "../api/types";
import { currentTab } from "./uiStore";
import { filterFeedIllusts } from "../utils/r18Filter";

// ── Store: reactive UI-facing state ──
const [state, setState] = createStore({
  illusts: [] as PixivIllust[],
  nextUrl: null as string | null,
  loading: false,
  refreshing: false,
  error: null as string | null,
  followRestrict: "public" as RestrictType,
});

// ── Tab cache (non-reactive data store) ──
// Caches raw API data per tab so tab switching doesn't re-fetch.
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
export const followRestrict = () => state.followRestrict;
export const setFollowRestrict = (r: RestrictType) => setState("followRestrict", r);

/** 获取指定 Tab 的原始作品数据（未经全局 R18/R18G 过滤） */
export function getTabRawIllusts(tab: string): PixivIllust[] {
  return tabIllusts[tab] || [];
}

// ── Actions ──

export function ensureLoaded() {
  const tab = currentTab();
  if (tabLoaded[tab]) {
    // Already loaded — restore cached data with filtering
    if (tabIllusts[tab]) {
      batch(() => {
        setState("illusts", filterFeedIllusts(tabIllusts[tab]));
        setState("nextUrl", tabNextUrl[tab] || null);
      });
    }
    return;
  }

  // Restore cached raw data if available (return visit)
  if (tabIllusts[tab]) {
    batch(() => {
      setState("illusts", filterFeedIllusts(tabIllusts[tab]));
      setState("nextUrl", tabNextUrl[tab] || null);
    });
    tabLoaded[tab] = true;
    return;
  }

  // Fresh load — clear old data to show skeleton
  setState("illusts", []);
  if (tab === "recommended") {
    fetchRecommended();
  } else if (tab === "follow") {
    fetchFollow();
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

export function isFeedCached() {
  const tab = currentTab();
  return tabLoaded[tab] || tabIllusts[tab] !== undefined;
}

export function getFeedScrollY() {
  const tab = currentTab();
  return tabScrollY[tab] || 0;
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
  try {
    const data = await loadFollow(state.followRestrict);
    // Cache raw data; illusts uses filtered version
    tabIllusts["follow"] = data.illusts;
    tabNextUrl["follow"] = data.next_url;
    if (currentTab() === "follow") {
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

export async function fetchMore() {
  if (!state.nextUrl || state.loading) return;
  const tab = currentTab();
  setState("loading", true);
  try {
    const data = await loadNext(state.nextUrl);
    // Append raw data to tab cache
    if (tab === "recommended" || tab === "follow") {
      tabIllusts[tab] = [...(tabIllusts[tab] || []), ...data.illusts];
    }
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
}
