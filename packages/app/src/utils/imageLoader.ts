import { Capacitor } from "@capacitor/core";
import { ImageCache, type ImageCachePlugin } from "../native/ImageCache";
import { isImageHostEnabled } from "../stores/imageHostStore";
import { getEffectiveImageUrl, getRaceCandidateUrls } from "../services/imageHostService";

const isNative = Capacitor.isNativePlatform();

// ─── 惰性加载 ImageCache 插件（避免在测试/Web 环境下误注册） ───
let imageCacheImpl: ImageCachePlugin | null = null;

function getImageCache(): ImageCachePlugin | null {
  if (!imageCacheImpl) {
    imageCacheImpl = ImageCache;
  }
  return imageCacheImpl;
}

// ─── LRU 图片缓存 ───

interface CacheEntry {
  blob: Blob;
  blobUrl: string;
  lastAccess: number;
  /** 缓存插入时的 blob.size 快照，避免频繁访问 size getter */
  byteSize: number;
}

/** 最大缓存字节数（约 200MB） */
const MAX_CACHE_BYTES = 200 * 1024 * 1024;
let totalBytes = 0;
const cache = new Map<string, CacheEntry>();

/** 找出最旧条目并从缓存中移除 */
function evictOldest() {
  let oldestKey = "";
  let oldestTime = Infinity;
  for (const [k, v] of cache) {
    if (v.lastAccess < oldestTime) {
      oldestTime = v.lastAccess;
      oldestKey = k;
    }
  }
  if (!oldestKey) return;
  const old = cache.get(oldestKey);
  if (old) {
    totalBytes -= old.byteSize;
    URL.revokeObjectURL(old.blobUrl);
    cache.delete(oldestKey);
  }
}

/** 从缓存获取持久 Blob URL，同时更新 LRU 访问时间 */
/** 同步检查缓存中是否存在指定图片（不触发加载），命中时返回代理 URL。
 * 代理 URL 走浏览器 HTTP 缓存（0ms，不产生 blob: 条目），
 * 而 blob: URL 需 0.5ms 的 createObjectURL + 跨语言边界解码开销。 */
export function checkImageCache(originalUrl: string): string | undefined {
  if (cache.get(originalUrl)) {
    return resolveImageUrl(originalUrl);
  }
  return undefined;
}

/** 存入缓存，创建持久 Blob URL；超出容量或字节预算时淘汰并释放最旧条目 */
function cacheSet(key: string, blob: Blob) {
  while (totalBytes + blob.size > MAX_CACHE_BYTES) {
    evictOldest();
  }
  const blobUrl = URL.createObjectURL(blob);
  totalBytes += blob.size;
  cache.set(key, { blob, blobUrl, lastAccess: Date.now(), byteSize: blob.size });
}

/**
 * 公开 API：将下载完成的 Blob 注入 LRU 缓存。
 * 用于 App.tsx 启动时从磁盘缓存预热。
 */
export function injectCacheEntry(key: string, blob: Blob): void {
  cacheSet(key, blob);
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
  // s.pximg.net 是静态资源 CDN（默认头像、印章等），不需要 Referer 验证，直接使用
  if (originalUrl.startsWith("https://s.pximg.net/")) return originalUrl;

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

// ─── 飞行中请求去重 ───

/** 正在加载中的请求，用于并发去重 — 同一 URL 只发一个真实 HTTP 请求 */
const inflightRequests = new Map<string, Promise<LoadedImage>>();

// ─── 带缓存的图片加载 ───

export interface LoadedImage {
  url: string;
  cleanup: () => void;
}

/**
 * 加载 Pixiv 图片（带 LRU 缓存 + 飞行中请求去重）。
 *
 * 缓存命中时返回代理 URL（走浏览器 HTTP 缓存，0ms，无 blob: 条目）；
 * 未命中时下载 → 存入 LRU → 返回代理 URL。
 *
 * - 命中缓存：直接返回代理 URL，浏览器在 HTTP 缓存中已有解码结果
 * - 未命中但已有同一 URL 正请求中：复用该 Promise，不发重复请求
 * - 未命中且无飞行中请求：发起 HTTP 请求 → 存入 LRU → 返回代理 URL
 *
 * 返回 { url, cleanup }。
 * cleanup() 为兼容保留，实际是 no-op。
 */
export async function loadImage(originalUrl: string): Promise<LoadedImage> {
  if (!originalUrl) {
    return { url: "", cleanup: () => {} };
  }

  // 1. 检查缓存 — 无需异步操作，直接代理 URL 走浏览器缓存
  if (cache.has(originalUrl)) {
    return { url: resolveImageUrl(originalUrl), cleanup: () => {} };
  }

  // 2. 检查是否已有相同 URL 正在加载中 — 复用 Promise，避免重复请求
  const inflight = inflightRequests.get(originalUrl);
  if (inflight) {
    return inflight;
  }

  // 3. 创建加载 Promise 并注册到飞行中 Map
  const promise = loadImageInner(originalUrl);
  inflightRequests.set(originalUrl, promise);

  // 4. 无论成功/失败，加载完成后从飞行中 Map 移除
  promise.finally(() => {
    inflightRequests.delete(originalUrl);
  });

  return promise;
}

/** loadImage 的内部实现 — 不含去重逻辑，由外层 loadImage 统一调度并发 */
async function loadImageInner(originalUrl: string): Promise<LoadedImage> {
  const targetUrl = isImageHostEnabled() ? getEffectiveImageUrl(originalUrl) : originalUrl;

  try {
    let blob: Blob;

    if (isNative) {
      // 1) 先检查 Android 文件缓存（异常时降级到网络，不阻塞加载路径）
      const imageCache = getImageCache();
      try {
        const cached = await imageCache.getImage({ key: originalUrl });
        if (cached?.base64) {
          const decoded = await base64ToBlob(cached.base64);
          cacheSet(originalUrl, decoded);
          return { url: resolveImageUrl(originalUrl), cleanup: () => {} };
        }
      } catch (e) {
        console.warn("[ImageCache] Disk cache check failed, falling back to network", e);
      }

      // 2) 未命中，发网络请求
      blob = await fetchNative(targetUrl, originalUrl);

      // 3) 后台保存到磁盘缓存（异常不影响主加载路径）
      try {
        const base64 = await blobToBase64(blob);
        imageCache
          .saveImage({ key: originalUrl, base64 })
          .catch((e) => console.warn("[ImageCache] Failed to save to disk", e));
      } catch (e) {
        console.warn("[ImageCache] Failed to encode blob for disk cache", e);
      }
    } else {
      blob = await fetchWeb(targetUrl, originalUrl);
    }

    // 存入缓存（cacheSet 创建持久 Blob URL 供内部使用）
    cacheSet(originalUrl, blob);

    // 返回代理 URL（不走 blob: URL，避免 Network 面板条目 + 0.5ms 开销）
    return {
      url: resolveImageUrl(originalUrl),
      cleanup: () => {},
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
 * - 未命中但已有 loadImage（无进度版）正在请求中：等待后从缓存返回，跳过重复请求
 * - 未命中且无飞行中请求：通过 Web ReadableStream 或 Native XHR 实时报告进度
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

  // 1. 缓存命中 — 直接返回代理 URL（走浏览器 HTTP 缓存，0ms，无 blob: 条目）
  if (cache.has(originalUrl)) {
    onProgress({ loaded: 0, total: 0, percent: 100 });
    return { url: resolveImageUrl(originalUrl), cleanup: () => {}, durationMs: 0 };
  }

  // 1b. 检查是否有 loadImage（无进度版）正在请求同一 URL
  //     有则等待它完成，缓存中就绪后直接返回，跳过重复 HTTP 请求
  const mainInflight = inflightRequests.get(originalUrl);
  if (mainInflight) {
    await mainInflight;
    onProgress({ loaded: 0, total: 0, percent: 100 });
    return { url: resolveImageUrl(originalUrl), cleanup: () => {}, durationMs: 0 };
  }

  const startTime = performance.now();

  try {
    // 2. 解析目标 URL（图床代理 / 原生 URL）
    const targetUrl = isImageHostEnabled() ? getEffectiveImageUrl(originalUrl) : originalUrl;

    // 3. 带进度下载（统一走 WebView 代理）
    const proxyUrl = toWebProxyUrl(targetUrl);
    const blob = await loadWithProgressWeb(proxyUrl, onProgress);

    // 4. 存入缓存
    cacheSet(originalUrl, blob);

    const durationMs = Math.round(performance.now() - startTime);

    // 5. 最终 100% 回调
    onProgress({ loaded: blob.size, total: blob.size, percent: 100 });

    return { url: resolveImageUrl(originalUrl), cleanup: () => {}, durationMs };
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

/** Native 模式：通过 WebView 代理获取图片（同 Web 模式一致，绕过 CapacitorHttp） */
async function fetchNative(targetUrl: string, originalUrl: string): Promise<Blob> {
  const urls = getRaceCandidateUrls(targetUrl);

  if (urls.length > 1) {
    const proxyUrls = urls.map(toWebProxyUrl);
    return raceFetch(proxyUrls, fetchSingleWeb, toWebProxyUrl(originalUrl));
  }

  return fetchSingleWeb(toWebProxyUrl(targetUrl));
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

// ─── Blob ↔ Base64 工具（用于 ImageCache 插件） ───

/** 将 Blob 转为 Base64 字符串 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        // 去掉 data:...;base64, 前缀
        const base64 = reader.result.split(",")[1] ?? reader.result;
        resolve(base64);
      } else {
        reject(new Error("FileReader did not return a string"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

/** 将 Base64 字符串还原为 Blob（同步，无 data: URL fetch） */
function base64ToBlob(base64: string, mimeType: string = "image/jpeg"): Blob {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

// ─── 磁盘缓存预热 ───

/**
 * 启动时从 Android 文件缓存读取最近使用的图片，预填到 LRU 缓存。
 * 仅在 Native 平台生效；Web 平台无操作。
 *
 * 在 App.tsx onMount 中调用，与 auth 初始化并行执行。
 * 预热失败不影响正常功能（降级为冷启动重新下载）。
 */
export async function warmCacheFromDisk(): Promise<void> {
  if (!isNative) return;

  try {
    const cache = getImageCache();
    const { keys } = await cache.getCachedKeys();
    if (!keys || keys.length === 0) return;

    // 取最近 50 张，并行加载到 LRU
    const recentKeys = keys.slice(-50);
    const results = await Promise.allSettled(
      recentKeys.map(async (key: string) => {
        const cached = await cache.getImage({ key });
        if (cached?.base64) {
          const blob = await base64ToBlob(cached.base64);
          injectCacheEntry(key, blob);
        }
      }),
    );

    const loaded = results.filter((r) => r.status === "fulfilled").length;
    console.log(`[ImageCache] Warmup: loaded ${loaded}/${recentKeys.length} entries`);
  } catch (e) {
    // 预热失败不阻塞启动
    console.warn("[ImageCache] Warmup failed", e);
  }
}
