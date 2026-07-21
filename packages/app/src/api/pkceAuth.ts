import { Capacitor } from "@capacitor/core";
import { setAccessToken } from "./client";
import type { PixivAuthResponse, PixivUser } from "./types";
import { PIXIV_USER_AGENT } from "./userAgent";

// ─── 平台检测 ───
const isNative = Capacitor.isNativePlatform();

/**
 * 从任意 Pixiv OAuth 响应体中提取认证字段。
 * 支持 { response: { ... } } 和 { ... } 两种包裹格式。
 */
function extractAuth(data: any): { accessToken: string; refreshToken: string; user: PixivUser } {
  const d = data.response || data;
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    user: d.user || { id: 0, name: "", account: "" },
  };
}

/** base64url 编码（URL-safe，无 padding）。 */
function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * 生成 PKCE code_verifier + code_challenge。
 *
 * code_verifier: 43 字符 URL-safe 随机字符串。
 * code_challenge: SHA-256(code_verifier) 的 base64url 编码。
 */
export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  // 32 字节随机 → base64url → 43 字符
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  let binary = "";
  for (let i = 0; i < random.length; i++) {
    binary += String.fromCharCode(random[i]);
  }
  const codeVerifier = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .slice(0, 43);

  // SHA-256 → base64url
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier));
  const codeChallenge = base64url(hash);

  return { codeVerifier, codeChallenge };
}

/**
 * 构建 Pixiv OAuth 登录 URL。
 *
 * @param codeChallenge PKCE code_challenge
 * @returns Pixiv 登录页面 URL
 */
export function buildLoginUrl(codeChallenge: string): string {
  const params = new URLSearchParams({
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    client: "pixiv-android",
  });
  return `${__PUBLIC_CONFIG__.loginUrl}?${params.toString()}`;
}

/**
 * 使用 authorization_code 交换 access_token + refresh_token。
 *
 * ── 生产环境（Android Native） ──
 * 通过 OAuthPlugin 在 Java 端完成。
 *
 * ── 开发环境（浏览器 pnpm dev） ──
 * 通过 JS fetch + Vite 代理完成。
 * 此分支的凭证在 build 时被 terser 消除。
 */
export async function exchangeCode(code: string, codeVerifier: string): Promise<PixivAuthResponse> {
  if (isNative) {
    const { OAuthPlugin } = await import("@/native/OAuthPlugin");
    const result = await OAuthPlugin.exchangeCode({ code, codeVerifier });
    setAccessToken(result.accessToken);
    return {
      access_token: result.accessToken,
      expires_in: 3600,
      refresh_token: result.refreshToken,
      token_type: "bearer",
      user: {
        id: result.userId,
        name: result.userName,
        account: result.userAccount,
        profile_image_urls: result.profileImageUrls ?? {},
        is_followed: false,
      },
    };
  }

  // ── DEV-ONLY 分支 ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (import.meta.env.DEV) {
    const {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      hashSecret: HASH_SECRET,
    } = __CREDENTIALS__;

    const { default: SparkMD5 } = await import("spark-md5");

    const time = new Date().toISOString().replace(/Z$/u, "+00:00");
    const hash = SparkMD5.hash(time + HASH_SECRET);

    const headers: Record<string, string> = {
      "X-Client-Time": time,
      "X-Client-Hash": hash,
      "App-OS": __CREDENTIALS__.appOs,
      "App-OS-Version": __CREDENTIALS__.appOsVersion,
      "User-Agent": PIXIV_USER_AGENT,
    };

    const bodyStr = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: __CREDENTIALS__.redirectUri,
      get_secure_url: "1",
    }).toString();

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

    const data = await resp.json();
    const auth = extractAuth(data);
    setAccessToken(auth.accessToken);
    return data;
  }

  throw new Error("Auth not available outside native or dev mode");
}
