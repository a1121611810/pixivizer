import { type Component, onMount, onCleanup, createSignal, createEffect, Show } from "solid-js";
import { useNavigate, useParams, useRouter } from "@tanstack/solid-router";
import { user } from "../stores/authStore";
import { setCurrentTab } from "../stores/uiStore";
import { resolveImageUrl } from "../utils/imageLoader";
import { unfollowUser, followUser } from "../api/illust";
import { createSentinelPaginator } from "../primitives/createSentinelPaginator";

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

function avatarUrl(urls: { medium?: string; px_50x50?: string; px_170x170?: string }): string {
  const src = urls.medium || urls.px_170x170 || urls.px_50x50 || "";
  return resolveImageUrl(src);
}

const shimmerStyle = {
  background:
    "linear-gradient(90deg, var(--colorNeutralBackground2) 25%, var(--colorNeutralBackground1) 50%, var(--colorNeutralBackground2) 75%)",
  "background-size": "200% 100%",
  animation: "fluent-shimmer var(--durationSlower) var(--curveEasyEase) infinite",
};

function Shimmer(props: { class?: string; style?: Record<string, string | number> }) {
  return <div class={props.class || ""} style={{ ...shimmerStyle, ...props.style }} />;
}

import {
  profile,
  viewedUser,
  followingList,
  followersList,
  loading,
  error,
  activeTab,
  loadProfile,
  loadFollowing,
  loadMoreFollowing,
  loadMoreFollowers,
  toggleUserFollow,
  switchTab,
  resetData,
} from "../stores/userStore";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import SettingsDrawer from "../components/SettingsDrawer";
import LoadingSpinner from "../components/LoadingSpinner";

interface Props {
  userId?: string;
}

function fmtNum(n: number | undefined): string {
  if (n == null) return "—";
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}

const list = () => (activeTab() === "following" ? followingList() : followersList());

const PersonalCenter: Component<Props> = (props) => {
  const navigate = useNavigate();
  const router = useRouter();
  const params = useParams({ strict: false });
  const targetUserId = () => Number(props.userId || params().id || user()?.id || 0);
  const isSelf = () => targetUserId() === Number(user()?.id ?? 0);
  const displayUser = () => (isSelf() ? user() : viewedUser());
  const [collapsed, setCollapsed] = createSignal(false);
  const COLLAPSE_THRESHOLD = 140;

  onMount(() => {
    setCurrentTab("me");

    // ── Scroll-driven header collapse ──
    let scrollTicking = false;
    function onScroll() {
      setCollapsed(window.scrollY > COLLAPSE_THRESHOLD);
    }
    function onScrollRaf() {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(() => {
          onScroll();
          scrollTicking = false;
        });
      }
    }
    window.addEventListener("scroll", onScrollRaf, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", onScrollRaf));
  });

  // 用户切换时加载，缓存命中则跳过请求
  let prevUid = 0;
  createEffect(() => {
    const uid = targetUserId();
    if (uid === prevUid) return;
    prevUid = uid;
    resetData();
    loadProfile(uid);
    loadFollowing(uid);
    window.scrollTo(0, 0);
  });

  const { attach: sentinelAttach } = createSentinelPaginator({
    rootMargin: "200px",
    enabled: () => !loading(),
    onTrigger: () => {
      if (activeTab() === "following") loadMoreFollowing();
      else loadMoreFollowers();
    },
  });

  // R18 开关切换时自动刷新关注列表
  onMount(() => {
    const handler = () => {
      const uid = targetUserId();
      loadFollowing(uid);
    };
    window.addEventListener("r18Changed", handler);
    onCleanup(() => window.removeEventListener("r18Changed", handler));
  });

  return (
    <>
      <PageTransition>
        <div class="pb-16">
          {/* Header */}
          <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4 gap-3">
            <fluent-button
              appearance="subtle"
              aria-label="返回"
              on:click={() => router.history.back()}
              style="min-width:32px;width:32px;height:32px;padding:0"
            >
              ←
            </fluent-button>

            <span class="relative flex-1 min-w-0 h-full flex items-center">
              {/* 收起态：小头像 + 名称 (absolute overlay) */}
              <span
                class="absolute inset-0 flex items-center gap-2 min-w-0 transition-opacity duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                style={{
                  opacity: collapsed() ? "1" : "0",
                  "pointer-events": collapsed() ? "auto" : "none",
                }}
                aria-hidden={!collapsed()}
              >
                <div class="relative w-6 h-6 flex-shrink-0">
                  <AvatarFallback class="absolute inset-0 rounded-[var(--borderRadiusCircular)]" />
                  <Show when={displayUser()}>
                    <img
                      src={avatarUrl(displayUser()!.profile_image_urls)}
                      alt={displayUser()!.name}
                      class="absolute inset-0 w-full h-full rounded-[var(--borderRadiusCircular)] object-cover"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                  </Show>
                </div>
                <span class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)] truncate">
                  {displayUser()?.name}
                </span>
              </span>

              {/* 展开态：标题 */}
              <span
                class="transition-opacity duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                style={{
                  opacity: collapsed() ? "0" : "1",
                  "pointer-events": collapsed() ? "none" : "auto",
                }}
                aria-hidden={collapsed()}
              >
                <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none">
                  个人中心
                </h1>
              </span>
            </span>
          </header>

          <Show
            when={displayUser()}
            fallback={
              /* Profile skeleton */
              <div class="flex flex-col items-center px-4 pt-6 pb-3">
                <Shimmer class="w-20 h-20 rounded-[var(--borderRadiusCircular)]" />
                <Shimmer class="mt-2 h-5 rounded w-24" />
                <Shimmer class="mt-1 h-4 rounded w-16" />
              </div>
            }
          >
            {/* User info */}
            <div class="flex flex-col items-center px-4 pt-6 pb-3">
              <div class="relative w-20 h-20">
                <AvatarFallback class="absolute inset-0 rounded-[var(--borderRadiusCircular)] ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]" />
                <img
                  src={avatarUrl(displayUser()!.profile_image_urls)}
                  alt={displayUser()!.name}
                  class="absolute inset-0 w-full h-full rounded-[var(--borderRadiusCircular)] object-cover ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]"
                  onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                />
              </div>
              <h2 class="mt-2 [font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                {displayUser()!.name}
              </h2>
              <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
                @{displayUser()!.account}
              </p>
              {!isSelf() && (
                <button
                  class="inline-flex items-center justify-center gap-[var(--spacingHorizontalXS)] rounded-[var(--borderRadiusMedium)] font-semibold [font-size:var(--fontSizeBase200)] min-h-8 px-[var(--spacingHorizontalM)] border transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] active:scale-[0.97] select-none cursor-pointer focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)] mt-2"
                  classList={{
                    "bg-[var(--colorBrandBackground)] text-white border-[var(--colorBrandBackground)] hover:bg-[var(--colorBrandBackgroundHover)] active:bg-[var(--colorBrandBackgroundPressed)]":
                      !(viewedUser()?.is_followed ?? false),
                    "bg-transparent text-[var(--colorNeutralForeground2)] border-[var(--colorNeutralStroke2)] hover:text-[var(--colorStatusDangerForeground1)] hover:border-[var(--colorStatusDangerForeground1)]":
                      viewedUser()?.is_followed ?? false,
                  }}
                  onClick={async () => {
                    const vu = viewedUser();
                    if (!vu) return;
                    const prev = vu.is_followed ?? false;
                    vu.is_followed = !prev;
                    // trigger reactive update
                    loadProfile(vu.id);
                    try {
                      if (prev) {
                        await unfollowUser(vu.id);
                      } else {
                        await followUser(vu.id);
                      }
                    } catch {
                      vu.is_followed = prev;
                      loadProfile(vu.id);
                    }
                  }}
                >
                  {viewedUser()?.is_followed ? "已关注" : "关注"}
                </button>
              )}
            </div>

            {/* Stats card */}
            <div class="px-4 pb-4">
              <div class="surface-card rounded-[var(--borderRadiusMedium)] px-4 py-3 flex">
                <div
                  class="flex-1 text-center cursor-pointer rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
                  onClick={() => void navigate({ to: `/user/${targetUserId()}/illusts` })}
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
                <div class="flex-1 text-center">
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    {fmtNum(profile()?.total_follow_users)}
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    关注
                  </p>
                </div>
                <div class="flex-1 text-center">
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    {fmtNum(profile()?.total_mypixiv_users)}
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    粉丝
                  </p>
                </div>
              </div>
            </div>
          </Show>

          {/* Segmented control — sticky below header */}
          <div class="sticky top-12 z-10 px-4 py-3 bg-[var(--colorNeutralBackgroundAlpha)] backdrop-blur-[30px] backdrop-saturate-[125%]">
            <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
              <button
                classList={{
                  "segmented-item-active": activeTab() === "following",
                  "segmented-item-inactive": activeTab() !== "following",
                }}
                onClick={() => switchTab("following")}
              >
                关注中
              </button>
              <button
                classList={{
                  "segmented-item-active": activeTab() === "followers",
                  "segmented-item-inactive": activeTab() !== "followers",
                }}
                onClick={() => switchTab("followers")}
              >
                粉丝
              </button>
            </div>
          </div>

          {/* User list */}
          <div class="px-4 flex flex-col" style={{ gap: "var(--spacingVerticalS)" }}>
            {error() && (
              <div class="text-center py-4 px-4 rounded-[var(--borderRadiusMedium)] bg-[var(--colorStatusDangerBackground2)] text-[var(--colorStatusDangerForeground1)]">
                <p class="[font-size:var(--fontSizeBase200)]">{error()}</p>
              </div>
            )}

            {list().map((preview) => (
              <div
                class="surface-card rounded-[var(--borderRadiusMedium)] p-3 transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] cursor-pointer select-none"
                onClick={() => void navigate({ to: `/user/${preview.user.id}` })}
              >
                <div class="flex items-center gap-3">
                  <div class="relative w-10 h-10 flex-shrink-0">
                    <AvatarFallback class="absolute inset-0 rounded-[var(--borderRadiusCircular)]" />
                    <img
                      src={avatarUrl(preview.user.profile_image_urls)}
                      alt={preview.user.name}
                      class="absolute inset-0 w-full h-full rounded-[var(--borderRadiusCircular)] object-cover"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)] truncate">
                      {preview.user.name}
                    </p>
                    <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] truncate">
                      @{preview.user.account}
                    </p>
                  </div>
                  {!isSelf() && (
                    <button
                      class="inline-flex items-center justify-center min-h-[40px] font-semibold [font-size:var(--fontSizeBase100)] cursor-pointer select-none transition-colors duration-[var(--durationFast)] ease-[var(--curveEasyEase)] active:scale-[0.95] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)] appearance-none border-none bg-transparent p-0 px-[var(--spacingHorizontalS)] flex-shrink-0"
                      classList={{
                        "text-[var(--colorBrandForeground1)] hover:text-[var(--colorBrandForeground1Hover)]":
                          !preview.user.is_followed,
                        "text-[var(--colorNeutralForeground3)] hover:text-[var(--colorStatusDangerForeground2)]":
                          preview.user.is_followed,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleUserFollow(preview, activeTab());
                      }}
                      aria-label={preview.user.is_followed ? "取消关注" : "关注"}
                    >
                      {preview.user.is_followed ? "已关注" : "关注"}
                    </button>
                  )}
                </div>
                {preview.illusts && preview.illusts.length > 0 && (
                  <div class="flex gap-1.5 mt-2">
                    {preview.illusts.slice(0, 3).map((illust) => (
                      <img
                        src={resolveImageUrl(illust.image_urls.square_medium)}
                        alt={illust.title}
                        class="h-12 aspect-square rounded-[var(--borderRadiusSmall)] object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading() && list().length === 0 && (
              <div class="flex flex-col" style={{ gap: "var(--spacingVerticalS)" }}>
                {Array.from({ length: 5 }).map(() => (
                  <div class="surface-card rounded-[var(--borderRadiusMedium)] p-3">
                    <div class="flex items-center gap-3">
                      <Shimmer class="w-10 h-10 rounded-[var(--borderRadiusCircular)] flex-shrink-0" />
                      <div class="flex-1 flex flex-col gap-1.5">
                        <Shimmer class="h-4 rounded w-24" />
                        <Shimmer class="h-3 rounded w-16" />
                      </div>
                    </div>
                    <div class="flex gap-1.5 mt-2">
                      <Shimmer class="h-12 aspect-square rounded-[var(--borderRadiusSmall)]" />
                      <Shimmer class="h-12 aspect-square rounded-[var(--borderRadiusSmall)]" />
                      <Shimmer class="h-12 aspect-square rounded-[var(--borderRadiusSmall)]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loading() && <LoadingSpinner text="加载中..." />}

            {!loading() && list().length === 0 && !error() && (
              <p class="text-[var(--colorNeutralForeground2)] text-center py-8 [font-size:var(--fontSizeBase300)]">
                {activeTab() === "following" ? "还没有关注任何人" : "还没有粉丝"}
              </p>
            )}

            <div ref={sentinelAttach} class="h-1" />
          </div>
        </div>
      </PageTransition>

      <NavBar />

      <SettingsDrawer />
    </>
  );
};

export default PersonalCenter;
