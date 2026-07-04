import { type Component, createSignal } from "solid-js";
import type { PixivIllust } from "../api/types";
import { listQuality } from "../stores/uiStore";
import { addBookmark, deleteBookmark, followUser, unfollowUser } from "../api/illust";
import PixivImage from "./PixivImage";
import HeartBurstEffect from "./HeartBurstEffect";
import IllustTags from "./IllustTags";
import { resolveImageUrl } from "../utils/imageLoader";

function resolveUrl(illust: PixivIllust): string {
  const q = listQuality();
  if (q === "medium") return illust.image_urls.medium;
  if (q === "large") return illust.image_urls.large;
  // original: use original_image_url if available, otherwise fallback to large
  return illust.meta_single_page?.original_image_url ?? illust.image_urls.large;
}

interface Props {
  illust: PixivIllust;
  onClick: (id: number) => void;
}

const ImageCard: Component<Props> = (props) => {
  const img = () => resolveUrl(props.illust);
  const w = () => props.illust.width;
  const h = () => props.illust.height;
  const isUgoira = () => props.illust.type === "ugoira";
  const [bookmarked, setBookmarked] = createSignal(props.illust.is_bookmarked);
  const [privateHint, setPrivateHint] = createSignal(false);
  const [bookmarkBurstTrigger, setBookmarkBurstTrigger] = createSignal(0);
  const [ugoiraHeight] = createSignal(Math.round(h() * 0.75));
  const [isFollowed, setIsFollowed] = createSignal(props.illust.user.is_followed ?? false);
  const [following, setFollowing] = createSignal(false);
  const [mainLoaded, setMainLoaded] = createSignal(false);

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

  let longPressTimer: ReturnType<typeof setTimeout>;
  let hintTimer: ReturnType<typeof setTimeout>;

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
      toggleBookmark(e as any, true); // private
      longPressTimer = 0 as any;
    }, 500);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = 0 as any;
      toggleBookmark(e as any, false); // public
    }
  };

  return (
    <div class="image-card" onClick={() => props.onClick(props.illust.id)}>
      <div class="relative overflow-hidden rounded-[var(--borderRadiusMedium)]">
        {/* Blur-up placeholder: square_medium 瞬间加载，铺底模糊占位；主图加载后淡出 */}
        <img
          src={resolveImageUrl(props.illust.image_urls.square_medium)}
          alt=""
          class="absolute inset-0 w-full h-full object-cover blur-lg scale-110 pointer-events-none transition-opacity duration-500"
          classList={{ "opacity-0": mainLoaded() }}
        />
        {isUgoira() ? (
          <div style={{ "aspect-ratio": `${w()} / ${ugoiraHeight()}` }} class="overflow-hidden">
            <PixivImage
              src={img()}
              alt={props.illust.title}
              width={w()}
              height={h()}
              loading="lazy"
              class="w-full h-full object-cover object-top"
              onLoad={() => setMainLoaded(true)}
            />
          </div>
        ) : (
          <PixivImage
            src={img()}
            alt={props.illust.title}
            width={w()}
            height={h()}
            loading="lazy"
            class="w-full h-auto block"
            onLoad={() => setMainLoaded(true)}
          />
        )}
        {isUgoira() && (
          <div class="absolute top-1.5 right-1.5">
            <fluent-badge appearance="filled">▶ 动图</fluent-badge>
          </div>
        )}
        {/* Badge group — 左上角，水平排列 */}
        <div class="absolute top-1.5 left-1.5 flex items-center gap-[var(--spacingHorizontalXXS)] pointer-events-none select-none z-1">
          {props.illust.x_restrict === 1 && (
            <fluent-badge appearance="filled" color="danger">
              R-18
            </fluent-badge>
          )}
          {props.illust.x_restrict === 2 && (
            <fluent-badge appearance="filled" color="warning">
              R-18G
            </fluent-badge>
          )}
          {props.illust.illust_ai_type != null && props.illust.illust_ai_type > 1 && (
            <fluent-badge appearance="filled">
              {props.illust.illust_ai_type === 2 ? "AI" : "AI辅助"}
            </fluent-badge>
          )}
        </div>
        {props.illust.page_count > 1 && (
          <div class="absolute bottom-1.5 left-1.5">
            <fluent-badge appearance="subtle">📄 {props.illust.page_count}</fluent-badge>
          </div>
        )}
        {/* Bookmark heart — bottom-right */}
        <div class="absolute bottom-1.5 right-1.5">
          <button
            class="w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-sm transition-all active:scale-90 select-none"
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
          <HeartBurstEffect trigger={bookmarkBurstTrigger} size={80} particleCount={6} />
        </div>
        {privateHint() && (
          <div class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-[var(--borderRadiusMedium)] pointer-events-none z-10">
            <span class="text-white [font-size:var(--fontSizeBase200)] font-medium">
              已私密收藏
            </span>
          </div>
        )}
      </div>
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
            onClick={(e) => toggleFollow(e)}
            disabled={following()}
            aria-label={isFollowed() ? "取消关注" : "关注"}
          >
            {following() ? "…" : isFollowed() ? "已关注" : "关注"}
          </button>
        </p>
        <IllustTags tags={props.illust.tags} size="small" class="mt-1.5" />
      </div>
    </div>
  );
};

export default ImageCard;
