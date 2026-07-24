import { createStore, produce } from "solid-js/store";
import { Preferences } from "@capacitor/preferences";

type Tab = "recommended" | "follow" | "bookmarks" | "me" | "history";
export type { Tab };
export type ContentType = "illust" | "novel";
export type Theme = "light" | "dark" | "system";

/** 布局模式 → 列数映射 */
export const MODE_COLUMNS: Record<string, number> = {
  waterfall: 2,
  single: 1,
  grid: 3,
};

const PREF_KEY_THEME = "theme";
const PREF_KEY_CONTENT_TYPE = "content_type";

// ── 主题辅助函数 ──

/** 根据 OS 偏好获取当前系统主题（安全兜底） */
function getSystemTheme(): "dark" | "light" {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** 根据用户选择的 theme 计算出实际生效的主题 */
function computeResolvedTheme(userTheme: Theme): "dark" | "light" {
  return userTheme === "system" ? getSystemTheme() : userTheme;
}

// ── Store ──

const initialState = () => {
  const initialTheme: Theme = "system";
  return {
    // 导航
    currentTab: "recommended" as Tab,
    // 内容类型
    contentType: "illust" as ContentType,
    // 主题
    theme: initialTheme as Theme,
    resolvedTheme: computeResolvedTheme(initialTheme) as "dark" | "light",
  };
};

const [state, setState] = createStore(initialState());

// ── 向后兼容的导出包装函数 ──

export const currentTab = () => state.currentTab;
export const setCurrentTab = (tab: Tab) => setState("currentTab", tab);

export const contentType = () => state.contentType;

export async function setContentType(type: ContentType): Promise<void> {
  const prev = state.contentType;
  if (type === prev) {
    return;
  }
  setState("contentType", type);
  try {
    await Preferences.set({ key: PREF_KEY_CONTENT_TYPE, value: type });
  } catch (error) {
    console.warn("[uiStore] Failed to persist contentType", error);
    setState("contentType", prev);
  }
  window.dispatchEvent(new CustomEvent("contentTypeChanged"));
}

export const theme = () => state.theme;
export const setTheme = (t: Theme) => setState("theme", t);

export const resolvedTheme = () => state.resolvedTheme;
export const setThemePersisted = async (newTheme: Theme): Promise<void> => {
  setState(
    produce((s) => {
      s.theme = newTheme;
      s.resolvedTheme = computeResolvedTheme(newTheme);
    }),
  );
  try {
    await Preferences.set({ key: PREF_KEY_THEME, value: newTheme });
    localStorage.setItem(PREF_KEY_THEME, newTheme);
  } catch (error) {
    console.warn("[uiStore] Failed to persist theme", error);
  }
};

// ── 主题持久化 ──

export async function loadThemePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_THEME });
    const userTheme: Theme =
      value === "light" || value === "dark" || value === "system" ? value : "system";
    setState(
      produce((s) => {
        s.theme = userTheme;
        s.resolvedTheme = computeResolvedTheme(userTheme);
      }),
    );
  } catch (error) {
    console.warn("[uiStore] Failed to load theme preference", error);
    setState("resolvedTheme", getSystemTheme());
  }
}

export async function loadContentTypePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_CONTENT_TYPE });
    if (value === "illust" || value === "novel") {
      setState("contentType", value as ContentType);
    }
  } catch (error) {
    console.warn("[uiStore] Failed to load contentType preference", error);
  }
}

/** 重置所有 UI 设置为默认值。同时重置主题和设置 store。 */
export async function resetUiStore(): Promise<void> {
  await setThemePersisted("system");
  const { resetSettingsStore } = await import("./settingsStore");
  await resetSettingsStore();
}

// ── 模块级副作用（仅在浏览器环境下执行）──

// 监听系统主题变化，用户选 "system" 时自动跟随
try {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", () => {
    if (state.theme === "system") {
      setState("resolvedTheme", getSystemTheme());
    }
  });
} catch {
  // 测试环境或 SSR 中 window.matchMedia 不可用，静默跳过
}
