import {
  type Component,
  onMount,
  Show,
  createSignal,
  createEffect,
  onCleanup,
  lazy,
  ErrorBoundary,
} from "solid-js";
import { Outlet, useLocation, useNavigate, useRouter } from "@tanstack/solid-router";
import { isLoggedIn, isLoading, setIsLoading, initializeAuth } from "@/stores/authStore";
import {
  loadAutoHideNavBarPreference,
  loadShowR18Preference,
  loadShowR18GPreference,
  loadLayoutModePreference,
  loadShowDetailStairsPreference,
  loadAgePreference,
  loadThemePreference,
  ageConfirmed,
  autoCheckUpdate,
  loadAutoCheckUpdatePreference,
  loadUseDnsOverridePreference,
  loadContentTypePreference,
  loadImageCachePrefs,
  loadNovelLayoutModePreference,
  loadLastDismissedVersionPreference,
  setHasUpdate,
  setLatestVersion,
  setLatestReleaseUrl,
  setLatestChangelog,
  setShowUpdateDialog,
  setIsCheckingUpdate,
  setCheckCompleted,
  lastDismissedVersion,
} from "@/stores/uiStore";
import { checkForUpdate } from "@/services/updateService";
import { clearOverlays, registerBackGesture } from "@/services/backGestureService";
import { warmCacheFromDisk } from "@/utils/imageLoader";
import { loadReportedIds } from "@/stores/reportStore";
import { loadBlockedIds } from "@/stores/blockStore";
import { loadImageHostPreference } from "@/stores/imageHostStore";

const StartupUpdateDialog = lazy(() => import("@/components/StartupUpdateDialog"));

const RootLayout: Component = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const router = useRouter();
  const [showExitHint, setShowExitHint] = createSignal(false);
  let exitHintTimer: ReturnType<typeof setTimeout>;

  // 路由切换时清空 overlay 栈，避免旧路由未关闭的 overlay 阻塞新路由的返回手势。
  createEffect(() => {
    // 依赖 location 变化
    void location().pathname;
    clearOverlays();
  });

  onMount(async () => {
    // Disable browser native scroll restoration — we manage scroll ourselves via stores + restoreScrollTop.
    // Without this, window.history.go(-1) triggers popstate and the browser may fight our scroll restoration.
    if (history.scrollRestoration) {
      history.scrollRestoration = "manual";
    }

    // Show "press again to exit" toast handler
    const onExitHint = () => {
      setShowExitHint(true);
      clearTimeout(exitHintTimer);
      exitHintTimer = setTimeout(() => setShowExitHint(false), 2000);
    };
    window.addEventListener("exitHint", onExitHint);

    // Register cleanup synchronously (before any await) so Solid tracks it properly
    let unregisterBackGesture: (() => void) | null = null;
    onCleanup(() => {
      window.removeEventListener("exitHint", onExitHint);
      clearTimeout(exitHintTimer);
      unregisterBackGesture?.();
    });

    // Load persisted preferences (async) — 并行加载
    await Promise.all([
      loadThemePreference(),
      loadAutoHideNavBarPreference(),
      loadShowR18Preference(),
      loadShowR18GPreference(),
      loadLayoutModePreference(),
      loadShowDetailStairsPreference(),
      loadAgePreference(),
      loadAutoCheckUpdatePreference(),
      loadLastDismissedVersionPreference(),
      loadUseDnsOverridePreference(),
      loadContentTypePreference(),
      loadImageCachePrefs(),
      loadNovelLayoutModePreference(),
    ]);

    // Load user content moderation state — 并行加载
    await Promise.all([loadReportedIds(), loadBlockedIds(), loadImageHostPreference()]);

    // 后台预热 LRU 缓存（从 Android 文件系统读取最近图片，不阻塞启动流程）
    warmCacheFromDisk();

    // Background update check on startup if toggle is enabled.
    // The result is stored in uiStore so StartupUpdateDialog can render it.
    // isCheckingUpdate/checkCompleted are kept in sync so the Settings drawer
    // can show the version indicator ("v3.5.1 ✅") after a startup check.
    if (autoCheckUpdate()) {
      setIsCheckingUpdate(true);
      try {
        const result = await checkForUpdate();
        setHasUpdate(result.hasUpdate);
        setLatestVersion(result.latestVersion);
        setLatestReleaseUrl(result.latestReleaseUrl);
        setLatestChangelog(result.latestChangelog);
        if (
          result.hasUpdate &&
          result.latestVersion &&
          result.latestVersion !== lastDismissedVersion()
        ) {
          setShowUpdateDialog(true);
        }
      } catch (e) {
        console.warn("[App] Startup update check failed", e);
      } finally {
        setIsCheckingUpdate(false);
        setCheckCompleted(true);
      }
    }

    // Register native back gesture handler. Overlay closure is handled by backGestureStore
    // once components push overlays in Phase 5; for now the service closes top overlay if any.
    unregisterBackGesture = await registerBackGesture({
      getPathname: () => location().pathname,
      navigateBack: () => router.history.back(),
      dispatchExitHint: () => window.dispatchEvent(new CustomEvent("exitHint")),
    });

    try {
      // 如果尚未确认年龄，先导航到年龄确认页面，不进行登录判断
      if (!ageConfirmed()) {
        await navigate({ to: "/age-confirmation", replace: true });
        return;
      }

      await initializeAuth();
      if (isLoggedIn()) {
        await navigate({ to: "/recommended", replace: true });
      } else {
        await navigate({ to: "/login", replace: true });
      }
    } catch (e) {
      console.error("[App] Auth initialization failed", e);
      try {
        await navigate({ to: "/login", replace: true });
      } catch {
        // 导航异常不影响 loading 状态释放
      }
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div class="page">
      <Show
        when={!isLoading()}
        fallback={
          <div class="flex flex-col items-center justify-center min-h-screen gap-4">
            {/* Pictelio logo, 64px, scale entrance */}
            <svg
              width="64"
              height="64"
              viewBox="0 0 192 192"
              fill="none"
              aria-hidden="true"
              style="animation: fluent-scale-enter var(--durationNormal) var(--curveDecelerateMid) both"
            >
              <defs>
                <filter id="splashShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow
                    dx="0"
                    dy="6"
                    stdDeviation="10"
                    flood-color="#000000"
                    flood-opacity="0.10"
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
                filter="url(#splashShadow)"
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

            {/* Brand text: staggered fade-slide-up */}
            <div class="flex flex-col items-center gap-1">
              <h1
                class="text-[var(--fontSizeBase600)] font-semibold text-[var(--colorNeutralForeground1)] leading-none"
                style="animation: splash-fade-slide-up var(--durationNormal) var(--curveDecelerateMid) 100ms both"
              >
                Pictelio
              </h1>
              <p
                class="text-[var(--fontSizeBase200)] text-[var(--colorNeutralForegroundDisabled)] font-400"
                style="animation: splash-fade-slide-up var(--durationNormal) var(--curveDecelerateMid) 200ms both"
              >
                第三方插画浏览器
              </p>
            </div>

            {/* ProgressRing: 16px, delayed 500ms — only visible if auth is slow */}
            <div
              class="w-4 h-4 [border-width:var(--strokeWidthThick)] border-solid [border-color:var(--colorNeutralStroke2)] [border-top-color:var(--colorBrandStroke1)] rounded-[var(--borderRadiusCircular)]"
              style="animation: splash-fade-in var(--durationNormal) var(--curveDecelerateMid) 500ms both, spin 1s linear infinite"
            />
          </div>
        }
      >
        <ErrorBoundary
          fallback={(err, reset) => (
            <div class="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
              <p class="text-[var(--colorStatusDangerForeground1)] text-lg font-semibold">
                页面加载失败
              </p>
              <p class="text-[var(--colorNeutralForeground2)] text-sm text-center max-w-xs">
                {err?.message ?? "未知错误"}
              </p>
              <button
                class="px-4 py-2 rounded-[var(--borderRadiusMedium)] bg-[var(--colorBrandBackground)] text-[var(--colorNeutralForegroundOnBrand)] text-sm font-medium"
                onClick={reset}
              >
                重试
              </button>
            </div>
          )}
        >
          <Outlet />
        </ErrorBoundary>
      </Show>

      {/* Exit hint toast */}
      <Show when={showExitHint()}>
        <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--colorNeutralBackground1)] border border-[var(--colorNeutralStroke2)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation8)] px-5 py-2.5 text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase200)] font-medium whitespace-nowrap pointer-events-none transition-all duration-[var(--durationGentle)]">
          再按一次退出应用
        </div>
      </Show>

      <StartupUpdateDialog />
    </div>
  );
};

export default RootLayout;
