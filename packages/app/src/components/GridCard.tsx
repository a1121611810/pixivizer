import { type Component, createSignal } from "solid-js";
import type { PixivIllust } from "../api/types";
import { listQuality } from "../stores/uiStore";
import { addBookmark, deleteBookmark, followUser, unfollowUser } from "../api/illust";
import PixivImage from "./PixivImage";
import HeartBurstEffect from "./HeartBurstEffect";
import { resolveImageUrl } from "../utils/imageLoader";

function resolveUrl(illust: PixivIllust): string {
  const q = listQuality();
  if (q === "medium") return illust.image_urls.medium;
  if (q === "large") return illust.image_urls.large;
  return illust.meta_single_page?.original_image_url ?? illust.image_urls.large;
}

interface Props {
  illust: PixivIllust;
  onClick: (id: number) => void;
}

const GridCard: Component<Props> = (props) => {
  const img = () => resolveUrl(props.illust);
  const [bookmarked, setBookmarked] = createSignal(props.illust.is_bookmarked);
  const [bookmarkBurstTrigger, setBookmarkBurstTrigger] = createSignal(0);
  const [privateHint, setPrivateHint] = createSignal(false);
  const [isFollowed, setIsFollowed] = createSignal(props.illust.user.is_followed ?? false);
  const [following, setFollowing] = createSignal(false);

  let longPressTimer: ReturnType<typeof setTimeout>;
  let hintTimer: ReturnType<typeof setTimeout>;

  const toggleFollow = async (e: MouseEvent) => {
    e.stopPropagation();
    if (following()) return;
    const prev = isFollowed();
    setIsFollowed(!prev);
    setFollowing(true);
    try {
      if (prev) {
        await unfollowUser(props.illust.user.id);
      } else {
        await followUser(props.illust.user.id);
      }
    } catch {
      setIsFollowed(prev);
    } finally {
      setFollowing(false);
    }
  };

  const showPrivateToast = () => {
    setPrivateHint(true);
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => setPrivateHint(false), 1500);
  };

  const toggleBookmark = async (e: MouseEvent, privateBookmark = false) => {
    e.stopPropagation();
    try {
      if (bookmarked()) {
        await deleteBookmark(props.illust.id);
        setBookmarked(false);
      } else {
        await addBookmark(props.illust.id, privateBookmark ? "private" : "public");
        setBookmarked(true);
        setBookmarkBurstTrigger((n) => n + 1);
        if (privateBookmark) showPrivateToast();
      }
    } catch {
      /* silently fail */
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    longPressTimer = setTimeout(() => {
      toggleBookmark(e as any, true);
      longPressTimer = 0 as any;
    }, 500);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = 0 as any;
      toggleBookmark(e as any, false);
    }
  };

  return (
    <div
      class="image-card h-full flex flex-col cursor-pointer"
      onClick={() => props.onClick(props.illust.id)}
    >
      {/* Thumbnail — fixed height, object-cover cropped */}
      <div class="relative flex-1 overflow-hidden rounded-[var(--borderRadiusMedium)] min-h-0">
        {/* Blur-up placeholder */}
        <img
          src={resolveImageUrl(props.illust.image_urls.square_medium)}
          alt=""
          class="absolute inset-0 w-full h-full object-cover blur-lg scale-110 pointer-events-none"
        />
        <PixivImage
          src={img()}
          alt={props.illust.title}
          width={props.illust.width}
          height={props.illust.height}
          loading="lazy"
          class="absolute inset-0 w-full h-full object-cover"
        />
        {/* Badges — top-left */}
        <div class="absolute top-1 left-1 flex items-center gap-[var(--spacingHorizontalXXS)] pointer-events-none select-none z-1 flex-wrap">
          {props.illust.x_restrict === 1 && (
            <fluent-badge appearance="filled" color="danger" style="font-size:10px">
              R-18
            </fluent-badge>
          )}
          {props.illust.x_restrict === 2 && (
            <fluent-badge appearance="filled" color="warning" style="font-size:10px">
              R-18G
            </fluent-badge>
          )}
          {props.illust.illust_ai_type != null && props.illust.illust_ai_type > 1 && (
            <fluent-badge appearance="filled" style="font-size:10px">
              {props.illust.illust_ai_type === 2 ? "AI" : "AI辅"}
            </fluent-badge>
          )}
        </div>
        {/* Multi-page indicator */}
        {props.illust.page_count > 1 && (
          <div class="absolute bottom-1 left-1">
            <fluent-badge appearance="subtle" style="font-size:10px">
              📄 {props.illust.page_count}
            </fluent-badge>
          </div>
        )}
        {/* Bookmark heart — bottom-right */}
        <div class="absolute bottom-1 right-1">
          <button
            class="w-6 h-6 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-xs transition-all active:scale-90 select-none"
            classList={{
              "text-red-400": bookmarked(),
              "text-white/70 hover:text-red-300": !bookmarked(),
            }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={() => {
              if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = 0 as any;
              }
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={bookmarked() ? "取消收藏" : "收藏"}
          >
            {bookmarked() ? "♥" : "♡"}
          </button>
          <HeartBurstEffect trigger={bookmarkBurstTrigger} size={60} particleCount={4} />
        </div>
        {privateHint() && (
          <div class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-[var(--borderRadiusMedium)] pointer-events-none z-10">
            <span class="text-white [font-size:var(--fontSizeBase100)] font-medium">已私密</span>
          </div>
        )}
      </div>
      {/* Info bar — matches ImageCard styling */}
      <div class="p-2.5">
        <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground1)] truncate font-semibold">
          {props.illust.title}
        </p>
        <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground2)] truncate mt-0.5 flex items-baseline gap-1">
          <span class="truncate">@{props.illust.user.name}</span>
          <span class="text-[var(--colorNeutralForegroundDisabled)] flex-shrink-0 select-none">
            ·
          </span>
          <button
            class="inline-flex items-center min-h-[40px] font-semibold [font-size:var(--fontSizeBase100)] cursor-pointer select-none transition-colors duration-[var(--durationFast)] ease-[var(--curveEasyEase)] active:scale-[0.95] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)] appearance-none border-none bg-transparent p-0 flex-shrink-0"
            classList={{
              "text-[var(--colorBrandForeground1)] hover:text-[var(--colorBrandForeground1Hover)]":
                !isFollowed(),
              "text-[var(--colorNeutralForeground3)] hover:text-[var(--colorStatusDangerForeground2)]":
                isFollowed(),
            }}
            onClick={toggleFollow}
            disabled={following()}
            aria-label={isFollowed() ? "取消关注" : "关注"}
          >
            {following() ? "…" : isFollowed() ? "已关注" : "关注"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default GridCard;
