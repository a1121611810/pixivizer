import { type Component, Show, createSignal, createEffect, onCleanup } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import FluentIcon from "./ui/FluentIcon";
import { pushOverlay, popOverlay } from "../stores/backGestureStore";
import {
  showSettingsDrawer,
  closeSettingsDrawer,
  theme,
  resolvedTheme,
  setThemePersisted,
  type Theme,
  listQuality,
  setListQuality,
  detailQuality,
  setDetailQuality,
  type ImageQuality,
  showR18,
  setShowR18,
  showR18G,
  setShowR18G,
  ageConfirmed,
  isAdult,
  setAgeConfirmation,
  autoCheckUpdate,
  hasUpdate,
  isCheckingUpdate,
  latestVersion,
  checkCompleted,
  setAutoCheckUpdate,
  setHasUpdate,
  setIsCheckingUpdate,
  setLatestReleaseUrl,
  setLatestVersion,
  setCheckCompleted,
  resetUiStore,
  useDnsOverride,
  setUseDnsOverride,
} from "../stores/uiStore";
import { isLoggedIn, logout, user } from "../stores/authStore";
import { clearImageCache, resolveImageUrl, loadImage } from "../utils/imageLoader";
import { resetBlockedIds } from "../stores/blockStore";
import { clearAll as clearNovelCache } from "../stores/novelCache";
import { resetReportedIds } from "../stores/reportStore";
import { profile, loadProfile } from "../stores/userStore";
import BlocklistSheet from "./BlocklistSheet";
import { checkForUpdate } from "../services/updateService";
import { imageHostState, setMasterEnabled, modeLabel } from "../stores/imageHostStore";
import ThemeSelector from "./ThemeSelector";
import { colorTheme } from "@/stores/themeStore";

function handleThemeChange(newTheme: Theme) {
  setThemePersisted(newTheme);
}

async function handleCheckUpdate() {
  if (isCheckingUpdate()) {
    return;
  }
  setIsCheckingUpdate(true);
  const result = await checkForUpdate();
  setHasUpdate(result.hasUpdate);
  setLatestVersion(result.latestVersion);
  setLatestReleaseUrl(result.latestReleaseUrl);
  setIsCheckingUpdate(false);
  setCheckCompleted(true);
  if (result.hasUpdate && result.latestReleaseUrl) {
    window.open(result.latestReleaseUrl, "_blank", "noopener,noreferrer");
  }
}

function openDeleteAccountPage() {
  // TODO: Install @capacitor/browser and use Browser.open({ url }) for a native in-app/system browser experience.
  window.open("https://www.pixiv.net/leave.php", "_blank", "noopener,noreferrer");
}

function fmtNum(n: number | undefined): string {
  if (n == null) {
    return "—";
  }
  if (n >= 10_000) {
    return `${(n / 10_000).toFixed(1)}万`;
  }
  return String(n);
}

function AvatarFallback(props: { class?: string }) {
  return (
    <div
      class={`flex items-center justify-center bg-[var(--colorNeutralBackground2)] ${props.class || ""}`}
    >
      <svg
        width="60%"
        height="60%"
        viewBox="0 0 24 24"
        fill="none"
        class="text-[var(--colorNeutralForegroundDisabled)]"
      >
        <circle cx="12" cy="8" r="4" fill="currentColor" />
        <path d="M5 21c0-4 3.1-7 7-7s7 3 7 7" fill="currentColor" />
      </svg>
    </div>
  );
}

const SettingsDrawer: Component = () => {
  const navigate = useNavigate();
  const [ageGateMessage, setAgeGateMessage] = createSignal<string | null>(null);
  const [showBlocklist, setShowBlocklist] = createSignal(false);
  const [actionToast, setActionToast] = createSignal<string | null>(null);
  const [profileError, setProfileError] = createSignal(false);
  const isNative = Capacitor.isNativePlatform();
  const [settingsAvatarUrl, setSettingsAvatarUrl] = createSignal("");
  const [settingsAvatarErrored, setSettingsAvatarErrored] = createSignal(false);

  createEffect(() => {
    const u = user();
    if (!u) {
      setSettingsAvatarUrl("");
      return;
    }
    const src =
      u.profile_image_urls.medium ||
      u.profile_image_urls.px_170x170 ||
      u.profile_image_urls.px_50x50 ||
      "";
    console.log(
      src,
      !!u.profile_image_urls.medium,
      !!u.profile_image_urls.px_170x170,
      !!u.profile_image_urls.px_50x50,
    );
    if (!src) {
      setSettingsAvatarUrl("");
      return;
    }
    if (isNative) {
      loadImage(src)
        .then((r) => {
          setSettingsAvatarUrl(r.url);
        })
        .catch((err) => {});
    } else {
      const url = resolveImageUrl(src);
      setSettingsAvatarUrl(url);
    }
  });
  const [dialogState, setDialogState] = createSignal<
    { type: "clear" } | { type: "deleteAccount" } | null
  >(null);

  function reconfirmAge() {
    setAgeConfirmation(false, false);
    void navigate({ to: "/age-confirmation", search: { reconfirm: "true" } });
  }

  // Auto-hide the age gate hint toast
  createEffect(() => {
    if (ageGateMessage()) {
      const timer = setTimeout(() => setAgeGateMessage(null), 2500);
      onCleanup(() => clearTimeout(timer));
    }
  });

  // Auto-hide action toast
  createEffect(() => {
    if (actionToast()) {
      const timer = setTimeout(() => setActionToast(null), 2500);
      onCleanup(() => clearTimeout(timer));
    }
  });

  async function handleLogout() {
    try {
      await logout();
      closeSettingsDrawer();
      void navigate({ to: "/login", replace: true });
      setActionToast("已退出登录");
    } catch {
      setActionToast("退出登录失败");
    }
  }

  async function handleClearLocalData() {
    try {
      await logout();
      clearImageCache();
      await clearNovelCache();
      resetBlockedIds();
      resetReportedIds();
      await Preferences.clear();
      await resetUiStore();
      closeSettingsDrawer();
      void navigate({ to: "/login", replace: true });
      setActionToast("本地数据已清除");
    } catch {
      setActionToast("清除失败，请重试");
    } finally {
      closeSettingsDrawer();
    }
  }

  function requireAdult(action: () => void) {
    if (!isAdult()) {
      setAgeGateMessage("请先确认已满 18 岁");
      return;
    }
    action();
  }

  // SettingsDrawer 打开时压入 overlay 栈，关闭时弹出；同步关闭嵌套的 BlocklistSheet
  createEffect(() => {
    if (showSettingsDrawer()) {
      setProfileError(false);
      // 利用缓存，几乎零成本
      loadProfile().catch(() => setProfileError(true));
      pushOverlay("settingsDrawer", closeSettingsDrawer);

      onCleanup(() => {
        setShowBlocklist(false);
        popOverlay("settingsDrawer");
      });
    }
  });

  // BlocklistSheet 打开时压入 overlay 栈，确保返回键先关闭子面板
  createEffect(() => {
    if (showBlocklist()) {
      pushOverlay("blocklistSheet", () => setShowBlocklist(false));
      onCleanup(() => {
        popOverlay("blocklistSheet");
      });
    }
  });

  // Close Drawer時清理狀態
  createEffect(() => {
    if (!showSettingsDrawer()) {
      setDialogState(null);
      setAgeGateMessage(null);
      setActionToast(null);
    }
  });

  // Drawer 控制器 — fluent-drawer 使用 show()/hide() 方法，不支持 open 属性
  createEffect(() => {
    const drawerEl = document.querySelector("fluent-drawer");
    if (!drawerEl) {
      return;
    }
    if (showSettingsDrawer()) {
      drawerEl.show();
    } else {
      drawerEl.hide();
    }
  });

  return (
    <>
      {/* Age gate hint toast */}
      <Show when={ageGateMessage()}>
        <fluent-message-bar
          intent="warning"
          style="position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:60;pointer-events:none"
        >
          {ageGateMessage()}
        </fluent-message-bar>
      </Show>

      {/* Action success toast */}
      <Show when={actionToast()}>
        <fluent-message-bar
          intent="success"
          style="position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:60;pointer-events:none"
        >
          {actionToast()}
        </fluent-message-bar>
      </Show>

      <fluent-drawer
        type="modal"
        position="start"
        on:toggle={(e: CustomEvent) => {
          if (e.detail?.newState === "closed") {
            closeSettingsDrawer();
          }
        }}
      >
        {/* ════════════════════════════════════════════ */}
        {/* Drawer Header */}
        {/* ════════════════════════════════════════════ */}
        <div class="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
            设置
          </h2>
          <fluent-button
            appearance="subtle"
            aria-label="关闭设置"
            on:click={closeSettingsDrawer}
            style="min-width:32px;width:32px;height:32px;padding:0"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M15.14 4.86a.67.67 0 0 0-.95 0L10 9.05 5.81 4.86a.67.67 0 0 0-.95.95L9.05 10l-4.19 4.19a.67.67 0 0 0 .95.95L10 10.95l4.19 4.19a.67.67 0 0 0 .95-.95L10.95 10l4.19-4.19a.67.67 0 0 0 0-.95z"
                fill="currentColor"
              />
            </svg>
          </fluent-button>
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* 个人概要区 */}
        {/* ════════════════════════════════════════════ */}
        <Show when={user()}>
          <div class="flex flex-col items-center px-5 pt-4 pb-3">
            {/* Avatar */}
            <div class="relative w-20 h-20">
              <AvatarFallback class="absolute inset-0 rounded-[var(--borderRadiusCircular)] ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]" />
              <Show when={!settingsAvatarErrored() && settingsAvatarUrl()}>
                <img
                  src={settingsAvatarUrl()}
                  alt={user()!.name}
                  class="absolute inset-0 w-full h-full rounded-[var(--borderRadiusCircular)] object-cover ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]"
                  onError={() => setSettingsAvatarErrored(true)}
                />
              </Show>
            </div>
            {/* Name */}
            <h2 class="mt-2 [font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
              {user()!.name}
            </h2>
            {/* Account */}
            <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
              @{user()!.account}
            </p>
            {/* Stats card — 仅 profile 加载成功后显示 */}
            <Show when={profile()}>
              <div class="w-full mt-3 surface-card rounded-[var(--borderRadiusMedium)] px-4 py-3 flex">
                {/* 作品 */}
                <div
                  class="flex-1 text-center cursor-pointer rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
                  onClick={() => {
                    closeSettingsDrawer();
                    void navigate({ to: `/user/${user()!.id}/illusts` });
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="查看作品"
                >
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    {fmtNum(
                      (profile()?.total_illusts ?? 0) +
                        (profile()?.total_manga ?? 0) +
                        (profile()?.total_novels ?? 0),
                    )}
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    作品
                  </p>
                </div>
                {/* 关注 */}
                <div
                  class="flex-1 text-center cursor-pointer rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
                  onClick={() => {
                    closeSettingsDrawer();
                    void navigate({ to: `/user/${user()!.id}/following` });
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="查看关注"
                >
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    {fmtNum(profile()?.total_follow_users)}
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    关注
                  </p>
                </div>
                {/* 粉丝 */}
                <div
                  class="flex-1 text-center cursor-pointer rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
                  onClick={() => {
                    closeSettingsDrawer();
                    void navigate({ to: `/user/${user()!.id}/followers` });
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="查看粉丝"
                >
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    {fmtNum(profile()?.total_mypixiv_users)}
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    粉丝
                  </p>
                </div>
              </div>
            </Show>
            {/* 数据未加载时显示占位骨架 */}
            <Show when={!profile() && !profileError() && user()}>
              <div class="w-full mt-3 surface-card rounded-[var(--borderRadiusMedium)] px-4 py-3 flex">
                <div class="flex-1 text-center">
                  <div class="h-5 w-10 bg-[var(--colorNeutralBackground2)] rounded mx-auto" />
                  <div class="h-3 w-6 bg-[var(--colorNeutralBackground2)] rounded mx-auto mt-1" />
                </div>
                <div class="flex-1 text-center">
                  <div class="h-5 w-10 bg-[var(--colorNeutralBackground2)] rounded mx-auto" />
                  <div class="h-3 w-6 bg-[var(--colorNeutralBackground2)] rounded mx-auto mt-1" />
                </div>
                <div class="flex-1 text-center">
                  <div class="h-5 w-10 bg-[var(--colorNeutralBackground2)] rounded mx-auto" />
                  <div class="h-3 w-6 bg-[var(--colorNeutralBackground2)] rounded mx-auto mt-1" />
                </div>
              </div>
            </Show>
            {/* 数据加载失败时显示占位 */}
            <Show when={profileError() && user()}>
              <div class="w-full mt-3 surface-card rounded-[var(--borderRadiusMedium)] px-4 py-3 flex">
                <div class="flex-1 text-center">
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    —
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    作品
                  </p>
                </div>
                <div class="flex-1 text-center">
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    —
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    关注
                  </p>
                </div>
                <div class="flex-1 text-center">
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    —
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    粉丝
                  </p>
                </div>
              </div>
            </Show>
          </div>
        </Show>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第1组：显示与交互 */}
        {/* ════════════════════════════════════════════ */}
        <div class="px-5 py-3 flex flex-col">
          <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
            显示与交互
          </p>

          {/* Theme picker row — 仅 Fluent 默认主题支持明暗切换 */}
          <Show when={colorTheme() === "fluent"}>
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0">
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: resolvedTheme() === "dark" ? 0 : 1,
                      transition: "opacity var(--durationFast) var(--curveEasyEase)",
                    }}
                  >
                    <FluentIcon name="weatherSunny" size={24} active />
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: resolvedTheme() === "dark" ? 1 : 0,
                      transition: "opacity var(--durationFast) var(--curveEasyEase)",
                    }}
                  >
                    <FluentIcon name="weatherMoon" size={24} active />
                  </div>
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    明暗主题
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    {theme() === "light"
                      ? "始终浅色"
                      : theme() === "dark"
                        ? "始终深色"
                        : "跟随系统"}
                  </p>
                </div>
              </div>

              {/* Three-segment theme selector */}
              <div class="flex rounded-[var(--borderRadiusCircular)] overflow-hidden border border-[var(--colorNeutralStroke2)]">
                {(["light", "system", "dark"] as const).map((t) => (
                  <button
                    onClick={() => handleThemeChange(t)}
                    class={`px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--durationNormal)] ${
                      theme() === t
                        ? "bg-[var(--colorCompoundBrandBackground)] text-white"
                        : "bg-transparent text-[var(--colorNeutralForeground2)] hover:text-[var(--colorNeutralForeground1)]"
                    }`}
                    aria-label={t === "light" ? "浅色" : t === "dark" ? "深色" : "跟随系统"}
                  >
                    {t === "light" ? "☀️ 浅色" : t === "dark" ? "🌙 深色" : "🔄 跟随"}
                  </button>
                ))}
              </div>
            </div>
          </Show>

          {/* Color theme selector */}
          <div class="py-3">
            <div class="flex items-center gap-2 mb-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                class="text-[var(--colorNeutralForeground2)] flex-shrink-0"
              >
                <path
                  d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM7.75 9a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5zM7 12.75a.75.75 0 0 0 .75.75h8.5a.75.75 0 0 0 0-1.5h-8.5a.75.75 0 0 0-.75.75zM7.75 16a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5z"
                  fill="currentColor"
                />
              </svg>
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                颜色主题
              </p>
            </div>
            <ThemeSelector />
            <p class="mt-2 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
              选择应用整体配色；Fluent 默认支持明暗切换，其他主题为单模式
            </p>
          </div>

          {/* 布局设置入口 — 点击进入独立页面 */}
          <div
            class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
            onClick={() => {
              closeSettingsDrawer();
              void navigate({ to: "/layout-settings" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                closeSettingsDrawer();
                void navigate({ to: "/layout-settings" });
              }
            }}
            role="button"
            tabindex="0"
            aria-label="布局设置"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M3 6.25A3.25 3.25 0 0 1 6.25 3h11.5A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25zM6.25 4.5A1.75 1.75 0 0 0 4.5 6.25V9h2.25V5.25A1.72 1.72 0 0 0 6.25 4.5zM4.5 10.5v3h3v-3h-3zm4.5 0v3h3.75v-3H9zm5.25 0v3h3.75v-3h-3zm3.75-1.5h-3.75V5.25c.455 0 .873.173 1.188.48l.012.012.018.018c.315.315.506.735.532 1.19V9zm-5.25 0H9V5.25h3.75V9zm-8.25 6v2.75c0 .966.784 1.75 1.75 1.75h.5V15H4.5zm3.75 0v4.5H9V15H8.25zm5.25 0v4.5h.75V15h-.75zm5.25 0v4.5h.5a1.75 1.75 0 0 0 1.75-1.75V15h-2.25z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div class="min-w-0">
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  布局设置
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  插画/小说布局模式、楼梯导航、自动隐藏导航栏
                </p>
              </div>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              class="flex-shrink-0 text-[var(--colorNeutralForeground3)] ml-2"
            >
              <path
                d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第2组：内容与过滤 */}
        {/* ════════════════════════════════════════════ */}
        <div class="px-5 py-3 flex flex-col">
          <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
            内容与过滤
          </p>

          {/* 显示 R18 内容开关行 */}
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6.25 3A3.25 3.25 0 0 0 3 6.25v11.5A3.25 3.25 0 0 0 6.25 21h11.5A3.25 3.25 0 0 0 21 17.75V6.25A3.25 3.25 0 0 0 17.75 3H6.25zm0 1.5h11.5a1.75 1.75 0 0 1 1.75 1.75v11.5c0 .966-.784 1.75-1.75 1.75H6.25a1.75 1.75 0 0 1-1.75-1.75V6.25c0-.966.784-1.75 1.75-1.75zM7 8.75A1.75 1.75 0 0 1 8.75 7h.084A1.75 1.75 0 0 1 10.5 8.84v.33a1.75 1.75 0 0 1-1.75 1.75l-.084-.001A1.75 1.75 0 0 1 7 9.08V8.75zm6.5 0A1.75 1.75 0 0 1 15.25 7h.084A1.75 1.75 0 0 1 17 8.84v.33a1.75 1.75 0 0 1-1.75 1.75l-.084-.001A1.75 1.75 0 0 1 13.5 9.08V8.75zM8.724 15.5a.75.75 0 0 0 0 1.5h6.552a.75.75 0 0 0 0-1.5H8.724z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  显示 R18 内容
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  关闭后列表中不展示敏感内容，需刷新列表生效
                </p>
              </div>
            </div>

            <fluent-switch
              checked={showR18()}
              on:change={() => requireAdult(() => setShowR18(!showR18()))}
              aria-label="显示 R18 内容"
            />
          </div>

          {/* 显示 R-18G 内容开关行 */}
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M10.82 2.001a1.752 1.752 0 0 1 2.36 0c.53.47 6.07 5.42 8.587 11.508.168.405.233.815.233 1.211a4.751 4.751 0 0 1-4.755 4.752 4.4 4.4 0 0 1-1.77-.427L15.5 19c-3.428 0-5.26 0-7-.027a4.753 4.753 0 0 1-4.727-4.725c0-.397.065-.807.233-1.211C6.525 7.422 12.065 2.472 12.595 2l.005.005L10.82 2zm1.18 1.44c-.26.28-5.643 5.058-8.065 10.798a3.28 3.28 0 0 0-.185.796 3.253 3.253 0 0 0 3.24 3.222c1.678.026 3.412.027 6.76.027h.225c.236 0 .473.07.675.2l.022.014a2.9 2.9 0 0 0 1.163.277 3.251 3.251 0 0 0 3.188-2.538c.031-.22.049-.443.052-.667v-.048a3.25 3.25 0 0 0-.157-.813C16.846 8.498 11.463 3.72 11.2 3.44L12 2.64l-.8.8h.001zM12 8.001a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  显示 R-18G 内容
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  关闭后列表中不展示猎奇内容，需刷新列表生效
                </p>
              </div>
            </div>

            <fluent-switch
              checked={showR18G()}
              on:change={() => requireAdult(() => setShowR18G(!showR18G()))}
              aria-label="显示 R-18G 内容"
            />
          </div>

          {/* 重新确认年龄 */}
          <Show when={ageConfirmed()}>
            <div class="flex items-center justify-between py-2">
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm0 4.5a.75.75 0 0 1 .75.75v4.19l2.47 2.47a.75.75 0 0 1-1.06 1.06l-2.72-2.72a.75.75 0 0 1-.22-.53V8.75a.75.75 0 0 1 .75-.75z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    重新确认年龄
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    点击后重新进入年龄确认页面
                  </p>
                </div>
              </div>

              <fluent-button appearance="secondary" on:click={reconfirmAge}>
                重新确认
              </fluent-button>
            </div>
          </Show>

          {/* 管理屏蔽列表 */}
          <div
            class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
            onClick={() => setShowBlocklist(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowBlocklist(true);
              }
            }}
            role="button"
            tabindex="0"
            aria-label="管理屏蔽列表"
          >
            <div class="flex items-center gap-3">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm4.25 6.25a.75.75 0 0 1 0 1.06l-8.5 8.5a.75.75 0 1 1-1.06-1.06l8.5-8.5a.75.75 0 0 1 1.06 0z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  管理屏蔽列表
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  查看或解除已屏蔽的作者
                </p>
              </div>
            </div>
            {/* Chevron right */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              class="flex-shrink-0 text-[var(--colorNeutralForeground3)] ml-2"
            >
              <path
                d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第3组：图片与网络 */}
        {/* ════════════════════════════════════════════ */}
        <div class="px-5 py-3 flex flex-col">
          <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
            图片与网络
          </p>

          {/* List image quality */}
          <div class="py-2">
            <div class="flex items-center gap-2 mb-2">
              <FluentIcon name="image" size={20} />
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                列表画质
              </p>
            </div>
            <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
              {(["medium", "large"] as ImageQuality[]).map((q) => (
                <button
                  class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                  classList={{
                    "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                      listQuality() === q,
                    "bg-transparent text-[var(--colorNeutralForeground2)]": listQuality() !== q,
                  }}
                  onClick={() => setListQuality(q)}
                >
                  {q === "medium" ? "默认" : "高清"}
                </button>
              ))}
            </div>
          </div>

          {/* Detail image quality */}
          <div class="py-2">
            <div class="flex items-center gap-2 mb-2">
              <FluentIcon name="imageSearch" size={20} />
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                详情画质
              </p>
            </div>
            <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
              {(["medium", "large", "original"] as ImageQuality[]).map((q) => (
                <button
                  class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                  classList={{
                    "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                      detailQuality() === q,
                    "bg-transparent text-[var(--colorNeutralForeground2)]": detailQuality() !== q,
                  }}
                  onClick={() => setDetailQuality(q)}
                >
                  {q === "medium" ? "默认" : q === "large" ? "高清" : "原图"}
                </button>
              ))}
            </div>
          </div>

          {/* Image cache management entry */}
          <div
            class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
            onClick={() => {
              closeSettingsDrawer();
              void navigate({ to: "/image-cache" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                closeSettingsDrawer();
                void navigate({ to: "/image-cache" });
              }
            }}
            role="button"
            tabindex="0"
            aria-label="图片缓存"
          >
            <div class="flex items-center gap-3">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                <FluentIcon name="server" size={24} />
              </div>
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                图片缓存
              </p>
            </div>
            <span class="text-[var(--colorNeutralForeground3)] ml-2">→</span>
          </div>

          {/* 图床代理入口 */}
          <div
            class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
            onClick={() => {
              closeSettingsDrawer();
              void navigate({ to: "/image-host" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                closeSettingsDrawer();
                void navigate({ to: "/image-host" });
              }
            }}
            role="button"
            tabindex="0"
            aria-label="图床代理"
          >
            <div class="flex items-center gap-3">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                <FluentIcon name="image" size={24} />
              </div>
              <div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  图床代理
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  {imageHostState().masterEnabled
                    ? `${modeLabel(imageHostState().mode)} · ${imageHostState().hosts.filter((h) => h.enabled).length} 个图床`
                    : "使用默认代理"}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0 ml-3">
              <fluent-switch
                checked={imageHostState().masterEnabled}
                on:change={() => {
                  if (!imageHostState().masterEnabled) {
                    closeSettingsDrawer();
                    void navigate({ to: "/image-host" });
                  } else {
                    setMasterEnabled(false);
                  }
                }}
                aria-label="启用图床代理"
                onClick={(e: MouseEvent) => e.stopPropagation()}
              />
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                class="text-[var(--colorNeutralForeground3)]"
              >
                <path
                  d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>

          {/* 自定义 DNS 解析（实验性，仅 Android） */}
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm1.75 5.44l-1.22-1.22a.75.75 0 0 0-1.06 0l-1.22 1.22a.75.75 0 1 0 1.06 1.06l.69-.69v4.19a.75.75 0 0 0 1.5 0V8.81l.69.69a.75.75 0 0 0 1.06-1.06z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  DNS over HTTPS
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  实验性
                  {Capacitor.isNativePlatform()
                    ? " · 仅 Android 生效"
                    : " · 仅适用于 Android 原生应用"}
                </p>
              </div>
            </div>
            <fluent-switch
              checked={useDnsOverride()}
              disabled={!Capacitor.isNativePlatform()}
              on:change={() => setUseDnsOverride(!useDnsOverride())}
              aria-label="DNS over HTTPS"
            />
          </div>
        </div>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第4组：账号与应用 */}
        {/* ════════════════════════════════════════════ */}
        <div class="px-5 py-3 flex flex-col">
          <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
            账号与应用
          </p>

          {/* 退出登录 */}
          <Show when={isLoggedIn()}>
            <div
              class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
              onClick={handleLogout}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleLogout();
                }
              }}
              role="button"
              tabindex="0"
              aria-label="退出登录"
            >
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <FluentIcon name="signOut" size={24} />
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    退出登录
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    清除当前登录凭证，不会删除本地其他数据
                  </p>
                </div>
              </div>
            </div>
          </Show>

          {/* 清除所有本地数据 */}
          <div
            class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
            onClick={() => setDialogState({ type: "clear" })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setDialogState({ type: "clear" });
              }
            }}
            role="button"
            tabindex="0"
            aria-label="清除所有本地数据"
          >
            <div class="flex items-center gap-3">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorStatusDangerForeground1)]">
                <FluentIcon name="delete" size={24} />
              </div>
              <div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorStatusDangerForeground1)] leading-snug">
                  清除所有本地数据
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  删除登录凭证、图片缓存、设置、屏蔽与举报记录
                </p>
              </div>
            </div>
          </div>

          {/* 删除 Pixiv 账号 */}
          <div
            class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
            onClick={() => setDialogState({ type: "deleteAccount" })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setDialogState({ type: "deleteAccount" });
              }
            }}
            role="button"
            tabindex="0"
            aria-label="删除 Pixiv 账号"
          >
            <div class="flex items-center gap-3">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                <FluentIcon name="open" size={24} />
              </div>
              <div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  删除 Pixiv 账号
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  打开 Pixiv 官方账号删除页面，按官方流程操作
                </p>
              </div>
            </div>
            {/* Chevron right */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              class="flex-shrink-0 text-[var(--colorNeutralForeground3)] ml-2"
            >
              <path
                d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z"
                fill="currentColor"
              />
            </svg>
          </div>

          {/* 启动时检查更新 — toggle row */}
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 4.5a7.5 7.5 0 0 0-5.303 12.803.75.75 0 0 0 1.06-1.06A6 6 0 1 1 18 12h-3.75a.75.75 0 0 0-.53 1.28l3.25 3.247a.75.75 0 0 0 1.06 0l3.25-3.247A.75.75 0 0 0 20.28 12H16.5A7.5 7.5 0 0 0 12 4.5z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div class="min-w-0">
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  启动时检查更新
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  每次打开 App 时后台检测新版本
                </p>
              </div>
            </div>
            <fluent-switch
              checked={autoCheckUpdate()}
              on:change={() => setAutoCheckUpdate(!autoCheckUpdate())}
              aria-label="启动时检查更新"
            />
          </div>

          {/* 检查更新 */}
          <div
            class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
            onClick={handleCheckUpdate}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCheckUpdate();
              }
            }}
            role="button"
            tabindex="0"
            aria-label="检查更新"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.25 14.66l-4-4a.75.75 0 0 1 1.06-1.06l2.97 2.97 5.22-5.97a.75.75 0 1 1 1.14 1l-5.75 6.5a.75.75 0 0 1-.56.25.75.75 0 0 1-.55-.23l-.53-.52V16.66z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                检查更新
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0 ml-3">
              {/* Loading spinner */}
              <Show when={isCheckingUpdate()}>
                <fluent-spinner size="tiny"></fluent-spinner>
              </Show>
              {/* Latest version tag — visible after check completes */}
              <Show when={checkCompleted() && !isCheckingUpdate()}>
                <span
                  class="[font-size:var(--fontSizeBase200)] font-semibold leading-snug"
                  classList={{
                    "text-[var(--colorStatusSuccessForeground1)]":
                      !hasUpdate() && latestVersion() !== "",
                    "text-[var(--colorBrandForeground1)]": hasUpdate(),
                    "text-[var(--colorNeutralForeground3)]": latestVersion() === "",
                  }}
                >
                  {latestVersion() !== ""
                    ? hasUpdate()
                      ? `v${latestVersion()} ✨`
                      : `v${APP_VERSION} ✅`
                    : `v${APP_VERSION} 🔄`}
                </span>
              </Show>
            </div>
          </div>

          {/* About entry — clickable row */}
          <div
            class="flex items-center justify-between mx-0 mb-4 px-1 py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)]"
            onClick={() => {
              closeSettingsDrawer();
              void navigate({ to: "/about" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                closeSettingsDrawer();
                void navigate({ to: "/about" });
              }
            }}
            role="button"
            tabindex="0"
            aria-label="关于"
          >
            <div class="flex items-center gap-3 min-w-0">
              {/* Pictelio logo — small 32px */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 192 192"
                fill="none"
                aria-hidden="true"
                class="flex-shrink-0"
              >
                <defs>
                  <filter id="settingsShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow
                      dx="0"
                      dy="4"
                      stdDeviation="6"
                      flood-color="#000000"
                      flood-opacity="0.08"
                    />
                  </filter>
                </defs>
                <rect
                  x="12"
                  y="12"
                  width="168"
                  height="168"
                  rx="44"
                  fill="#ffffff"
                  filter="url(#settingsShadow)"
                />
                <svg x="36" y="36" width="120" height="120" viewBox="0 0 64 64">
                  <path
                    d="M18 12 C18 12 16 28 19 52 C19 52 22 54 24 50 C26 47 24 39 26 33 C26 33 37 35 45 27 C51 21 47 13 38 11 C31 9 24 12 18 12 Z"
                    fill="#2b579a"
                  />
                  <path
                    d="M22 16 C22 16 21 28 23 46"
                    fill="none"
                    stroke="#5a9fd4"
                    stroke-width="3"
                    stroke-linecap="round"
                  />
                  <circle cx="42" cy="19" r="2" fill="#7ab8e8" />
                  <circle cx="46" cy="25" r="1.5" fill="#7ab8e8" />
                </svg>
              </svg>
              <div class="min-w-0">
                <p class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  Pictelio
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  关于 · v{APP_VERSION}
                </p>
              </div>
            </div>
            {/* Chevron right */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              class="flex-shrink-0 text-[var(--colorNeutralForeground3)] ml-2"
            >
              <path
                d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        {/* Bottom spacer */}
        <div class="h-8" />
      </fluent-drawer>

      {/* BlocklistSheet */}
      <Show when={showBlocklist()}>
        <BlocklistSheet
          isOpen={showBlocklist()}
          onClose={() => {
            setShowBlocklist(false);
          }}
        />
      </Show>

      {/* Clear data dialog */}
      <fluent-dialog
        open={dialogState()?.type === "clear"}
        on:close={() => setDialogState(null)}
        aria-label="清除所有本地数据？"
      >
        <h3 slot="title">清除所有本地数据？</h3>
        <p>
          这将删除本应用在本机保存的全部数据，包括：登录凭证、图片缓存、浏览设置、屏蔽列表、举报记录。此操作不可恢复，但不会删除你的
          Pixiv 账号及其在 Pixiv 服务器上的数据。
        </p>
        <fluent-button slot="actions" appearance="secondary" on:click={() => setDialogState(null)}>
          取消
        </fluent-button>
        <fluent-button slot="actions" appearance="primary" on:click={handleClearLocalData}>
          确认清除
        </fluent-button>
      </fluent-dialog>

      {/* Delete account dialog */}
      <fluent-dialog
        open={dialogState()?.type === "deleteAccount"}
        on:close={() => setDialogState(null)}
        aria-label="删除 Pixiv 账号？"
      >
        <h3 slot="title">删除 Pixiv 账号？</h3>
        <p>
          Pictelio 是第三方客户端，无法直接删除你的 Pixiv 账号。点击确认将打开 Pixiv
          官方账号删除页面，请按官方流程操作。
        </p>
        <fluent-button slot="actions" appearance="secondary" on:click={() => setDialogState(null)}>
          取消
        </fluent-button>
        <fluent-button
          slot="actions"
          appearance="primary"
          on:click={() => {
            setDialogState(null);
            openDeleteAccountPage();
          }}
        >
          前往 Pixiv
        </fluent-button>
      </fluent-dialog>
    </>
  );
};

export default SettingsDrawer;
