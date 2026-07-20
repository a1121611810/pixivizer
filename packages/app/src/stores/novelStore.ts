// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Imports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { createStore, produce } from "solid-js/store";
import { createEffect, createRoot, batch } from "solid-js";
import { loadRecommended, loadBookmarks, loadNext, loadFollow } from "../api/novel";
import type { PixivNovel, RestrictType } from "../api/types";
import { ApiErrorType, type ApiError } from "../api/types";
import { toApiError, pickBestErrorType } from "../api/client";
import { filterNovels } from "../utils/r18Filter";
import { currentTab } from "./uiStore";
import { user } from "./authStore";
import { scrollRestoreGlobal } from "../primitives/createScrollRestore";
import type { ScrollRestoreState } from "../primitives/createScrollRestore";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Tab cache
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const tabNovels: Record<string, PixivNovel[]> = {};
const tabNextUrl: Record<string, string | null> = {};
export type { ScrollRestoreState };

const tabLoaded: Record<string, boolean> = {};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Store
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const [state, setState] = createStore({
  novels: [] as PixivNovel[],
  nextUrl: null as string | null,
  loading: false,
  refreshing: false,
  error: null as ApiError | null,
  followTab: "all" as "all" | "public" | "private",
  bookmarkRestrict: "public" as RestrictType,
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const novels = () => filterNovels(state.novels);
export const nextUrl = () => state.nextUrl;
export const loading = () => state.loading;
export const refreshing = () => state.refreshing;
export const error = () => state.error;
export const novelFollowTab = () => state.followTab;
export const bookmarkRestrict = () => state.bookmarkRestrict;

export function setNovelFollowTab(t: "all" | "public" | "private") {
  setState("followTab", t);
}

export function setBookmarkRestrict(r: RestrictType) {
  if (state.bookmarkRestrict === r) {
    return;
  }
  setState("bookmarkRestrict", r);
}

const pendingRefreshKeys = new Set<string>();

function getSourceKey(tab?: string, subTab?: string, restrict?: RestrictType): string {
  const t = tab ?? currentTab();
  const st = subTab ?? state.followTab;
  if (t === "recommended") {
    return "novel_recommended";
  }
  if (t === "bookmarks") {
    return `novel_bookmarks_${restrict ?? state.bookmarkRestrict}`;
  }
  if (t === "follow") {
    return `novel_follow_${st}`;
  }
  return `novel_${t}`;
}

function getTabLoadedKey(tab?: string): string {
  const t = tab ?? currentTab();
  if (t === "follow") {
    return "novel_follow";
  }
  if (t === "recommended") {
    return "novel_recommended";
  }
  if (t === "bookmarks") {
    return "novel_bookmarks";
  }
  return `novel_${t}`;
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

function computeFollowNovels(): PixivNovel[] {
  const st = state.followTab;
  if (st === "public") {
    return tabNovels["novel_follow_public"] ?? [];
  }
  if (st === "private") {
    return tabNovels["novel_follow_private"] ?? [];
  }
  const pub = tabNovels["novel_follow_public"] ?? [];
  const priv = tabNovels["novel_follow_private"] ?? [];
  if (pub.length === 0) {
    return priv;
  }
  if (priv.length === 0) {
    return pub;
  }
  return mergeAndSort(pub, priv);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Reactive
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
createRoot(() => {
  createEffect(() => {
    const tab = currentTab();
    if (tab === "follow") {
      // Track changes
      novelFollowTab();
      batch(() => {
        setState("novels", computeFollowNovels());
        const st = state.followTab;
        if (st === "public") {
          setState("nextUrl", tabNextUrl["novel_follow_public"] ?? null);
        } else if (st === "private") {
          setState("nextUrl", tabNextUrl["novel_follow_private"] ?? null);
        } else {
          setState(
            "nextUrl",
            tabNextUrl["novel_follow_public"] || tabNextUrl["novel_follow_private"] || null,
          );
        }
      });
    }
  });
});

export async function ensureLoaded(): Promise<void> {
  const tab = currentTab();
  const sourceKey = getSourceKey(tab);

  // ── Follow tab ──
  if (tab === "follow") {
    const pubCached = tabNovels["novel_follow_public"] !== undefined;
    const privCached = tabNovels["novel_follow_private"] !== undefined;
    if (pubCached || privCached) {
      batch(() => {
        setState("novels", computeFollowNovels());
        const st = state.followTab;
        if (st === "public") {
          setState("nextUrl", tabNextUrl["novel_follow_public"] ?? null);
        } else if (st === "private") {
          setState("nextUrl", tabNextUrl["novel_follow_private"] ?? null);
        } else {
          setState(
            "nextUrl",
            tabNextUrl["novel_follow_public"] || tabNextUrl["novel_follow_private"] || null,
          );
        }
      });
    }
    if (!tabLoaded["novel_follow"]) {
      if (!pubCached && !privCached) {
        setState("novels", []);
      }
      await fetchFollow();
      tabLoaded["novel_follow"] = true;
    }
    return;
  }

  // Show cached data if available
  if (tabNovels[sourceKey]) {
    batch(() => {
      setState("novels", tabNovels[sourceKey]);
      setState("nextUrl", tabNextUrl[sourceKey] ?? null);
    });
  }

  if (tabLoaded[sourceKey]) {
    return;
  }
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
        setState("error", { type: ApiErrorType.UNAUTHORIZED, message: "未登录" });
        return;
      }
      const data = await loadBookmarks(u.id, state.bookmarkRestrict);
      tabNovels[sourceKey] = data.novels;
      tabNextUrl[sourceKey] = data.next_url;
      batch(() => {
        setState("novels", data.novels);
        setState("nextUrl", data.next_url);
      });
    }
    tabLoaded[sourceKey] = true;
  } catch (error) {
    setState("error", toApiError(error));
  } finally {
    setState("loading", false);
  }
}

async function fetchFollow(): Promise<void> {
  setState("loading", true);
  setState("error", null);
  const sourceKeys = ["novel_follow_public", "novel_follow_private"];

  // 检查锁
  for (const key of sourceKeys) {
    if (pendingRefreshKeys.has(key)) {
      return;
    }
  }
  for (const key of sourceKeys) {
    pendingRefreshKeys.add(key);
  }

  try {
    const [publicResult, privateResult] = await Promise.allSettled([
      loadFollow("public"),
      loadFollow("private"),
    ]);

    const errors: ApiError[] = [];

    if (publicResult.status === "fulfilled") {
      tabNovels["novel_follow_public"] = publicResult.value.novels;
      tabNextUrl["novel_follow_public"] = publicResult.value.next_url;
    } else {
      errors.push(toApiError(publicResult.reason, "公开关注加载失败"));
    }

    if (privateResult.status === "fulfilled") {
      tabNovels["novel_follow_private"] = privateResult.value.novels;
      tabNextUrl["novel_follow_private"] = privateResult.value.next_url;
    } else {
      errors.push(toApiError(privateResult.reason, "非公开关注加载失败"));
    }

    if (currentTab() === "follow") {
      batch(() => {
        setState("novels", computeFollowNovels());
        const st = state.followTab;
        if (st === "public") {
          setState("nextUrl", tabNextUrl["novel_follow_public"] ?? null);
        } else if (st === "private") {
          setState("nextUrl", tabNextUrl["novel_follow_private"] ?? null);
        } else {
          setState(
            "nextUrl",
            tabNextUrl["novel_follow_public"] || tabNextUrl["novel_follow_private"] || null,
          );
        }
      });
    }

    if (errors.length > 0) {
      if (errors.length === 2) {
        const bestType = pickBestErrorType(...errors);
        setState("error", {
          type: bestType,
          message: errors.map((e) => e.message).join("; "),
        });
      } else {
        console.warn("fetchFollow: partial failure —", errors.map((e) => e.message).join("; "));
      }
    }
  } finally {
    for (const key of sourceKeys) {
      pendingRefreshKeys.delete(key);
    }
    setState("loading", false);
  }
}

export async function refresh(): Promise<void> {
  const tab = currentTab();

  if (tab === "follow") {
    const sourceKey = getTabLoadedKey(tab);
    const sourceKeys = ["novel_follow_public", "novel_follow_private"];

    // 检查锁
    for (const key of sourceKeys) {
      if (pendingRefreshKeys.has(key)) {
        return;
      }
    }

    tabLoaded[sourceKey] = false;
    tabNovels["novel_follow_public"] = [];
    tabNovels["novel_follow_private"] = [];
    tabNextUrl["novel_follow_public"] = null;
    tabNextUrl["novel_follow_private"] = null;
    setState("refreshing", true);
    try {
      await ensureLoaded();
    } finally {
      setState("refreshing", false);
    }
    return;
  }

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
  const tab = currentTab();

  // ── Follow tab pagination ──
  if (tab === "follow") {
    if (state.loading) {
      return;
    }
    setState("loading", true);
    try {
      const fTab = state.followTab;
      if (fTab === "public") {
        const next = tabNextUrl["novel_follow_public"];
        if (!next) {
          setState("loading", false);
          return;
        }
        const data = await loadNext(next);
        tabNovels["novel_follow_public"] = [
          ...(tabNovels["novel_follow_public"] || []),
          ...data.novels,
        ];
        tabNextUrl["novel_follow_public"] = data.next_url;
        setState(
          produce((s) => {
            s.novels.push(...data.novels);
            s.nextUrl = data.next_url;
          }),
        );
      } else if (fTab === "private") {
        const next = tabNextUrl["novel_follow_private"];
        if (!next) {
          setState("loading", false);
          return;
        }
        const data = await loadNext(next);
        tabNovels["novel_follow_private"] = [
          ...(tabNovels["novel_follow_private"] || []),
          ...data.novels,
        ];
        tabNextUrl["novel_follow_private"] = data.next_url;
        setState(
          produce((s) => {
            s.novels.push(...data.novels);
            s.nextUrl = data.next_url;
          }),
        );
      } else {
        // "all" mode — 优先加载尾部更旧的那一路
        const pub = tabNovels["novel_follow_public"] || [];
        const priv = tabNovels["novel_follow_private"] || [];
        const pubOldest = pub.length > 0 ? pub[pub.length - 1].create_date : null;
        const privOldest = priv.length > 0 ? priv[priv.length - 1].create_date : null;

        if (pubOldest === null && privOldest === null) {
          setState("loading", false);
          return;
        }

        const preferPublic = privOldest === null || (pubOldest !== null && pubOldest < privOldest);

        const loadSource = async (
          key: "novel_follow_public" | "novel_follow_private",
        ): Promise<boolean> => {
          const next = tabNextUrl[key];
          if (!next) {
            return false;
          }
          const data = await loadNext(next);
          tabNovels[key] = [...(tabNovels[key] || []), ...data.novels];
          tabNextUrl[key] = data.next_url;
          return true;
        };

        const loaded = preferPublic
          ? (await loadSource("novel_follow_public")) || (await loadSource("novel_follow_private"))
          : (await loadSource("novel_follow_private")) || (await loadSource("novel_follow_public"));

        if (loaded) {
          setState(
            produce((s) => {
              s.novels = computeFollowNovels();
              s.nextUrl = tabNextUrl["novel_follow_public"] || tabNextUrl["novel_follow_private"];
            }),
          );
        } else {
          setState("loading", false);
        }
      }
    } catch (error) {
      setState("error", toApiError(error));
    } finally {
      setState("loading", false);
    }
    return;
  }

  if (state.loading || !state.nextUrl) {
    return;
  }
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
  } catch (error) {
    setState("error", toApiError(error));
  } finally {
    setState("loading", false);
  }
}

export function saveTabScroll(tab: string) {
  if (tab === "follow") {
    scrollRestoreGlobal.saveSimple(`novel_follow_${state.followTab}`);
    tabNextUrl[`novel_follow_${state.followTab}`] = state.nextUrl;
    return;
  }
  scrollRestoreGlobal.saveSimple(getSourceKey(tab));
}

export function getFeedScrollY(tab?: string): number {
  const t = tab ?? currentTab();
  if (t === "follow") {
    return scrollRestoreGlobal.getSimple(`novel_follow_${state.followTab}`) ?? 0;
  }
  return scrollRestoreGlobal.getSimple(getSourceKey(t)) ?? 0;
}

// ── TanStack Virtual 滚动状态 API ──

function getScrollStateKey(tab?: string): string {
  const t = tab ?? currentTab();
  if (t === "follow") {
    return `novel_follow_${state.followTab}`;
  }
  return getSourceKey(t);
}

export function saveNovelScrollState(tab: string, st: ScrollRestoreState) {
  scrollRestoreGlobal.saveVirtual(getScrollStateKey(tab), st);
}

export function getNovelScrollState(tab?: string): ScrollRestoreState | null {
  return scrollRestoreGlobal.getVirtual(getScrollStateKey(tab)) ?? null;
}

export function isNovelCached(tab?: string): boolean {
  const t = tab ?? currentTab();
  if (t === "follow") {
    return (
      tabLoaded["novel_follow"] ||
      tabNovels["novel_follow_public"] !== undefined ||
      tabNovels["novel_follow_private"] !== undefined
    );
  }
  const key = getSourceKey(t);
  return tabLoaded[key] || tabNovels[key] !== undefined;
}
