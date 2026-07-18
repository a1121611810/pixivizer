import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock SecureStorage ──
const mockSecureStorage = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

vi.mock("@aparajita/capacitor-secure-storage", () => ({
  SecureStorage: {
    get: (...args: unknown[]) => mockSecureStorage.get(...args),
    set: (...args: unknown[]) => mockSecureStorage.set(...args),
    remove: (...args: unknown[]) => mockSecureStorage.remove(...args),
  },
}));

import { checkBackupIntegrity } from "@/utils/secureStorage";

describe("checkBackupIntegrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("首次启动: marker 不存在 → 写入 marker → 返回 true", async () => {
    mockSecureStorage.get.mockResolvedValue(null);

    const result = await checkBackupIntegrity();

    expect(result).toBe(true);
    expect(mockSecureStorage.get).toHaveBeenCalledWith("__pictelio_backup_marker");
    expect(mockSecureStorage.set).toHaveBeenCalledWith("__pictelio_backup_marker", "1");
  });

  it("正常启动: marker 存在 → 返回 true", async () => {
    mockSecureStorage.get.mockResolvedValue("1");

    const result = await checkBackupIntegrity();

    expect(result).toBe(true);
    expect(mockSecureStorage.get).toHaveBeenCalledWith("__pictelio_backup_marker");
    // Marker 已存在，不应再次写入
    expect(mockSecureStorage.set).not.toHaveBeenCalled();
  });

  it("备份还原: SecureStorage 异常 → 清除 refresh_token → 返回 false", async () => {
    mockSecureStorage.get.mockRejectedValue(new Error("KeyStore unavailable"));

    const result = await checkBackupIntegrity();

    expect(result).toBe(false);
    // Token 应被清除
    expect(mockSecureStorage.remove).toHaveBeenCalled();
  });

  it("SecureStorage.get 返回非字符串值 → 视为首次启动", async () => {
    // SecureStorage.get 可能返回非 string 类型（如空对象）
    mockSecureStorage.get.mockResolvedValue(undefined);

    const result = await checkBackupIntegrity();

    expect(result).toBe(true);
    expect(mockSecureStorage.set).toHaveBeenCalledWith("__pictelio_backup_marker", "1");
  });
});
