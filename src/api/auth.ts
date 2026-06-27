import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { setAccessToken } from "./client";
import type { PixivAuthResponse } from "./types";
import SparkMD5 from "spark-md5";

// ─── 平台检测 ───
const isNative = Capacitor.isNativePlatform();

// ─── OAuth 端点 ───
const PIXIV_AUTH_URL = "https://oauth.secure.pixiv.net/auth/token";

// ─── Pixiv OAuth 凭证 ───
// 使用 Android client_id + iOS User-Agent 的组合（iOS 凭证 KzEZED7a… 已被封禁）
const CLIENT_ID = "MOBrBDS8blbauoSck0ZfDbtuzpyT";
const CLIENT_SECRET = "lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj";
const HASH_SECRET = "28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c";

/** 生成 Pixiv OAuth 所需的 X-Client-Time 和 X-Client-Hash */
function makeClientHeaders(): Record<string, string> {
  const time = new Date().toISOString().replace(/Z$/, "+00:00");
  const hash = SparkMD5.hash(time + HASH_SECRET);
  return {
    "X-Client-Time": time,
    "X-Client-Hash": hash,
    "App-OS": "ios",
    "App-OS-Version": "18.5",
    "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
  };
}

/** 提取 access_token, refresh_token, user */
function extractAuth(data: any): { accessToken: string; refreshToken: string; user: any } {
  const d = data.response || data;
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    user: d.user || { id: 0, name: "", account: "" },
  };
}

/** 发起 OAuth 请求 — native 用 CapacitorHttp，web 用 Vite 代理路径 */
async function oauthRequest(body: Record<string, string>): Promise<any> {
  const headers = makeClientHeaders();
  const bodyStr = new URLSearchParams(body).toString();

  if (isNative) {
    const resp = await CapacitorHttp.request({
      method: "POST",
      url: PIXIV_AUTH_URL,
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      data: bodyStr,
    });
    if (resp.status >= 400) {
      const errText = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
      throw new Error(`OAuth 失败 (HTTP ${resp.status}): ${errText.slice(0, 300)}`);
    }
    return resp.data;
  } else {
    const resp = await fetch("/pixiv-oauth/auth/token", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyStr,
      credentials: "omit",
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`OAuth 失败 (HTTP ${resp.status}): ${text.slice(0, 300)}`);
    }
    return resp.json();
  }
}

/** Refresh Token 刷新 */
export async function refreshToken(token: string): Promise<PixivAuthResponse> {
  const data = await oauthRequest({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: token,
    get_secure_url: "1",
  });
  const auth = extractAuth(data);
  setAccessToken(auth.accessToken);
  return data;
}
