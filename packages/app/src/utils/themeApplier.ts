import type { ColorThemeId, PageStyleThemeId } from "@/stores/themeStore";

/**
 * 管理 <html> 上的 theme-* 类名与 .dark 类。
 * - 非 Fluent 主题为单Palette，会移除 .dark。
 * - Fluent 主题根据 isDark 参数设置/移除 .dark。
 */
export function applyColorThemeClass(id: ColorThemeId, isDark?: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const toRemove: string[] = [];
  for (const cls of root.classList) {
    if (cls.startsWith("theme-")) {
      toRemove.push(cls);
    }
  }
  if (toRemove.length > 0) {
    root.classList.remove(...toRemove);
  }

  if (id !== "fluent") {
    root.classList.add(`theme-${id}`);
    root.classList.remove("dark");
  } else {
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}

/**
 * 管理 <html> 上的页面风格类（page-card 等）。
 * 页面风格影响卡片布局的视觉 tokens。
 */
export function applyPageStyleClass(id: PageStyleThemeId): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  // 移除所有 .page-* 类
  const toRemove: string[] = [];
  for (const cls of root.classList) {
    if (cls.startsWith("page-")) {
      toRemove.push(cls);
    }
  }
  if (toRemove.length > 0) {
    root.classList.remove(...toRemove);
  }

  if (id === "card") {
    root.classList.add("page-card");
  }
}
