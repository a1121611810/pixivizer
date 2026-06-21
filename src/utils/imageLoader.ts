import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

// ─── LRU 图片缓存 ───

interface CacheEntry {
  blob: Blob;
  lastAccess: number;
}

const MAX_CACHE_SIZE = 600;
const cache = new Map<string, CacheEntry>();

/** 从缓存获取 Blob，同时更新 LRU 访问时间 */
function cacheGet(key: string): Blob | undefined {
  const entry = cache.get(key);
  if (entry) {
    entry.lastAccess = Date.now();
    return entry.blob;
  }
  return undefined;
}

/** 同步检查缓存中是否存在指定图片（不触发加载） */
export function checkImageCache(originalUrl: string): Blob | undefined {
  return cacheGet(originalUrl);
}

/** 存入缓存，超出容量时淘汰最旧的条目 */
function cacheSet(key: string, blob: Blob) {
  // 淘汰最旧条目
  if (cache.size >= MAX_CACHE_SIZE) {
    let oldestKey = "";
    let oldestTime = Infinity;
    for (const [k, v] of cache) {
      if (v.lastAccess < oldestTime) {
        oldestTime = v.lastAccess;
        oldestKey = k;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { blob, lastAccess: Date.now() });
}

/** 清空缓存 */
export function clearImageCache() {
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
 * 加载 Pixiv 图片（带 LRU 缓存）。
 *
 * - 命中缓存：直接从缓存的 Blob 创建新 Blob URL（极快）
 * - 未命中：请求图片 → 缓存 Blob → 返回 Blob URL
 *
 * 返回 { url, cleanup }，调用 cleanup() 释放本次的 Blob URL
 * （底层 Blob 保留在缓存中，下次访问仍然可用）。
 */
export async function loadImage(originalUrl: string): Promise<LoadedImage> {
  if (!originalUrl) {
    return { url: "", cleanup: () => {} };
  }

  // 1. 检查缓存
  const cached = cacheGet(originalUrl);
  if (cached) {
    const blobUrl = URL.createObjectURL(cached);
    return {
      url: blobUrl,
      cleanup: () => URL.revokeObjectURL(blobUrl),
    };
  }

  // 2. 加载图片
  try {
    let blob: Blob;

    if (isNative) {
      blob = await fetchNative(originalUrl);
    } else {
      blob = await fetchWeb(originalUrl);
    }

    // 3. 存入缓存
    cacheSet(originalUrl, blob);

    // 4. 创建 Blob URL
    const blobUrl = URL.createObjectURL(blob);
    return {
      url: blobUrl,
      cleanup: () => URL.revokeObjectURL(blobUrl),
    };
  } catch (e) {
    console.warn(`[ImageCache] Load failed: ${originalUrl}`, e);
    // 失败时回退到代理 URL（浏览器自身缓存可能会命中）
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
  } as any);

  if (resp.status !== 200) throw new Error(`HTTP ${resp.status}`);

  const raw = resp.data;
  let bytes: Uint8Array;

  if (typeof raw === "string") {
    const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
    const byteChars = atob(base64);
    bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      bytes[i] = byteChars.charCodeAt(i);
    }
  } else if (raw instanceof ArrayBuffer) {
    bytes = new Uint8Array(raw);
  } else {
    bytes = new Uint8Array(raw);
  }

  const contentType =
    resp.headers?.["Content-Type"] || resp.headers?.["content-type"] || "image/jpeg";

  return new Blob([bytes as any], { type: contentType });
}
