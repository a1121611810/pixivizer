import { type Component, createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { login, isLoggedIn } from '../stores/authStore';

const Login: Component = () => {
  const navigate = useNavigate();
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    if (isLoggedIn()) {
      navigate('/feed', { replace: true });
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username(), password());
      navigate('/feed', { replace: true });
    } catch (err) {
      setError((err as { message?: string }).message ?? '登录失败，请检查账号密码');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="page flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} class="w-full max-w-sm flex flex-col gap-5">
        <div class="text-center mb-4">
          <div class="text-4xl mb-2">🎨</div>
          <h1 class="text-2xl font-bold text-white">Pixivizer</h1>
          <p class="text-gray-400 text-sm mt-1">登录你的 Pixiv 账号</p>
        </div>

        <input
          type="text"
          placeholder="Pixiv ID / 邮箱"
          value={username()}
          onInput={(e) => setUsername(e.currentTarget.value)}
          required
          disabled={submitting()}
          class="w-full px-4 py-3 rounded-xl bg-dark-800 text-white border border-gray-700 focus:border-blue-500 outline-none disabled:opacity-50"
        />

        <input
          type="password"
          placeholder="密码"
          value={password()}
          onInput={(e) => setPassword(e.currentTarget.value)}
          required
          disabled={submitting()}
          class="w-full px-4 py-3 rounded-xl bg-dark-800 text-white border border-gray-700 focus:border-blue-500 outline-none disabled:opacity-50"
        />

        {error() && (
          <div class="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded-lg">
            {error()}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting()}
          class="btn w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting() ? (
            <>
              <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              登录中...
            </>
          ) : (
            '登录'
          )}
        </button>
      </form>
    </div>
  );
};

export default Login;
