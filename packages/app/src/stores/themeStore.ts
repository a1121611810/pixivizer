import { createEffect, createRoot, createSignal } from "solid-js";
import { Preferences } from "@capacitor/preferences";
import { applyPageStyleClass, applyDarkClass } from "@/utils/themeApplier";
import { resolvedTheme } from "@/stores/uiStore";

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

// 自动应用页面风格 class 并持久化
createRoot(() => {
  createEffect(() => {
    const id = internalPageStyleTheme();
    if (typeof document === "undefined") return;
    applyPageStyleClass(id);
  });

  // 跟踪上次持久化的页面风格，避免启动时重复写入
  let lastPersistedPageStyle: string | undefined;

  createEffect(() => {
    const id = internalPageStyleTheme();
    if (typeof document === "undefined") return;
    // 仅在用户切换后持久化（跳过启动时的初始加载）
    if (id !== lastPersistedPageStyle) {
      lastPersistedPageStyle = id;
      Preferences.set({ key: PREF_KEY_PAGE_STYLE_THEME, value: id }).catch((error) => {
        console.warn("[themeStore] Failed to persist page style theme", error);
      });
    }
  });

  // ── 明暗主题同步：监听 resolvedTheme 并切换 <html> 的 .dark 类 ──
  createEffect(() => {
    const isDark = resolvedTheme() === "dark";
    applyDarkClass(isDark);
  });
});
