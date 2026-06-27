import { describe, it, expect, vi, beforeEach } from "vitest";
import { Preferences } from "@capacitor/preferences";

vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: vi.fn(), set: vi.fn() },
}));

async function loadStore() {
  vi.resetModules();
  const mod = await import("../reportStore");
  return mod;
}

describe("reportStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads reported ids from Preferences", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({
      value: JSON.stringify([
        { id: 123, reason: "pornography" as const, reportedAt: 1 },
        { id: 456, reason: "spam" as const, reportedAt: 2 },
      ]),
    });

    const { loadReportedIds, reportedIds, hasReported } = await loadStore();
    await loadReportedIds();

    expect(hasReported(123)).toBe(true);
    expect(hasReported(456)).toBe(true);
    expect(hasReported(789)).toBe(false);
    expect(reportedIds().size).toBe(2);
  });

  it("handles missing preference gracefully", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });

    const { loadReportedIds, reportedIds, hasReported } = await loadStore();
    await loadReportedIds();

    expect(reportedIds().size).toBe(0);
    expect(hasReported(123)).toBe(false);
  });

  it("reports an illust and persists it", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue(undefined);

    const { loadReportedIds, reportIllust, hasReported } = await loadStore();
    await loadReportedIds();
    await reportIllust(123, "infringement");

    expect(hasReported(123)).toBe(true);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "reported_ids",
      value: expect.stringContaining("123"),
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "reported_ids",
      value: expect.stringContaining("infringement"),
    });
  });

  it("does not report the same illust twice", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue(undefined);

    const { loadReportedIds, reportIllust, reportedIds } = await loadStore();
    await loadReportedIds();
    await reportIllust(123, "other");
    await reportIllust(123, "spam");

    expect(reportedIds().size).toBe(1);
    expect(Preferences.set).toHaveBeenCalledTimes(1);
  });
});
