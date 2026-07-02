import { describe, it, expect, vi, beforeEach } from "vitest";
import { Preferences } from "@capacitor/preferences";

const mockSecureGet = vi.fn();
const mockSecureSet = vi.fn();
const mockSecureRemove = vi.fn();

vi.mock("capacitor-secure-storage-plugin", () => ({
  SecureStoragePlugin: {
    get: (...args: unknown[]) => mockSecureGet(...args),
    set: (...args: unknown[]) => mockSecureSet(...args),
    remove: (...args: unknown[]) => mockSecureRemove(...args),
  },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
}));

async function loadModule() {
  vi.resetModules();
  return import("@/utils/secureStorage");
}

describe("secureStorage", () => {
  describe("getRefreshToken", () => {
    it("returns token from SecureStoragePlugin", async () => {
      mockSecureGet.mockResolvedValue({ value: "my-token" });
      const { getRefreshToken } = await loadModule();
      const result = await getRefreshToken();
      expect(result).toBe("my-token");
      expect(mockSecureGet).toHaveBeenCalledWith({ key: "refresh_token" });
    });

    it("returns null when secure storage throws", async () => {
      mockSecureGet.mockRejectedValue(new Error("Keystore error"));
      const { getRefreshToken } = await loadModule();
      const result = await getRefreshToken();
      expect(result).toBeNull();
    });

    it("returns null when no value stored", async () => {
      mockSecureGet.mockResolvedValue({ value: null });
      const { getRefreshToken } = await loadModule();
      const result = await getRefreshToken();
      expect(result).toBeNull();
    });
  });

  describe("setRefreshToken", () => {
    it("stores token to SecureStoragePlugin", async () => {
      mockSecureSet.mockResolvedValue(undefined);
      const { setRefreshToken } = await loadModule();
      await setRefreshToken("new-token");
      expect(mockSecureSet).toHaveBeenCalledWith({
        key: "refresh_token",
        value: "new-token",
      });
    });
  });

  describe("removeRefreshToken", () => {
    it("removes token from SecureStoragePlugin", async () => {
      mockSecureRemove.mockResolvedValue(undefined);
      const { removeRefreshToken } = await loadModule();
      await removeRefreshToken();
      expect(mockSecureRemove).toHaveBeenCalledWith({ key: "refresh_token" });
    });
  });

  describe("migrateRefreshTokenFromPreferences", () => {
    it("migrates token from Preferences to SecureStorage", async () => {
      vi.mocked(Preferences.get).mockResolvedValue({ value: "old-token" });
      mockSecureSet.mockResolvedValue(undefined);
      vi.mocked(Preferences.remove).mockResolvedValue(undefined);

      const { migrateRefreshTokenFromPreferences } = await loadModule();
      const result = await migrateRefreshTokenFromPreferences();

      expect(result).toBe("old-token");
      expect(mockSecureSet).toHaveBeenCalledWith({
        key: "refresh_token",
        value: "old-token",
      });
      expect(Preferences.remove).toHaveBeenCalledWith({ key: "refresh_token" });
    });

    it("returns null when Preferences has no token", async () => {
      vi.mocked(Preferences.get).mockResolvedValue({ value: null });

      const { migrateRefreshTokenFromPreferences } = await loadModule();
      const result = await migrateRefreshTokenFromPreferences();

      expect(result).toBeNull();
      expect(mockSecureSet).not.toHaveBeenCalled();
      expect(Preferences.remove).not.toHaveBeenCalled();
    });
  });
});
