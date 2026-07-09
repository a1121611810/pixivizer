import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { Preferences } from "@capacitor/preferences";
import {
  type ColorThemeId,
  colorTheme,
  setColorTheme,
  loadColorThemePreference,
  applyColorThemeClass,
} from "@/stores/themeStore";

vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: vi.fn(), set: vi.fn() },
}));

let originalDocument: unknown;
let classes: string[];

function createMockClassList() {
  classes = [];
  return {
    add: vi.fn((token: string) => {
      if (!classes.includes(token)) classes.push(token);
    }),
    remove: vi.fn((token: string) => {
      classes = classes.filter((c) => c !== token);
    }),
    contains: vi.fn((token: string) => classes.includes(token)),
    toggle: vi.fn((token: string, force?: boolean) => {
      const has = classes.includes(token);
      if (force === true) {
        if (!has) classes.push(token);
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
  };
}

beforeAll(() => {
  originalDocument = (globalThis as any).document;
  (globalThis as any).document = {
    documentElement: {
      classList: createMockClassList(),
    },
  };
});

afterAll(() => {
  (globalThis as any).document = originalDocument;
});

beforeEach(() => {
  classes = [];
  vi.clearAllMocks();
});

describe("applyColorThemeClass", () => {
  it("adds theme-rose and removes dark for non-fluent themes", () => {
    document.documentElement.classList.add("dark");
    applyColorThemeClass("rose");
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("theme-rose");
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith("dark");
  });

  it("removes all theme-* classes and restores dark when fluent + isDark=true", () => {
    document.documentElement.classList.add("theme-rose");
    applyColorThemeClass("fluent", true);
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      "theme-rose",
      "theme-coast",
      "theme-sage",
      "theme-lavender",
      "theme-caramel",
    );
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("dark");
  });

  it("removes all theme-* classes and dark when fluent + isDark=false", () => {
    document.documentElement.classList.add("theme-coast");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.add.mockClear();
    applyColorThemeClass("fluent", false);
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      "theme-rose",
      "theme-coast",
      "theme-sage",
      "theme-lavender",
      "theme-caramel",
    );
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith("dark");
    expect(document.documentElement.classList.add).not.toHaveBeenCalledWith("dark");
  });
});

describe("loadColorThemePreference", () => {
  it("restores a valid stored color theme", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: "rose" });

    await loadColorThemePreference();

    expect(Preferences.get).toHaveBeenCalledWith({ key: "color_theme" });
    expect(colorTheme()).toBe("rose");
  });

  it("falls back to fluent for invalid stored values", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: "neon" });

    await loadColorThemePreference();

    expect(colorTheme()).toBe("fluent");
  });

  it("falls back to fluent when nothing is stored", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });

    await loadColorThemePreference();

    expect(colorTheme()).toBe("fluent");
  });
});

describe("setColorTheme", () => {
  it("updates the colorTheme signal", () => {
    setColorTheme("lavender");
    expect(colorTheme()).toBe("lavender");
  });

  it("accepts all valid theme ids", () => {
    const ids: ColorThemeId[] = ["fluent", "coast", "rose", "sage", "lavender", "caramel"];
    for (const id of ids) {
      setColorTheme(id);
      expect(colorTheme()).toBe(id);
    }
  });
});
