import { type Component, onMount, onCleanup, createSignal, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { user } from "../stores/authStore";
import { setCurrentTab } from "../stores/uiStore";
import { resolveImageUrl } from "../utils/imageLoader";

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
  loadFollowers,
  loadMoreFollowing,
  loadMoreFollowers,
  toggleUserFollow,
  switchTab,
} from "../stores/userStore";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import SettingsSheet from "../components/SettingsSheet";
import LoadingSpinner from "../components/LoadingSpinner";

interface Props {
  userId?: string;
}

const PersonalCenter: Component<Props> = (props) => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const targetUserId = () => Number(props.userId || params.id || user()?.id || 0);
  const isSelf = () => targetUserId() === (user()?.id ?? 0);
  const displayUser = () => (isSelf() ? user() : viewedUser());
  const [collapsed, setCollapsed] = createSignal(false);
  const COLLAPSE_THRESHOLD = 140;

  onMount(() => {
    setCurrentTab("me");
    const uid = targetUserId();
    loadProfile(uid);
    loadFollowing(uid);

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

  function fmtNum(n: number | undefined): string {
    if (n == null) return "—";
    if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
    return String(n);
  }

  let sentinelRef: HTMLDivElement | undefined;

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !loading()) {
          if (activeTab() === "following") loadMoreFollowing();
          else loadMoreFollowers();
        }
      },
      { rootMargin: "200px" },
    );
    if (sentinelRef) observer.observe(sentinelRef);
    return () => observer.disconnect();
  });

  const list = () => (activeTab() === "following" ? followingList() : followersList());

  return (
    <>
      <PageTransition>
        <div class="pb-16">
          {/* Header */}
          <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4 gap-3">
            <button onClick={() => navigate(-1)} class="btn-icon flex-shrink-0" aria-label="返回">
              ←
            </button>

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
                      class="absolute inset-0 w-full h-full rounded-[var(--borderRadiusCircular)] object-cover z-10"
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

          <Show when={displayUser()}>
            {/* User info */}
            <div class="flex flex-col items-center px-4 pt-6 pb-3">
              <div class="relative w-20 h-20">
                <AvatarFallback class="absolute inset-0 rounded-[var(--borderRadiusCircular)] ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]" />
                <img
                  src={avatarUrl(displayUser()!.profile_image_urls)}
                  alt={displayUser()!.name}
                  class="absolute inset-0 w-full h-full rounded-[var(--borderRadiusCircular)] object-cover ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)] z-10"
                  onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                />
              </div>
              <h2 class="mt-2 [font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                {displayUser()!.name}
              </h2>
              <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
                @{displayUser()!.account}
              </p>
            </div>

            {/* Stats card */}
            <div class="px-4 pb-4">
              <div class="surface-card rounded-[var(--borderRadiusMedium)] px-4 py-3 flex">
                <div class="flex-1 text-center">
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    {fmtNum(profile()?.total_illusts)}
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    插画
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
          <div class="sticky top-12 z-10 px-4 py-3 bg-[var(--colorNeutralBackground3)]">
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
                onClick={() => navigate(`/user/${preview.user.id}`)}
              >
                <div class="flex items-center gap-3">
                  <div class="relative w-10 h-10 flex-shrink-0">
                    <AvatarFallback class="absolute inset-0 rounded-[var(--borderRadiusCircular)]" />
                    <img
                      src={avatarUrl(preview.user.profile_image_urls)}
                      alt={preview.user.name}
                      class="absolute inset-0 w-full h-full rounded-[var(--borderRadiusCircular)] object-cover z-10"
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

            {loading() && <LoadingSpinner text="加载中..." />}

            {!loading() && list().length === 0 && !error() && (
              <p class="text-[var(--colorNeutralForeground2)] text-center py-8 [font-size:var(--fontSizeBase300)]">
                {activeTab() === "following" ? "还没有关注任何人" : "还没有粉丝"}
              </p>
            )}

            <div ref={sentinelRef} class="h-1" />
          </div>
        </div>
      </PageTransition>

      <NavBar />

      <SettingsSheet />
    </>
  );
};

export default PersonalCenter;
