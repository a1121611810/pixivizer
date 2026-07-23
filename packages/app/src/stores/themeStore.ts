import { createEffect, createRoot, createSignal } from "solid-js";
import { Preferences } from "@capacitor/preferences";
import { resolvedTheme, setThemePersisted } from "@/stores/uiStore";
import { applyColorThemeClass, applyPageStyleClass } from "@/utils/themeApplier";

export type ColorThemeId = "fluent" | "coast" | "rose" | "sage" | "lavender" | "caramel";

/** 页面风格主题 */
export type PageStyleThemeId = "fluent" | "card";

export const PAGE_STYLE_THEME_IDS: readonly PageStyleThemeId[] = ["fluent", "card"];

const PREF_KEY_PAGE_STYLE_THEME = "page_style_theme";

const [internalPageStyleTheme, _setPageStyleTheme] = createSignal<PageStyleThemeId>("fluent");

export const pageStyleTheme = () => internalPageStyleTheme();

export function setPageStyleTheme(id: PageStyleThemeId): void {
  _setPageStyleTheme(id);
  // 立即应用 class（不等待 createEffect 调度）
  if (typeof document !== "undefined") {
    applyPageStyleClass(id);
  }
  // 卡牌风格使用固定浅色值，强制回到明亮主题
  if (id === "card") {
    // async 调用但不等待，避免阻塞 UI
    setThemePersisted("light").catch(() => {});
  }
}

export async function loadPageStyleThemePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_PAGE_STYLE_THEME });
    if (value != null && (PAGE_STYLE_THEME_IDS as readonly string[]).includes(value)) {
      _setPageStyleTheme(value as PageStyleThemeId);
    }
  } catch (error) {
    console.warn("[themeStore] Failed to load page style theme preference", error);
  }
}

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

  // 跟踪上次持久化的页面风格，避免启动时重复写入
  let lastPersistedPageStyle: string | undefined;

  // 自动应用页面风格 class 并持久化
  createEffect(() => {
    const id = internalPageStyleTheme();
    if (typeof document === "undefined") return;
    applyPageStyleClass(id);
    // 仅在用户切换后持久化（跳过启动时的初始加载）
    if (id !== lastPersistedPageStyle) {
      lastPersistedPageStyle = id;
      Preferences.set({ key: PREF_KEY_PAGE_STYLE_THEME, value: id }).catch((error) => {
        console.warn("[themeStore] Failed to persist page style theme", error);
      });
    }
  });
});
