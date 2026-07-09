import { describe, it, expect, vi, beforeEach } from "vitest";
import { Preferences } from "@capacitor/preferences";
import {
  type ColorThemeId,
  colorTheme,
  setColorTheme,
  loadColorThemePreference,
} from "@/stores/themeStore";
import { applyColorThemeClass } from "@/utils/themeApplier";

vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: vi.fn(), set: vi.fn(() => Promise.resolve()) },
}));

let classes: string[];

function createMockClassList() {
  classes = [];
  return {
    add: vi.fn((token: string) => {
      if (!classes.includes(token)) classes.push(token);
    }),
    remove: vi.fn((...tokens: string[]) => {
      classes = classes.filter((c) => !tokens.includes(c));
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

beforeEach(async () => {
  vi.stubGlobal("document", {
    documentElement: {
      classList: createMockClassList(),
    },
  });
  vi.mocked(Preferences.get).mockResolvedValue({ value: null });
  await loadColorThemePreference();
  vi.clearAllMocks();
  classes = [];
});

describe("applyColorThemeClass", () => {
  it("adds theme-rose for non-fluent themes", () => {
    applyColorThemeClass("rose");
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("theme-rose");
  });

  it("removes all theme-* classes for fluent theme", () => {
    classes = ["theme-rose"];
    applyColorThemeClass("fluent");
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      "theme-rose",
      "theme-coast",
      "theme-sage",
      "theme-lavender",
      "theme-caramel",
    );
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

  it("accepts fluent as a valid stored value", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: "fluent" });

    await loadColorThemePreference();

    expect(colorTheme()).toBe("fluent");
  });

  it("falls back to fluent when nothing is stored", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });

    await loadColorThemePreference();

    expect(colorTheme()).toBe("fluent");
  });

  it("calls Preferences.set after restoring a stored theme", async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: "coast" });

    await loadColorThemePreference();

    expect(Preferences.set).toHaveBeenCalledWith({ key: "color_theme", value: "coast" });
  });

  it("falls back to fluent when Preferences.get rejects", async () => {
    vi.mocked(Preferences.get).mockRejectedValue(new Error("storage unavailable"));

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

  it("triggers the DOM effect to apply the theme class", () => {
    setColorTheme("rose");
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("theme-rose");
  });

  it("triggers the persistence effect to save the theme", () => {
    setColorTheme("lavender");
    expect(Preferences.set).toHaveBeenCalledWith({ key: "color_theme", value: "lavender" });
  });
});
