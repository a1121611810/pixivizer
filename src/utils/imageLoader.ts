import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

// ─── LRU 图片缓存 ───

interface CacheEntry {
  blob: Blob;
  blobUrl: string;
  lastAccess: number;
}

let maxCacheSize = 600;
const cache = new Map<string, CacheEntry>();

/** 从缓存获取持久 Blob URL，同时更新 LRU 访问时间 */
function cacheGet(key: string): string | undefined {
  const entry = cache.get(key);
  if (entry) {
    entry.lastAccess = Date.now();
    return entry.blobUrl;
  }
  return undefined;
}

/** 同步检查缓存中是否存在指定图片（不触发加载），返回持久 Blob URL */
export function checkImageCache(originalUrl: string): string | undefined {
  return cacheGet(originalUrl);
}

/** Update the cache size limit. If lowered, evict oldest entries immediately. */
export function setMaxCacheSize(n: number): void {
  maxCacheSize = n;
  while (cache.size > maxCacheSize) {
    let oldestKey = "";
    let oldestTime = Infinity;
    for (const [k, v] of cache) {
      if (v.lastAccess < oldestTime) {
        oldestTime = v.lastAccess;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      const old = cache.get(oldestKey);
      if (old) URL.revokeObjectURL(old.blobUrl);
      cache.delete(oldestKey);
    } else {
      break;
    }
  }
}

/** 存入缓存，创建持久 Blob URL；超出容量时淘汰并释放最旧条目 */
function cacheSet(key: string, blob: Blob) {
  if (cache.size >= maxCacheSize) {
    let oldestKey = "";
    let oldestTime = Infinity;
    for (const [k, v] of cache) {
      if (v.lastAccess < oldestTime) {
        oldestTime = v.lastAccess;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      const old = cache.get(oldestKey);
      if (old) URL.revokeObjectURL(old.blobUrl);
      cache.delete(oldestKey);
    }
  }
  const blobUrl = URL.createObjectURL(blob);
  cache.set(key, { blob, blobUrl, lastAccess: Date.now() });
}

/** 清空缓存，释放所有 Blob URL */
export function clearImageCache() {
  for (const entry of cache.values()) {
    URL.revokeObjectURL(entry.blobUrl);
  }
  cache.clear();
}

/** 获取缓存大小 */
export function getCacheSize(): number {
  return cache.size;
}

// ─── URL 转换 ───

/**
 * 将 i.pximg.net 的原始 URL 转换为代理路径。
 */
export function resolveImageUrl(originalUrl: string): string {
  if (!originalUrl) return "";
  if (originalUrl.startsWith("/pixiv-img/")) return originalUrl;

  const parts = originalUrl.split("/");
  const path = parts.slice(3).join("/");
  return `/pixiv-img/${path}`;
}

// ─── 带缓存的图片加载 ───

export interface LoadedImage {
  url: string;
  cleanup: () => void;
}

/**
 * 加载 Pixiv 图片（带 LRU 缓存 + 持久 Blob URL）。
 *
 * - 命中缓存：直接返回持久 Blob URL（浏览器瞬间识别，零解码延迟）
 * - 未命中：请求图片 → 存入缓存（创建持久 Blob URL）→ 返回
 *
 * 返回 { url, cleanup }。
 * Blob URL 由缓存持有，只在淘汰/清空时 revoke。
 * cleanup() 为兼容保留，实际是 no-op。
 */
export async function loadImage(originalUrl: string): Promise<LoadedImage> {
  if (!originalUrl) {
    return { url: "", cleanup: () => {} };
  }

  // 1. 检查缓存 — 返回持久 Blob URL，浏览器瞬间识别
  const cachedUrl = cacheGet(originalUrl);
  if (cachedUrl) {
    return { url: cachedUrl, cleanup: () => {} };
  }

  // 2. 加载图片
  try {
    let blob: Blob;

    if (isNative) {
      blob = await fetchNative(originalUrl);
    } else {
      blob = await fetchWeb(originalUrl);
    }

    // 3. 存入缓存（cacheSet 创建持久 Blob URL）
    cacheSet(originalUrl, blob);

    // 4. 从缓存读取持久 URL
    const url = cacheGet(originalUrl);
    return {
      url: url ?? "",
      cleanup: () => {}, // 持久 URL 由缓存管理，无需手动 revoke
    };
  } catch (e) {
    console.warn(`[ImageCache] Load failed: ${originalUrl}`, e);
    return {
      url: resolveImageUrl(originalUrl),
      cleanup: () => {},
    };
  }
}

/** Web 模式：通过 Vite 代理获取图片 */
async function fetchWeb(originalUrl: string): Promise<Blob> {
  const proxyUrl = resolveImageUrl(originalUrl);
  const resp = await fetch(proxyUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const blob = await resp.blob();
  if (blob.size === 0) throw new Error("Empty response");
  return blob;
}

/** Native 模式：通过 CapacitorHttp 获取图片 */
async function fetchNative(originalUrl: string): Promise<Blob> {
  const { CapacitorHttp } = await import("@capacitor/core");

  const resp = await CapacitorHttp.request({
    method: "GET",
    url: originalUrl,
    headers: {
      Referer: "https://app-api.pixiv.net/",
      "User-Agent": "PixivIOSApp/7.16.9 (iOS 16.4.1; iPad13,4)",
    },
    responseType: "arraybuffer",
  } as any);

  if (resp.status !== 200) throw new Error(`HTTP ${resp.status}`);

  const contentType =
    resp.headers?.["Content-Type"] || resp.headers?.["content-type"] || "image/jpeg";

  // Capacitor 将 arraybuffer 响应编码为 base64 字符串返回（无 data: 前缀）
  // 使用 data: URL + fetch 解码 — 浏览器内置能力，比 atob() 更可靠
  const dataUrl = `data:${contentType};base64,${resp.data}`;
  const decoded = await fetch(dataUrl);
  if (!decoded.ok) throw new Error(`Failed to decode image: HTTP ${decoded.status}`);
  return decoded.blob();
}
