import { type Component, createSignal } from "solid-js";
import type { PixivIllust } from "../api/types";
import { listQuality } from "../stores/uiStore";
import { addBookmark, deleteBookmark } from "../api/illust";
import PixivImage from "./PixivImage";
import HeartBurstEffect from "./HeartBurstEffect";

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
  const [totalBookmarks, setTotalBookmarks] = createSignal(props.illust.total_bookmarks);
  const [privateHint, setPrivateHint] = createSignal(false);
  const [bookmarkBurstTrigger, setBookmarkBurstTrigger] = createSignal(0);
  const [ugoiraHeight, setUgoiraHeight] = createSignal(Math.round(h() * 0.75));

  /** 分析 ugoira 静态帧底部黑边，返回内容实际高度 */
  function measureUgoiraContent(e: Event) {
    const img = e.target as HTMLImageElement;
    if (img.naturalHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    // 从底部向上扫描，找第一个亮度 > 15 的像素行
    const midX = Math.floor(img.naturalWidth / 2);
    for (let y = img.naturalHeight - 1; y >= 0; y--) {
      const p = ctx.getImageData(midX, y, 1, 1).data;
      if ((p[0] + p[1] + p[2]) / 3 > 15) {
        // 内容结束行 + 2px 安全余量
        setUgoiraHeight(Math.min(y + 2, img.naturalHeight));
        return;
      }
    }
  }

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
        setTotalBookmarks((t) => t - 1);
      } else {
        await addBookmark(props.illust.id, privateBookmark ? "private" : "public");
        setBookmarked(true);
        setTotalBookmarks((t) => t + 1);
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
      <div class="relative">
        {isUgoira() ? (
          <div style={{ "aspect-ratio": `${w()} / ${ugoiraHeight()}` }} class="overflow-hidden">
            <PixivImage
              src={img()}
              alt={props.illust.title}
              width={w()}
              height={h()}
              loading="lazy"
              class="w-full h-full object-cover object-top"
              onLoad={measureUgoiraContent}
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
          />
        )}
        {isUgoira() && <div class="absolute top-1.5 right-1.5 badge-overlay">▶ 动图</div>}
        {props.illust.page_count > 1 && (
          <div class="absolute bottom-1.5 left-1.5 badge-overlay">📄 {props.illust.page_count}</div>
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
        <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground2)] truncate mt-0.5">
          @{props.illust.user.name}
        </p>
      </div>
    </div>
  );
};

export default ImageCard;
