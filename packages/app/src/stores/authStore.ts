import { createSignal } from "solid-js";
import { setAccessToken, setOnUnauthorized } from "../api/client";
import { refreshToken } from "../api/auth";
import type { PixivUser } from "../api/types";
import {
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  migrateRefreshTokenFromPreferences,
} from "../utils/secureStorage";
import { App } from "@capacitor/app";

const [accessTokenSig, setAccessTokenSig] = createSignal<string | null>(null);
const [refreshTokenSig, setRefreshTokenSig] = createSignal<string | null>(null);
const [user, setUser] = createSignal<PixivUser | null>(null);
const [isLoggedIn, setIsLoggedIn] = createSignal(false);
const [isLoading, setIsLoading] = createSignal(true);

/** 上次 token 刷新的时间戳 */
let lastRefreshTime = 0;
/** 预判性刷新阈值：前台恢复后距离上次刷新超过此值则预刷新（10 分钟） */
const PRE_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;

export { isLoggedIn, user, isLoading, setIsLoading, accessTokenSig, refreshTokenSig };

function syncToken(token: string) {
  setAccessTokenSig(token);
  setAccessToken(token);
}

/** 安装 onUnauthorized 处理器 + 前台恢复预刷新监听 */
let appStateListener: ReturnType<typeof App.addListener> | null = null;

function setupUnauthorizedHandler() {
  setOnUnauthorized(async () => {
    const latest = refreshTokenSig();
    if (latest) {
      await performRefresh(latest);
    } else {
      await logout();
    }
  });

  // 前台恢复时预判性刷新：如果距离上次刷新超过阈值，提前 refresh
  appStateListener = App.addListener("appStateChange", ({ isActive }) => {
    if (isActive && refreshTokenSig() && Date.now() - lastRefreshTime > PRE_REFRESH_THRESHOLD_MS) {
      const latest = refreshTokenSig();
      if (latest) performRefresh(latest);
    }
  });
}

export async function initializeAuth() {
  setIsLoading(true);
  let token = await getRefreshToken();
  if (!token) {
    token = await migrateRefreshTokenFromPreferences();
  }
  if (token) {
    setRefreshTokenSig(token);
    setupUnauthorizedHandler();
    await performRefresh(token);
  }
}

async function performRefresh(token: string) {
  try {
    const resp = await refreshToken(token);
    syncToken(resp.access_token);
    setRefreshTokenSig(resp.refresh_token);
    setUser(resp.user);
    setIsLoggedIn(true);
    lastRefreshTime = Date.now();
    await setRefreshToken(resp.refresh_token);
  } catch {
    await logout();
  }
}

export async function loginWithToken(token: string) {
  const resp = await refreshToken(token);
  syncToken(resp.access_token);
  setRefreshTokenSig(resp.refresh_token);
  setUser(resp.user);
  setIsLoggedIn(true);
  setupUnauthorizedHandler();
  await setRefreshToken(resp.refresh_token);
}

export async function logout() {
  appStateListener?.remove();
  appStateListener = null;
  syncToken("");
  setRefreshTokenSig(null);
  setUser(null);
  setIsLoggedIn(false);
  await removeRefreshToken();
}
