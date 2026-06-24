import { type Component, onMount, Show, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { user } from "../stores/authStore";
import { setCurrentTab } from "../stores/uiStore";
import {
  profile,
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
import PixivImage from "../components/PixivImage";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import SettingsSheet from "../components/SettingsSheet";
import LoadingSpinner from "../components/LoadingSpinner";

const PersonalCenter: Component = () => {
  const navigate = useNavigate();

  onMount(() => {
    setCurrentTab("me");
    loadProfile();
    loadFollowing();
  });

  // 统计数字格式化
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
            <button onClick={() => navigate(-1)} class="btn-icon" aria-label="返回">
              ←
            </button>
            <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none">
              个人中心
            </h1>
          </header>

          <Show when={user()}>
            {/* User info */}
            <div class="flex flex-col items-center px-4 pt-6 pb-3">
              <PixivImage
                src={user()!.profile_image_urls.px_170x170}
                alt={user()!.name}
                width={80}
                height={80}
                class="w-20 h-20 rounded-[var(--borderRadiusCircular)] object-cover ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]"
              />
              <h2 class="mt-2 [font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                {user()!.name}
              </h2>
              <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
                @{user()!.account}
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

          {/* Segmented control */}
          <div class="px-4 pb-3">
            <div class="segmented">
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
              <div class="surface-card rounded-[var(--borderRadiusMedium)] p-3 flex items-center gap-3 transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] cursor-pointer select-none">
                <PixivImage
                  src={preview.user.profile_image_urls.px_170x170}
                  alt={preview.user.name}
                  width={40}
                  height={40}
                  class="w-10 h-10 rounded-[var(--borderRadiusCircular)] object-cover flex-shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <p class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)] truncate">
                    {preview.user.name}
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] truncate">
                    @{preview.user.account}
                  </p>
                </div>
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
