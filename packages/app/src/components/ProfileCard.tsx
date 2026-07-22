import { type Component, Show, createSignal, createEffect } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { user } from "../stores/authStore";
import { profile, viewedUser } from "../stores/userStore";
import { followUser, unfollowUser } from "../api/illust";
import { openSettingsDrawer } from "../stores/uiStore";
import { Capacitor } from "@capacitor/core";
import { resolveImageUrl, loadImage } from "../utils/imageLoader";

function AvatarFallback(props: { class?: string }) {
  return (
    <div
      class={`flex items-center justify-center bg-[var(--colorNeutralBackground2)] ${props.class || ""}`}
    >
      <svg
        width="60%" height="60%" viewBox="0 0 24 24" fill="none"
        class="text-[var(--colorNeutralForegroundDisabled)]"
      >
        <circle cx="12" cy="8" r="4" fill="currentColor" />
        <path d="M5 21c0-4 3.1-7 7-7s7 3 7 7" fill="currentColor" />
      </svg>
    </div>
  );
}

function fmtNum(n: number | undefined): string {
  if (n == null) return "—";
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  return String(n);
}

interface Props {
  targetUserId: number;
  isSelf: boolean;
}

const ProfileCard: Component<Props> = (props) => {
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();
  const [avatarUrl, setAvatarUrl] = createSignal("");
  const [errored, setErrored] = createSignal(false);
  const [following, setFollowing] = createSignal(false);

  const displayUser = () => (props.isSelf ? user() : viewedUser());

  createEffect(() => {
    const u = displayUser();
    if (!u) {
      setAvatarUrl("");
      return;
    }
    const src = u.profile_image_urls.px_170x170 || u.profile_image_urls.medium || "";
    if (!src) {
      setAvatarUrl("");
      return;
    }
    setErrored(false);
    if (isNative) {
      loadImage(src).then((r) => setAvatarUrl(r.url)).catch(() => {});
    } else {
      setAvatarUrl(resolveImageUrl(src));
    }
  });

  createEffect(() => {
    setFollowing(viewedUser()?.is_followed ?? false);
  });

  async function handleToggleFollow() {
    const vu = viewedUser();
    if (!vu) return;
    const prev = following();
    setFollowing(!prev);
    try {
      if (prev) {
        await unfollowUser(vu.id);
      } else {
        await followUser(vu.id);
      }
    } catch {
      setFollowing(prev);
    }
  }

  const totalWorks = () =>
    (profile()?.total_illusts ?? 0) +
    (profile()?.total_manga ?? 0) +
    (profile()?.total_novels ?? 0);

  return (
    <div class="surface-glass rounded-[var(--borderRadiusLarge)] px-[var(--spacingHorizontalXXL)] py-[var(--spacingVerticalXXL)] flex flex-col items-center gap-3 relative z-10">
      {/* Avatar — 120px */}
      <div class="relative w-[120px] h-[120px]">
        <AvatarFallback class="absolute inset-0 rounded-[var(--borderRadiusCircular)] ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]" />
        <Show when={!errored() && avatarUrl()}>
          <img
            src={avatarUrl()}
            alt={displayUser()?.name ?? ""}
            class="absolute inset-0 w-full h-full rounded-[var(--borderRadiusCircular)] object-cover ring-[var(--strokeWidthThin)] ring-[var(--colorBrandStroke1)] shadow-[0_0_20px_var(--colorBrandStroke1Hover)]"
            onError={() => setErrored(true)}
          />
        </Show>
      </div>

      {/* Name + Account */}
      <div class="text-center">
        <h2 class="[font-size:var(--fontSizeBase600)] font-semibold text-[var(--colorNeutralForeground1)]">
          {displayUser()?.name}
        </h2>
        <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
          @{displayUser()?.account}
        </p>
        <Show when={displayUser()?.comment}>
          <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground2)] mt-1 max-w-[280px] line-clamp-2">
            {displayUser()!.comment}
          </p>
        </Show>
      </div>

      {/* Stats row */}
      <div class="flex gap-4 w-full justify-center mt-1">
        <button
          class="flex flex-col items-center gap-0.5 px-4 py-2 rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
          onClick={() => void navigate({ to: `/user/${props.targetUserId}/illusts` })}
          aria-label="查看作品"
        >
          <span class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
            {fmtNum(totalWorks())}
          </span>
          <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)]">作品</span>
        </button>
        <button
          class="flex flex-col items-center gap-0.5 px-4 py-2 rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
          onClick={() => void navigate({ to: `/user/${props.targetUserId}/following` })}
          aria-label="查看关注"
        >
          <span class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
            {fmtNum(profile()?.total_follow_users)}
          </span>
          <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)]">关注</span>
        </button>
        <button
          class="flex flex-col items-center gap-0.5 px-4 py-2 rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
          onClick={() => void navigate({ to: `/user/${props.targetUserId}/followers` })}
          aria-label="查看粉丝"
        >
          <span class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
            {fmtNum(profile()?.total_mypixiv_users)}
          </span>
          <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)]">粉丝</span>
        </button>
      </div>

      {/* Action button */}
      <div class="mt-1">
        <Show
          when={props.isSelf}
          fallback={
            <button
              class="inline-flex items-center justify-center gap-[var(--spacingHorizontalXS)] rounded-[var(--borderRadiusMedium)] font-semibold [font-size:var(--fontSizeBase200)] min-h-8 px-[var(--spacingHorizontalM)] border transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] active:scale-[0.97] select-none cursor-pointer focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
              classList={{
                "bg-[var(--colorBrandBackground)] text-white border-[var(--colorBrandBackground)] hover:bg-[var(--colorBrandBackgroundHover)]":
                  !following(),
                "bg-transparent text-[var(--colorNeutralForeground2)] border-[var(--colorNeutralStroke2)] hover:text-[var(--colorStatusDangerForeground1)] hover:border-[var(--colorStatusDangerForeground1)]":
                  following(),
              }}
              onClick={handleToggleFollow}
            >
              {following() ? "已关注" : "关注"}
            </button>
          }
        >
          <button
            class="inline-flex items-center justify-center gap-[var(--spacingHorizontalXS)] rounded-[var(--borderRadiusMedium)] font-semibold [font-size:var(--fontSizeBase200)] min-h-8 px-[var(--spacingHorizontalM)] border border-[var(--colorNeutralStroke2)] bg-transparent text-[var(--colorNeutralForeground2)] transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] active:scale-[0.97] select-none cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
            onClick={() => openSettingsDrawer()}
          >
            编辑资料
          </button>
        </Show>
      </div>
    </div>
  );
};

export default ProfileCard;
