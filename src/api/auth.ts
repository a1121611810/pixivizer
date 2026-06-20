import { setAccessToken } from "./client";
import type { PixivAuthResponse } from "./types";
import SparkMD5 from "spark-md5";

// ─── Pixiv OAuth 凭证 ───
// 注：Android 客户端 (KzEZED7...) 已被 Pixiv 停用，仅 iOS 可用
const CLIENT_ID = "MOBrBDS8blbauoSck0ZfDbtuzpyT";
const CLIENT_SECRET = "lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj";
const HASH_SECRET = "28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c";
// OAuth 直连 URL（client.ts 的 rewriteUrl 会在 web 模式自动转为 /pixiv-oauth/auth/token）

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

/** 用户名+密码登录 */
export async function loginWithPassword(
  username: string,
  password: string,
): Promise<PixivAuthResponse> {
  const headers = makeClientHeaders();
  const body: Record<string, string> = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "password",
    username,
    password,
    get_secure_url: "1",
  };
  // 使用 apiClient.post 但需要传入自定义 headers
  // apiClient 不支持自定义 headers，直接构造请求
  const resp = await fetch("/pixiv-oauth/auth/token", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    credentials: "omit",
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`登录失败 (HTTP ${resp.status}): ${text.slice(0, 300)}`);
  }
  const data = await resp.json();
  const auth = extractAuth(data);
  setAccessToken(auth.accessToken);
  return data;
}

/** Refresh Token 刷新 */
export async function refreshToken(refreshToken: string): Promise<PixivAuthResponse> {
  const headers = makeClientHeaders();
  const body: Record<string, string> = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    get_secure_url: "1",
  };
  const resp = await fetch("/pixiv-oauth/auth/token", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    credentials: "omit",
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Token 刷新失败 (HTTP ${resp.status}): ${text.slice(0, 300)}`);
  }
  const data = await resp.json();
  const auth = extractAuth(data);
  setAccessToken(auth.accessToken);
  return data;
}
