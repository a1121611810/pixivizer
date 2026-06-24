import { type Component, onMount, Show, createSignal, onCleanup } from "solid-js";
import { Route, Router, useNavigate } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { isLoggedIn, isLoading, initializeAuth } from "./stores/authStore";
import { usePredictiveBack, loadPredictiveBackPreference } from "./stores/uiStore";
import { App as CapApp } from "@capacitor/app";
import Login from "./routes/Login";
import IllustDetail from "./routes/IllustDetail";
import DebugImage from "./routes/DebugImage";
import Bookmarks from "./routes/Bookmarks";
import TabFeedPage from "./routes/TabFeedPage";

const RootLayout: Component<RouteSectionProps> = (props) => {
  const navigate = useNavigate();
  const [showExitHint, setShowExitHint] = createSignal(false);
  let exitHintTimer: ReturnType<typeof setTimeout>;

  onMount(async () => {
    // Initialize persisted predictive back state and sync native handler
    await loadPredictiveBackPreference();
    const current = usePredictiveBack();
    try {
      await CapApp.toggleBackButtonHandler({ enabled: !current });
    } catch (e) {
      console.warn("[App] Failed to sync predictive back state on mount", e);
    }

    let lastBackTime = 0;

    // Show "press again to exit" toast
    const onExitHint = () => {
      setShowExitHint(true);
      clearTimeout(exitHintTimer);
      exitHintTimer = setTimeout(() => setShowExitHint(false), 2000);
    };
    window.addEventListener("exitHint", onExitHint);
    onCleanup(() => window.removeEventListener("exitHint", onExitHint));

    // Handle Android back button / gesture
    CapApp.addListener("backButton", () => {
      // If viewer is open, close it first
      if ((window as any).__viewerOpen) {
        window.dispatchEvent(new CustomEvent("closeViewer"));
        return;
      }
      // Non-root pages — navigate back
      const path = window.location.pathname;
      if (
        path !== "/recommended" &&
        path !== "/following" &&
        path !== "/bookmarks" &&
        path !== "/login"
      ) {
        navigate(-1);
        return;
      }
      // Root pages — double-press to exit
      const now = Date.now();
      if (now - lastBackTime < 2000) {
        CapApp.exitApp();
      } else {
        lastBackTime = now;
        // Dispatch a toast-like event or just let the user know via a simple visual cue
        window.dispatchEvent(new CustomEvent("exitHint"));
      }
    });

    await initializeAuth();
    if (isLoggedIn()) {
      navigate("/recommended", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
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
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              style="animation: fluent-scale-enter var(--durationNormal) var(--curveDecelerateMid) both"
            >
              <path
                d="M17.75 3A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3zm-1.72 7.78a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5zM5 15.25V17.5l.005.16A1.75 1.75 0 0 0 6.75 19.25h10.5a1.75 1.75 0 0 0 1.745-1.607L19 17.5v-2.25a.75.75 0 0 0-.648-.743L18.25 14.5H5.75a.75.75 0 0 0-.743.648z"
                fill="var(--colorBrandForeground1)"
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
        {props.children}
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
      <Route path="*" component={Login} />
    </Router>
  );
};

export default App;
