import { type Component, onCleanup, Show, For } from "solid-js";
import { useNavigate, useParams, useRouter } from "@tanstack/solid-router";
import { resolveImageUrl } from "../utils/imageLoader";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import SettingsDrawer from "../components/SettingsDrawer";
import LoadingSpinner from "../components/LoadingSpinner";
import { createSentinelPaginator } from "../primitives/createSentinelPaginator";
import { scrollToTop } from "../utils/scrollToTop";
import {
  users,
  loading,
  error,
  loadMore,
  reset,
  toggleFollow,
  type FollowMode,
} from "../stores/followListStore";

interface Props {
  mode: FollowMode;
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

function avatarUrl(urls: { medium?: string; px_50x50?: string; px_170x170?: string }): string {
  const src = urls.medium || urls.px_170x170 || urls.px_50x50 || "";
  return resolveImageUrl(src);
}

const FollowListPage: Component<Props> = (props) => {
  const navigate = useNavigate();
  const router = useRouter();
  const params = useParams({ strict: false });
  const userId = () => Number(params().id);

  // 初始数据由路由 loader 加载；组件卸载时重置列表。
  onCleanup(() => {
    reset();
  });

  const { attach: sentinelAttach } = createSentinelPaginator({
    rootMargin: "200px",
    enabled: () => !loading(),
    onTrigger: () => loadMore(props.mode, userId()),
  });

  return (
    <>
      <PageTransition>
        <div class="pb-16">
          {/* Header */}
          <header
            class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4 gap-3"
            onDblClick={scrollToTop}
          >
            <fluent-button
              appearance="subtle"
              aria-label="返回"
              on:click={() => router.history.back()}
              style="min-width:32px;width:32px;height:32px;padding:0"
            >
              ←
            </fluent-button>
            <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none">
              {props.mode === "following" ? "关注" : "粉丝"}
            </h1>
          </header>

          {/* User list */}
          <div class="px-4 flex flex-col" style={{ gap: "var(--spacingVerticalS)" }}>
            {error() && (
              <div class="text-center py-4 px-4 rounded-[var(--borderRadiusMedium)] bg-[var(--colorStatusDangerBackground2)] text-[var(--colorStatusDangerForeground1)]">
                <p class="[font-size:var(--fontSizeBase200)]">{error()}</p>
              </div>
            )}

            <For each={users()}>
              {(preview, index) => (
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
                    {/* 关注按钮（非当前用户时显示） */}
                    <Show when={preview.user.is_followed != null}>
                      <button
                        class="inline-flex items-center justify-center min-h-[40px] font-semibold [font-size:var(--fontSizeBase100)] cursor-pointer select-none transition-colors duration-[var(--durationFast)] ease-[var(--curveEasyEase)] active:scale-[0.95] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[var(--colorStrokeFocus2)] appearance-none border-none bg-transparent p-0 px-[var(--spacingHorizontalS)] flex-shrink-0"
                        classList={{
                          "text-[var(--colorBrandForeground1)] hover:text-[var(--colorBrandForeground1Hover)]":
                            !preview.user.is_followed,
                          "text-[var(--colorNeutralForeground3)] hover:text-[var(--colorStatusDangerForeground2)]":
                            preview.user.is_followed,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFollow(index());
                        }}
                        aria-label={preview.user.is_followed ? "取消关注" : "关注"}
                      >
                        {preview.user.is_followed ? "已关注" : "关注"}
                      </button>
                    </Show>
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
              )}
            </For>

            {loading() && users().length === 0 && (
              <div class="flex flex-col" style={{ gap: "var(--spacingVerticalS)" }}>
                {/* 骨架屏 */}
                {Array.from({ length: 5 }).map(() => (
                  <div class="surface-card rounded-[var(--borderRadiusMedium)] p-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-[var(--borderRadiusCircular)] bg-[var(--colorNeutralBackground2)] flex-shrink-0" />
                      <div class="flex-1 flex flex-col gap-1.5">
                        <div class="h-4 rounded w-24 bg-[var(--colorNeutralBackground2)]" />
                        <div class="h-3 rounded w-16 bg-[var(--colorNeutralBackground2)]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loading() && <LoadingSpinner text="加载中..." />}

            {!loading() && users().length === 0 && !error() && (
              <p class="text-[var(--colorNeutralForeground2)] text-center py-8 [font-size:var(--fontSizeBase300)]">
                {props.mode === "following" ? "还没有关注任何人" : "还没有粉丝"}
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

export default FollowListPage;
