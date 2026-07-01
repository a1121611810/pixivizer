import { createEffect, createRoot, createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import { setMaxCacheSize } from "../utils/imageLoader";
import { setPredictiveBackEnabled } from "../services/predictiveBack";

type Tab = "recommended" | "follow" | "bookmarks" | "me";
export type { Tab };
export type Theme = "light" | "dark" | "system";
export type ImageQuality = "medium" | "large" | "original";
export type CacheSize = number;
export type LayoutMode = "waterfall" | "single" | "grid";

/** 布局模式 → 列数映射 */
export const MODE_COLUMNS: Record<LayoutMode, number> = {
  waterfall: 2,
  single: 1,
  grid: 3,
};

const PREF_KEY_THEME = "theme";
const PREF_KEY_LAYOUT_MODE = "layout_mode";
const PREF_KEY_USE_PREDICTIVE_BACK = "use_predictive_back";
const PREF_KEY_AUTO_HIDE_NAV_BAR = "auto_hide_nav_bar";
const PREF_KEY_SHOW_R18 = "show_r18";
const PREF_KEY_SHOW_R18G = "show_r18g";
const PREF_KEY_SHOW_DETAIL_STAIRS = "show_detail_stairs";
const PREF_KEY_AGE_CONFIRMED = "age_confirmed";
const PREF_KEY_IS_ADULT = "is_adult";
const PREF_KEY_AUTO_CHECK_UPDATE = "auto_check_update";
const PREF_KEY_USE_DNS_OVERRIDE = "use_dns_override";
const ANDROID_16_API_LEVEL = 36;

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
// 将所有 UI 状态聚合到一个 Store 中，利用 createStore 的细粒度更新能力。
// 对外导出的 getter/setter 函数保持与旧版完全相同的 API，确保向后兼容。

const initialState = () => {
  const initialTheme: Theme = "system";
  return {
    // 导航
    currentTab: "recommended" as Tab,

    // 主题
    theme: initialTheme,
    resolvedTheme: computeResolvedTheme(initialTheme) as "dark" | "light",

    // 布局
    layoutMode: "waterfall" as LayoutMode,
    autoHideNavBar: true,

    // 内容过滤
    showR18: false,
    showR18G: false,
    showDetailStairs: false,

    // 年龄确认
    ageConfirmed: false,
    isAdult: false,

    // 图片质量
    listQuality: "medium" as ImageQuality,
    detailQuality: "medium" as ImageQuality,
    cacheSize: 600 as CacheSize,

    // 预测返回手势
    usePredictiveBack: false,
    isPredictiveBackSupported: false,

    // 更新检测
    autoCheckUpdate: false,
    hasUpdate: false,
    latestVersion: "",
    latestReleaseUrl: "",
    latestChangelog: "",
    isCheckingUpdate: false,
    checkCompleted: false,

    // 自定义 DNS 解析（实验性，仅 Android）
    useDnsOverride: false,
  };
};

const [state, setState] = createStore(initialState());

// ── 向后兼容的导出包装函数 ──
// 每个 getter 读取 store 中的对应属性，setter 更新 store 中的对应属性。

export const currentTab = () => state.currentTab;
export const setCurrentTab = (tab: Tab) => setState("currentTab", tab);

export const theme = () => state.theme;
export const setTheme = (t: Theme) => setState("theme", t);

export const resolvedTheme = () => state.resolvedTheme;
export const setThemePersisted = async (newTheme: Theme): Promise<void> => {
  // 使用 produce 一次性更新 theme 和 resolvedTheme，避免中间渲染
  setState(
    produce((s) => {
      s.theme = newTheme;
      s.resolvedTheme = computeResolvedTheme(newTheme);
    }),
  );
  try {
    await Preferences.set({ key: PREF_KEY_THEME, value: newTheme });
    // 双写 localStorage 供防 FOUC 内联脚本使用
    localStorage.setItem(PREF_KEY_THEME, newTheme);
  } catch (e) {
    console.warn("[uiStore] Failed to persist theme", e);
  }
};

// ── Drawer 开关
const [drawerOpen, setDrawerOpen] = createSignal(false);
export const showSettingsDrawer = () => drawerOpen();
export const setShowSettingsDrawer = (v: boolean) => setDrawerOpen(v);
export const openSettingsDrawer = () => setDrawerOpen(true);
export const closeSettingsDrawer = () => setDrawerOpen(false);

export const layoutMode = () => state.layoutMode;
export const setLayoutMode = async (mode: LayoutMode): Promise<void> => {
  setState("layoutMode", mode);
  try {
    await Preferences.set({ key: PREF_KEY_LAYOUT_MODE, value: mode });
  } catch (e) {
    console.warn("[uiStore] Failed to persist layoutMode", e);
  }
  window.dispatchEvent(new CustomEvent("layoutModeChanged"));
};

export const listQuality = () => state.listQuality;
export const setListQuality = (q: ImageQuality) => setState("listQuality", q);

export const detailQuality = () => state.detailQuality;
export const setDetailQuality = (q: ImageQuality) => setState("detailQuality", q);

export const cacheSize = () => state.cacheSize;
export const setCacheSize = (s: CacheSize) => setState("cacheSize", s);

export const usePredictiveBack = () => state.usePredictiveBack;
export const isPredictiveBackSupported = () => state.isPredictiveBackSupported;

// ── 预测返回手势 ──

async function applyPredictiveBackState(enabled: boolean): Promise<void> {
  try {
    await App.toggleBackButtonHandler({ enabled: !enabled });
  } catch (e) {
    console.warn("[uiStore] Failed to toggle back button handler", e);
  }
  try {
    await setPredictiveBackEnabled(enabled);
  } catch (e) {
    console.warn("[uiStore] Failed to set predictive back enabled state", e);
  }
}

export async function setUsePredictiveBack(enabled: boolean): Promise<void> {
  // 非 Android 平台不调用原生返回处理，避免 unimplemented warning
  if (Capacitor.getPlatform() !== "android") return;

  const previous = state.usePredictiveBack;
  setState("usePredictiveBack", enabled);

  try {
    await Preferences.set({ key: PREF_KEY_USE_PREDICTIVE_BACK, value: String(enabled) });
    await applyPredictiveBackState(enabled);
  } catch (e) {
    console.warn("[uiStore] Failed to apply predictive back state, reverting UI toggle", e);
    setState("usePredictiveBack", previous);
    try {
      await applyPredictiveBackState(previous);
    } catch (rollbackErr) {
      console.warn("[uiStore] Failed to rollback predictive back native state", rollbackErr);
    }
  }
}

export async function loadPredictiveBackPreference(): Promise<void> {
  const platform = Capacitor.getPlatform();
  if (platform !== "android") {
    setState(
      produce((s) => {
        s.usePredictiveBack = false;
        s.isPredictiveBackSupported = false;
      }),
    );
    return;
  }

  try {
    const { androidSDKVersion } = await Device.getInfo();
    const supported = androidSDKVersion != null && androidSDKVersion >= ANDROID_16_API_LEVEL;
    setState("isPredictiveBackSupported", supported);

    const { value } = await Preferences.get({ key: PREF_KEY_USE_PREDICTIVE_BACK });
    if (value !== null) {
      setState("usePredictiveBack", value === "true");
    } else {
      setState("usePredictiveBack", supported);
      await Preferences.set({ key: PREF_KEY_USE_PREDICTIVE_BACK, value: String(supported) });
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load predictive back preference", e);
    setState(
      produce((s) => {
        s.usePredictiveBack = false;
        s.isPredictiveBackSupported = false;
      }),
    );
  }

  await applyPredictiveBackState(state.usePredictiveBack);
}

// ── 自动隐藏导航 ──

export const autoHideNavBar = () => state.autoHideNavBar;

export async function setAutoHideNavBar(enabled: boolean): Promise<void> {
  setState("autoHideNavBar", enabled);
  try {
    await Preferences.set({ key: PREF_KEY_AUTO_HIDE_NAV_BAR, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist autoHideNavBar", e);
  }
}

export async function loadAutoHideNavBarPreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_AUTO_HIDE_NAV_BAR });
    if (value !== null) {
      setState("autoHideNavBar", value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load autoHideNavBar preference", e);
  }
}

// ── R-18 / R-18G 过滤 ──

export const showR18 = () => state.showR18;

export async function setShowR18(enabled: boolean): Promise<void> {
  setState("showR18", enabled);
  try {
    await Preferences.set({ key: PREF_KEY_SHOW_R18, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist showR18", e);
  }
  window.dispatchEvent(new CustomEvent("r18Changed"));
}

export async function loadShowR18Preference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_SHOW_R18 });
    if (value !== null) {
      setState("showR18", value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load showR18 preference", e);
  }
}

export const showR18G = () => state.showR18G;

export async function setShowR18G(enabled: boolean): Promise<void> {
  setState("showR18G", enabled);
  try {
    await Preferences.set({ key: PREF_KEY_SHOW_R18G, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist showR18G", e);
  }
  window.dispatchEvent(new CustomEvent("r18gChanged"));
}

export async function loadShowR18GPreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_SHOW_R18G });
    if (value !== null) {
      setState("showR18G", value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load showR18G preference", e);
  }
}

// ── 布局模式持久化 ──

export async function loadLayoutModePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_LAYOUT_MODE });
    if (value !== null && (value === "waterfall" || value === "single" || value === "grid")) {
      setState("layoutMode", value as LayoutMode);
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load layoutMode preference", e);
  }
}

// ── 年龄确认 ──

export const ageConfirmed = () => state.ageConfirmed;
export const isAdult = () => state.isAdult;

export async function loadAgePreference(): Promise<void> {
  try {
    const [{ value: confirmed }, { value: adult }] = await Promise.all([
      Preferences.get({ key: PREF_KEY_AGE_CONFIRMED }),
      Preferences.get({ key: PREF_KEY_IS_ADULT }),
    ]);
    setState(
      produce((s) => {
        if (confirmed !== null) s.ageConfirmed = confirmed === "true";
        if (adult !== null) s.isAdult = adult === "true";
      }),
    );
  } catch (e) {
    console.warn("[uiStore] Failed to load age preference", e);
  }

  // 如果用户不是成年人，强制关闭 R-18/R-18G 并持久化
  if (!state.isAdult) {
    await setShowR18(false);
    await setShowR18G(false);
  }
}

export async function setAgeConfirmation(confirmed: boolean, adult: boolean): Promise<void> {
  setState(
    produce((s) => {
      s.ageConfirmed = confirmed;
      s.isAdult = adult;
    }),
  );
  try {
    await Preferences.set({ key: PREF_KEY_AGE_CONFIRMED, value: String(confirmed) });
    await Preferences.set({ key: PREF_KEY_IS_ADULT, value: String(adult) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist age confirmation", e);
  }
  if (!adult) {
    await setShowR18(false);
    await setShowR18G(false);
  }
}

// ── 详情页楼梯模式 ──

export const showDetailStairs = () => state.showDetailStairs;

export async function setShowDetailStairs(enabled: boolean): Promise<void> {
  setState("showDetailStairs", enabled);
  try {
    await Preferences.set({ key: PREF_KEY_SHOW_DETAIL_STAIRS, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist showDetailStairs", e);
  }
}

export async function loadShowDetailStairsPreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_SHOW_DETAIL_STAIRS });
    if (value !== null) {
      setState("showDetailStairs", value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load showDetailStairs preference", e);
  }
}

// ── 更新检测 ──

export const autoCheckUpdate = () => state.autoCheckUpdate;

export async function setAutoCheckUpdate(enabled: boolean): Promise<void> {
  setState("autoCheckUpdate", enabled);
  try {
    await Preferences.set({ key: PREF_KEY_AUTO_CHECK_UPDATE, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist autoCheckUpdate", e);
  }
}

export async function loadAutoCheckUpdatePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_AUTO_CHECK_UPDATE });
    if (value !== null) {
      setState("autoCheckUpdate", value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load autoCheckUpdate preference", e);
  }
}

export const useDnsOverride = () => state.useDnsOverride;
export async function setUseDnsOverride(enabled: boolean): Promise<void> {
  setState("useDnsOverride", enabled);
  try {
    await Preferences.set({ key: PREF_KEY_USE_DNS_OVERRIDE, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist useDnsOverride", e);
  }
}

export async function loadUseDnsOverridePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_USE_DNS_OVERRIDE });
    if (value !== null) {
      setState("useDnsOverride", value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load useDnsOverride preference", e);
  }
}

export const hasUpdate = () => state.hasUpdate;
export const setHasUpdate = (v: boolean) => setState("hasUpdate", v);

export const latestVersion = () => state.latestVersion;
export const setLatestVersion = (v: string) => setState("latestVersion", v);

export const latestReleaseUrl = () => state.latestReleaseUrl;
export const setLatestReleaseUrl = (v: string) => setState("latestReleaseUrl", v);

export const latestChangelog = () => state.latestChangelog;
export const setLatestChangelog = (v: string) => setState("latestChangelog", v);

export const isCheckingUpdate = () => state.isCheckingUpdate;
export const setIsCheckingUpdate = (v: boolean) => setState("isCheckingUpdate", v);

export const checkCompleted = () => state.checkCompleted;
export const setCheckCompleted = (v: boolean) => setState("checkCompleted", v);

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
  } catch (e) {
    console.warn("[uiStore] Failed to load theme preference", e);
    setState("resolvedTheme", getSystemTheme());
  }
}

/** 重置所有 UI 设置为默认值，并尽可能持久化。 */
export async function resetUiStore(): Promise<void> {
  await setThemePersisted("system");
  setState("listQuality", "medium");
  setState("detailQuality", "medium");
  setState("cacheSize", 600);
  await setAutoHideNavBar(true);
  await setShowR18(false);
  await setShowR18G(false);
  await setLayoutMode("waterfall");
  await setShowDetailStairs(false);
  await setAgeConfirmation(false, false);
  await setAutoCheckUpdate(false);
  if (Capacitor.getPlatform() === "android") {
    await setUsePredictiveBack(state.isPredictiveBackSupported);
  } else {
    setState("usePredictiveBack", false);
  }
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

// Sync resolvedTheme 到 <html> class
createRoot(() => {
  createEffect(() => {
    const root = document.documentElement;
    if (state.resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  });
});

// Sync cache size limit to imageLoader whenever it changes
createRoot(() => {
  createEffect(() => {
    setMaxCacheSize(state.cacheSize);
  });
});
