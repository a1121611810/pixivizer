import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { isImageHostEnabled } from "../stores/imageHostStore";
import { getEffectiveImageUrl, getRaceCandidateUrls } from "../services/imageHostService";

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

// ─── URL 尺寸解析 ───

/**
 * 从 Pixiv CDN URL 中提取图片裁剪尺寸。
 *
 * Pixiv CDN URL 格式示例：
 *   /c/600x1200_90/img-master/img/2026/06/30/13/50/51/146641178_p0_master1200.jpg
 *   /c/250x250_80/a.jpg
 *   /custom/600x1200/xxx.jpg
 *
 * 返回 { width, height }，无尺寸前缀则返回 null。
 * 纯函数，O(1) 正则匹配，不涉及网络/IO。
 */
export function parsePixivUrlDimensions(url: string): { width: number; height: number } | null {
  if (!url) return null;
  const match = url.match(/\/(?:c|custom)\/(\d+)x(\d+)/);
  if (!match) return null;
  const w = parseInt(match[1], 10);
  const h = parseInt(match[2], 10);
  if (w <= 0 || h <= 0) return null;
  return { width: w, height: h };
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

/**
 * 将第三方图床 URL 转换为 Web 模式下可用的本地代理路径。
 *
 * - i.pixiv.re → /pixiv-re/
 * - i.pixiv.nl → /pixiv-nl/
 * - 其他（含 i.pximg.net）→ /pixiv-img/ 代理
 * - 已是代理路径的 URL 直接返回
 */
export function toWebProxyUrl(url: string): string {
  if (!url || url.startsWith("/")) return url;
  if (url.startsWith("https://i.pixiv.re/")) return url.replace("https://i.pixiv.re", "/pixiv-re");
  if (url.startsWith("https://i.pixiv.nl/")) return url.replace("https://i.pixiv.nl", "/pixiv-nl");
  return resolveImageUrl(url);
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

  // 2. 解析图床代理 URL
  const targetUrl = isImageHostEnabled() ? getEffectiveImageUrl(originalUrl) : originalUrl;

  // 3. 加载图片
  try {
    let blob: Blob;

    if (isNative) {
      blob = await fetchNative(targetUrl, originalUrl);
    } else {
      blob = await fetchWeb(targetUrl, originalUrl);
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

// ─── 带进度回调的图片加载 ───

export interface LoadProgress {
  /** 已下载字节数 */
  loaded: number;
  /** 总字节数（Content-Length），为 null 表示未知 */
  total: number | null;
  /** 进度百分比 0-100；total 不可用时为 -1 */
  percent: number;
}

export interface LoadImageResultWithProgress {
  url: string;
  cleanup: () => void;
  /** 下载耗时（毫秒） */
  durationMs: number;
}

/**
 * 带下载进度的图片加载。
 *
 * - 缓存命中：立即回调 percent=100 并返回缓存 Blob URL
 * - 未命中：通过 Web ReadableStream 或 Native XHR 实时报告进度
 * - 下载完成后存入 LRU 缓存
 * - 失败时降级返回代理 URL（无缓存）
 *
 * Web 模式使用 fetch + ReadableStream（不阻塞内存，逐 chunk 拼接）
 * Native 模式使用 XMLHttpRequest（CapacitorHttp 不支持 streaming）
 */
export async function loadImageWithProgress(
  originalUrl: string,
  onProgress: (p: LoadProgress) => void,
): Promise<LoadImageResultWithProgress> {
  if (!originalUrl) {
    return { url: "", cleanup: () => {}, durationMs: 0 };
  }

  // 1. 缓存命中 — 直接返回
  const cachedUrl = cacheGet(originalUrl);
  if (cachedUrl) {
    onProgress({ loaded: 0, total: 0, percent: 100 });
    return { url: cachedUrl, cleanup: () => {}, durationMs: 0 };
  }

  const startTime = performance.now();

  try {
    // 2. 解析目标 URL（图床代理 / 原生 URL）
    const targetUrl = isImageHostEnabled() ? getEffectiveImageUrl(originalUrl) : originalUrl;

    // 3. 带进度下载
    let blob: Blob;
    if (isNative) {
      blob = await loadWithProgressNative(targetUrl, onProgress);
    } else {
      const proxyUrl = toWebProxyUrl(targetUrl);
      blob = await loadWithProgressWeb(proxyUrl, onProgress);
    }

    // 4. 存入缓存
    cacheSet(originalUrl, blob);

    const url = cacheGet(originalUrl);
    const durationMs = Math.round(performance.now() - startTime);

    // 5. 最终 100% 回调
    onProgress({ loaded: blob.size, total: blob.size, percent: 100 });

    return { url: url ?? "", cleanup: () => {}, durationMs };
  } catch (e) {
    console.warn(`[ImageCache] LoadWithProgress failed: ${originalUrl}`, e);
    onProgress({ loaded: 0, total: 0, percent: -1 });
    return { url: resolveImageUrl(originalUrl), cleanup: () => {}, durationMs: 0 };
  }
}

/** Web 模式：fetch + ReadableStream 逐 chunk 读取并报告进度 */
async function loadWithProgressWeb(
  proxyUrl: string,
  onProgress: (p: LoadProgress) => void,
): Promise<Blob> {
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentLength = response.headers.get("Content-Length");
  const total = contentLength ? parseInt(contentLength, 10) : null;
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    // eslint-disable-next-line no-await-in-loop — ReadableStream chunks must be read sequentially
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      const percent = total ? Math.round((loaded / total) * 100) : -1;
      onProgress({ loaded, total, percent });
    }
  }

  const contentType = response.headers.get("Content-Type") || "image/jpeg";
  return new Blob(chunks, { type: contentType });
}

/** Native 模式：XMLHttpRequest + onprogress 事件报告进度 */
function loadWithProgressNative(url: string, onProgress: (p: LoadProgress) => void): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.setRequestHeader("Referer", "https://app-api.pixiv.net/");
    xhr.setRequestHeader("User-Agent", "PixivIOSApp/7.16.9 (iOS 16.4.1; iPad13,4)");

    xhr.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress({ loaded: e.loaded, total: e.total, percent });
      } else {
        onProgress({ loaded: e.loaded, total: null, percent: -1 });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        resolve(xhr.response as Blob);
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("timeout", () => reject(new Error("Timeout")));
    xhr.send();
  });
}

/** Web 模式：通过 Vite 代理或图床代理获取图片 */
async function fetchWeb(targetUrl: string, originalUrl: string): Promise<Blob> {
  const urls = getRaceCandidateUrls(targetUrl);

  if (urls.length > 1) {
    // Web 模式：所有 race 候选 URL 转为本地代理路径，避免 CORS
    const webUrls = urls.map(toWebProxyUrl);
    return raceFetch(webUrls, fetchSingleWeb, toWebProxyUrl(originalUrl));
  }

  return fetchSingleWeb(toWebProxyUrl(targetUrl));
}

async function fetchSingleWeb(url: string): Promise<Blob> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const blob = await resp.blob();
  if (blob.size === 0) throw new Error("Empty response");
  return blob;
}

/** Native 模式：通过 CapacitorHttp 获取图片 */
async function fetchNative(targetUrl: string, originalUrl: string): Promise<Blob> {
  const urls = getRaceCandidateUrls(targetUrl);

  if (urls.length > 1) {
    return raceFetch(urls, (url) => fetchSingleNative(url), originalUrl);
  }

  return fetchSingleNative(targetUrl);
}

async function fetchSingleNative(url: string): Promise<Blob> {
  const resp = await CapacitorHttp.request({
    method: "GET",
    url,
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

/**
 * 并发请求多个候选 URL，返回最快成功响应。
 *
 * 所有请求通过 Promise.any 竞速；全部失败时回退到默认代理 URL。
 */
async function raceFetch<T>(
  urls: string[],
  fetcher: (url: string) => Promise<T>,
  fallbackUrl: string,
): Promise<T> {
  const pending = urls.map(async (url): Promise<T> => {
    try {
      return await fetcher(url);
    } catch {
      throw new Error(`Failed: ${url}`);
    }
  });

  try {
    return await Promise.any(pending);
  } catch {
    console.warn(`[ImageCache] All race candidates failed, fallback to ${fallbackUrl}`);
    return fetcher(fallbackUrl);
  }
}
