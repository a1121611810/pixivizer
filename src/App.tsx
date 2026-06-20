import { type Component, onMount, Show } from "solid-js";
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

  onMount(async () => {
    // Handle Android back button / gesture
    CapApp.addListener("backButton", () => {
      // If viewer is open, close it first
      if ((window as any).__viewerOpen) {
        window.dispatchEvent(new CustomEvent("closeViewer"));
        return;
      }
      // Root pages — exit app
      const path = window.location.pathname;
      if (
        path === "/recommended" ||
        path === "/following" ||
        path === "/bookmarks" ||
        path === "/login"
      ) {
        CapApp.exitApp();
      } else {
        window.history.back();
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
