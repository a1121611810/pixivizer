import { createStore, produce } from "solid-js/store";
import { batch } from "solid-js";
import { loadRecommended, loadBookmarks, loadNext } from "../api/novel";
import type { PixivNovel } from "../api/types";
import { currentTab } from "./uiStore";
import { user } from "./authStore";

// ── Tab cache ──
const tabNovels: Record<string, PixivNovel[]> = {};
const tabNextUrl: Record<string, string | null> = {};
const tabScrollY: Record<string, number> = {};
const tabLoaded: Record<string, boolean> = {};

// ── Store ──
const [state, setState] = createStore({
  novels: [] as PixivNovel[],
  nextUrl: null as string | null,
  loading: false,
  refreshing: false,
  error: null as string | null,
});

// ── Exports ──
export const novels = () => state.novels;
export const nextUrl = () => state.nextUrl;
export const loading = () => state.loading;
export const refreshing = () => state.refreshing;
export const error = () => state.error;

function getSourceKey(tab?: string): string {
  const t = tab ?? currentTab();
  if (t === "recommended") return "novel_recommended";
  if (t === "bookmarks") return "novel_bookmarks";
  return `novel_${t}`;
}

export function isNovelCached(tab?: string): boolean {
  const key = getSourceKey(tab);
  return tabLoaded[key] || tabNovels[key] !== undefined;
}

export async function ensureLoaded(): Promise<void> {
  const tab = currentTab();
  const sourceKey = getSourceKey(tab);

  // Show cached data if available
  if (tabNovels[sourceKey]) {
    batch(() => {
      setState("novels", tabNovels[sourceKey]);
      setState("nextUrl", tabNextUrl[sourceKey] ?? null);
    });
  }

  if (tabLoaded[sourceKey]) return;
  setState("loading", true);
  setState("error", null);

  try {
    if (tab === "recommended") {
      const data = await loadRecommended();
      tabNovels[sourceKey] = data.novels;
      tabNextUrl[sourceKey] = data.next_url;
      batch(() => {
        setState("novels", data.novels);
        setState("nextUrl", data.next_url);
      });
    } else if (tab === "bookmarks") {
      const u = user();
      if (!u) {
        setState("error", "未登录");
        return;
      }
      const data = await loadBookmarks(u.id);
      tabNovels[sourceKey] = data.novels;
      tabNextUrl[sourceKey] = data.next_url;
      batch(() => {
        setState("novels", data.novels);
        setState("nextUrl", data.next_url);
      });
    }
    tabLoaded[sourceKey] = true;
  } catch (e) {
    setState("error", (e as { message?: string }).message ?? "加载失败");
  } finally {
    setState("loading", false);
  }
}

export async function refresh(): Promise<void> {
  const tab = currentTab();
  if (tab === "follow") return; // no follow API yet
  const sourceKey = getSourceKey(tab);
  tabLoaded[sourceKey] = false;
  tabNovels[sourceKey] = [];
  tabNextUrl[sourceKey] = null;
  setState("refreshing", true);
  try {
    await ensureLoaded();
  } finally {
    setState("refreshing", false);
  }
}

export async function fetchMore(): Promise<void> {
  if (state.loading || !state.nextUrl) return;
  const sourceKey = getSourceKey();
  setState("loading", true);
  setState("error", null);

  try {
    const data = await loadNext(state.nextUrl);
    tabNovels[sourceKey] = [...(tabNovels[sourceKey] || []), ...data.novels];
    tabNextUrl[sourceKey] = data.next_url;
    batch(() => {
      setState(
        produce((s) => {
          s.novels.push(...data.novels);
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

export function saveTabScroll(tab: string) {
  tabScrollY[getSourceKey(tab)] = window.scrollY;
}

export function getFeedScrollY(tab?: string): number {
  return tabScrollY[getSourceKey(tab)] || 0;
}
