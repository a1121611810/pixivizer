import { Preferences } from "@capacitor/preferences";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const REFRESH_TOKEN_KEY = "refresh_token";

export async function getRefreshToken(): Promise<string | null> {
  try {
    const { value } = await SecureStoragePlugin.get({ key: REFRESH_TOKEN_KEY });
    return value ?? null;
  } catch (err) {
    console.error("[secureStorage] failed to get refresh_token", err);
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStoragePlugin.set({ key: REFRESH_TOKEN_KEY, value: token });
}

export async function removeRefreshToken(): Promise<void> {
  await SecureStoragePlugin.remove({ key: REFRESH_TOKEN_KEY });
}

/** 从旧的 Preferences 迁移 refresh_token 到 SecureStorage（一次性） */
export async function migrateRefreshTokenFromPreferences(): Promise<string | null> {
  const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
  if (value) {
    await SecureStoragePlugin.set({ key: REFRESH_TOKEN_KEY, value });
    await Preferences.remove({ key: REFRESH_TOKEN_KEY });
  }
  return value ?? null;
}
