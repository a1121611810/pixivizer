import type { ColorThemeId } from "@/stores/themeStore";
import { THEME_CLASS_NAMES } from "@/stores/themeStore";

/**
 * 仅管理 <html> 上的 theme-* 类名。
 * .dark 类由 uiStore 单独维护，此函数绝不触碰。
 */
export function applyColorThemeClass(id: ColorThemeId): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.remove(...THEME_CLASS_NAMES.map((name) => `theme-${name}`));

  if (id !== "fluent") {
    root.classList.add(`theme-${id}`);
  }
}
