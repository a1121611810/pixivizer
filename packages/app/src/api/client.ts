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
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: Record<string, string>): Promise<T>;
}

// ─── 状态 ───
let accessToken = "";
let onUnauthorized: (() => Promise<void>) | null = null;
/** 401 刷新 Promise — 共享给所有并发 401 请求，确保 refresh 只执行一次 */
let refreshPromise: Promise<void> | null = null;

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
  if (!data || typeof data !== "object") return null;
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
  if (typeof d.message === "string") return d.message;
  if (typeof d.error === "string") return d.error;
  return null;
}

export function classifyError(status: number, error: unknown, responseBody?: unknown): ApiError {
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
      if (status >= 500)
        return {
          type: ApiErrorType.SERVER,
          message: `服务器错误 (HTTP ${status})${suffix}`,
          status,
        };
      if (status > 0)
        return {
          type: ApiErrorType.UNKNOWN,
          message: `请求失败 (HTTP ${status})${suffix}`,
          status,
        };
      return { type: ApiErrorType.UNKNOWN, message: `未知错误${suffix}`, status };
  }
}

/**
 * Web 模式下，将 Pixiv 直连 URL 重写为 Vite 代理路径
 * 原生模式下保持原 URL（CapacitorHttp 可直接访问）
 */
export function rewriteUrl(path: string): string {
  // 已经是本地代理路径，直接返回
  if (path.startsWith("/pixiv-")) return path;
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
  if (!isNative) return `/pixiv-api${path}`;
  return `${PIXIV_API_BASE}${path}`;
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  data?: Record<string, string>,
): Promise<T> {
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
          const res = await fetch(url + params, { method: "GET", headers });
          response = { status: res.status, data: await res.json() };
        } else {
          const body = data ? new URLSearchParams(data).toString() : "";
          headers["Content-Type"] = "application/x-www-form-urlencoded";
          const res = await fetch(url, { method: "POST", headers, body });
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            response = { status: res.status, data: await res.json() };
          } else {
            const text = await res.text().catch(() => "");
            throw new Error(`\u670d\u52a1\u5668\u8fd4\u56de\u975e JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
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
        return request<T>(method, path, data);
      }

      if (response!.status === 429 && attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (response!.status >= 400) {
        let errorBody: unknown;
        try {
          errorBody = response!.data;
        } catch {
          // ignore
        }
        throw classifyError(response!.status, null, errorBody);
      }

      return response!.data as T;
    } catch (e) {
      if ((e as ApiError).type) throw e;
      const errMsg = e instanceof Error ? e.message : String(e ?? "");
      throw classifyError(0, e, { message: errMsg });
    }
  }
}

export const apiClient: PixivApiClient = {
  get: <T>(path: string, params?: Record<string, string>) => request<T>("GET", path, params),
  post: <T>(path: string, body: Record<string, string>) => request<T>("POST", path, body),
};
