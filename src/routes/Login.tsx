import { type Component, createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { login, loginWithToken, isLoggedIn } from '../stores/authStore';

type LoginMode = 'token' | 'password' | 'smart';

function looksLikeToken(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.length >= 30 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

const Login: Component = () => {
  const navigate = useNavigate();
  const [mode, setMode] = createSignal<LoginMode>('smart');
  const [tokenInput, setTokenInput] = createSignal('');
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [smartToken, setSmartToken] = createSignal('');
  const [smartUsername, setSmartUsername] = createSignal('');
  const [smartPassword, setSmartPassword] = createSignal('');
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
      if (mode() === 'token') {
        await loginWithToken(tokenInput().trim());
      } else if (mode() === 'password') {
        await login(username().trim(), password());
      } else {
        const st = smartToken().trim();
        if (st.length > 0 && looksLikeToken(st)) {
          await loginWithToken(st);
        } else if (smartUsername().trim() && smartPassword()) {
          await login(smartUsername().trim(), smartPassword());
        } else if (st.length > 0) {
          throw new Error('请输入密码');
        } else {
          throw new Error('请输入 refresh_token 或账号密码');
        }
      }
      navigate('/feed', { replace: true });
    } catch (err) {
      setError((err as { message?: string }).message ?? '登录失败，请检查输入');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="page flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} class="w-full max-w-sm flex flex-col gap-5">
        <div class="text-center mb-4">
          <div class="text-4xl mb-2">🎨</div>
          <h1 class="[font-size:var(--fontSizeHero800)] font-bold [color:var(--colorNeutralForeground1)]">
            Pixivizer
          </h1>
          <p class="[color:var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase300)] mt-1">
            登录你的 Pixiv 账号
          </p>
        </div>

        <div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:8px;background:#ff0;color:#000;font-size:16px;font-weight:bold">
          <span>A</span>
          <span>B</span>
          <span>C</span>
        </div>

        {/* 模式切换 — 用 div 包裹隔离 form 的 flex-col 影响 */}
        <div>
          <div style="display:flex;flex-direction:row;background-color:var(--colorNeutralBackground2);border-radius:var(--borderRadiusMedium);padding:0.375rem;gap:0.25rem">
            <div style="flex:1;padding:var(--spacingVerticalS) var(--spacingHorizontalM);border-radius:var(--borderRadiusSmall);font-size:var(--fontSizeBase200);font-weight:600;text-align:center;transition:all 150ms;cursor:pointer;user-select:none;background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);box-shadow:var(--elevation2)" onClick={() => setMode('token')}>Token</div>
            <div style="flex:1;padding:var(--spacingVerticalS) var(--spacingHorizontalM);border-radius:var(--borderRadiusSmall);font-size:var(--fontSizeBase200);font-weight:600;text-align:center;transition:all 150ms;cursor:pointer;user-select:none;background-color:transparent;color:var(--colorNeutralForeground2)" onClick={() => setMode('password')}>密码</div>
            <div style="flex:1;padding:var(--spacingVerticalS) var(--spacingHorizontalM);border-radius:var(--borderRadiusSmall);font-size:var(--fontSizeBase200);font-weight:600;text-align:center;transition:all 150ms;cursor:pointer;user-select:none;background-color:transparent;color:var(--colorNeutralForeground2)" onClick={() => setMode('smart')}>智能</div>
          </div>
        </div>

        {/* Token 模式 */}
        {mode() === 'token' && (
          <div class="flex flex-col gap-4">
            <p class="label">粘贴你的 Pixiv refresh_token</p>
            <textarea
              placeholder="粘贴 refresh_token..."
              value={tokenInput()}
              onInput={(e) => setTokenInput(e.currentTarget.value)}
              required
              disabled={submitting()}
              class="input min-h-24 resize-y"
              rows={3}
            />
          </div>
        )}

        {/* 密码模式 */}
        {mode() === 'password' && (
          <div class="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Pixiv ID / 邮箱"
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
              required
              disabled={submitting()}
              class="input"
            />
            <input
              type="password"
              placeholder="密码"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              required
              disabled={submitting()}
              class="input"
            />
          </div>
        )}

        {/* 智能模式：上方 token，下方账号密码，始终可见 */}
        {mode() === 'smart' && (
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <p class="label">refresh_token（优先）</p>
              <textarea
                placeholder="粘贴 refresh_token..."
                value={smartToken()}
                onInput={(e) => setSmartToken(e.currentTarget.value)}
                disabled={submitting()}
                class="input min-h-20 resize-y"
                rows={2}
              />
            </div>
            <div class="flex items-center gap-2">
              <div class="flex-1 border-t border-[var(--colorNeutralStroke2)]" />
              <span class="[font-size:var(--fontSizeBase100)] [color:var(--colorNeutralForeground3)]">或</span>
              <div class="flex-1 border-t border-[var(--colorNeutralStroke2)]" />
            </div>
            <div class="flex flex-col gap-3">
              <p class="label">账号密码</p>
              <input
                type="text"
                placeholder="Pixiv ID / 邮箱"
                value={smartUsername()}
                onInput={(e) => setSmartUsername(e.currentTarget.value)}
                disabled={submitting()}
                class="input"
              />
              <input
                type="password"
                placeholder="密码"
                value={smartPassword()}
                onInput={(e) => setSmartPassword(e.currentTarget.value)}
                disabled={submitting()}
                class="input"
              />
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error() && (
          <div class="[color:var(--colorStatusDangerForeground1)] [font-size:var(--fontSizeBase200)] text-center [background-color:var(--colorStatusDangerBackground2)] py-2 rounded-[var(--borderRadiusMedium)]">
            {error()}
          </div>
        )}

        {/* 登录按钮 */}
        <button
          type="submit"
          disabled={submitting()}
          class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting() ? (
            <>
              <span class="spinner w-4 h-4" />
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
