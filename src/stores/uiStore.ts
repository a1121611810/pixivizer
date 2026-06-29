import { createSignal, createEffect, createRoot } from "solid-js";
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

const [currentTab, setCurrentTab] = createSignal<Tab>("recommended");
const [theme, setTheme] = createSignal<Theme>("system");
const [showSettingsSheet, setShowSettingsSheet] = createSignal(false);
const [listQuality, setListQuality] = createSignal<ImageQuality>("medium");
const [detailQuality, setDetailQuality] = createSignal<ImageQuality>("medium");
const [cacheSize, setCacheSize] = createSignal<CacheSize>(600);
const [layoutMode, setLayoutModeSig] = createSignal<LayoutMode>("waterfall");

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
const ANDROID_16_API_LEVEL = 36;

const [usePredictiveBack, setUsePredictiveBackSig] = createSignal<boolean>(false);
const [isPredictiveBackSupported, setIsPredictiveBackSupportedSig] = createSignal<boolean>(false);
const [autoHideNavBar, setAutoHideNavBarSig] = createSignal<boolean>(true);
const [showR18, setShowR18Sig] = createSignal<boolean>(false);
const [showR18G, setShowR18GSig] = createSignal<boolean>(false);
const [showDetailStairs, setShowDetailStairsSig] = createSignal<boolean>(false);
const [ageConfirmed, setAgeConfirmedSig] = createSignal<boolean>(false);
const [isAdult, setIsAdultSig] = createSignal<boolean>(false);

const [autoCheckUpdateSig, setAutoCheckUpdateSig] = createSignal<boolean>(false);
const [hasUpdateSig, setHasUpdateSig] = createSignal<boolean>(false);
const [latestVersionSig, setLatestVersionSig] = createSignal<string>("");
const [latestReleaseUrlSig, setLatestReleaseUrlSig] = createSignal<string>("");
const [latestChangelogSig, setLatestChangelogSig] = createSignal<string>("");
const [isCheckingUpdateSig, setIsCheckingUpdateSig] = createSignal<boolean>(false);

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

async function loadPredictiveBackPreference(): Promise<void> {
  // 预测返回仅在 Android 原生层有意义，Web/iOS 直接保持未启用
  const platform = Capacitor.getPlatform();
  if (platform !== "android") {
    setUsePredictiveBackSig(false);
    setIsPredictiveBackSupportedSig(false);
    return;
  }

  try {
    const { androidSDKVersion } = await Device.getInfo();
    // Android 16 (API 36) 及以上才支持系统级预测返回手势
    const supported = androidSDKVersion != null && androidSDKVersion >= ANDROID_16_API_LEVEL;
    setIsPredictiveBackSupportedSig(supported);

    const { value } = await Preferences.get({ key: PREF_KEY_USE_PREDICTIVE_BACK });
    if (value !== null) {
      setUsePredictiveBackSig(value === "true");
    } else {
      // 首次启动无持久化值时，默认与系统支持情况保持一致
      setUsePredictiveBackSig(supported);
      await Preferences.set({ key: PREF_KEY_USE_PREDICTIVE_BACK, value: String(supported) });
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load predictive back preference", e);
    setUsePredictiveBackSig(false);
    setIsPredictiveBackSupportedSig(false);
  }

  await applyPredictiveBackState(usePredictiveBack());
}

async function setUsePredictiveBack(enabled: boolean): Promise<void> {
  // 非 Android 平台不调用原生返回处理，避免 unimplemented warning
  if (Capacitor.getPlatform() !== "android") return;

  const previous = usePredictiveBack();
  setUsePredictiveBackSig(enabled);

  try {
    await Preferences.set({ key: PREF_KEY_USE_PREDICTIVE_BACK, value: String(enabled) });
    await applyPredictiveBackState(enabled);
  } catch (e) {
    console.warn("[uiStore] Failed to apply predictive back state, reverting UI toggle", e);
    setUsePredictiveBackSig(previous);
    try {
      await applyPredictiveBackState(previous);
    } catch (rollbackErr) {
      console.warn("[uiStore] Failed to rollback predictive back native state", rollbackErr);
    }
  }
}

// ── 主题系统（浅色 / 深色 / 跟随系统）──

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

// resolvedTheme：实际生效的主题（用户选 system 时跟随 OS）
const [resolvedTheme, setResolvedTheme] = createSignal<"dark" | "light">(
  computeResolvedTheme(theme()),
);

// 监听系统主题变化，用户选 "system" 时自动跟随
try {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", () => {
    if (theme() === "system") {
      setResolvedTheme(getSystemTheme());
    }
  });
} catch {
  // 测试环境或 SSR 中 window.matchMedia 不可用，静默跳过
}

// Sync resolvedTheme 到 <html> class
createRoot(() => {
  createEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme() === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  });
});

// Sync cache size limit to imageLoader whenever it changes
createRoot(() => {
  createEffect(() => {
    setMaxCacheSize(cacheSize());
  });
});

async function setAutoHideNavBar(enabled: boolean): Promise<void> {
  setAutoHideNavBarSig(enabled);
  try {
    await Preferences.set({ key: PREF_KEY_AUTO_HIDE_NAV_BAR, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist autoHideNavBar", e);
  }
}

async function loadAutoHideNavBarPreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_AUTO_HIDE_NAV_BAR });
    if (value !== null) {
      setAutoHideNavBarSig(value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load autoHideNavBar preference", e);
  }
}

async function setShowR18(enabled: boolean): Promise<void> {
  setShowR18Sig(enabled);
  try {
    await Preferences.set({ key: PREF_KEY_SHOW_R18, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist showR18", e);
  }
  window.dispatchEvent(new CustomEvent("r18Changed"));
}

async function loadShowR18Preference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_SHOW_R18 });
    if (value !== null) {
      setShowR18Sig(value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load showR18 preference", e);
  }
}

async function setShowR18G(enabled: boolean): Promise<void> {
  setShowR18GSig(enabled);
  try {
    await Preferences.set({ key: PREF_KEY_SHOW_R18G, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist showR18G", e);
  }
  window.dispatchEvent(new CustomEvent("r18gChanged"));
}

async function setLayoutMode(mode: LayoutMode): Promise<void> {
  setLayoutModeSig(mode);
  try {
    await Preferences.set({ key: PREF_KEY_LAYOUT_MODE, value: mode });
  } catch (e) {
    console.warn("[uiStore] Failed to persist layoutMode", e);
  }
  window.dispatchEvent(new CustomEvent("layoutModeChanged"));
}

async function loadLayoutModePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_LAYOUT_MODE });
    if (value !== null && (value === "waterfall" || value === "single" || value === "grid")) {
      setLayoutModeSig(value as LayoutMode);
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load layoutMode preference", e);
  }
}

async function loadShowR18GPreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_SHOW_R18G });
    if (value !== null) {
      setShowR18GSig(value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load showR18G preference", e);
  }
}

async function loadAgePreference(): Promise<void> {
  try {
    const [{ value: confirmed }, { value: adult }] = await Promise.all([
      Preferences.get({ key: PREF_KEY_AGE_CONFIRMED }),
      Preferences.get({ key: PREF_KEY_IS_ADULT }),
    ]);
    if (confirmed !== null) {
      setAgeConfirmedSig(confirmed === "true");
    }
    if (adult !== null) {
      setIsAdultSig(adult === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load age preference", e);
  }

  // 如果用户不是成年人，强制关闭 R-18/R-18G 并持久化，防止持久化数据不一致时启动即展示成人内容
  if (!isAdult()) {
    await setShowR18(false);
    await setShowR18G(false);
  }
}

async function setAgeConfirmation(confirmed: boolean, adult: boolean): Promise<void> {
  setAgeConfirmedSig(confirmed);
  setIsAdultSig(adult);
  try {
    await Preferences.set({ key: PREF_KEY_AGE_CONFIRMED, value: String(confirmed) });
    await Preferences.set({ key: PREF_KEY_IS_ADULT, value: String(adult) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist age confirmation", e);
  }
  if (!adult) {
    // 未成年人自动关闭敏感内容开关
    await setShowR18(false);
    await setShowR18G(false);
  }
}

async function setShowDetailStairs(enabled: boolean): Promise<void> {
  setShowDetailStairsSig(enabled);
  try {
    await Preferences.set({ key: PREF_KEY_SHOW_DETAIL_STAIRS, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist showDetailStairs", e);
  }
}

async function loadShowDetailStairsPreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_SHOW_DETAIL_STAIRS });
    if (value !== null) {
      setShowDetailStairsSig(value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load showDetailStairs preference", e);
  }
}

async function setAutoCheckUpdate(enabled: boolean): Promise<void> {
  setAutoCheckUpdateSig(enabled);
  try {
    await Preferences.set({ key: PREF_KEY_AUTO_CHECK_UPDATE, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist autoCheckUpdate", e);
  }
}

async function loadAutoCheckUpdatePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_AUTO_CHECK_UPDATE });
    if (value !== null) {
      setAutoCheckUpdateSig(value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load autoCheckUpdate preference", e);
  }
}

// ── 主题持久化 ──

async function setThemePersisted(newTheme: Theme): Promise<void> {
  setTheme(newTheme);
  setResolvedTheme(computeResolvedTheme(newTheme));
  try {
    await Preferences.set({ key: PREF_KEY_THEME, value: newTheme });
    // 双写 localStorage 供防 FOUC 内联脚本使用
    localStorage.setItem(PREF_KEY_THEME, newTheme);
  } catch (e) {
    console.warn("[uiStore] Failed to persist theme", e);
  }
}

async function loadThemePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_THEME });
    const userTheme: Theme =
      value === "light" || value === "dark" || value === "system" ? value : "system";
    setTheme(userTheme);
    setResolvedTheme(computeResolvedTheme(userTheme));
  } catch (e) {
    console.warn("[uiStore] Failed to load theme preference", e);
    setResolvedTheme(getSystemTheme());
  }
}

/** 重置所有 UI 设置为默认值，并尽可能持久化。 */
export async function resetUiStore(): Promise<void> {
  await setThemePersisted("system");
  setListQuality("medium");
  setDetailQuality("medium");
  setCacheSize(600);
  await setAutoHideNavBar(true);
  await setShowR18(false);
  await setShowR18G(false);
  await setLayoutMode("waterfall");
  await setShowDetailStairs(false);
  await setAgeConfirmation(false, false);
  await setAutoCheckUpdate(false);
  if (Capacitor.getPlatform() === "android") {
    await setUsePredictiveBack(isPredictiveBackSupported());
  } else {
    setUsePredictiveBackSig(false);
  }
}

export {
  currentTab,
  setCurrentTab,
  theme,
  setTheme,
  resolvedTheme,
  setThemePersisted,
  loadThemePreference,
  showSettingsSheet,
  setShowSettingsSheet,
  layoutMode,
  setLayoutMode,
  loadLayoutModePreference,
  listQuality,
  setListQuality,
  detailQuality,
  setDetailQuality,
  cacheSize,
  setCacheSize,
  usePredictiveBack,
  setUsePredictiveBack,
  isPredictiveBackSupported,
  loadPredictiveBackPreference,
  autoHideNavBar,
  setAutoHideNavBar,
  loadAutoHideNavBarPreference,
  showR18,
  setShowR18,
  loadShowR18Preference,
  showR18G,
  setShowR18G,
  loadShowR18GPreference,
  showDetailStairs,
  setShowDetailStairs,
  loadShowDetailStairsPreference,
  ageConfirmed,
  isAdult,
  loadAgePreference,
  setAgeConfirmation,
  autoCheckUpdateSig as autoCheckUpdate,
  setAutoCheckUpdate,
  loadAutoCheckUpdatePreference,
  hasUpdateSig as hasUpdate,
  setHasUpdateSig as setHasUpdate,
  latestVersionSig as latestVersion,
  setLatestVersionSig as setLatestVersion,
  latestReleaseUrlSig as latestReleaseUrl,
  setLatestReleaseUrlSig as setLatestReleaseUrl,
  latestChangelogSig as latestChangelog,
  setLatestChangelogSig as setLatestChangelog,
  isCheckingUpdateSig as isCheckingUpdate,
  setIsCheckingUpdateSig as setIsCheckingUpdate,
};
