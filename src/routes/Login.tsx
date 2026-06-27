import { type Component, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { loginWithToken, isLoggedIn } from "../stores/authStore";

const S = {
  page: "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:0 24px;background-color:var(--colorNeutralBackground3);color:var(--colorNeutralForeground1)",
  form: "width:100%;max-width:384px;display:flex;flex-direction:column;gap:20px",
  title: "text-align:center;margin-bottom:16px",
  h1: "font-size:var(--fontSizeHero800);font-weight:700;color:var(--colorNeutralForeground1)",
  sub: "color:var(--colorNeutralForeground2);font-size:var(--fontSizeBase300);margin-top:4px",
  emoji: "font-size:var(--fontSizeHero900);margin-bottom:var(--spacingVerticalS)",
  label: "font-size:var(--fontSizeBase200);color:var(--colorNeutralForeground2);font-weight:400",
  textarea:
    "width:100%;padding:6px 10px;border-radius:var(--borderRadiusMedium);background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);font-size:var(--fontSizeBase300);border:1px solid var(--colorNeutralStroke1);outline:none;resize:vertical;box-sizing:border-box;min-height:96px",
  btn: "width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 16px;border-radius:var(--borderRadiusMedium);font-size:var(--fontSizeBase300);font-weight:600;background-color:var(--colorBrandBackground);color:var(--colorNeutralForegroundOnBrand);border:none;cursor:pointer",
  error:
    "color:var(--colorStatusDangerForeground1);font-size:var(--fontSizeBase200);text-align:center;background-color:var(--colorStatusDangerBackground2);padding:8px;border-radius:var(--borderRadiusMedium)",
  disclaimer:
    "font-size:var(--fontSizeBase100);color:var(--colorNeutralForeground3);line-height:1.5;text-align:center;padding:0 4px",
  fieldGroup: "display:flex;flex-direction:column;gap:var(--spacingVerticalL)",
};

const Login: Component = () => {
  const navigate = useNavigate();
  const [tokenInput, setTokenInput] = createSignal("");
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
      await loginWithToken(tokenInput().trim());
      navigate("/recommended", { replace: true });
    } catch (err) {
      setError((err as { message?: string }).message ?? "登录失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={S.page}>
      <form onSubmit={handleSubmit} style={S.form}>
        <div style={S.title}>
          <div style={S.emoji}>🎨</div>
          <h1 style={S.h1}>Pictelio</h1>
          <p style={S.sub}>第三方插画浏览器</p>
        </div>

        <div style={S.fieldGroup}>
          <p style={S.label}>粘贴你的 Pixiv refresh_token</p>
          <textarea
            style={S.textarea}
            placeholder="粘贴 refresh_token..."
            value={tokenInput()}
            onInput={(e) => setTokenInput(e.currentTarget.value)}
            required
            disabled={submitting()}
            rows={3}
          />
        </div>

        {error() && <div style={S.error}>{error()}</div>}

        <button type="submit" disabled={submitting()} style={S.btn}>
          {submitting() ? "登录中..." : "登录"}
        </button>

        <p style={S.disclaimer}>
          本应用与 Pixiv 官方无任何关联，不存储、托管或分发任何图片内容。所有插画均来自 Pixiv 公开
          API，版权归原作者所有。请通过可信渠道获取你的 refresh_token。
        </p>
      </form>
    </div>
  );
};

export default Login;
