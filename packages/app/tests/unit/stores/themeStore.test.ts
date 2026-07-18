import { describe, it, expect, vi, beforeEach } from "vitest";
import { Preferences } from "@capacitor/preferences";
import type { ColorThemeId } from "@/stores/themeStore";

vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: vi.fn(), set: vi.fn(() => Promise.resolve()) },
}));

vi.mock("@/stores/uiStore", () => ({
  resolvedTheme: vi.fn(() => "light"),
}));

let classes: string[];

function createMockClassList() {
  classes = [];
  return {
    add: vi.fn((token: string) => {
      if (!classes.includes(token)) {
        classes.push(token);
      }
    }),
    remove: vi.fn((...tokens: string[]) => {
      classes = classes.filter((c) => !tokens.includes(c));
    }),
    contains: vi.fn((token: string) => classes.includes(token)),
    toggle: vi.fn((token: string, force?: boolean) => {
      const has = classes.includes(token);
      if (force === true) {
        if (!has) {
          classes.push(token);
        }
        return true;
      }
      if (force === false) {
        classes = classes.filter((c) => c !== token);
        return false;
      }
      if (has) {
        classes = classes.filter((c) => c !== token);
        return false;
      }
      classes.push(token);
      return true;
    }),
    [Symbol.iterator]: () => classes.values(),
  };
}

beforeEach(() => {
  vi.stubGlobal("document", {
    documentElement: {
      classList: createMockClassList(),
    },
  });
  vi.stubGlobal("window", {
    matchMedia: () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
  vi.clearAllMocks();
  classes = [];
});

async function loadStore() {
  vi.resetModules();
  const mod = await import("@/stores/themeStore");
  return mod;
}

describe("loadColorThemePreference", () => {
  it("restores a valid stored color theme", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: "rose" });

    const { loadColorThemePreference, colorTheme } = await loadStore();
    await loadColorThemePreference();

    expect(Preferences.get).toHaveBeenCalledWith({ key: "color_theme" });
    expect(colorTheme()).toBe("rose");
  });

  it("falls back to fluent for invalid stored values", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: "neon" });

    const { loadColorThemePreference, colorTheme } = await loadStore();
    await loadColorThemePreference();

    expect(colorTheme()).toBe("fluent");
  });

  it("accepts fluent as a valid stored value", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: "fluent" });

    const { loadColorThemePreference, colorTheme } = await loadStore();
    await loadColorThemePreference();

    expect(colorTheme()).toBe("fluent");
  });

  it("falls back to fluent when nothing is stored", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });

    const { loadColorThemePreference, colorTheme } = await loadStore();
    await loadColorThemePreference();

    expect(colorTheme()).toBe("fluent");
  });

  it("does not write to Preferences when restoring a stored theme", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: "coast" });

    const { loadColorThemePreference } = await loadStore();
    await loadColorThemePreference();

    expect(Preferences.set).not.toHaveBeenCalled();
  });

  it("falls back to fluent when Preferences.get rejects", async () => {
    vi.mocked(Preferences.get).mockRejectedValue(new Error("storage unavailable"));

    const { loadColorThemePreference, colorTheme } = await loadStore();
    await loadColorThemePreference();

    expect(colorTheme()).toBe("fluent");
    expect(Preferences.set).not.toHaveBeenCalled();
  });

  it("does not overwrite a theme set by the user while loading", async () => {
    vi.mocked(Preferences.get).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ value: "coast" }), 10)),
    );

    const { loadColorThemePreference, setColorTheme, colorTheme } = await loadStore();
    const loadPromise = loadColorThemePreference();
    setColorTheme("rose");
    await loadPromise;

    expect(colorTheme()).toBe("rose");
    expect(Preferences.set).toHaveBeenCalledWith({ key: "color_theme", value: "rose" });
  });

  it("handles concurrent loadColorThemePreference calls", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: "sage" });

    const { loadColorThemePreference, colorTheme } = await loadStore();
    await Promise.all([loadColorThemePreference(), loadColorThemePreference()]);

    expect(colorTheme()).toBe("sage");
  });
});

describe("setColorTheme", () => {
  it("updates the colorTheme signal", async () => {
    const { setColorTheme, colorTheme } = await loadStore();
    setColorTheme("lavender");
    expect(colorTheme()).toBe("lavender");
  });

  it("accepts all valid theme ids", async () => {
    const { setColorTheme, colorTheme } = await loadStore();
    const ids: ColorThemeId[] = ["fluent", "coast", "rose", "sage", "lavender", "caramel"];
    for (const id of ids) {
      setColorTheme(id);
      expect(colorTheme()).toBe(id);
    }
  });

  it("triggers the DOM effect to apply the theme class", async () => {
    const { loadColorThemePreference, setColorTheme } = await loadStore();
    await loadColorThemePreference();
    vi.clearAllMocks();

    setColorTheme("rose");
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("theme-rose");
  });

  it("triggers the persistence effect to save the theme", async () => {
    const { loadColorThemePreference, setColorTheme } = await loadStore();
    await loadColorThemePreference();
    vi.clearAllMocks();

    setColorTheme("lavender");
    expect(Preferences.set).toHaveBeenCalledWith({ key: "color_theme", value: "lavender" });
  });

  it("applies .dark for fluent theme based on resolvedTheme", async () => {
    const uiStore = await import("@/stores/uiStore");
    vi.mocked(uiStore.resolvedTheme).mockReturnValue("dark");

    const { loadColorThemePreference, setColorTheme } = await loadStore();
    await loadColorThemePreference();
    vi.clearAllMocks();

    setColorTheme("fluent");
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("dark");
  });

  it("removes .dark when switching from non-fluent to fluent in light mode", async () => {
    const { loadColorThemePreference, setColorTheme } = await loadStore();
    await loadColorThemePreference();
    setColorTheme("rose");
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith("dark");

    vi.clearAllMocks();
    setColorTheme("fluent");
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith("theme-rose");
  });

  it("does not persist the same theme id twice", async () => {
    const { loadColorThemePreference, setColorTheme } = await loadStore();
    await loadColorThemePreference();
    vi.clearAllMocks();

    setColorTheme("rose");
    await new Promise((r) => setTimeout(r, 0));
    setColorTheme("rose");
    await new Promise((r) => setTimeout(r, 0));

    expect(Preferences.set).toHaveBeenCalledTimes(1);
    expect(Preferences.set).toHaveBeenCalledWith({ key: "color_theme", value: "rose" });
  });
});

describe("SSR / no-document path", () => {
  it("loadColorThemePreference does not throw when document is undefined", async () => {
    vi.stubGlobal("document", undefined);
    vi.mocked(Preferences.get).mockResolvedValue({ value: "rose" });

    const { loadColorThemePreference, colorTheme } = await loadStore();
    await expect(loadColorThemePreference()).resolves.toBeUndefined();
    expect(colorTheme()).toBe("rose");
  });
});
