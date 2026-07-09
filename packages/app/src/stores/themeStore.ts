import { createEffect, createRoot, createSignal } from "solid-js";
import { Preferences } from "@capacitor/preferences";

export type ColorThemeId = "fluent" | "coast" | "rose" | "sage" | "lavender" | "caramel";

const PREF_KEY_COLOR_THEME = "color_theme";

const THEME_CLASS_NAMES: ColorThemeId[] = ["rose", "coast", "sage", "lavender", "caramel"];

const [colorTheme, setColorTheme] = createSignal<ColorThemeId>("fluent");
export { colorTheme, setColorTheme };

/** 应用颜色主题类到 <html>；非 fluent 主题会移除 dark 类。 */
export function applyColorThemeClass(id: ColorThemeId, isDark = false): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.remove(...THEME_CLASS_NAMES.map((name) => `theme-${name}`));

  if (id === "fluent") {
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } else {
    root.classList.add(`theme-${id}`);
    root.classList.remove("dark");
  }
}

/** 从 Preferences 读取已保存的颜色主题并应用。 */
export async function loadColorThemePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_COLOR_THEME });
    const id: ColorThemeId =
      value != null && (THEME_CLASS_NAMES as readonly string[]).includes(value)
        ? (value as ColorThemeId)
        : "fluent";
    setColorTheme(id);
  } catch (e) {
    console.warn("[themeStore] Failed to load color theme preference", e);
  }
}

// 自动应用主题类并持久化到 Preferences
/* eslint-disable @typescript-eslint/no-floating-promises */
createRoot(() => {
  createEffect(() => {
    const id = colorTheme();
    if (typeof document === "undefined") return;

    const isDark = document.documentElement.classList.contains("dark");
    applyColorThemeClass(id, isDark);

    Promise.resolve(Preferences.set({ key: PREF_KEY_COLOR_THEME, value: id })).catch((e) => {
      console.warn("[themeStore] Failed to persist color theme", e);
    });
  });
});
