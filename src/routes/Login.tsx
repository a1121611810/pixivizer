import { type Component, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { login, loginWithToken, isLoggedIn } from "../stores/authStore";

type LoginMode = "token" | "password" | "smart";

function looksLikeToken(input: string): boolean {
  return input.trim().length >= 30 && /^[a-zA-Z0-9_-]+$/.test(input.trim());
}

const S = {
  page: "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:0 24px;background-color:var(--colorNeutralBackground3);color:var(--colorNeutralForeground1)",
  form: "width:100%;max-width:384px;display:flex;flex-direction:column;gap:20px",
  title: "text-align:center;margin-bottom:16px",
  h1: "font-size:var(--fontSizeHero800);font-weight:700;color:var(--colorNeutralForeground1)",
  sub: "color:var(--colorNeutralForeground2);font-size:var(--fontSizeBase300);margin-top:4px",
  segOuter:
    "display:flex;flex-direction:row;background-color:var(--colorNeutralBackground2);border-radius:var(--borderRadiusMedium);padding:6px;gap:4px",
  segBtn:
    "flex:1 1 0%;padding:8px 12px;border-radius:var(--borderRadiusSmall);font-size:var(--fontSizeBase200);font-weight:600;text-align:center;cursor:pointer;user-select:none;transition:all 0.15s",
  segActive:
    "background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);box-shadow:var(--elevation2)",
  segInactive: "background-color:transparent;color:var(--colorNeutralForeground2)",
  input:
    "width:100%;padding:6px 10px;border-radius:var(--borderRadiusMedium);background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);font-size:var(--fontSizeBase300);border:1px solid var(--colorNeutralStroke1);outline:none;box-sizing:border-box",
  textarea:
    "width:100%;padding:6px 10px;border-radius:var(--borderRadiusMedium);background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);font-size:var(--fontSizeBase300);border:1px solid var(--colorNeutralStroke1);outline:none;resize:vertical;box-sizing:border-box",
  btn: "width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 16px;border-radius:var(--borderRadiusMedium);font-size:var(--fontSizeBase300);font-weight:600;background-color:var(--colorBrandBackground);color:var(--colorNeutralForegroundOnBrand);border:none;cursor:pointer",
  error:
    "color:var(--colorStatusDangerForeground1);font-size:var(--fontSizeBase200);text-align:center;background-color:var(--colorStatusDangerBackground2);padding:8px;border-radius:var(--borderRadiusMedium)",
  label: "font-size:var(--fontSizeBase200);color:var(--colorNeutralForeground2);font-weight:400",
  divider: "display:flex;align-items:center;gap:8px",
  dividerLine: "flex:1;border-top:1px solid var(--colorNeutralStroke2)",
  dividerText: "font-size:var(--fontSizeBase100);color:var(--colorNeutralForeground3)",
  // 新增：emoji + 表单间距
  emoji: "font-size:var(--fontSizeHero900);margin-bottom:var(--spacingVerticalS)",
  fieldGroup: "display:flex;flex-direction:column;gap:var(--spacingVerticalL)",
  fieldGroupSmall: "display:flex;flex-direction:column;gap:var(--spacingVerticalS)",
  fieldGroupTight: "display:flex;flex-direction:column;gap:var(--spacingVerticalM)",
  textareaToken:
    "width:100%;padding:6px 10px;border-radius:var(--borderRadiusMedium);background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);font-size:var(--fontSizeBase300);border:1px solid var(--colorNeutralStroke1);outline:none;resize:vertical;box-sizing:border-box;min-height:96px",
  textareaSmart:
    "width:100%;padding:6px 10px;border-radius:var(--borderRadiusMedium);background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);font-size:var(--fontSizeBase300);border:1px solid var(--colorNeutralStroke1);outline:none;resize:vertical;box-sizing:border-box;min-height:80px",
};

const Login: Component = () => {
  const navigate = useNavigate();
  const [mode, setMode] = createSignal<LoginMode>("smart");
  const [tokenInput, setTokenInput] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [smartToken, setSmartToken] = createSignal("");
  const [smartUsername, setSmartUsername] = createSignal("");
  const [smartPassword, setSmartPassword] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    if (isLoggedIn()) navigate("/recommended", { replace: true });
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode() === "token") {
        await loginWithToken(tokenInput().trim());
      } else if (mode() === "password") {
        await login(username().trim(), password());
      } else {
        const st = smartToken().trim();
        if (st && looksLikeToken(st)) {
          await loginWithToken(st);
        } else if (smartUsername().trim() && smartPassword()) {
          await login(smartUsername().trim(), smartPassword());
        } else if (st) {
          throw new Error("请输入密码");
        } else {
          throw new Error("请输入 refresh_token 或账号密码");
        }
      }
      navigate("/recommended", { replace: true });
    } catch (err) {
      setError((err as { message?: string }).message ?? "登录失败");
    } finally {
      setSubmitting(false);
    }
  };

  const segBtnStyle = (active: boolean) => S.segBtn + ";" + (active ? S.segActive : S.segInactive);

  return (
    <div style={S.page}>
      <form onSubmit={handleSubmit} style={S.form}>
        <div style={S.title}>
          <div style={S.emoji}>🎨</div>
          <h1 style={S.h1}>Pixivizer</h1>
          <p style={S.sub}>登录你的 Pixiv 账号</p>
        </div>

        {/* 模式切换 — 水平 tabs */}
        <div style={S.segOuter}>
          <div style={segBtnStyle(mode() === "token")} onClick={() => setMode("token")}>
            Token
          </div>
          <div style={segBtnStyle(mode() === "password")} onClick={() => setMode("password")}>
            密码
          </div>
          <div style={segBtnStyle(mode() === "smart")} onClick={() => setMode("smart")}>
            智能
          </div>
        </div>

        {mode() === "token" && (
          <div style={S.fieldGroup}>
            <p style={S.label}>粘贴你的 Pixiv refresh_token</p>
            <textarea
              style={S.textareaToken}
              placeholder="粘贴 refresh_token..."
              value={tokenInput()}
              onInput={(e) => setTokenInput(e.currentTarget.value)}
              required
              disabled={submitting()}
              rows={3}
            />
          </div>
        )}

        {mode() === "password" && (
          <div style={S.fieldGroup}>
            <input
              style={S.input}
              type="text"
              placeholder="Pixiv ID / 邮箱"
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
              required
              disabled={submitting()}
            />
            <input
              style={S.input}
              type="password"
              placeholder="密码"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              required
              disabled={submitting()}
            />
          </div>
        )}

        {mode() === "smart" && (
          <div style={S.fieldGroup}>
            <div style={S.fieldGroupSmall}>
              <p style={S.label}>refresh_token（优先）</p>
              <textarea
                style={S.textareaSmart}
                placeholder="粘贴 refresh_token..."
                value={smartToken()}
                onInput={(e) => setSmartToken(e.currentTarget.value)}
                disabled={submitting()}
                rows={2}
              />
            </div>
            <div style={S.divider}>
              <div style={S.dividerLine} />
              <span style={S.dividerText}>或</span>
              <div style={S.dividerLine} />
            </div>
            <div style={S.fieldGroupTight}>
              <p style={S.label}>账号密码</p>
              <input
                style={S.input}
                type="text"
                placeholder="Pixiv ID / 邮箱"
                value={smartUsername()}
                onInput={(e) => setSmartUsername(e.currentTarget.value)}
                disabled={submitting()}
              />
              <input
                style={S.input}
                type="password"
                placeholder="密码"
                value={smartPassword()}
                onInput={(e) => setSmartPassword(e.currentTarget.value)}
                disabled={submitting()}
              />
            </div>
          </div>
        )}

        {error() && <div style={S.error}>{error()}</div>}

        <button type="submit" disabled={submitting()} style={S.btn}>
          {submitting() ? "登录中..." : "登录"}
        </button>
      </form>
    </div>
  );
};

export default Login;
