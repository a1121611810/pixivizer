import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLoadColorThemePreference = vi.fn().mockResolvedValue(undefined);

vi.mock("@/stores/themeStore", () => ({
  loadColorThemePreference: () => mockLoadColorThemePreference(),
}));

import { initializeStartupPreferences } from "@/startup";

describe("initializeStartupPreferences", () => {
  beforeEach(() => {
    mockLoadColorThemePreference.mockClear();
  });

  it("loads the persisted color theme preference before rendering", async () => {
    await initializeStartupPreferences();
    expect(mockLoadColorThemePreference).toHaveBeenCalledTimes(1);
  });
});
