import { type Component, Show, createSignal, createEffect, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Preferences } from "@capacitor/preferences";
import FluentIcon from "./ui/FluentIcon";
import {
  showSettingsSheet,
  setShowSettingsSheet,
  theme,
  resolvedTheme,
  setThemePersisted,
  type Theme,
  listQuality,
  setListQuality,
  detailQuality,
  setDetailQuality,
  type ImageQuality,
  cacheSize,
  setCacheSize,
  usePredictiveBack,
  setUsePredictiveBack,
  isPredictiveBackSupported,
  autoHideNavBar,
  setAutoHideNavBar,
  showR18,
  setShowR18,
  showR18G,
  setShowR18G,
  layoutMode,
  setLayoutMode,
  type LayoutMode,
  showDetailStairs,
  setShowDetailStairs,
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
} from "../stores/uiStore";
import { isLoggedIn, logout } from "../stores/authStore";
import { clearImageCache } from "../utils/imageLoader";
import { resetBlockedIds } from "../stores/blockStore";
import { resetReportedIds } from "../stores/reportStore";
import { usePredictiveBackOverlayStyle } from "../services/predictiveBack";
import BlocklistSheet from "./BlocklistSheet";
import { checkForUpdate } from "../services/updateService";

function handleThemeChange(newTheme: Theme) {
  setThemePersisted(newTheme);
}

// Prevent body scroll when touching the scrim while sheet is open
function handleScrimTouchMove(e: TouchEvent) {
  if (e.target === e.currentTarget) {
    e.preventDefault();
  }
}

async function handleCheckUpdate() {
  if (isCheckingUpdate()) return;
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

const SettingsSheet: Component = () => {
  const navigate = useNavigate();
  const [closing, setClosing] = createSignal(false);
  const [mounted, setMounted] = createSignal(false);
  const [ageGateMessage, setAgeGateMessage] = createSignal<string | null>(null);
  const [showBlocklist, setShowBlocklist] = createSignal(false);
  const [actionToast, setActionToast] = createSignal<string | null>(null);
  const [dialogState, setDialogState] = createSignal<
    { type: "clear" } | { type: "deleteAccount" } | null
  >(null);

  function reconfirmAge() {
    setAgeConfirmation(false, false);
    navigate("/age-confirmation?reconfirm=true");
  }
  const pbStyle = usePredictiveBackOverlayStyle();

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
      setActionToast("已退出登录");
    } catch {
      setActionToast("退出登录失败");
    }
  }

  async function handleClearLocalData() {
    try {
      await logout();
      clearImageCache();
      resetBlockedIds();
      resetReportedIds();
      await Preferences.clear();
      await resetUiStore();
      setActionToast("本地数据已清除");
    } catch {
      setActionToast("清除失败，请重试");
    } finally {
      close();
    }
  }

  function requireAdult(action: () => void) {
    if (!isAdult()) {
      setAgeGateMessage("请先确认已满 18 岁");
      return;
    }
    action();
  }

  // Reset animation state and register back-button listener each time opened
  createEffect(() => {
    if (showSettingsSheet()) {
      (window as any).__settingsOpen = true;

      const handler = () => close();
      window.addEventListener("closeSettings", handler);

      setMounted(false);
      setClosing(false);
      // Double rAF ensures a paint frame at opacity:0 before transitioning to opacity:1
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });

      onCleanup(() => {
        (window as any).__settingsOpen = false;
        window.removeEventListener("closeSettings", handler);
      });
    }
  });

  function close() {
    setClosing(true);
    setTimeout(() => {
      setShowSettingsSheet(false);
    }, 250); // match --durationGentle
  }

  return (
    <Show when={showSettingsSheet()}>
      {/* Age gate hint toast */}
      <Show when={ageGateMessage()}>
        <div
          class="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-[var(--colorStatusWarningBackground2)] text-[var(--colorStatusWarningForeground1)] border border-[var(--colorStatusWarningForeground1)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation8)] px-5 py-2.5 [font-size:var(--fontSizeBase200)] font-medium whitespace-nowrap pointer-events-none transition-all duration-[var(--durationGentle)]"
          style={{
            animation: "fluent-scale-enter var(--durationNormal) var(--curveDecelerateMid) both",
          }}
        >
          {ageGateMessage()}
        </div>
      </Show>

      {/* Action success toast */}
      <Show when={actionToast()}>
        <div
          class="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-[var(--colorStatusSuccessBackground2)] text-[var(--colorStatusSuccessForeground1)] border border-[var(--colorStatusSuccessForeground1)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation8)] px-5 py-2.5 [font-size:var(--fontSizeBase200)] font-medium whitespace-nowrap pointer-events-none transition-all duration-[var(--durationGentle)]"
          style={{
            animation: "fluent-scale-enter var(--durationNormal) var(--curveDecelerateMid) both",
          }}
        >
          {actionToast()}
        </div>
      </Show>

      <div class="fixed inset-0 z-50" style={pbStyle()}>
        {/* Scrim — click to close */}
        <div
          class="absolute inset-0 transition-opacity cursor-pointer"
          onClick={close}
          onTouchMove={handleScrimTouchMove}
          style={{
            "background-color": "var(--colorScrim)",
            opacity: mounted() && !closing() ? 1 : 0,
            transition: `opacity var(--durationGentle) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}`,
          }}
        />

        {/* Sheet — slides down from top */}
        <div
          class="absolute top-0 left-0 right-0 surface-appbar rounded-b-[var(--borderRadius4XLarge)] shadow-[var(--elevation28)]"
          style={{
            "max-height": "50vh",
            "overflow-y": "auto",
            transform: mounted() && !closing() ? "translateY(0)" : "translateY(-100%)",
            opacity: mounted() && !closing() ? 1 : 0,
            transition: `transform var(--durationGentle) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}, opacity var(--durationNormal) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}`,
          }}
        >
          {/* Drag handle (visual affordance, non-functional in v1) */}
          <div class="flex justify-center pt-2 pb-1">
            <div class="w-10 h-1 rounded-[var(--borderRadiusCircular)] bg-[var(--colorNeutralStroke1)]" />
          </div>

          {/* Header */}
          <div class="flex items-center justify-between px-5 pt-1 pb-2">
            <h2 class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
              设置
            </h2>
            <fluent-button appearance="subtle" aria-label="关闭设置" on:click={close}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M15.14 4.86a.67.67 0 0 0-.95 0L10 9.05 5.81 4.86a.67.67 0 0 0-.95.95L9.05 10l-4.19 4.19a.67.67 0 0 0 .95.95L10 10.95l4.19 4.19a.67.67 0 0 0 .95-.95L10.95 10l4.19-4.19a.67.67 0 0 0 0-.95z"
                  fill="currentColor"
                />
              </svg>
            </fluent-button>
          </div>

          {/* Divider */}
          <fluent-divider style="margin-inline:20px"></fluent-divider>

          {/* ── Settings rows ── */}
          <div class="px-5 py-3 flex flex-col">
            {/* Theme picker row */}
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
                    主题
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

            {/* 自动隐藏导航栏开关行 */}
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3.75 5.25a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75zm0 4.5a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75zm0 4.5a.75.75 0 0 0 0 1.5h11.5a.75.75 0 0 0 0-1.5H3.75z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    自动隐藏导航栏
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    页面向下滚动时收起导航栏，上滑时重新显示
                  </p>
                </div>
              </div>

              <fluent-switch
                checked={autoHideNavBar()}
                on:change={() => setAutoHideNavBar(!autoHideNavBar())}
                aria-label="自动隐藏导航栏"
              />
            </div>

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

            {/* 预测性返回手势开关行 */}
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm3.78 5.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 0 1 1.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 0 1 1.06 0z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    预测性返回手势
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    {isPredictiveBackSupported()
                      ? "使用 Android 16 系统级侧滑返回预览"
                      : "仅 Android 16 及以上系统可用"}
                  </p>
                </div>
              </div>

              <fluent-switch
                checked={usePredictiveBack()}
                on:change={() =>
                  isPredictiveBackSupported() && setUsePredictiveBack(!usePredictiveBack())
                }
                disabled={!isPredictiveBackSupported()}
                aria-label="预测性返回手势"
              />
            </div>

            {/* Layout mode selector */}
            <div class="py-2">
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
                    d="M3 6.25A3.25 3.25 0 0 1 6.25 3h11.5A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25zM6.25 4.5A1.75 1.75 0 0 0 4.5 6.25V9h2.25V5.25A1.72 1.72 0 0 0 6.25 4.5zM4.5 10.5v3h3v-3h-3zm4.5 0v3h3.75v-3H9zm5.25 0v3h3.75v-3h-3zm3.75-1.5h-3.75V5.25c.455 0 .873.173 1.188.48l.012.012.018.018c.315.315.506.735.532 1.19V9zm-5.25 0H9V5.25h3.75V9zm-8.25 6v2.75c0 .966.784 1.75 1.75 1.75h.5V15H4.5zm3.75 0v4.5H9V15H8.25zm5.25 0v4.5h.75V15h-.75zm5.25 0v4.5h.5a1.75 1.75 0 0 0 1.75-1.75V15h-2.25z"
                    fill="currentColor"
                  />
                </svg>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  布局模式
                </p>
              </div>
              <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
                {(["waterfall", "single", "grid"] as LayoutMode[]).map((m) => (
                  <button
                    class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                    classList={{
                      "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                        layoutMode() === m,
                      "bg-transparent text-[var(--colorNeutralForeground2)]": layoutMode() !== m,
                    }}
                    onClick={() => setLayoutMode(m)}
                  >
                    {m === "waterfall" ? "瀑布流" : m === "single" ? "单列" : "网格"}
                  </button>
                ))}
              </div>
              <p class="mt-1.5 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                {layoutMode() === "waterfall"
                  ? "双列瀑布流，图片错落有致"
                  : layoutMode() === "single"
                    ? "单列大图，适合浏览细节"
                    : "三列网格，信息密度最高"}
              </p>
            </div>

            {/* 详情页楼梯导航开关行 */}
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 6.25A3.25 3.25 0 0 1 6.25 3h11.5A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25zM6.25 4.5A1.75 1.75 0 0 0 4.5 6.25V9h2.25V5.25A1.72 1.72 0 0 0 6.25 4.5zM4.5 10.5v3h3v-3h-3zm4.5 0v3h3.75v-3H9zm5.25 0v3h3.75v-3h-3zm3.75-1.5h-3.75V5.25c.455 0 .873.173 1.188.48l.012.012.018.018c.315.315.506.735.532 1.19V9zm-5.25 0H9V5.25h3.75V9zm-8.25 6v2.75c0 .966.784 1.75 1.75 1.75h.5V15H4.5zm3.75 0v4.5H9V15H8.25zm5.25 0v4.5h.75V15h-.75zm5.25 0v4.5h.5a1.75 1.75 0 0 0 1.75-1.75V15h-2.25z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    详情页楼梯导航
                    <span class="inline-flex items-center ml-1 px-[var(--spacingHorizontalXS)] py-[var(--spacingVerticalXXS)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase100)] font-semibold text-[var(--colorPaletteGreenForeground2)] bg-[var(--colorPaletteGreenBackground2)] align-middle">
                      Beta
                    </span>
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    在多页作品中显示右侧页码导航条，方便快速跳转
                  </p>
                </div>
              </div>

              <fluent-switch
                checked={showDetailStairs()}
                on:change={() => setShowDetailStairs(!showDetailStairs())}
                aria-label="详情页楼梯导航"
              />
            </div>

            {/* Divider before quality settings */}
            <fluent-divider style="margin-block:4px"></fluent-divider>

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
          </div>

          {/* Divider before cache size */}
          <fluent-divider style="margin-block:4px"></fluent-divider>

          {/* Image cache size */}
          <div class="px-5 py-2">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <FluentIcon name="server" size={20} />
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  图片缓存数
                </p>
              </div>
              <span class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorCompoundBrandForeground1)]">
                {cacheSize()}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForegroundDisabled)] flex-shrink-0">
                100
              </span>
              <input
                type="range"
                min="100"
                max="1000"
                step="100"
                value={cacheSize()}
                onInput={(e) => setCacheSize(Number(e.currentTarget.value))}
                class="flex-1 h-1 rounded-[var(--borderRadiusCircular)] cursor-pointer"
                style={{
                  "accent-color": "var(--colorCompoundBrandBackground)",
                }}
              />
              <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForegroundDisabled)] flex-shrink-0">
                1000
              </span>
            </div>
            <p class="mt-2 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
              缓存数越大，图片加载越快，但占用的内存也越多。推荐 400~600。
            </p>
          </div>

          {/* Divider */}
          <fluent-divider style="margin-inline:20px"></fluent-divider>

          {/* ── Account & data section ── */}
          <div class="px-5 py-3 flex flex-col">
            <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
              账号与数据
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
          </div>

          {/* Divider */}
          <fluent-divider style="margin-inline:20px"></fluent-divider>

          {/* ── 检测更新 ── */}
          <div class="px-5 py-3 flex flex-col">
            <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
              检测更新
            </p>

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
          </div>

          {/* Divider */}
          <fluent-divider style="margin-inline:20px"></fluent-divider>

          {/* About entry — clickable row */}
          <div
            class="flex items-center justify-between mx-4 mb-4 px-5 py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)]"
            onClick={() => {
              close();
              navigate("/about");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                close();
                navigate("/about");
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
      </div>

      <BlocklistSheet isOpen={showBlocklist()} onClose={() => setShowBlocklist(false)} />

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
    </Show>
  );
};

export default SettingsSheet;
