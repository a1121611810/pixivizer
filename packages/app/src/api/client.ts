import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { ApiErrorType, type ApiError } from "./types";
import { PictelioHttp } from "../native/PictelioHttp";
import { useDnsOverride } from "../stores/uiStore";
import { PIXIV_USER_AGENT } from "./userAgent";

// ─── 端点 ───
const PIXIV_API_BASE = "https://app-api.pixiv.net";
const PIXIV_AUTH_URL = "https://oauth.secure.pixiv.net/auth/token";

// ─── 平台检测 ───
const isNative = Capacitor.isNativePlatform();

// ─── 对外接口 ───
export interface PixivApiClient {
  get<T>(path: string, params?: Record<string, string>, signal?: AbortSignal): Promise<T>;
  post<T>(path: string, body: Record<string, string>): Promise<T>;
}

// ─── 状态 ───
let accessToken = "";
let onUnauthorized: (() => Promise<void>) | null = null;
/** 401 刷新 Promise — 共享给所有并发 401 请求，确保 refresh 只执行一次 */
let refreshPromise: Promise<void> | null = null;

// ─── GET 请求去重 ───
/** 飞行中的 GET 请求，相同 URL+参数只发一个真实 HTTP 请求 */
const inflightGetRequests = new Map<string, Promise<any>>();

function getRequestKey(path: string, data?: Record<string, string>): string {
  return `GET:${path}:${JSON.stringify(data ?? {})}`;
}

export function setAccessToken(token: string) {
  accessToken = token;
}

export function getAccessToken(): string {
  return accessToken;
}

export function setOnUnauthorized(handler: () => Promise<void>) {
  onUnauthorized = handler;
}

/** 尝试从 Pixiv 错误响应体中提取人类可读的错误消息 */
export function extractPixivErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const d = data as Record<string, unknown>;
  if (d.errors && typeof d.errors === "object") {
    const errors = d.errors as Record<string, unknown>;
    const sys = errors.system;
    if (sys && typeof sys === "object") {
      const { message, code } = sys as Record<string, unknown>;
      if (typeof message === "string") {
        return code ? `[${code}] ${message}` : message;
      }
    }
  }
  if (typeof d.message === "string") {
    return d.message;
  }
  if (typeof d.error === "string") {
    return d.error;
  }
  // OAuth 错误: { error: { message: "..." } }
  if (typeof d.error === "object" && d.error !== null) {
    const errObj = d.error as Record<string, unknown>;
    if (typeof errObj.message === "string") {
      return errObj.message;
    }
  }
  return null;
}

/**
 * 检测是否为 OAuth token 失效错误（400 + 特定错误体）。
 * Pixiv OAuth 端点在 refresh_token 过期时返回 400 而非 401，
 * 响应体格式为 { error: { message: "...OAuth...invalid_request..." } }。
 * 纯函数，O(1)，零分配。
 */
export function isOAuthTokenErrorResponse(status: number, responseBody: unknown): boolean {
  if (status !== 400 || !responseBody || typeof responseBody !== "object") {
    return false;
  }
  const d = responseBody as Record<string, unknown>;
  const err = d.error;
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const msg = (err as Record<string, unknown>).message;
  return typeof msg === "string" && (msg.includes("OAuth") || msg.includes("invalid_request"));
}

/** 统一将任意错误值转换为 ApiError，已有 type 的保留原 type，否则创建 UNKNOWN */
export function toApiError(e: unknown, fallbackMsg = "加载失败"): ApiError {
  if (e && typeof e === "object" && "type" in e) {
    return e as ApiError;
  }
  return {
    type: ApiErrorType.UNKNOWN,
    message: (e as { message?: string }).message ?? fallbackMsg,
  };
}

/** 错误类型优先级（索引越小越具体/重要） */
const ERROR_TYPE_PRIORITY: ApiErrorType[] = [
  ApiErrorType.PROXY,
  ApiErrorType.NETWORK,
  ApiErrorType.UNAUTHORIZED,
  ApiErrorType.RATE_LIMIT,
  ApiErrorType.SERVER,
  ApiErrorType.UNKNOWN,
];

/**
 * 从一组 ApiError 中选出最具体的错误类型
 * 优先级：PROXY > NETWORK > UNAUTHORIZED > RATE_LIMIT > SERVER > UNKNOWN
 */
export function pickBestErrorType(...errors: ApiError[]): ApiErrorType {
  for (const t of ERROR_TYPE_PRIORITY) {
    if (errors.some((e) => e.type === t)) {
      return t;
    }
  }
  return ApiErrorType.UNKNOWN;
}

export function classifyError(status: number, error: unknown, responseBody?: unknown): ApiError {
  // 检测代理错误：Vite 代理层返回 { error: "proxy_error", message: "..." }
  // 必须在状态码分类之前检测，因为 proxy_error 可能伴随任何 HTTP 状态码
  if (
    responseBody &&
    typeof responseBody === "object" &&
    (responseBody as Record<string, unknown>).error === "proxy_error"
  ) {
    return {
      type: ApiErrorType.PROXY,
      message: "本地代理连接失败（127.0.0.1:10808），请检查代理软件是否运行",
    };
  }

  if (!status && error instanceof TypeError) {
    return { type: ApiErrorType.NETWORK, message: "网络不可用，请检查连接" };
  }
  // 尝试提取 Pixiv 错误消息
  const pixivMsg = responseBody ? extractPixivErrorMessage(responseBody) : null;
  const suffix = pixivMsg ? ` (${pixivMsg})` : "";
  switch (status) {
    case 401:
      return {
        type: ApiErrorType.UNAUTHORIZED,
        message: `登录已过期 (HTTP 401)${suffix ? `: ${pixivMsg}` : ""}`,
        status: 401,
      };
    case 403:
      return {
        type: ApiErrorType.FORBIDDEN,
        message: `没有权限访问 (HTTP 403)${suffix}`,
        status: 403,
      };
    case 429:
      return {
        type: ApiErrorType.RATE_LIMIT,
        message: "请求过于频繁，请稍后重试 (HTTP 429)",
        status: 429,
      };
    default:
      // 400 OAuth 错误 → refresh_token 已失效，视为 UNAUTHORIZED
      if (status === 400 && isOAuthTokenErrorResponse(status, responseBody)) {
        return {
          type: ApiErrorType.UNAUTHORIZED,
          message: "登录凭证已失效，请重新登录",
          status: 400,
        };
      }
      if (status >= 500) {
        return {
          type: ApiErrorType.SERVER,
          message: `服务器错误 (HTTP ${status})${suffix}`,
          status,
        };
      }
      if (status > 0) {
        return {
          type: ApiErrorType.UNKNOWN,
          message: `请求失败 (HTTP ${status})${suffix}`,
          status,
        };
      }
      return { type: ApiErrorType.UNKNOWN, message: `未知错误${suffix}`, status };
  }
}

/**
 * Web 模式下，将 Pixiv 直连 URL 重写为 Vite 代理路径
 * 原生模式下保持原 URL（CapacitorHttp 可直接访问）
 */
export function rewriteUrl(path: string): string {
  // 已经是本地代理路径，直接返回
  if (path.startsWith("/pixiv-")) {
    return path;
  }
  // 已经是 http(s) URL
  if (path.startsWith("http")) {
    if (!isNative) {
      if (path.startsWith(PIXIV_API_BASE)) {
        return path.replace(PIXIV_API_BASE, "/pixiv-api");
      }
      if (path.startsWith(PIXIV_AUTH_URL)) {
        return "/pixiv-oauth/auth/token";
      }
    }
    return path;
  }
  // 相对路径：web 走 Vite 代理，native 拼完整 URL
  if (!isNative) {
    return `/pixiv-api${path}`;
  }
  return `${PIXIV_API_BASE}${path}`;
}

/** 实际执行 HTTP 请求（不含去重层），含 401 刷新和 429 重试 */
async function executeRequest<T>(
  method: "GET" | "POST",
  path: string,
  data?: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  // 请求前检查是否已取消
  if (signal?.aborted) {
    throw new DOMException("请求已取消", "AbortError");
  }
  const url = rewriteUrl(path);
  const headers: Record<string, string> = {
    "User-Agent": PIXIV_USER_AGENT,
    Referer: "https://app-api.pixiv.net/",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const MAX_RETRIES = 3;
  for (let attempt = 0; ; attempt++) {
    try {
      let response;
      if (isNative) {
        if (method === "POST") {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
        if (useDnsOverride()) {
          const resp = await PictelioHttp.request({
            url,
            method,
            headers,
            body: method === "POST" && data ? new URLSearchParams(data).toString() : undefined,
          });
          try {
            response = { status: resp.status, data: JSON.parse(resp.data) };
          } catch {
            response = { status: resp.status, data: resp.data };
          }
        } else if (method === "GET") {
          response = await CapacitorHttp.request({
            method: "GET",
            url,
            headers,
            params: data as any,
          });
        } else {
          const body = data ? new URLSearchParams(data).toString() : "";
          response = await CapacitorHttp.request({ method: "POST", url, headers, data: body });
        }
      } else {
        if (method === "GET") {
          const params = data ? "?" + new URLSearchParams(data).toString() : "";
          const res = await fetch(url + params, { method: "GET", headers, signal });
          response = { status: res.status, data: await res.json() };
        } else {
          const body = data ? new URLSearchParams(data).toString() : "";
          headers["Content-Type"] = "application/x-www-form-urlencoded";
          const res = await fetch(url, { method: "POST", headers, body, signal });
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            response = { status: res.status, data: await res.json() };
          } else {
            const text = await res.text().catch(() => "");
            throw new Error(
              `\u670d\u52a1\u5668\u8fd4\u56de\u975e JSON (HTTP ${res.status}): ${text.slice(0, 300)}`,
            );
          }
        }
      }

      if (response!.status === 401 && onUnauthorized) {
        if (!refreshPromise) {
          refreshPromise = onUnauthorized().finally(() => {
            refreshPromise = null;
          });
        }
        await refreshPromise;
        if (!accessToken) {
          throw classifyError(401, null);
        }
        // 401 后 token 已刷新，递归调用时绕过去重层
        return executeRequest<T>(method, path, data, signal);
      }

      // 400 OAuth 错误：refresh_token 已失效，触发清理后以 UNAUTHORIZED 抛出
      if (isOAuthTokenErrorResponse(response!.status, response!.data)) {
        if (onUnauthorized) {
          if (!refreshPromise) {
            refreshPromise = onUnauthorized().finally(() => {
              refreshPromise = null;
            });
          }
          await refreshPromise;
        }
        throw classifyError(response!.status, null, response!.data);
      }

      if (response!.status === 429 && attempt < MAX_RETRIES) {
        if (signal?.aborted) {
          throw new DOMException("请求已取消", "AbortError");
        }
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (response!.status >= 400) {
        let errorBody: unknown;
        try {
          errorBody = response!.data;
        } catch {
          // Ignore
        }
        throw classifyError(response!.status, null, errorBody);
      }

      return response!.data as T;
    } catch (error) {
      if ((error as ApiError).type) {
        throw error;
      }
      const errMsg = error instanceof Error ? error.message : String(error ?? "");
      throw classifyError(0, error, { message: errMsg });
    }
  }
}

/**
 * 发送 HTTP 请求（GET 带去重，POST 不缓存）。
 * GET 请求去重：同一 URL+参数的并发请求自动合并为一个真实 HTTP 请求。
 */
function request<T>(
  method: "GET" | "POST",
  path: string,
  data?: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  // GET 请求去重：相同 path+data 只发一个真实 HTTP 请求
  if (method === "GET") {
    const key = getRequestKey(path, data);
    const existing = inflightGetRequests.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
    const promise = executeRequest<T>(method, path, data, signal);
    inflightGetRequests.set(key, promise);
    promise
      .finally(() => {
        inflightGetRequests.delete(key);
      })
      .catch(() => {
        // 忽略：原始 promise 的 rejection 由调用方处理，
        // .finally() 返回的中间 promise 在 source 被 reject 时也会 reject，
        // 不 catch 会导致 Node/vitest 的 unhandledRejection 检测误报
      });
    return promise;
  }

  // POST 请求透传（不做去重，因为涉及收藏/关注等副作用）
  return executeRequest<T>(method, path, data, signal);
}

export const apiClient: PixivApiClient = {
  get: <T>(path: string, params?: Record<string, string>, signal?: AbortSignal) =>
    request<T>("GET", path, params, signal),
  post: <T>(path: string, body: Record<string, string>) => request<T>("POST", path, body),
};
