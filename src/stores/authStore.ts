import { createSignal } from "solid-js";
import { Preferences } from "@capacitor/preferences";
import { setAccessToken, setOnUnauthorized } from "../api/client";
import { refreshToken } from "../api/auth";
import type { PixivUser } from "../api/types";

const [accessTokenSig, setAccessTokenSig] = createSignal<string | null>(null);
const [refreshTokenSig, setRefreshTokenSig] = createSignal<string | null>(null);
const [user, setUser] = createSignal<PixivUser | null>(null);
const [isLoggedIn, setIsLoggedIn] = createSignal(false);
const [isLoading, setIsLoading] = createSignal(true);

export { isLoggedIn, user, isLoading, accessTokenSig, refreshTokenSig };

function syncToken(token: string) {
  setAccessTokenSig(token);
  setAccessToken(token);
}

/** 安装 onUnauthorized 处理器，始终使用最新的 refreshTokenSig */
function setupUnauthorizedHandler() {
  setOnUnauthorized(async () => {
    const latest = refreshTokenSig();
    if (latest) {
      await performRefresh(latest);
    } else {
      await logout();
    }
  });
}

export async function initializeAuth() {
  setIsLoading(true);
  const { value } = await Preferences.get({ key: "refresh_token" });
  if (value) {
    setRefreshTokenSig(value);
    setupUnauthorizedHandler();
    await performRefresh(value);
  }
  setIsLoading(false);
}

async function performRefresh(token: string) {
  try {
    const resp = await refreshToken(token);
    syncToken(resp.access_token);
    setRefreshTokenSig(resp.refresh_token);
    setUser(resp.user);
    setIsLoggedIn(true);
    await Preferences.set({ key: "refresh_token", value: resp.refresh_token });
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
  await Preferences.set({ key: "refresh_token", value: resp.refresh_token });
}

export async function logout() {
  syncToken("");
  setRefreshTokenSig(null);
  setUser(null);
  setIsLoggedIn(false);
  await Preferences.remove({ key: "refresh_token" });
}
