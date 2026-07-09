import type { PixivNovel, SeriesNavigation } from "../api/types";
import type { NovelImagesMap, NovelSeriesDetailResponse } from "../api/novel";

// ─── Entry ───

interface CacheEntry<T> {
  data: T;
  time: number;
}

// ─── Detail cache ───

const detailCache = new Map<number, CacheEntry<PixivNovel>>();
let detailMax = 100;

// ─── Text cache ───

const textCache = new Map<number, CacheEntry<string>>();
let textMax = 10;

// ─── Nav cache ───

const navCache = new Map<number, CacheEntry<SeriesNavigation>>();
let navMax = 50;

// ─── Images cache ───

const imagesCache = new Map<number, CacheEntry<NovelImagesMap>>();
let imagesMax = 20;

// ─── Series cache ───

const seriesCache = new Map<number, CacheEntry<NovelSeriesDetailResponse>>();
let seriesMax = 20;

// ─── LRU helpers ───

function lruGet<T>(cache: Map<number, CacheEntry<T>>, id: number): T | undefined {
  const entry = cache.get(id);
  if (!entry) return undefined;
  entry.time = Date.now();
  return entry.data;
}

function lruSet<T>(cache: Map<number, CacheEntry<T>>, id: number, data: T, max: number): void {
  if (cache.has(id)) {
    cache.get(id)!.data = data;
    cache.get(id)!.time = Date.now();
    return;
  }
  if (cache.size >= max) {
    // Evict oldest
    let oldestId = id;
    let oldestTime = Infinity;
    for (const [k, v] of cache) {
      if (v.time < oldestTime) {
        oldestTime = v.time;
        oldestId = k;
      }
    }
    cache.delete(oldestId);
  }
  cache.set(id, { data, time: Date.now() });
}

// ─── Public API ───

export function getDetail(id: number): PixivNovel | undefined {
  return lruGet(detailCache, id);
}

export function setDetail(id: number, data: PixivNovel): void {
  lruSet(detailCache, id, data, detailMax);
}

export function getText(id: number): string | undefined {
  return lruGet(textCache, id);
}

export function setText(id: number, data: string): void {
  lruSet(textCache, id, data, textMax);
}

export function getNav(id: number): SeriesNavigation | undefined {
  return lruGet(navCache, id);
}

export function setNav(id: number, data: SeriesNavigation): void {
  lruSet(navCache, id, data, navMax);
}

export function getImages(id: number): NovelImagesMap | undefined {
  return lruGet(imagesCache, id);
}

export function setImages(id: number, data: NovelImagesMap): void {
  lruSet(imagesCache, id, data, imagesMax);
}

export function getSeries(id: number): NovelSeriesDetailResponse | undefined {
  return lruGet(seriesCache, id);
}

export function setSeries(id: number, data: NovelSeriesDetailResponse): void {
  lruSet(seriesCache, id, data, seriesMax);
}

/**
 * 更新缓存上限。滑块控制 textMax，detailMax = textMax * 10。
 * 若新上限低于当前容量，立刻淘汰最旧条目。
 */
export function setNovelCacheLimits(textLimit: number): void {
  textMax = textLimit;
  detailMax = textLimit * 10;

  while (textCache.size > textMax) {
    let oldestId = 0;
    let oldestTime = Infinity;
    for (const [k, v] of textCache) {
      if (v.time < oldestTime) {
        oldestTime = v.time;
        oldestId = k;
      }
    }
    if (oldestId) textCache.delete(oldestId);
    else break;
  }

  while (detailCache.size > detailMax) {
    let oldestId = 0;
    let oldestTime = Infinity;
    for (const [k, v] of detailCache) {
      if (v.time < oldestTime) {
        oldestTime = v.time;
        oldestId = k;
      }
    }
    if (oldestId) detailCache.delete(oldestId);
    else break;
  }

  while (navCache.size > navMax) {
    let oldestId = 0;
    let oldestTime = Infinity;
    for (const [k, v] of navCache) {
      if (v.time < oldestTime) {
        oldestTime = v.time;
        oldestId = k;
      }
    }
    if (oldestId) navCache.delete(oldestId);
    else break;
  }
}

export function clearNovelCache(): void {
  detailCache.clear();
  textCache.clear();
  navCache.clear();
  imagesCache.clear();
  seriesCache.clear();
}
