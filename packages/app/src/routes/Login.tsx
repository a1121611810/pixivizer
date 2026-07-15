import { type Component, createSignal, onMount } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { loginWithToken, isLoggedIn } from "../stores/authStore";
import { ApiErrorType, type ApiError } from "../api/types";
import { toApiError } from "../api/client";
import ErrorDisplay from "../components/ErrorDisplay";

const S = {
  page: "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:0 24px;background-color:var(--colorNeutralBackground3);color:var(--colorNeutralForeground1)",
  form: "width:100%;max-width:384px;display:flex;flex-direction:column;gap:20px",
  title: "text-align:center;margin-bottom:16px",
  h1: "font-size:var(--fontSizeHero800);font-weight:700;color:var(--colorNeutralForeground1)",
  sub: "color:var(--colorNeutralForeground2);font-size:var(--fontSizeBase300);margin-top:4px",
  iconBadge:
    "width:80px;height:80px;border-radius:24px;background-color:#ffffff;display:flex;align-items:center;justify-content:center;margin:0 auto var(--spacingVerticalM);box-shadow:var(--elevation4)",
  iconSvg: "width:52px;height:52px;display:block",
  label: "font-size:var(--fontSizeBase200);color:var(--colorNeutralForeground2);font-weight:400",
  textarea:
    "width:100%;padding:6px 10px;border-radius:var(--borderRadiusMedium);background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);font-size:var(--fontSizeBase300);border:1px solid var(--colorNeutralStroke1);outline:none;resize:vertical;box-sizing:border-box;min-height:96px",
  btn: "width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 16px;border-radius:var(--borderRadiusMedium);font-size:var(--fontSizeBase300);font-weight:600;background-color:var(--colorBrandBackground);color:var(--colorNeutralForegroundOnBrand);border:none;cursor:pointer",
  disclaimer:
    "font-size:var(--fontSizeBase100);color:var(--colorNeutralForeground3);line-height:1.5;text-align:center;padding:0 4px",
  fieldGroup: "display:flex;flex-direction:column;gap:var(--spacingVerticalL)",
};

const Login: Component = () => {
  const navigate = useNavigate();
  const [tokenInput, setTokenInput] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<ApiError | null>(null);

  onMount(() => {
    if (isLoggedIn()) void navigate({ to: "/recommended", replace: true });
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await loginWithToken(tokenInput().trim());
      void navigate({ to: "/recommended", replace: true });
    } catch (err) {
      setError(toApiError(err, "登录失败"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={S.page}>
      <form onSubmit={handleSubmit} style={S.form}>
        <div style={S.title}>
          <div style={S.iconBadge}>
            <svg style={S.iconSvg} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M18 12 C18 12 16 28 19 52 C19 52 22 54 24 50 C26 47 24 39 26 33 C26 33 37 35 45 27 C51 21 47 13 38 11 C31 9 24 12 18 12 Z"
                fill="#2b579a"
              />
              <path
                d="M22 16 C22 16 21 28 23 46"
                fill="none"
                stroke="#5a9fd4"
                stroke-width="3"
                stroke-linecap="round"
              />
              <circle cx="42" cy="19" r="2" fill="#7ab8e8" />
              <circle cx="46" cy="25" r="1.5" fill="#7ab8e8" />
            </svg>
          </div>
          <h1 style={S.h1}>Pictelio</h1>
          <p style={S.sub}>第三方插画浏览器</p>
        </div>

        <div style={S.fieldGroup}>
          <p style={S.label}>粘贴你的 Pixiv refresh_token</p>
          <fluent-textarea
            style="--inline-size:100%;--min-block-size:96px"
            placeholder="粘贴 refresh_token..."
            value={tokenInput()}
            on:input={(e) => setTokenInput((e.target as any).value)}
            required
            disabled={submitting()}
          ></fluent-textarea>
        </div>

        {error() && (
          <ErrorDisplay error={error()!} onRetry={() => handleSubmit(new Event("submit"))} />
        )}

        <fluent-button
          appearance="primary"
          disabled={submitting()}
          style="width:100%"
          on:click={handleSubmit}
        >
          {submitting() ? "登录中..." : "登录"}
        </fluent-button>

        <p style={S.disclaimer}>
          本应用与 Pixiv 官方无任何关联，不存储、托管或分发任何图片内容。所有插画均来自 Pixiv 公开
          API，版权归原作者所有。请通过可信渠道获取你的 refresh_token。
        </p>
      </form>
    </div>
  );
};

export default Login;
