import { type Component, onMount, Show, createSignal, onCleanup } from "solid-js";
import { Route, Router, useNavigate, useLocation, useBeforeLeave } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { App as CapApp } from "@capacitor/app";
import { isLoggedIn, isLoading, initializeAuth } from "./stores/authStore";
import {
  loadPredictiveBackPreference,
  loadAutoHideNavBarPreference,
  loadShowR18Preference,
  loadShowR18GPreference,
  loadLayoutModePreference,
} from "./stores/uiStore";
import {
  initPredictiveBack,
  setPredictiveBackEnabled,
  pushRoute,
  popRoute,
  clearRouteStack,
} from "./services/predictiveBack";
import Login from "./routes/Login";
import IllustDetail from "./routes/IllustDetail";
import DebugImage from "./routes/DebugImage";
import Bookmarks from "./routes/Bookmarks";
import TabFeedPage from "./routes/TabFeedPage";
import PersonalCenter from "./routes/PersonalCenter";
import UserIllusts from "./routes/UserIllusts";
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
    await loadPredictiveBackPreference();
    await loadAutoHideNavBarPreference();
    await loadShowR18Preference();
    await loadShowR18GPreference();
    await loadLayoutModePreference();

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
            {/* Icon: Fluent image (filled), 64px, brand color, scale entrance */}
            <svg
              width="64"
              height="64"
              viewBox="0 0 192 192"
              fill="none"
              aria-hidden="true"
              style="animation: fluent-scale-enter var(--durationNormal) var(--curveDecelerateMid) both"
            >
              <defs>
                <linearGradient id="splashPGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#0078d4" />
                  <stop offset="55%" stop-color="#2899f5" />
                  <stop offset="100%" stop-color="#60aaff" />
                </linearGradient>
                <filter id="splashPShadow" x="-25%" y="-25%" width="150%" height="150%">
                  <feDropShadow
                    dx="0"
                    dy="6"
                    stdDeviation="8"
                    flood-color="#0078d4"
                    flood-opacity="0.35"
                  />
                </filter>
              </defs>
              <rect x="12" y="12" width="168" height="168" rx="44" fill="#1f1f1f" />
              <path
                d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
                fill="url(#splashPGrad)"
                filter="url(#splashPShadow)"
              />
              <path
                d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
                fill="white"
                fill-opacity="0.12"
              />
            </svg>

            {/* Brand text: staggered fade-slide-up */}
            <div class="flex flex-col items-center gap-1">
              <h1
                class="text-[var(--fontSizeBase600)] font-semibold text-[var(--colorNeutralForeground1)] leading-none"
                style="animation: splash-fade-slide-up var(--durationNormal) var(--curveDecelerateMid) 100ms both"
              >
                Pixivizer
              </h1>
              <p
                class="text-[var(--fontSizeBase200)] text-[var(--colorNeutralForegroundDisabled)] font-400"
                style="animation: splash-fade-slide-up var(--durationNormal) var(--curveDecelerateMid) 200ms both"
              >
                Pixiv 第三方客户端
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
        <PredictiveBackContainer>{props.children}</PredictiveBackContainer>
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

const IllustDetailRoute: Component<RouteSectionProps> = () => {
  return <IllustDetail />;
};

const App: Component = () => {
  return (
    <Router root={RootLayout}>
      <Route path="/login" component={Login} />
      <Route path="/recommended" component={() => <TabFeedPage tab="recommended" />} />
      <Route path="/following" component={() => <TabFeedPage tab="follow" />} />
      <Route path="/illust/:id" component={IllustDetailRoute} />
      <Route path="/debug" component={DebugImage} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route path="/me" component={PersonalCenter} />
      <Route path="/user/:id/illusts" component={UserIllusts} />
      <Route path="/user/:id" component={PersonalCenter} />
      <Route path="*" component={Login} />
    </Router>
  );
};

export default App;
