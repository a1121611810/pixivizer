import { Capacitor } from "@capacitor/core";
import { setAccessToken } from "./client";
import type { PixivAuthResponse } from "./types";
import { PIXIV_USER_AGENT } from "./userAgent";

const isNative = Capacitor.isNativePlatform();

function extractAuth(data: any): { accessToken: string; refreshToken: string } {
  const d = data.response || data;
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
  };
}

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
