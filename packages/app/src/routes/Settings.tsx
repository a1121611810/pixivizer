import { type Component, Show, createSignal, createEffect } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { Capacitor } from "@capacitor/core";
import { user, isLoggedIn } from "../stores/authStore";
import { profile, loadProfile } from "../stores/userStore";
import { resolveImageUrl, loadImage } from "../utils/imageLoader";
import PageTransition from "../components/PageTransition";
import NavBar from "../components/NavBar";
import FluentIcon from "../components/ui/FluentIcon";

function fmtNum(n: number | undefined): string {
  if (n == null) {
    return "—";
  }
  if (n >= 10_000) {
    return `${(n / 10_000).toFixed(1)}万`;
  }
  return String(n);
}

function AvatarFallback(props: { class?: string }) {
  return (
    <div
      class={`flex items-center justify-center bg-[var(--colorNeutralBackground2)] ${props.class || ""}`}
    >
      <svg
        width="60%"
        height="60%"
        viewBox="0 0 24 24"
        fill="none"
        class="text-[var(--colorNeutralForegroundDisabled)]"
      >
        <circle cx="12" cy="8" r="4" fill="currentColor" />
        <path d="M5 21c0-4 3.1-7 7-7s7 3 7 7" fill="currentColor" />
      </svg>
    </div>
  );
}

interface NavRow {
  label: string;
  desc: string;
  icon: Parameters<typeof FluentIcon>[0]["name"];
  to: string;
}

const navRows: NavRow[] = [
  {
    label: "外观设置",
    desc: "明暗主题、颜色主题、布局模式",
    icon: "weatherSunny",
    to: "/settings/appearance",
  },
  {
    label: "内容与过滤",
    desc: "R18 / R-18G 过滤、屏蔽列表、年龄确认",
    icon: "filter",
    to: "/settings/content",
  },
  {
    label: "存储与缓存",
    desc: "图片缓存管理、DNS over HTTPS",
    icon: "server",
    to: "/settings/storage",
  },
  {
    label: "图床代理",
    desc: "第三方图片代理源配置",
    icon: "image",
    to: "/image-host",
  },
  {
    label: "关于",
    desc: "版本信息、更新检查、账号管理",
    icon: "info",
    to: "/settings/about",
  },
];

const Settings: Component = () => {
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();
  const [avatarUrl, setAvatarUrl] = createSignal("");
  const [avatarErrored, setAvatarErrored] = createSignal(false);

  createEffect(() => {
    const u = user();
    if (!u) {
      setAvatarUrl("");
      return;
    }
    const src =
      u.profile_image_urls.medium ||
      u.profile_image_urls.px_170x170 ||
      u.profile_image_urls.px_50x50 ||
      "";
    if (!src) {
      setAvatarUrl("");
      return;
    }
    if (isNative) {
      loadImage(src)
        .then((r) => {
          setAvatarUrl(r.url);
        })
        .catch(() => {});
    } else {
      const url = resolveImageUrl(src);
      setAvatarUrl(url);
    }
  });

  // 加载 profile 用于统计
  createEffect(() => {
    const u = user();
    if (u) {
      loadProfile().catch(() => {});
    }
  });

  return (
    <PageTransition>
      <div class="min-h-screen pb-16 bg-[var(--colorNeutralBackground2)]">
        {/* Sticky header */}
        <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4 gap-3">
          <fluent-button
            appearance="subtle"
            aria-label="返回"
            on:click={() => navigate({ to: "/" })}
            style="min-width:32px;width:32px;height:32px;padding:0"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15.53 4.22a.75.75 0 0 1 0 1.06L8.81 12l6.72 6.72a.75.75 0 1 1-1.06 1.06l-7.25-7.25a.75.75 0 0 1 0-1.06l7.25-7.25a.75.75 0 0 1 1.06 0z"
                fill="currentColor"
              />
            </svg>
          </fluent-button>
          <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] flex-1">
            设置
          </h1>
        </header>

        {/* ── Profile section ── */}
        <Show when={user()}>
          <div class="bg-[var(--colorNeutralBackground1)] mx-4 mt-4 rounded-[var(--borderRadius2XLarge)] p-4 shadow-[var(--elevation2)]">
            <div class="flex flex-col items-center">
              {/* Avatar */}
              <div class="relative w-20 h-20">
                <AvatarFallback class="absolute inset-0 rounded-[var(--borderRadiusCircular)] ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]" />
                <Show when={!avatarErrored() && avatarUrl()}>
                  <img
                    src={avatarUrl()}
                    alt={user()!.name}
                    class="absolute inset-0 w-full h-full rounded-[var(--borderRadiusCircular)] object-cover ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]"
                    onError={() => setAvatarErrored(true)}
                  />
                </Show>
              </div>
              {/* Name */}
              <h2 class="mt-2 [font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                {user()!.name}
              </h2>
              {/* Account */}
              <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
                @{user()!.account}
              </p>
              {/* Stats card */}
              <Show when={profile()}>
                <div class="w-full mt-3 surface-card rounded-[var(--borderRadiusMedium)] px-4 py-3 flex">
                  <div
                    class="flex-1 text-center cursor-pointer rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
                    onClick={() => void navigate({ to: `/user/${user()!.id}/illusts` })}
                    role="button"
                    tabindex="0"
                    aria-label="查看作品"
                  >
                    <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                      {fmtNum(
                        (profile()?.total_illusts ?? 0) +
                          (profile()?.total_manga ?? 0) +
                          (profile()?.total_novels ?? 0),
                      )}
                    </p>
                    <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                      作品
                    </p>
                  </div>
                  <div
                    class="flex-1 text-center cursor-pointer rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
                    onClick={() => void navigate({ to: `/user/${user()!.id}/following` })}
                    role="button"
                    tabindex="0"
                    aria-label="查看关注"
                  >
                    <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                      {fmtNum(profile()?.total_follow_users)}
                    </p>
                    <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                      关注
                    </p>
                  </div>
                  <div
                    class="flex-1 text-center cursor-pointer rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
                    onClick={() => void navigate({ to: `/user/${user()!.id}/followers` })}
                    role="button"
                    tabindex="0"
                    aria-label="查看粉丝"
                  >
                    <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                      {fmtNum(profile()?.total_mypixiv_users)}
                    </p>
                    <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                      粉丝
                    </p>
                  </div>
                </div>
              </Show>
              {/* Skeleton when profile not loaded */}
              <Show when={!profile() && user()}>
                <div class="w-full mt-3 surface-card rounded-[var(--borderRadiusMedium)] px-4 py-3 flex">
                  {[0, 1, 2].map(() => (
                    <div class="flex-1 text-center">
                      <div class="h-5 w-10 bg-[var(--colorNeutralBackground2)] rounded mx-auto" />
                      <div class="h-3 w-6 bg-[var(--colorNeutralBackground2)] rounded mx-auto mt-1" />
                    </div>
                  ))}
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* ── Navigation rows ── */}
        <div class="mx-4 mt-4 rounded-[var(--borderRadius2XLarge)] bg-[var(--colorNeutralBackground1)] overflow-hidden shadow-[var(--elevation2)]">
          {navRows.map((row) => (
            <div
              class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)]"
              onClick={() => void navigate({ to: row.to })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void navigate({ to: row.to });
                }
              }}
              role="button"
              tabindex="0"
              aria-label={row.label}
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)] flex items-center justify-center">
                  <FluentIcon name={row.icon} size={24} />
                </div>
                <div class="min-w-0">
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    {row.label}
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    {row.desc}
                  </p>
                </div>
              </div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                class="flex-shrink-0 text-[var(--colorNeutralForeground3)] ml-2"
              >
                <path
                  d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z"
                  fill="currentColor"
                />
              </svg>
            </div>
          ))}
        </div>

        {/* ── Not logged in state ── */}
        <Show when={!isLoggedIn()}>
          <div class="mx-4 mt-4 rounded-[var(--borderRadius2XLarge)] bg-[var(--colorNeutralBackground1)] p-8 shadow-[var(--elevation2)]">
            <div class="flex flex-col items-center gap-3">
              <p class="[font-size:var(--fontSizeBase400)] text-[var(--colorNeutralForeground2)]">
                登录后可查看设置
              </p>
              <fluent-button appearance="primary" on:click={() => void navigate({ to: "/login" })}>
                登录 / 注册
              </fluent-button>
            </div>
          </div>
        </Show>
      </div>

      <NavBar />
    </PageTransition>
  );
};

export default Settings;
