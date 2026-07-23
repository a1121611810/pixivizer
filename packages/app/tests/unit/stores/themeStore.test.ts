import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

function mockPreferences(getReturn: Record<string, string | null> = {}) {
  const store = new Map<string, string>();
  for (const [k, v] of Object.entries(getReturn)) {
    if (v != null) store.set(k, v);
  }
  vi.mock("@capacitor/preferences", () => ({
    Preferences: {
      get: vi.fn(async ({ key }: { key: string }) => ({
        value: store.get(key) ?? null,
      })),
      set: vi.fn(async () => {}),
    },
  }));
}

async function loadStore() {
  return await import("@/stores/themeStore");
}

describe("pageStyleTheme", () => {
  it("defaults to fluent", async () => {
    const { pageStyleTheme } = await loadStore();
    expect(pageStyleTheme()).toBe("fluent");
  });

  it("updates when setPageStyleTheme is called", async () => {
    const { setPageStyleTheme, pageStyleTheme } = await loadStore();
    setPageStyleTheme("card");
    expect(pageStyleTheme()).toBe("card");
  });

  it("persists preference via Preferences.set", async () => {
    const prefs = await import("@capacitor/preferences");
    const { setPageStyleTheme } = await loadStore();
    setPageStyleTheme("card");
    expect(prefs.Preferences.set).toHaveBeenCalledWith({
      key: "page_style_theme",
      value: "card",
    });
  });

  it("restores persisted preference on loadPageStyleThemePreference", async () => {
    mockPreferences({ page_style_theme: "card" });
    const { loadPageStyleThemePreference, pageStyleTheme } = await loadStore();
    await loadPageStyleThemePreference();
    expect(pageStyleTheme()).toBe("card");
  });

  it("falls back to fluent when persisted value is invalid", async () => {
    mockPreferences({ page_style_theme: "invalid_value" });
    const { loadPageStyleThemePreference, pageStyleTheme } = await loadStore();
    await loadPageStyleThemePreference();
    expect(pageStyleTheme()).toBe("fluent");
  });

  it("falls back to fluent when no preference is stored", async () => {
    mockPreferences({});
    const { loadPageStyleThemePreference, pageStyleTheme } = await loadStore();
    await loadPageStyleThemePreference();
    expect(pageStyleTheme()).toBe("fluent");
  });
});
