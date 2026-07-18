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

export const NON_FLUENT_THEME_IDS = VALID_THEME_IDS.filter(
  (id): id is Exclude<ColorThemeId, "fluent"> => id !== "fluent",
);

const [internalColorTheme, _setColorTheme] = createSignal<ColorThemeId | null>(null);
const [hasLoaded, setHasLoaded] = createSignal(false);

export const colorTheme = () => internalColorTheme() ?? "fluent";

let userHasSetTheme = false;
let lastPersistedId: ColorThemeId | null = null;

export function setColorTheme(id: ColorThemeId): void {
  userHasSetTheme = true;
  _setColorTheme(id);
}

/** 从 Preferences 读取已保存的颜色主题并应用。 */
export async function loadColorThemePreference(): Promise<void> {
  let id: ColorThemeId = "fluent";
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_COLOR_THEME });
    id =
      value != null && (VALID_THEME_IDS as readonly string[]).includes(value)
        ? (value as ColorThemeId)
        : "fluent";
  } catch (error) {
    console.warn("[themeStore] Failed to load color theme preference", error);
    id = "fluent";
  } finally {
    if (!userHasSetTheme) {
      lastPersistedId = id;
      _setColorTheme(id);
    }
    setHasLoaded(true);
  }
}

// 自动应用主题类与 .dark 类，并持久化到 Preferences。
// ThemeStore 是运行期间 <html> 上 theme-* 与 .dark 类的唯一所有者（index.html 仅在首屏前负责 .dark 防闪白）。
createRoot(() => {
  createEffect(() => {
    const id = internalColorTheme();
    if (id == null || typeof document === "undefined" || !hasLoaded()) {
      return;
    }
    applyColorThemeClass(id, resolvedTheme() === "dark");
  });

  createEffect(() => {
    const id = internalColorTheme();
    if (id == null || !hasLoaded()) {
      return;
    }
    if (id === lastPersistedId) {
      return;
    }
    Preferences.set({ key: PREF_KEY_COLOR_THEME, value: id })
      .then(() => {
        // 仅在主题仍是本次写入的值时才更新 lastPersistedId，避免快速切换 A→B→A 时陈旧写入覆盖最新状态。
        if (internalColorTheme() === id) {
          lastPersistedId = id;
        }
      })
      .catch((error) => {
        console.warn("[themeStore] Failed to persist color theme", error);
      });
  });
});
