import { createSignal } from 'solid-js';
import { Preferences } from '@capacitor/preferences';
import { setAccessToken, setOnUnauthorized } from '../api/client';
import { loginWithPassword, refreshToken } from '../api/auth';
import type { PixivUser } from '../api/types';

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

export async function initializeAuth() {
  setIsLoading(true);
  const { value } = await Preferences.get({ key: 'refresh_token' });
  if (value) {
    setRefreshTokenSig(value);
    setOnUnauthorized(async () => {
      await performRefresh(value);
    });
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
    await Preferences.set({ key: 'refresh_token', value: resp.refresh_token });
  } catch {
    await logout();
  }
}

export async function login(username: string, password: string) {
  const resp = await loginWithPassword(username, password);
  syncToken(resp.access_token);
  setRefreshTokenSig(resp.refresh_token);
  setUser(resp.user);
  setIsLoggedIn(true);
  await Preferences.set({ key: 'refresh_token', value: resp.refresh_token });
}

export async function logout() {
  syncToken('');
  setRefreshTokenSig(null);
  setUser(null);
  setIsLoggedIn(false);
  await Preferences.remove({ key: 'refresh_token' });
}
