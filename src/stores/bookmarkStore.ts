import { createSignal } from "solid-js";
import { loadBookmarks, loadNext } from "../api/illust";
import { user } from "./authStore";
import type { PixivIllust, RestrictType } from "../api/types";
import { filterFeedIllusts } from "../utils/r18Filter";

// ── Signals ──
const [illusts, setIllusts] = createSignal<PixivIllust[]>([]);
const [nextUrl, setNextUrl] = createSignal<string | null>(null);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);
const [restrict, setRestrictSignal] = createSignal<RestrictType>("public");

// ── Scroll persistence ──
let scrollY = 0;
/** 是否已经完成过首次加载（无论结果如何），防止空列表触发无限请求 */
let loaded = false;

export { illusts, nextUrl, loading, error, restrict };

export function saveBookmarkScroll() {
  scrollY = window.scrollY;
}

export function getBookmarkScrollY(): number {
  return scrollY;
}

// ── Actions ──

/** 确保数据已加载（无数据时自动加载，有数据时 no-op） */
export function ensureLoaded() {
  if (loaded || illusts().length > 0 || loading() || error()) return;
  forceLoad();
}

async function forceLoad() {
  if (loading()) return;
  const userId = user()?.id;
  if (!userId) {
    setError("请先登录");
    return;
  }
  setLoading(true);
  setError(null);
  try {
    const data = await loadBookmarks(userId, restrict());
    setIllusts(filterFeedIllusts(data.illusts));
    setNextUrl(data.next_url);
    setLoading(false);
    loaded = true;
  } catch (e) {
    const msg = (e as { message?: string }).message ?? "加载失败";
    if (msg.includes("401") || msg.includes("UNAUTHORIZED")) {
      setError("登录已过期，请重新登录");
    } else if (msg.includes("429") || msg.includes("频繁")) {
      setError("请求太频繁，3 秒后自动重试...");
      setLoading(false);
      setTimeout(() => {
        if (error()?.includes("频繁")) {
          setError(null);
          forceLoad();
        }
      }, 3000);
      return;
    } else if (msg.includes("NETWORK") || msg.includes("网络")) {
      setError("网络连接失败，请检查网络后重试");
    } else {
      setError(`加载收藏列表失败: ${msg}`);
    }
    setLoading(false);
    loaded = true;
  }
}

/** 加载下一页 */
export async function fetchMore() {
  if (!nextUrl() || loading()) return;
  setLoading(true);
  try {
    const data = await loadNext(nextUrl()!);
    setIllusts([...illusts(), ...filterFeedIllusts(data.illusts)]);
    setNextUrl(data.next_url);
    setLoading(false);
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
    setLoading(false);
  }
}

/** 下拉刷新：重新加载第一页并替换全部数据 */
export async function refresh() {
  setLoading(true);
  setError(null);
  loaded = false;
  try {
    const userId = user()?.id;
    if (!userId) {
      setError("请先登录");
      setLoading(false);
      return;
    }
    const data = await loadBookmarks(userId, restrict());
    setIllusts(filterFeedIllusts(data.illusts));
    setNextUrl(data.next_url);
    setLoading(false);
    loaded = true;
  } catch (e) {
    const msg = (e as { message?: string }).message ?? "加载失败";
    setError(`刷新失败: ${msg}`);
    setLoading(false);
    loaded = true;
  }
}

/** 切换公开/非公开收藏，清空列表并重新加载 */
export function setRestrict(r: RestrictType) {
  if (restrict() === r) return;
  setRestrictSignal(r);
  setIllusts([]);
  setNextUrl(null);
  setError(null);
  loaded = false;
  ensureLoaded();
}
