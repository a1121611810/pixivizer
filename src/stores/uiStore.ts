import { createSignal, createEffect } from "solid-js";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import { setMaxCacheSize } from "../utils/imageLoader";

type Tab = "recommended" | "follow" | "bookmarks";
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
const ANDROID_16_API_LEVEL = 36;

const [usePredictiveBack, setUsePredictiveBackSig] = createSignal<boolean>(false);
const [isPredictiveBackSupported, setIsPredictiveBackSupportedSig] = createSignal<boolean>(false);

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
      return;
    }

    // 首次启动无持久化值时，默认与系统支持情况保持一致
    setUsePredictiveBackSig(supported);
    await Preferences.set({ key: PREF_KEY_USE_PREDICTIVE_BACK, value: String(supported) });
  } catch (e) {
    console.warn("[uiStore] Failed to load predictive back preference", e);
    setUsePredictiveBackSig(false);
    setIsPredictiveBackSupportedSig(false);
  }
}

async function setUsePredictiveBack(enabled: boolean): Promise<void> {
  // 非 Android 平台不调用原生返回处理，避免 unimplemented warning
  if (Capacitor.getPlatform() !== "android") return;

  setUsePredictiveBackSig(enabled);

  try {
    await Preferences.set({ key: PREF_KEY_USE_PREDICTIVE_BACK, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to save predictive back preference", e);
  }

  try {
    // 开启预测返回时，需要关闭 Capacitor 对返回键的默认拦截，让系统手势接管
    await App.toggleBackButtonHandler({ enabled: !enabled });
  } catch (e) {
    console.warn("[uiStore] Failed to toggle back button handler", e);
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

// Log tab changes for debugging
createEffect(() => {});

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
};
