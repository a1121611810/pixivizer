import type { ColorThemeId } from "@/stores/themeStore";

const THEME_CLASS_NAMES: Exclude<ColorThemeId, "fluent">[] = [
  "rose",
  "coast",
  "sage",
  "lavender",
  "caramel",
];

export function applyColorThemeClass(id: ColorThemeId, isDark: boolean): void {
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
