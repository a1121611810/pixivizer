import { Http } from "@capacitor/http";
import { ApiErrorType, type ApiError } from "./types";

const BASE_URL = "https://app-api.pixiv.net";
const USER_AGENT = "PixivAndroidApp/5.0.234 (Android 14)";
const REFERER = "https://app-api.pixiv.net/";

export interface PixivApiClient {
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: Record<string, string>): Promise<T>;
}

let accessToken = "";
let onUnauthorized: (() => Promise<void>) | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
}

export function setOnUnauthorized(handler: () => Promise<void>) {
  onUnauthorized = handler;
}

function classifyError(status: number, error: unknown): ApiError {
  if (!status && error instanceof TypeError) {
    return { type: ApiErrorType.NETWORK, message: "网络不可用，请检查连接" };
  }
  switch (status) {
    case 401:
      return { type: ApiErrorType.UNAUTHORIZED, message: "登录已过期", status: 401 };
    case 403:
      return { type: ApiErrorType.FORBIDDEN, message: "没有权限访问", status: 403 };
    case 429:
      return { type: ApiErrorType.RATE_LIMIT, message: "请求过于频繁，请稍后重试", status: 429 };
    default:
      if (status >= 500) return { type: ApiErrorType.SERVER, message: "服务器错误", status };
      return { type: ApiErrorType.UNKNOWN, message: "未知错误", status };
  }
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  data?: Record<string, string>,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Referer: REFERER,
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  try {
    let response;
    if (method === "GET") {
      response = await Http.request({ method: "GET", url, headers, params: data });
    } else {
      const body = data ? new URLSearchParams(data).toString() : "";
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      response = await Http.request({ method: "POST", url, headers, data: body });
    }

    if (response.status === 401 && onUnauthorized) {
      await onUnauthorized();
      // 重试
      return request<T>(method, path, data);
    }

    if (response.status >= 400) {
      throw classifyError(response.status, null);
    }

    return response.data as T;
  } catch (e) {
    if ((e as ApiError).type) throw e;
    throw classifyError(0, e);
  }
}

export const apiClient: PixivApiClient = {
  get: <T>(path: string, params?: Record<string, string>) => request<T>("GET", path, params),
  post: <T>(path: string, body: Record<string, string>) => request<T>("POST", path, body),
};
