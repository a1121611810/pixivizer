import { createEffect, createRoot, createSignal } from "solid-js";
import { Preferences } from "@capacitor/preferences";
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

export const THEME_CLASS_NAMES = VALID_THEME_IDS.filter(
  (id): id is Exclude<ColorThemeId, "fluent"> => id !== "fluent",
);

const [internalColorTheme, setColorTheme] = createSignal<ColorThemeId | null>(null);
const [hasLoaded, setHasLoaded] = createSignal(false);

export const colorTheme = () => internalColorTheme() ?? "fluent";
export { setColorTheme };

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
    setColorTheme("fluent");
  } finally {
    setHasLoaded(true);
  }
}

// 自动应用主题类并持久化到 Preferences
// 注意：.dark 类由 uiStore 单独管理，themeStore 绝不触碰。
createRoot(() => {
  createEffect(() => {
    const id = internalColorTheme();
    if (id == null || typeof document === "undefined") return;
    applyColorThemeClass(id);
  });

  createEffect(() => {
    const id = internalColorTheme();
    if (id == null || !hasLoaded()) return;
    Preferences.set({ key: PREF_KEY_COLOR_THEME, value: id }).catch((e) => {
      console.warn("[themeStore] Failed to persist color theme", e);
    });
  });
});
