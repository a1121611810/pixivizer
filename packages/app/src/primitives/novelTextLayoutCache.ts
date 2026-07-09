import type { NovelTextLayoutResult } from "./createNovelTextLayout";
import type { ReaderSettings } from "@/stores/readerSettingsStore";

interface CacheEntry {
  novelId: number;
  containerWidth: number;
  settings: ReaderSettings;
  result: NovelTextLayoutResult;
  lastAccessed: number;
}

const MAX_CACHE_ENTRIES = 3;
const WIDTH_TOLERANCE = 1; // 变化绝对值严格小于 1px 视为命中

const cache: CacheEntry[] = [];

export interface NovelTextLayoutCache {
  /** 获取缓存的布局结果，若未命中或参数变化则返回 undefined */
  get(
    novelId: number,
    containerWidth: number,
    settings: ReaderSettings,
  ): NovelTextLayoutResult | undefined;
  /** 写入缓存 */
  set(
    novelId: number,
    containerWidth: number,
    settings: ReaderSettings,
    result: NovelTextLayoutResult,
  ): void;
}

function settingsEqual(a: ReaderSettings, b: ReaderSettings): boolean {
  return (
    a.fontSize === b.fontSize &&
    a.fontWeight === b.fontWeight &&
    a.fontFamily === b.fontFamily &&
    a.lineHeight === b.lineHeight
  );
}

function findEntryIndex(novelId: number, containerWidth: number, settings: ReaderSettings): number {
  return cache.findIndex(
    (entry) =>
      entry.novelId === novelId &&
      Math.abs(entry.containerWidth - containerWidth) < WIDTH_TOLERANCE &&
      settingsEqual(entry.settings, settings),
  );
}

/**
 * 构造缓存 key。只包含影响布局结果的参数：novelId、容器宽度、字号、字重、字体、行高。
 */
export function buildCacheKey(
  novelId: number,
  containerWidth: number,
  settings: ReaderSettings,
): string {
  return [
    novelId,
    containerWidth,
    settings.fontSize,
    settings.fontWeight,
    settings.fontFamily,
    settings.lineHeight,
  ].join(":");
}

function createCache(): NovelTextLayoutCache {
  return {
    get(novelId, containerWidth, settings) {
      const index = findEntryIndex(novelId, containerWidth, settings);
      if (index === -1) return undefined;

      const entry = cache[index];
      // 更新宽度为最新值，并移动到末尾表示最近使用
      entry.containerWidth = containerWidth;
      entry.lastAccessed = Date.now();
      cache.splice(index, 1);
      cache.push(entry);
      return entry.result;
    },

    set(novelId, containerWidth, settings, result) {
      const index = findEntryIndex(novelId, containerWidth, settings);
      if (index !== -1) {
        cache.splice(index, 1);
      }

      cache.push({
        novelId,
        containerWidth,
        settings,
        result,
        lastAccessed: Date.now(),
      });

      // 淘汰最久未使用的条目
      while (cache.length > MAX_CACHE_ENTRIES) {
        cache.shift();
      }
    },
  };
}

const cacheInstance: NovelTextLayoutCache = createCache();

/** 获取全局缓存实例 */
export function getNovelTextLayoutCache(): NovelTextLayoutCache {
  return cacheInstance;
}

/** 清空全部缓存条目 */
export function clearNovelTextLayoutCache(): void {
  cache.length = 0;
}

/** @deprecated 仅用于兼容旧命名，等价于 getNovelTextLayoutCache().set(...) */
export function setNovelTextLayoutCache(
  novelId: number,
  containerWidth: number,
  settings: ReaderSettings,
  result: NovelTextLayoutResult,
): void {
  cacheInstance.set(novelId, containerWidth, settings, result);
}
