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

// 关注页隐私过滤状态
const [followRestrict, setFollowRestrict] = createSignal<RestrictType>("public");

// 按 Tab 缓存：tabIllusts 始终存储原始 API 数据（未经 filterR18）
const tabScrollY: Record<string, number> = {};
const tabIllusts: Record<string, PixivIllust[]> = {};
const tabNextUrl: Record<string, string | null> = {};
const tabLoaded: Record<string, boolean> = {};

export { illusts, nextUrl, loading, refreshing, error, followRestrict, setFollowRestrict };

/** 获取指定 Tab 的原始作品数据（未经全局 R18/R18G 过滤）。用于子 Tab 独立过滤。 */
export function getTabRawIllusts(tab: string): PixivIllust[] {
  return tabIllusts[tab] || [];
}

export function ensureLoaded() {
  const tab = currentTab();
  if (tabLoaded[tab]) {
    // Already loaded — restore this tab's cached data with filtering
    if (tabIllusts[tab]) {
      setIllusts(filterR18(tabIllusts[tab]));
      setNextUrl(tabNextUrl[tab] || null);
    }
    return;
  }

  // Restore cached raw data if available (return visit)
  if (tabIllusts[tab]) {
    setIllusts(filterR18(tabIllusts[tab]));
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
  // 只保存滚动位置，原始数据由 fetch 函数维护在 tabIllusts 中
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
    // 缓存原始数据，illusts 使用过滤后的数据
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

export async function fetchFollow() {
  setLoading(true);
  setError(null);
  try {
    const data = await loadFollow(followRestrict());
    // 缓存原始数据，illusts 使用过滤后的数据
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
  const tab = currentTab();
  setLoading(true);
  try {
    const data = await loadNext(nextUrl()!);
    // 追加原始数据到 tabIllusts
    if (tab === "recommended" || tab === "follow") {
      tabIllusts[tab] = [...(tabIllusts[tab] || []), ...data.illusts];
    }
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
