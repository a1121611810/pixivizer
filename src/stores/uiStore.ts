import { createSignal, createEffect } from "solid-js";
import { setMaxCacheSize } from "../utils/imageLoader";

type Tab = "recommended" | "follow" | "bookmarks";
export type { Tab };
export type Theme = "dark" | "light";
export type ImageQuality = "medium" | "large" | "original";
export type CacheSize = 200 | 400 | 600 | 1000;

const [currentTab, setCurrentTab] = createSignal<Tab>("recommended");
const [theme, setTheme] = createSignal<Theme>("light");
const [showSettingsSheet, setShowSettingsSheet] = createSignal(false);
const [listQuality, setListQuality] = createSignal<ImageQuality>("medium");
const [detailQuality, setDetailQuality] = createSignal<ImageQuality>("medium");
const [cacheSize, setCacheSize] = createSignal<CacheSize>(600);

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
};
