import type { PageStyleThemeId } from "@/stores/themeStore";

/**
 * 管理 <html> 上的页面风格类（page-card 等）和明暗类（.dark）。
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

/**
 * 同步明暗主题：根据 resolvedTheme 切换 <html> 的 .dark 类。
 * 由 themeStore 的 createEffect 调用。
 */
export function applyDarkClass(isDark: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", isDark);
}
