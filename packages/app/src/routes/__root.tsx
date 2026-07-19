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
import { useNavigate, useLocation, useRouter, Outlet } from "@tanstack/solid-router";
import { isLoggedIn, isLoading, setIsLoading, initializeAuth } from "@/stores/authStore";
import LoadingSpinner from "@/components/LoadingSpinner";
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
const SearchFAB = lazy(() => import("@/components/SearchFAB"));

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

  // 监听登录过期：当 isLoggedIn 从 true 变为 false 时自动跳转登录页
  createEffect(() => {
    const loggedIn = isLoggedIn();
    const path = location().pathname;
    // 跳过启动阶段（startup 代码在 onMount 中处理了初始导航）
    if (isLoading()) return;
    if (!loggedIn && path !== '/login' && path !== '/age-confirmation') {
      navigate({ to: "/login", replace: true });
    }
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
    // IsCheckingUpdate/checkCompleted are kept in sync so the Settings drawer
    // Can show the version indicator ("v3.5.1 ✅") after a startup check.
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
      } catch (error) {
        console.warn("[App] Startup update check failed", error);
      } finally {
        setIsCheckingUpdate(false);
        setCheckCompleted(true);
      }
    }

    // Register native back gesture handler. Overlay closure is handled by backGestureStore
    // Once components push overlays in Phase 5; for now the service closes top overlay if any.
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
    } catch (error) {
      console.error("[App] Auth initialization failed", error);
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
        {/* 始终渲染 Outlet，不让 Router 因 Outlet 卸载/重挂载而中止 Loader 的 AbortSignal */}
        <Outlet />
      </ErrorBoundary>

      {/* 启动加载覆盖层：浮在内容之上，不卸载 Outlet */}
      <Show when={isLoading()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--colorNeutralBackground3)]">
          <LoadingSpinner size="lg" text="加载中..." />
        </div>
      </Show>

      {/* Exit hint toast */}
      <Show when={showExitHint()}>
        <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--colorNeutralBackground1)] border border-[var(--colorNeutralStroke2)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation8)] px-5 py-2.5 text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase200)] font-medium whitespace-nowrap pointer-events-none transition-all duration-[var(--durationGentle)]">
          再按一次退出应用
        </div>
      </Show>

      <StartupUpdateDialog />
      <Show when={!isLoading()}>
        <SearchFAB />
      </Show>
    </div>
  );
};

export default RootLayout;
