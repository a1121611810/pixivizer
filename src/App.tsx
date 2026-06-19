import { type Component, onMount, Show } from 'solid-js';
import { Route, Router, useNavigate } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { isLoggedIn, isLoading, initializeAuth } from './stores/authStore';
import { App as CapApp } from '@capacitor/app';
import Login from './routes/Login';
import Feed from './routes/Feed';
import IllustDetail from './routes/IllustDetail';
import DebugImage from './routes/DebugImage';
import Bookmarks from './routes/Bookmarks';
import LoadingSpinner from './components/LoadingSpinner';

const RootLayout: Component<RouteSectionProps> = (props) => {
  const navigate = useNavigate();

  onMount(async () => {
    // Handle Android back button / gesture
    CapApp.addListener('backButton', ({ canGoBack }) => {
      // If settings sheet is open, close it instead of navigating back
      if ((window as any).__settingsOpen) {
        window.dispatchEvent(new CustomEvent('closeSettings'));
        return;
      }
      // If image viewer is open, close it instead of navigating back
      if ((window as any).__viewerOpen) {
        window.dispatchEvent(new CustomEvent('closeViewer'));
        return;
      }
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });

    await initializeAuth();
    if (isLoggedIn()) {
      navigate('/feed', { replace: true });
    } else {
      navigate('/login', { replace: true });
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
      <Route path="/feed" component={Feed} />
      <Route path="/illust/:id" component={IllustDetail} />
      <Route path="/debug" component={DebugImage} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route path="*" component={Login} />
    </Router>
  );
};

export default App;
