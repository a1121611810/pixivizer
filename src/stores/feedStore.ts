import { createSignal } from 'solid-js';
import {
  loadRecommended,
  loadFollow,
  loadNext,
} from '../api/illust';
import type { PixivIllust, ContentType, RestrictType } from '../api/types';
import { currentTab } from './uiStore';

const [illusts, setIllusts] = createSignal<PixivIllust[]>([]);
const [nextUrl, setNextUrl] = createSignal<string | null>(null);
const [loading, setLoading] = createSignal(false);
const [refreshing, setRefreshing] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);

export { illusts, nextUrl, loading, refreshing, error };

// ─── Per-tab cache ───

interface TabCache {
  illusts: PixivIllust[];
  nextUrl: string | null;
  scrollY: number;
  mounted: boolean;
}

const tabCache = new Map<string, TabCache>();

function getTabCache(tab: string): TabCache {
  if (!tabCache.has(tab)) {
    tabCache.set(tab, { illusts: [], nextUrl: null, scrollY: 0, mounted: false });
  }
  return tabCache.get(tab)!;
}

let activeTab: string = 'recommended';

/** Save current global illusts/nextUrl to the previously active tab's cache */
function saveCurrentToCache() {
  if (illusts().length > 0) {
    const cache = getTabCache(activeTab);
    cache.illusts = illusts();
    cache.nextUrl = nextUrl();
  }
}

/** Load data for the current tab, restoring from cache if available */
export async function ensureLoaded() {
  const tab = currentTab();

  // Save current data to previously active tab's cache
  if (activeTab !== tab) {
    saveCurrentToCache();
    activeTab = tab;
  }

  const cache = getTabCache(tab);

  // Restore from cache if available
  if (cache.illusts.length > 0) {
    setIllusts(cache.illusts);
    setNextUrl(cache.nextUrl);
    return;
  }

  // Fetch fresh
  if (tab === 'recommended') {
    await fetchRecommended();
  } else if (tab === 'follow') {
    await fetchFollow();
  }

  // Save to cache
  const updated = getTabCache(tab);
  updated.illusts = illusts();
  updated.nextUrl = nextUrl();
}

/** Pull-to-refresh: re-fetch current tab */
export async function refresh() {
  const tab = currentTab();
  setRefreshing(true);
  setError(null);
  try {
    if (tab === 'recommended') {
      await fetchRecommended();
    } else if (tab === 'follow') {
      await fetchFollow();
    }
    const cache = getTabCache(tab);
    cache.illusts = illusts();
    cache.nextUrl = nextUrl();
  } finally {
    setRefreshing(false);
  }
}

// ─── Scroll position management ───

export function saveFeedScroll() {
  const tab = currentTab();
  getTabCache(tab).scrollY = window.scrollY;
  // Also save current data before leaving the page
  saveCurrentToCache();
}

export function saveTabScroll(tab: string) {
  getTabCache(tab).scrollY = window.scrollY;
}

export function markFeedMounted() {
  getTabCache(currentTab()).mounted = true;
}

export function isFeedCached(): boolean {
  return getTabCache(currentTab()).illusts.length > 0;
}

export function getFeedScrollY(): number {
  return getTabCache(currentTab()).scrollY;
}

// ─── Data fetching (with cache sync) ───

export async function fetchRecommended(contentType: ContentType = 'illust') {
  setLoading(true);
  setError(null);
  try {
    const data = await loadRecommended(contentType);
    setIllusts(data.illusts);
    setNextUrl(data.next_url);
    // Sync to cache
    const cache = getTabCache('recommended');
    cache.illusts = data.illusts;
    cache.nextUrl = data.next_url;
  } catch (e) {
    setError((e as { message?: string }).message ?? '加载失败');
  } finally {
    setLoading(false);
  }
}

export async function fetchFollow(restrict: RestrictType = 'public') {
  setLoading(true);
  setError(null);
  try {
    const data = await loadFollow(restrict);
    setIllusts(data.illusts);
    setNextUrl(data.next_url);
    // Sync to cache
    const cache = getTabCache('follow');
    cache.illusts = data.illusts;
    cache.nextUrl = data.next_url;
  } catch (e) {
    setError((e as { message?: string }).message ?? '加载失败');
  } finally {
    setLoading(false);
  }
}

export async function fetchMore() {
  if (!nextUrl() || loading()) return;
  setLoading(true);
  try {
    const data = await loadNext(nextUrl()!);
    const updated = [...illusts(), ...data.illusts];
    setIllusts(updated);
    setNextUrl(data.next_url);
    // Sync to cache
    const cache = getTabCache(currentTab());
    cache.illusts = updated;
    cache.nextUrl = data.next_url;
  } catch (e) {
    setError((e as { message?: string }).message ?? '加载失败');
  } finally {
    setLoading(false);
  }
}
