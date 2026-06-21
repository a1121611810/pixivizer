import { type Component, onMount, Show, createSignal, onCleanup } from "solid-js";
import { Route, Router, useNavigate } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { isLoggedIn, isLoading, initializeAuth } from "./stores/authStore";
import { App as CapApp } from "@capacitor/app";
import Login from "./routes/Login";
import IllustDetail from "./routes/IllustDetail";
import DebugImage from "./routes/DebugImage";
import Bookmarks from "./routes/Bookmarks";
import TabFeedPage from "./routes/TabFeedPage";
import LoadingSpinner from "./components/LoadingSpinner";

const RootLayout: Component<RouteSectionProps> = (props) => {
  const navigate = useNavigate();
  const [showExitHint, setShowExitHint] = createSignal(false);
  let exitHintTimer: ReturnType<typeof setTimeout>;

  onMount(async () => {
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
      <Show when={!isLoading()} fallback={<LoadingSpinner text="启动中..." />}>
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
