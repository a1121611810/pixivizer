import {
  type Component,
  onMount,
  Show,
  createSignal,
  onCleanup,
  lazy,
  Suspense,
  ErrorBoundary,
} from "solid-js";
import { Route, Router, useNavigate, useLocation, useBeforeLeave } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { App as CapApp } from "@capacitor/app";
import { isLoggedIn, isLoading, setIsLoading, initializeAuth } from "./stores/authStore";
import {
  loadPredictiveBackPreference,
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
} from "./stores/uiStore";
import { checkForUpdate } from "./services/updateService";
import {
  initPredictiveBack,
  setPredictiveBackEnabled,
  pushRoute,
  popRoute,
  clearRouteStack,
} from "./services/predictiveBack";
import { loadReportedIds } from "./stores/reportStore";
import { loadBlockedIds } from "./stores/blockStore";
const Login = lazy(() => import("./routes/Login"));
const AgeConfirmation = lazy(() => import("./routes/AgeConfirmation"));
const IllustDetail = lazy(() => import("./routes/IllustDetail"));
const DebugImage = lazy(() => import("./routes/DebugImage"));
const Bookmarks = lazy(() => import("./routes/Bookmarks"));
const TabFeedPage = lazy(() => import("./routes/TabFeedPage"));
const PersonalCenter = lazy(() => import("./routes/PersonalCenter"));
const UserIllusts = lazy(() => import("./routes/UserIllusts"));
const About = lazy(() => import("./routes/About"));
import PredictiveBackContainer from "./components/PredictiveBackContainer";

const RootLayout: Component<RouteSectionProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showExitHint, setShowExitHint] = createSignal(false);
  let exitHintTimer: ReturnType<typeof setTimeout>;

  useBeforeLeave((e) => {
    const to = e.to;
    if (typeof to === "string") {
      if (e.options?.replace) {
        // Replace current top
        popRoute();
        pushRoute(to);
      } else {
        pushRoute(to);
      }
    } else if (typeof to === "number") {
      // Back/forward navigation: pop for back, we can't reliably push for forward
      if (to < 0) {
        for (let i = 0; i < Math.abs(to); i++) {
          popRoute();
        }
      }
    }
  });

  onMount(async () => {
    // Initialize predictive back coordinator before auth
    initPredictiveBack(navigate);

    // Show "press again to exit" toast handler
    const onExitHint = () => {
      setShowExitHint(true);
      clearTimeout(exitHintTimer);
      exitHintTimer = setTimeout(() => setShowExitHint(false), 2000);
    };
    window.addEventListener("exitHint", onExitHint);

    // Register cleanup synchronously (before any await) so Solid tracks it properly
    let backButtonListener: { remove: () => void } | null = null;
    onCleanup(() => {
      window.removeEventListener("exitHint", onExitHint);
      clearTimeout(exitHintTimer);
      backButtonListener?.remove();
    });

    // Load persisted preferences (async)
    await loadThemePreference();
    await loadPredictiveBackPreference();
    await loadAutoHideNavBarPreference();
    await loadShowR18Preference();
    await loadShowR18GPreference();
    await loadLayoutModePreference();
    await loadShowDetailStairsPreference();
    await loadAgePreference();
    await loadAutoCheckUpdatePreference();

    // Load user content moderation state
    await loadReportedIds();
    await loadBlockedIds();

    // Silently check for updates on startup if toggle is enabled
    if (autoCheckUpdate()) {
      checkForUpdate(); // fire-and-forget, non-blocking
    }

    // Initialize route stack tracking
    clearRouteStack();
    pushRoute(location.pathname);

    // Fallback JS back-button handler: registered unconditionally, but only receives
    // events when the native predictive back plugin is disabled (or unavailable).
    const rootPaths = new Set(["/recommended", "/following", "/bookmarks", "/login"]);
    let lastBackTime = 0;
    backButtonListener = await CapApp.addListener("backButton", () => {
      if (window.__viewerOpen) {
        window.dispatchEvent(new CustomEvent("closeViewer"));
        return;
      }

      if (window.__settingsOpen) {
        window.dispatchEvent(new CustomEvent("closeSettings"));
        return;
      }

      const currentPath = location.pathname;
      if (!rootPaths.has(currentPath)) {
        navigate(-1);
        return;
      }

      if (Date.now() - lastBackTime < 2000) {
        CapApp.exitApp();
      } else {
        lastBackTime = Date.now();
        window.dispatchEvent(new CustomEvent("exitHint"));
      }
    });

    try {
      // 如果尚未确认年龄，先导航到年龄确认页面，不进行登录判断
      if (!ageConfirmed()) {
        setIsLoading(false);
        navigate("/age-confirmation", { replace: true });
        return;
      }

      await initializeAuth();
      if (isLoggedIn()) {
        navigate("/recommended", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    } catch (e) {
      console.error("[App] Auth initialization failed", e);
    }
  });

  onCleanup(() => {
    setPredictiveBackEnabled(false).catch((e) =>
      console.warn("[App] Failed to disable predictive back on unmount", e),
    );
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
                class="px-4 py-2 rounded-[var(--borderRadiusMedium)] bg-[var(--colorBrandBackground)] text-white text-sm font-medium"
                onClick={reset}
              >
                重试
              </button>
            </div>
          )}
        >
          <Suspense
            fallback={
              <div class="flex items-center justify-center min-h-[60vh]">
                <div class="w-5 h-5 [border-width:var(--strokeWidthThick)] border-solid [border-color:var(--colorNeutralStroke2)] [border-top-color:var(--colorBrandStroke1)] rounded-[var(--borderRadiusCircular)] animate-spin" />
              </div>
            }
          >
            <PredictiveBackContainer>{props.children}</PredictiveBackContainer>
          </Suspense>
        </ErrorBoundary>
      </Show>

      {/* Exit hint toast */}
      <Show when={showExitHint()}>
        <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--colorNeutralBackground1)] border border-[var(--colorNeutralStroke2)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation8)] px-5 py-2.5 text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase200)] font-medium whitespace-nowrap pointer-events-none transition-all duration-[var(--durationGentle)]">
          再按一次退出应用
        </div>
      </Show>
    </div>
  );
};

const App: Component = () => {
  return (
    <Router root={RootLayout}>
      <Route path="/login" component={Login} />
      <Route path="/recommended" component={() => <TabFeedPage tab="recommended" />} />
      <Route path="/following" component={() => <TabFeedPage tab="follow" />} />
      <Route path="/illust/:id" component={IllustDetail} />
      <Route path="/debug" component={DebugImage} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route path="/me" component={PersonalCenter} />
      <Route path="/user/:id/illusts" component={UserIllusts} />
      <Route path="/user/:id" component={PersonalCenter} />
      <Route path="/about" component={About} />
      <Route path="/age-confirmation" component={AgeConfirmation} />
      <Route path="*" component={Login} />
    </Router>
  );
};

export default App;
