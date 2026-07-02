import { describe, it, expect, vi, beforeEach } from "vitest";
import { Preferences } from "@capacitor/preferences";

vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: vi.fn(), set: vi.fn() },
}));

async function loadStore() {
  vi.resetModules();
  const mod = await import("@/stores/blockStore");
  return mod;
}

describe("blockStore", () => {
  
  it("loads blocked ids from Preferences", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({
      value: JSON.stringify([111, 222]),
    });

    const { loadBlockedIds, blockedIds, isBlocked } = await loadStore();
    await loadBlockedIds();

    expect(isBlocked(111)).toBe(true);
    expect(isBlocked(222)).toBe(true);
    expect(isBlocked(333)).toBe(false);
    expect(blockedIds().size).toBe(2);
  });

  it("handles missing preference gracefully", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });

    const { loadBlockedIds, blockedIds, isBlocked } = await loadStore();
    await loadBlockedIds();

    expect(blockedIds().size).toBe(0);
    expect(isBlocked(111)).toBe(false);
  });

  it("blocks a user and persists the id", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue(undefined);

    const { loadBlockedIds, blockUser, isBlocked } = await loadStore();
    await loadBlockedIds();
    await blockUser(111);

    expect(isBlocked(111)).toBe(true);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "blocked_user_ids",
      value: JSON.stringify([111]),
    });
  });

  it("does not block the same user twice", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue(undefined);

    const { loadBlockedIds, blockUser, blockedIds } = await loadStore();
    await loadBlockedIds();
    await blockUser(111);
    await blockUser(111);

    expect(blockedIds().size).toBe(1);
    expect(Preferences.set).toHaveBeenCalledTimes(1);
  });

  it("unblocks a user and persists the change", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({
      value: JSON.stringify([111, 222]),
    });
    vi.mocked(Preferences.set).mockResolvedValue(undefined);

    const { loadBlockedIds, unblockUser, isBlocked } = await loadStore();
    await loadBlockedIds();
    await unblockUser(111);

    expect(isBlocked(111)).toBe(false);
    expect(isBlocked(222)).toBe(true);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "blocked_user_ids",
      value: JSON.stringify([222]),
    });
  });

  it("unblocking a non-blocked user is a no-op", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });

    const { loadBlockedIds, unblockUser, blockedIds } = await loadStore();
    await loadBlockedIds();
    await unblockUser(111);

    expect(blockedIds().size).toBe(0);
    expect(Preferences.set).not.toHaveBeenCalled();
  });

  it("resets blocked ids to empty", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({
      value: JSON.stringify([111, 222]),
    });

    const { loadBlockedIds, resetBlockedIds, blockedIds, isBlocked } = await loadStore();
    await loadBlockedIds();
    resetBlockedIds();

    expect(blockedIds().size).toBe(0);
    expect(isBlocked(111)).toBe(false);
    expect(isBlocked(222)).toBe(false);
  });
});
