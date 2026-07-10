import { Preferences } from "@capacitor/preferences";
import { SecureStoragePlugin } from "@aparajita/capacitor-secure-storage";

const REFRESH_TOKEN_KEY = "refresh_token";

export async function getRefreshToken(): Promise<string | null> {
  try {
    const value = await SecureStoragePlugin.get(REFRESH_TOKEN_KEY);
    return typeof value === "string" ? value : null;
  } catch (err) {
    console.error("[secureStorage] failed to get refresh_token", err);
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStoragePlugin.set(REFRESH_TOKEN_KEY, token);
}

export async function removeRefreshToken(): Promise<void> {
  await SecureStoragePlugin.remove(REFRESH_TOKEN_KEY);
}

/** 从旧的 Preferences 迁移 refresh_token 到 SecureStorage（一次性） */
export async function migrateRefreshTokenFromPreferences(): Promise<string | null> {
  const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
  if (value) {
    await SecureStoragePlugin.set(REFRESH_TOKEN_KEY, value);
    await Preferences.remove({ key: REFRESH_TOKEN_KEY });
  }
  return value ?? null;
}
