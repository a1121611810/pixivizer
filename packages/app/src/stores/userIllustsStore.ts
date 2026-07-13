import { createSignal, createResource } from "solid-js";
import { createStore } from "solid-js/store";
import { loadUserIllusts, loadNext as loadIllustNext } from "../api/illust";
import { loadUserNovels, loadNext as loadNovelNext } from "../api/novel";
import type { PixivIllust, PixivNovel, ContentType } from "../api/types";
import { filterFeedIllusts, filterNovels } from "../utils/r18Filter";

// ── Per-type data caches ──
// Avoid re-fetching when switching between types that have already been loaded.
type IllustCacheEntry = { illusts: PixivIllust[]; nextUrl: string | null };
type NovelCacheEntry = { novels: PixivNovel[]; nextUrl: string | null };

let illustCache: Record<string, IllustCacheEntry | undefined> = {};
let novelCache: NovelCacheEntry | undefined;

// ── Content type signal ──
const [contentType, setContentType] = createSignal<ContentType>("illust");

// ── Fetch trigger source ──
const [fetchSource, setFetchSource] = createSignal<{ userId: number; type: ContentType } | false>(
  false,
);

// ── Resource 1: illust / manga ──
const [illustResource, { mutate: mutateIllust }] = createResource(
  () => {
    const s = fetchSource();
    if (!s || s.type === "novel") return false;
    return s;
  },
  async ({ userId, type }) => {
    const data = await loadUserIllusts(userId, type);
    const entry: IllustCacheEntry = { illusts: data.illusts, nextUrl: data.next_url };
    illustCache[type] = entry;
    return entry;
  },
  { initialValue: { illusts: [] as PixivIllust[], nextUrl: null as string | null } },
);

// ── Resource 2: novel ──
const [novelResource, { mutate: mutateNovel }] = createResource(
  () => {
    const s = fetchSource();
    if (!s || s.type !== "novel") return false;
    return s;
  },
  async ({ userId }) => {
    const data = await loadUserNovels(userId);
    const entry: NovelCacheEntry = { novels: data.novels, nextUrl: data.next_url };
    novelCache = entry;
    return entry;
  },
  { initialValue: { novels: [] as PixivNovel[], nextUrl: null as string | null } },
);

// ── Scroll positions per content type (S1) ──
const [scrollPositions, setScrollPositions] = createStore<Record<ContentType, number>>({
  illust: 0,
  manga: 0,
  novel: 0,
});

// ── Derived exports ──

/** Returns illusts (non-novel types) or empty array when current type is novel. */
export const illusts = () => {
  const data = illustResource();
  return data ? filterFeedIllusts(data.illusts) : [];
};

/** Returns novels (novel type only) or empty array otherwise. */
export const novels = () => {
  if (contentType() !== "novel") return [] as PixivNovel[];
  const data = novelResource();
  return data ? filterNovels(data.novels) : [];
};

export const nextUrl = () => {
  if (contentType() === "novel") {
    return novelResource()?.nextUrl ?? null;
  }
  return illustResource()?.nextUrl ?? null;
};

export const loading = () =>
  contentType() === "novel" ? novelResource.loading : illustResource.loading;

export const error = () => {
  const err = contentType() === "novel" ? novelResource.error : illustResource.error;
  if (!err) return null;
  return (err as { message?: string }).message ?? "加载失败";
};

export { contentType, scrollPositions };

// ── Actions ──

/**
 * Load user works for a given userId and type.
 * Uses per-type cache: switching between already-loaded types is instant (no re-fetch).
 * Pass force=true to bypass cache (e.g. pull-to-refresh).
 */
export function load(userId: number, type: ContentType = "illust", force = false) {
  setContentType(type);

  // Restore from cache when switching between already-loaded types
  if (!force) {
    if (type !== "novel") {
      const cached = illustCache[type];
      if (cached) {
        mutateIllust(cached);
        return;
      }
    } else {
      if (novelCache) {
        mutateNovel(novelCache);
        return;
      }
    }
  }

  // No cache or force: fetch from API
  setFetchSource({ userId, type });
}

export async function loadMore() {
  if (contentType() === "novel") {
    const current = novelResource();
    if (!current?.nextUrl || novelResource.loading) return;
    const data = await loadNovelNext(current.nextUrl);
    const entry: NovelCacheEntry = {
      novels: [...current.novels, ...data.novels],
      nextUrl: data.next_url,
    };
    novelCache = entry;
    mutateNovel(entry);
    return;
  }

  const current = illustResource();
  if (!current?.nextUrl || illustResource.loading) return;
  const data = await loadIllustNext(current.nextUrl);
  const ct = contentType();
  const entry: IllustCacheEntry = {
    illusts: [...current.illusts, ...data.illusts],
    nextUrl: data.next_url,
  };
  illustCache[ct] = entry;
  mutateIllust(entry);
}

/** Switch content type. Does not trigger load by itself. */
export function switchType(type: ContentType) {
  setContentType(type);
}

/** Save scroll position for current content type. */
export function saveScrollPosition(pos: number) {
  setScrollPositions(contentType(), pos);
}

/** Get saved scroll position for a content type. */
export function getScrollPosition(type: ContentType): number {
  return scrollPositions[type] ?? 0;
}
