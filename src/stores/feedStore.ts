import { createSignal } from "solid-js";
import { loadRecommended, loadFollow, loadNext } from "../api/illust";
import type { PixivIllust, ContentType, RestrictType } from "../api/types";
import { currentTab } from "./uiStore";
import { filterR18 } from "../utils/r18Filter";
import { batch } from "solid-js";

const [illusts, setIllusts] = createSignal<PixivIllust[]>([]);
const [nextUrl, setNextUrl] = createSignal<string | null>(null);
const [loading, setLoading] = createSignal(false);
const [refreshing, setRefreshing] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);

// 按 Tab 缓存滚动位置和加载状态
const tabScrollY: Record<string, number> = {};
const tabIllusts: Record<string, PixivIllust[]> = {};
const tabNextUrl: Record<string, string | null> = {};
const tabLoaded: Record<string, boolean> = {};

export { illusts, nextUrl, loading, refreshing, error };

export function ensureLoaded() {
  const tab = currentTab();
  if (tabLoaded[tab]) {
    // Already loaded — restore this tab's cached data
    if (tabIllusts[tab]) {
      setIllusts(tabIllusts[tab]);
      setNextUrl(tabNextUrl[tab] || null);
    }
    return;
  }

  // Restore cached data if available (return visit)
  if (tabIllusts[tab]) {
    setIllusts(tabIllusts[tab]);
    setNextUrl(tabNextUrl[tab] || null);
    tabLoaded[tab] = true;
    return;
  }

  // Fresh load — clear old data first to show skeleton
  setIllusts([]);
  if (tab === "recommended") {
    fetchRecommended();
  } else if (tab === "follow") {
    fetchFollow();
  }
  tabLoaded[tab] = true;
}

export async function refresh() {
  const tab = currentTab();
  setRefreshing(true);
  try {
    if (tab === "recommended") {
      await fetchRecommended();
    } else if (tab === "follow") {
      await fetchFollow();
    }
  } finally {
    setRefreshing(false);
  }
}

export function saveTabScroll(tab: string) {
  // 保存当前数据到该 Tab 缓存
  tabIllusts[tab] = illusts();
  tabNextUrl[tab] = nextUrl();
  tabScrollY[tab] = window.scrollY;
}

export function markFeedMounted() {
  // no-op: 仅作为 Feed 组件生命周期钩子，实际缓存逻辑由 tabLoaded / tabIllusts 处理
}

export function isFeedCached() {
  const tab = currentTab();
  return tabLoaded[tab] || tabIllusts[tab] !== undefined;
}

export function getFeedScrollY() {
  const tab = currentTab();
  return tabScrollY[tab] || 0;
}

export async function fetchRecommended(contentType: ContentType = "illust") {
  setLoading(true);
  setError(null);
  try {
    const data = await loadRecommended(contentType);
    // Always cache, but only update illusts if still on this tab
    tabIllusts["recommended"] = data.illusts;
    tabNextUrl["recommended"] = data.next_url;
    if (currentTab() === "recommended") {
      setIllusts(filterR18(data.illusts));
      setNextUrl(data.next_url);
    }
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
  } finally {
    setLoading(false);
  }
}

export async function fetchFollow(restrict: RestrictType = "public") {
  setLoading(true);
  setError(null);
  try {
    const data = await loadFollow(restrict);
    // Always cache, but only update illusts if still on this tab
    tabIllusts["follow"] = data.illusts;
    tabNextUrl["follow"] = data.next_url;
    if (currentTab() === "follow") {
      setIllusts(filterR18(data.illusts));
      setNextUrl(data.next_url);
    }
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
  } finally {
    setLoading(false);
  }
}

export async function fetchMore() {
  if (!nextUrl() || loading()) return;
  setLoading(true);
  try {
    const data = await loadNext(nextUrl()!);
    batch(() => {
      setIllusts([...illusts(), ...filterR18(data.illusts)]);
      setNextUrl(data.next_url);
    });
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
  } finally {
    setLoading(false);
  }
}
