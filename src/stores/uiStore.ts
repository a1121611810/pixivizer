import { createSignal, createEffect } from "solid-js";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import { setMaxCacheSize } from "../utils/imageLoader";
import { setPredictiveBackEnabled } from "../services/predictiveBack";

type Tab = "recommended" | "follow" | "bookmarks" | "me";
export type { Tab };
export type Theme = "dark" | "light";
export type ImageQuality = "medium" | "large" | "original";
export type CacheSize = number;

const [currentTab, setCurrentTab] = createSignal<Tab>("recommended");
const [theme, setTheme] = createSignal<Theme>("light");
const [showSettingsSheet, setShowSettingsSheet] = createSignal(false);
const [listQuality, setListQuality] = createSignal<ImageQuality>("medium");
const [detailQuality, setDetailQuality] = createSignal<ImageQuality>("medium");
const [cacheSize, setCacheSize] = createSignal<CacheSize>(600);

const PREF_KEY_USE_PREDICTIVE_BACK = "use_predictive_back";
const PREF_KEY_AUTO_HIDE_NAV_BAR = "auto_hide_nav_bar";
const PREF_KEY_SHOW_R18 = "show_r18";
const ANDROID_16_API_LEVEL = 36;

const [usePredictiveBack, setUsePredictiveBackSig] = createSignal<boolean>(false);
const [isPredictiveBackSupported, setIsPredictiveBackSupportedSig] = createSignal<boolean>(false);
const [autoHideNavBar, setAutoHideNavBarSig] = createSignal<boolean>(true);
const [showR18, setShowR18Sig] = createSignal<boolean>(true);

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

// Sync theme class to <html> whenever it changes
createEffect(() => {
  const root = document.documentElement;
  if (theme() === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
});

// Sync cache size limit to imageLoader whenever it changes
createEffect(() => {
  setMaxCacheSize(cacheSize());
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

export {
  currentTab,
  setCurrentTab,
  theme,
  setTheme,
  showSettingsSheet,
  setShowSettingsSheet,
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
};
