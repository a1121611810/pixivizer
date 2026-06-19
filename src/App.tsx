import { type Component, onMount, Show } from 'solid-js';
import { Route, Router, useNavigate } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { isLoggedIn, isLoading, initializeAuth } from './stores/authStore';
import Login from './routes/Login';
import Feed from './routes/Feed';
import IllustDetail from './routes/IllustDetail';
import LoadingSpinner from './components/LoadingSpinner';

const RootLayout: Component<RouteSectionProps> = (props) => (
  <div class="page">
    <Show when={!isLoading()} fallback={<LoadingSpinner text="启动中..." />}>
      {props.children}
    </Show>
  </div>
);

const App: Component = () => {
  const navigate = useNavigate();

  onMount(async () => {
    await initializeAuth();
    if (isLoggedIn()) {
      navigate('/feed', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  });

  return (
    <Router root={RootLayout}>
      <Route path="/login" component={Login} />
      <Route path="/feed" component={Feed} />
      <Route path="/illust/:id" component={IllustDetail} />
      <Route path="*" component={Login} />
    </Router>
  );
};

export default App;
