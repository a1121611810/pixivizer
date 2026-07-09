import { createEffect, createRoot, createSignal } from "solid-js";
import { Preferences } from "@capacitor/preferences";
import { resolvedTheme } from "@/stores/uiStore";
import { applyColorThemeClass } from "@/utils/themeApplier";

export type ColorThemeId = "fluent" | "coast" | "rose" | "sage" | "lavender" | "caramel";

const PREF_KEY_COLOR_THEME = "color_theme";

export const VALID_THEME_IDS: readonly ColorThemeId[] = [
  "fluent",
  "rose",
  "coast",
  "sage",
  "lavender",
  "caramel",
];

const [colorTheme, setColorTheme] = createSignal<ColorThemeId>("fluent");
export { colorTheme, setColorTheme };

/** 从 Preferences 读取已保存的颜色主题并应用。 */
export async function loadColorThemePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_COLOR_THEME });
    const id: ColorThemeId =
      value != null && (VALID_THEME_IDS as readonly string[]).includes(value)
        ? (value as ColorThemeId)
        : "fluent";
    setColorTheme(id);
  } catch (e) {
    console.warn("[themeStore] Failed to load color theme preference", e);
  }
}

// 自动应用主题类并持久化到 Preferences
createRoot(() => {
  createEffect(() => {
    const id = colorTheme();
    applyColorThemeClass(id, resolvedTheme() === "dark");
  });

  createEffect(() => {
    const id = colorTheme();
    Preferences.set({ key: PREF_KEY_COLOR_THEME, value: id }).catch((e) => {
      console.warn("[themeStore] Failed to persist color theme", e);
    });
  });
});
