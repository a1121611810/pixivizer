import { createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { Preferences } from "@capacitor/preferences";

type Tab = "recommended" | "follow" | "bookmarks" | "me" | "history";
export type { Tab };
export type ContentType = "illust" | "novel";
export type Theme = "light" | "dark" | "system";
export type ImageQuality = "medium" | "large" | "original";
export type LayoutMode = "waterfall" | "single" | "grid";
export type NovelLayoutMode = "list" | "coverWall" | "textList";

/** 布局模式 → 列数映射 */
export const MODE_COLUMNS: Record<LayoutMode, number> = {
  waterfall: 2,
  single: 1,
  grid: 3,
};

const PREF_KEY_THEME = "theme";
const PREF_KEY_LAYOUT_MODE = "layout_mode";
const PREF_KEY_AUTO_HIDE_NAV_BAR = "auto_hide_nav_bar";
const PREF_KEY_SHOW_R18 = "show_r18";
const PREF_KEY_SHOW_R18G = "show_r18g";
const PREF_KEY_SHOW_DETAIL_STAIRS = "show_detail_stairs";
const PREF_KEY_AGE_CONFIRMED = "age_confirmed";
const PREF_KEY_IS_ADULT = "is_adult";
const PREF_KEY_AUTO_CHECK_UPDATE = "auto_check_update";
const PREF_KEY_USE_DNS_OVERRIDE = "use_dns_override";
const PREF_KEY_CONTENT_TYPE = "content_type";
const PREF_KEY_NOVEL_LAYOUT_MODE = "novel_layout_mode";
const PREF_KEY_IMAGE_CACHE_DISK = "image_cache_disk";
const PREF_KEY_IMAGE_CACHE_BROWSER = "image_cache_browser";
const PREF_KEY_IMAGE_CACHE_PREFETCH = "image_cache_prefetch";
const PREF_KEY_IMAGE_CACHE_DISK_SIZE = "image_cache_disk_size";
const PREF_KEY_DISMISSED_UPDATE_VERSION = "dismissed_update_version";

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

    // 内容类型
    contentType: "illust" as ContentType,

    // 主题
    theme: initialTheme,
    resolvedTheme: computeResolvedTheme(initialTheme) as "dark" | "light",

    // 布局
    layoutMode: "waterfall" as LayoutMode,
    novelLayoutMode: "list" as NovelLayoutMode,
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

    // 图片缓存三层开关（ADR-0003）
    // A: Java 磁盘缓存
    imageCacheDisk: true,
    // B: 浏览器缓存头
    imageCacheBrowser: true,
    // C: JS 预取
    imageCachePrefetch: true,
    // 单位 MB，范围 50～1000
    imageCacheDiskSize: 300,

    // 更新检测
    autoCheckUpdate: false,
    hasUpdate: false,
    latestVersion: "",
    latestReleaseUrl: "",
    latestChangelog: "",
    isCheckingUpdate: false,
    checkCompleted: false,
    lastDismissedVersion: "",
    showUpdateDialog: false,

    // 自定义 DNS 解析（实验性，仅 Android）
    useDnsOverride: false,
  };
};

const [state, setState] = createStore(initialState());

// ── 向后兼容的导出包装函数 ──
// 每个 getter 读取 store 中的对应属性，setter 更新 store 中的对应属性。

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
  } catch (error) {
    console.warn("[uiStore] Failed to persist theme", error);
  }
};


// ── 全局内容加载状态（控制 SearchFAB 等在加载时隐藏）
const [contentLoading, setContentLoading] = createSignal(false);
export const isContentLoading = () => contentLoading();
export const setContentLoadingState = (v: boolean) => setContentLoading(v);

export const layoutMode = () => state.layoutMode;
export const setLayoutMode = async (mode: LayoutMode): Promise<void> => {
  setState("layoutMode", mode);
  try {
    await Preferences.set({ key: PREF_KEY_LAYOUT_MODE, value: mode });
  } catch (error) {
    console.warn("[uiStore] Failed to persist layoutMode", error);
  }
  window.dispatchEvent(new CustomEvent("layoutModeChanged"));
};

export const novelLayoutMode = () => state.novelLayoutMode;

export const setNovelLayoutMode = async (mode: NovelLayoutMode): Promise<void> => {
  setState("novelLayoutMode", mode);
  try {
    await Preferences.set({ key: PREF_KEY_NOVEL_LAYOUT_MODE, value: mode });
  } catch (error) {
    console.warn("[uiStore] Failed to persist novelLayoutMode", error);
  }
  window.dispatchEvent(new CustomEvent("novelLayoutModeChanged"));
};

export const listQuality = () => state.listQuality;
export const setListQuality = (q: ImageQuality) => setState("listQuality", q);

export const detailQuality = () => state.detailQuality;
export const setDetailQuality = (q: ImageQuality) => setState("detailQuality", q);

// 图片缓存三层开关（ADR-0003）
export const imageCacheDisk = () => state.imageCacheDisk;
export const setImageCacheDisk = async (v: boolean): Promise<void> => {
  setState("imageCacheDisk", v);
  try {
    await Preferences.set({ key: PREF_KEY_IMAGE_CACHE_DISK, value: String(v) });
  } catch (error) {
    console.warn("[uiStore] Failed to persist imageCacheDisk", error);
  }
};
export const imageCacheBrowser = () => state.imageCacheBrowser;
export const setImageCacheBrowser = async (v: boolean): Promise<void> => {
  setState("imageCacheBrowser", v);
  try {
    await Preferences.set({ key: PREF_KEY_IMAGE_CACHE_BROWSER, value: String(v) });
  } catch (error) {
    console.warn("[uiStore] Failed to persist imageCacheBrowser", error);
  }
};
export const imageCachePrefetch = () => state.imageCachePrefetch;
export const setImageCachePrefetch = async (v: boolean): Promise<void> => {
  setState("imageCachePrefetch", v);
  try {
    await Preferences.set({ key: PREF_KEY_IMAGE_CACHE_PREFETCH, value: String(v) });
  } catch (error) {
    console.warn("[uiStore] Failed to persist imageCachePrefetch", error);
  }
};

export const imageCacheDiskSize = () => state.imageCacheDiskSize;

export const setImageCacheDiskSize = async (v: number): Promise<void> => {
  const clamped = Math.max(50, Math.min(1000, Math.round(v / 50) * 50));
  setState("imageCacheDiskSize", clamped);
  try {
    await Preferences.set({ key: PREF_KEY_IMAGE_CACHE_DISK_SIZE, value: String(clamped) });
  } catch (error) {
    console.warn("[uiStore] Failed to persist imageCacheDiskSize", error);
  }
};

export async function loadImageCachePrefs(): Promise<void> {
  try {
    const disk = await Preferences.get({ key: PREF_KEY_IMAGE_CACHE_DISK });
    if (disk.value !== null) {
      setState("imageCacheDisk", disk.value === "true");
    }
    const browser = await Preferences.get({ key: PREF_KEY_IMAGE_CACHE_BROWSER });
    if (browser.value !== null) {
      setState("imageCacheBrowser", browser.value === "true");
    }
    const prefetch = await Preferences.get({ key: PREF_KEY_IMAGE_CACHE_PREFETCH });
    if (prefetch.value !== null) {
      setState("imageCachePrefetch", prefetch.value === "true");
    }
    const size = await Preferences.get({ key: PREF_KEY_IMAGE_CACHE_DISK_SIZE });
    if (size.value !== null) {
      setState("imageCacheDiskSize", parseInt(size.value, 10));
    }
  } catch (error) {
    console.warn("[uiStore] Failed to load image cache prefs", error);
  }
}

// ── 自动隐藏导航 ──

export const autoHideNavBar = () => state.autoHideNavBar;

export async function setAutoHideNavBar(enabled: boolean): Promise<void> {
  setState("autoHideNavBar", enabled);
  try {
    await Preferences.set({ key: PREF_KEY_AUTO_HIDE_NAV_BAR, value: String(enabled) });
  } catch (error) {
    console.warn("[uiStore] Failed to persist autoHideNavBar", error);
  }
}

export async function loadAutoHideNavBarPreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_AUTO_HIDE_NAV_BAR });
    if (value !== null) {
      setState("autoHideNavBar", value === "true");
    }
  } catch (error) {
    console.warn("[uiStore] Failed to load autoHideNavBar preference", error);
  }
}

// ── R-18 / R-18G 过滤 ──

export const showR18 = () => state.showR18;

export async function setShowR18(enabled: boolean): Promise<void> {
  setState("showR18", enabled);
  try {
    await Preferences.set({ key: PREF_KEY_SHOW_R18, value: String(enabled) });
  } catch (error) {
    console.warn("[uiStore] Failed to persist showR18", error);
  }
  window.dispatchEvent(new CustomEvent("r18Changed"));
}

export async function loadShowR18Preference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_SHOW_R18 });
    if (value !== null) {
      setState("showR18", value === "true");
    }
  } catch (error) {
    console.warn("[uiStore] Failed to load showR18 preference", error);
  }
}

export const showR18G = () => state.showR18G;

export async function setShowR18G(enabled: boolean): Promise<void> {
  setState("showR18G", enabled);
  try {
    await Preferences.set({ key: PREF_KEY_SHOW_R18G, value: String(enabled) });
  } catch (error) {
    console.warn("[uiStore] Failed to persist showR18G", error);
  }
  window.dispatchEvent(new CustomEvent("r18gChanged"));
}

export async function loadShowR18GPreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_SHOW_R18G });
    if (value !== null) {
      setState("showR18G", value === "true");
    }
  } catch (error) {
    console.warn("[uiStore] Failed to load showR18G preference", error);
  }
}

// ── 布局模式持久化 ──

export async function loadLayoutModePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_LAYOUT_MODE });
    if (value !== null && (value === "waterfall" || value === "single" || value === "grid")) {
      setState("layoutMode", value as LayoutMode);
    }
  } catch (error) {
    console.warn("[uiStore] Failed to load layoutMode preference", error);
  }
}

export async function loadNovelLayoutModePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_NOVEL_LAYOUT_MODE });
    if (value !== null && (value === "list" || value === "coverWall" || value === "textList")) {
      setState("novelLayoutMode", value as NovelLayoutMode);
    }
  } catch (error) {
    console.warn("[uiStore] Failed to load novelLayoutMode preference", error);
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
        if (confirmed !== null) {
          s.ageConfirmed = confirmed === "true";
        }
        if (adult !== null) {
          s.isAdult = adult === "true";
        }
      }),
    );
  } catch (error) {
    console.warn("[uiStore] Failed to load age preference", error);
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
  } catch (error) {
    console.warn("[uiStore] Failed to persist age confirmation", error);
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
  } catch (error) {
    console.warn("[uiStore] Failed to persist showDetailStairs", error);
  }
}

export async function loadShowDetailStairsPreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_SHOW_DETAIL_STAIRS });
    if (value !== null) {
      setState("showDetailStairs", value === "true");
    }
  } catch (error) {
    console.warn("[uiStore] Failed to load showDetailStairs preference", error);
  }
}

// ── 更新检测 ──

export const autoCheckUpdate = () => state.autoCheckUpdate;

export async function setAutoCheckUpdate(enabled: boolean): Promise<void> {
  setState("autoCheckUpdate", enabled);
  try {
    await Preferences.set({ key: PREF_KEY_AUTO_CHECK_UPDATE, value: String(enabled) });
  } catch (error) {
    console.warn("[uiStore] Failed to persist autoCheckUpdate", error);
  }
}

export async function loadAutoCheckUpdatePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_AUTO_CHECK_UPDATE });
    if (value !== null) {
      setState("autoCheckUpdate", value === "true");
    }
  } catch (error) {
    console.warn("[uiStore] Failed to load autoCheckUpdate preference", error);
  }
}

export const lastDismissedVersion = () => state.lastDismissedVersion;

export async function setLastDismissedVersion(v: string): Promise<void> {
  setState("lastDismissedVersion", v);
  try {
    await Preferences.set({ key: PREF_KEY_DISMISSED_UPDATE_VERSION, value: v });
  } catch (error) {
    console.warn("[uiStore] Failed to persist dismissed update version", error);
  }
}

export async function loadLastDismissedVersionPreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_DISMISSED_UPDATE_VERSION });
    if (value !== null) {
      setState("lastDismissedVersion", value);
    }
  } catch (error) {
    console.warn("[uiStore] Failed to load dismissed update version preference", error);
  }
}

export const showUpdateDialog = () => state.showUpdateDialog;
export const setShowUpdateDialog = (v: boolean) => setState("showUpdateDialog", v);

export const useDnsOverride = () => state.useDnsOverride;
export async function setUseDnsOverride(enabled: boolean): Promise<void> {
  setState("useDnsOverride", enabled);
  try {
    await Preferences.set({ key: PREF_KEY_USE_DNS_OVERRIDE, value: String(enabled) });
  } catch (error) {
    console.warn("[uiStore] Failed to persist useDnsOverride", error);
  }
}

export async function loadUseDnsOverridePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_USE_DNS_OVERRIDE });
    if (value !== null) {
      setState("useDnsOverride", value === "true");
    }
  } catch (error) {
    console.warn("[uiStore] Failed to load useDnsOverride preference", error);
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
  } catch (error) {
    console.warn("[uiStore] Failed to load theme preference", error);
    setState("resolvedTheme", getSystemTheme());
  }
}

/** 重置所有 UI 设置为默认值，并尽可能持久化。 */
export async function resetUiStore(): Promise<void> {
  await setThemePersisted("system");
  setState("listQuality", "medium");
  setState("detailQuality", "medium");
  await setAutoHideNavBar(true);
  await setImageCacheDisk(true);
  await setImageCacheBrowser(true);
  await setImageCachePrefetch(true);
  await setImageCacheDiskSize(300);
  await setShowR18(false);
  await setShowR18G(false);
  await setLayoutMode("waterfall");
  await setNovelLayoutMode("list");
  await setShowDetailStairs(false);
  await setAgeConfirmation(false, false);
  await setAutoCheckUpdate(false);
  await setLastDismissedVersion("");
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
