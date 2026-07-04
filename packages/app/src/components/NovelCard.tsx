import { type Component, createSignal, For } from "solid-js";
import type { PixivNovel } from "../api/types";
import { addBookmark, deleteBookmark } from "../api/novel";
import HeartBurstEffect from "./HeartBurstEffect";
import IllustTags from "./IllustTags";
import { resolveImageUrl } from "../utils/imageLoader";

interface Props {
  novel: PixivNovel;
  onClick: (id: number) => void;
  onSeriesClick?: (seriesId: number) => void;
}

const NovelCard: Component<Props> = (props) => {
  const [bookmarked, setBookmarked] = createSignal(props.novel.is_bookmarked);
  const [bookmarkBurstTrigger, setBookmarkBurstTrigger] = createSignal(0);
  const [privateHint, setPrivateHint] = createSignal(false);
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
        await deleteBookmark(props.novel.id);
        setBookmarked(false);
      } else {
        await addBookmark(props.novel.id, privateBookmark ? "private" : "public");
        setBookmarked(true);
        setBookmarkBurstTrigger((n) => n + 1);
        if (privateBookmark) showPrivateToast();
      }
    } catch {
      /* silently fail */
    }
  };

  let longPressTimer: ReturnType<typeof setTimeout>;

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
      class="bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] shadow-[var(--elevation2)] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-[var(--durationFast)] ease-[var(--curveEasyEase)] h-[180px]"
      onClick={() => props.onClick(props.novel.id)}
    >
      <div class="flex gap-3 p-2.5 h-full">
        {/* Cover image — fixed 128px square */}
        <div class="relative w-[128px] h-[128px] flex-shrink-0 rounded-[var(--borderRadiusSmall)] overflow-hidden">
          <img
            src={resolveImageUrl(props.novel.image_urls.square_medium)}
            alt={props.novel.title}
            class="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Badge group — 左上角 */}
          <div class="absolute top-1 left-1 flex items-center gap-1 pointer-events-none z-1">
            {props.novel.x_restrict > 0 && (
              <fluent-badge
                appearance="filled"
                color={props.novel.x_restrict === 1 ? "danger" : "warning"}
              >
                {props.novel.x_restrict === 1 ? "R-18" : "R-18G"}
              </fluent-badge>
            )}
            {props.novel.novel_ai_type != null && props.novel.novel_ai_type > 1 && (
              <fluent-badge appearance="filled">
                {props.novel.novel_ai_type === 2 ? "AI" : "AI辅助"}
              </fluent-badge>
            )}
          </div>
        </div>

        {/* Info area — 固定高度与 NovelVirtualFeed 的 CARD_HEIGHT 匹配 */}
        <div class="flex-1 min-w-0 flex flex-col gap-1 h-[128px] overflow-hidden">
          <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground1)] line-clamp-2 leading-tight">
            {props.novel.title}
          </p>
          <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground2)] truncate">
            @{props.novel.user.name}
          </p>
          <div class="flex items-center gap-2 text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase100)]">
            <span>★ {props.novel.total_bookmarks}</span>
            {props.novel.page_count > 1 && <span>📄 {props.novel.page_count}页</span>}
          </div>
          <IllustTags tags={props.novel.tags} size="small" class="max-h-[36px] overflow-hidden" />
          <div class="mt-auto flex items-center gap-2 text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase100)]">
            <span>📖 {props.novel.text_length.toLocaleString()}字</span>
            {props.novel.series?.title && (
              <button
                class="inline-flex items-center bg-transparent border-none p-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onSeriesClick?.(props.novel.series!.id!);
                }}
                aria-label={`查看系列: ${props.novel.series.title}`}
              >
                <fluent-badge appearance="subtle">📚 系列</fluent-badge>
              </button>
            )}
          </div>
        </div>

        {/* Bookmark button */}
        <div class="flex-shrink-0 self-start">
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
      </div>

      {/* Private bookmark toast */}
      {privateHint() && (
        <div class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-[var(--borderRadiusMedium)] pointer-events-none z-10">
          <span class="text-white [font-size:var(--fontSizeBase200)] font-medium">已私密收藏</span>
        </div>
      )}
    </div>
  );
};

/** 小说封面墙卡片 — 封面在上，文字信息在下，2列排布 */
export const NovelCoverCard: Component<Props> = (props) => {
  const [bookmarked, setBookmarked] = createSignal(props.novel.is_bookmarked);
  const [bookmarkBurstTrigger, setBookmarkBurstTrigger] = createSignal(0);
  const [privateHint, setPrivateHint] = createSignal(false);
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
        await deleteBookmark(props.novel.id);
        setBookmarked(false);
      } else {
        await addBookmark(props.novel.id, privateBookmark ? "private" : "public");
        setBookmarked(true);
        setBookmarkBurstTrigger((n) => n + 1);
        if (privateBookmark) showPrivateToast();
      }
    } catch {
      /* silently fail */
    }
  };

  let longPressTimer: ReturnType<typeof setTimeout>;

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

  const tags = () => {
    const t = props.novel.tags;
    const visible = t.slice(0, 2);
    const overflow = t.length - 2;
    return { visible, overflow };
  };

  return (
    <div
      class="bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] shadow-[var(--elevation2)] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-[var(--durationFast)] ease-[var(--curveEasyEase)] flex flex-col h-full"
      onClick={() => props.onClick(props.novel.id)}
    >
      {/* Cover image — square, fills card width */}
      <div class="relative w-full aspect-square rounded-[var(--borderRadiusSmall)] overflow-hidden">
        <img
          src={resolveImageUrl(props.novel.image_urls.square_medium)}
          alt={props.novel.title}
          class="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Badge group — 左上角 */}
        <div class="absolute top-1 left-1 flex items-center gap-1 pointer-events-none z-1">
          {props.novel.x_restrict > 0 && (
            <fluent-badge
              appearance="filled"
              color={props.novel.x_restrict === 1 ? "danger" : "warning"}
            >
              {props.novel.x_restrict === 1 ? "R-18" : "R-18G"}
            </fluent-badge>
          )}
          {props.novel.novel_ai_type != null && props.novel.novel_ai_type > 1 && (
            <fluent-badge appearance="filled">
              {props.novel.novel_ai_type === 2 ? "AI" : "AI辅助"}
            </fluent-badge>
          )}
        </div>
        {/* Bookmark button — 右下角 */}
        <div class="absolute bottom-1.5 right-1.5 z-1">
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
          <HeartBurstEffect trigger={bookmarkBurstTrigger} size={60} particleCount={6} />
        </div>
      </div>

      {/* Info area — 封面下方 */}
      <div class="flex flex-col gap-1 p-2 flex-1 min-w-0">
        <p class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)] line-clamp-2 leading-tight">
          {props.novel.title}
        </p>
        <div class="flex items-center gap-1.5 text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase200)]">
          <span>📄 {props.novel.page_count || 1}p</span>
          <span aria-hidden="true">·</span>
          <span>⭐ {props.novel.total_bookmarks}</span>
        </div>
        <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorBrandForeground1)] truncate">
          @{props.novel.user.name}
        </p>
        <div class="flex items-center gap-1 flex-wrap min-w-0">
          <For each={tags().visible}>
            {(tag) => (
              <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] bg-[var(--colorNeutralBackground2)] px-1.5 py-0.5 rounded-[var(--borderRadiusSmall)] truncate max-w-[80px]">
                {tag.translated_name || tag.name}
              </span>
            )}
          </For>
          {tags().overflow > 0 && (
            <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)]">
              +{tags().overflow}
            </span>
          )}
        </div>
        {props.novel.series?.title && (
          <button
            class="self-start inline-flex items-center bg-transparent border-none p-0 cursor-pointer mt-0.5"
            onClick={(e) => {
              e.stopPropagation();
              props.onSeriesClick?.(props.novel.series!.id!);
            }}
            aria-label={`查看系列: ${props.novel.series.title}`}
          >
            <fluent-badge appearance="subtle" class="[font-size:var(--fontSizeBase100)]">
              📖 {props.novel.series.title}
            </fluent-badge>
          </button>
        )}
      </div>

      {/* Private bookmark toast */}
      {privateHint() && (
        <div class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-[var(--borderRadiusMedium)] pointer-events-none z-10">
          <span class="text-white [font-size:var(--fontSizeBase200)] font-medium">已私密收藏</span>
        </div>
      )}
    </div>
  );
};

export default NovelCard;
