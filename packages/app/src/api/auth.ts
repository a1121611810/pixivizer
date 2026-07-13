import { Capacitor } from "@capacitor/core";
import { setAccessToken } from "./client";
import type { PixivAuthResponse, PixivUser } from "./types";
import { AuthPlugin } from "@/native/AuthPlugin";
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

/**
 * 使用 refresh_token 交换新的 access_token。
 *
 * ── 生产环境（Android Native） ──
 * 通过 AuthPlugin 在 Java 端完成 OAuth 认证。
 * CLIENT_ID / CLIENT_SECRET / HASH_SECRET 仅存在于编译后的字节码中（classes.dex），
 * 不出现在 JS bundle 中。
 *
 * ── 开发环境（浏览器 pnpm dev） ──
 * 通过 JS fallback 处理，凭证在此分支中明文出现。
 * pnpm build 时 Rolldown 将 import.meta.env.DEV 替换为 false，
 * terser 消除 if (false) { ... } 整个块，此分支的凭证和 spark-md5 均不进入生产 bundle。
 */
export async function refreshToken(token: string): Promise<PixivAuthResponse> {
  if (isNative) {
    const result = await AuthPlugin.refreshToken({ refreshToken: token });
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
        profile_image_urls: {},
        is_followed: false,
      },
    };
  }

  // ── DEV-ONLY 分支 ──────────────────────────────────────────────
  // import.meta.env.DEV → Vite 编译期替换为 false → Rolldown 保留 if (false)
  // → terser 消除整个 { ... } → 凭证和 spark-md5 均不在生产 bundle 中
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (import.meta.env.DEV) {
    const CLIENT_ID = "MOBrBDS8blbauoSck0ZfDbtuzpyT";
    const CLIENT_SECRET = "lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj";
    const HASH_SECRET = "28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c";

    const { default: SparkMD5 } = await import("spark-md5");

    const time = new Date().toISOString().replace(/Z$/, "+00:00");
    const hash = SparkMD5.hash(time + HASH_SECRET);

    const headers: Record<string, string> = {
      "X-Client-Time": time,
      "X-Client-Hash": hash,
      "App-OS": "ios",
      "App-OS-Version": "18.5",
      "User-Agent": PIXIV_USER_AGENT,
    };

    const bodyStr = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: token,
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
