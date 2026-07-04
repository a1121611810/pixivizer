import { type Component, createSignal, For, onMount, onCleanup } from "solid-js";
import type { PixivNovel } from "../api/types";
import { addBookmark, deleteBookmark } from "../api/novel";
import HeartBurstEffect from "./HeartBurstEffect";

interface Props {
  novel: PixivNovel;
  onClick: (id: number) => void;
  onAuthorClick?: (userId: number) => void;
  onSeriesClick?: (seriesId: number) => void;
  onMeasure?: (height: number) => void;
}

const NovelTextListCard: Component<Props> = (props) => {
  const [bookmarked, setBookmarked] = createSignal(props.novel.is_bookmarked);
  const [bookmarkBurstTrigger, setBookmarkBurstTrigger] = createSignal(0);

  let rootRef: HTMLDivElement | null = null;

  onMount(() => {
    if (!rootRef || !props.onMeasure) return;

    const report = () => {
      const rect = rootRef.getBoundingClientRect();
      if (rect.height > 0) props.onMeasure?.(rect.height);
    };

    report();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h =
          entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height;
        if (h > 0) props.onMeasure?.(h);
      }
    });
    ro.observe(rootRef);

    onCleanup(() => {
      ro.disconnect();
    });
  });

  const toggleBookmark = async (e: MouseEvent) => {
    e.stopPropagation();
    try {
      if (bookmarked()) {
        await deleteBookmark(props.novel.id);
        setBookmarked(false);
      } else {
        await addBookmark(props.novel.id, "public");
        setBookmarked(true);
        setBookmarkBurstTrigger((n) => n + 1);
      }
    } catch {
      /* silently fail */
    }
  };

  const handleAuthorClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onAuthorClick?.(props.novel.user.id);
  };

  const handleSeriesClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.novel.series?.id) {
      props.onSeriesClick?.(props.novel.series.id);
    }
  };

  return (
    <div
      ref={(el) => (rootRef = el)}
      class="relative w-full px-4 py-3 rounded-[var(--borderRadiusLarge)] bg-[var(--colorNeutralBackground1)] shadow-[var(--elevation2)] cursor-pointer active:bg-[var(--colorNeutralBackground1Pressed)] transition-colors duration-[var(--durationFast)] ease-[var(--curveEasyEase)]"
      onClick={() => props.onClick(props.novel.id)}
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <h3
            data-testid="novel-title"
            class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug line-clamp-2"
          >
            {props.novel.title}
          </h3>

          <div
            data-testid="novel-meta"
            class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground2)]"
          >
            <button
              data-testid="novel-author"
              class="inline-block text-[var(--colorBrandForeground1)] hover:underline focus:outline-hidden focus-visible:underline"
              onClick={handleAuthorClick}
              aria-label={`作者: ${props.novel.user.name}`}
            >
              @{props.novel.user.name}
            </button>
            <span>·</span>
            <span>{props.novel.text_length.toLocaleString()}字</span>
            <span>·</span>
            <span>⭐ {props.novel.total_bookmarks.toLocaleString()}</span>
          </div>

          <div class="mt-1.5 flex flex-wrap items-center gap-2">
            {props.novel.x_restrict > 0 && (
              <fluent-badge
                data-testid="novel-r18-badge"
                appearance="filled"
                color={props.novel.x_restrict === 1 ? "danger" : "warning"}
                class="[font-size:var(--fontSizeBase100)]"
              >
                {props.novel.x_restrict === 1 ? "R-18" : "R-18G"}
              </fluent-badge>
            )}
            {props.novel.novel_ai_type != null && props.novel.novel_ai_type > 1 && (
              <fluent-badge
                data-testid="novel-ai-badge"
                appearance="filled"
                class="[font-size:var(--fontSizeBase100)]"
              >
                {props.novel.novel_ai_type === 2 ? "AI" : "AI辅助"}
              </fluent-badge>
            )}
            {props.novel.series?.title && (
              <button
                data-testid="novel-series"
                class="inline-flex items-center focus:outline-hidden focus-visible:underline"
                onClick={handleSeriesClick}
                aria-label={`查看系列: ${props.novel.series.title}`}
              >
                <fluent-badge
                  appearance="subtle"
                  class="[font-size:var(--fontSizeBase100)] truncate max-w-[180px]"
                >
                  📖 {props.novel.series.title}
                </fluent-badge>
              </button>
            )}
          </div>

          <div
            data-testid="novel-tags"
            class="mt-2 flex flex-wrap gap-[var(--spacingHorizontalXXS)]"
          >
            <For each={props.novel.tags}>
              {(tag) => (
                <span
                  class="inline-flex items-center rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground3)] text-[var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase100)] [line-height:var(--lineHeightBase100)] px-[var(--spacingHorizontalXS)] py-[var(--spacingVerticalXXS)]"
                  role="listitem"
                >
                  {tag.translated_name ?? tag.name}
                </span>
              )}
            </For>
          </div>
        </div>

        <button
          class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--colorBrandStroke1)] active:scale-90 transition-transform duration-[var(--durationFast)] ease-[var(--curveEasyEase)]"
          classList={{
            "text-[var(--colorPaletteRedForeground1)]": bookmarked(),
            "text-[var(--colorNeutralForeground3)] hover:text-[var(--colorPaletteRedForeground1)]":
              !bookmarked(),
          }}
          onClick={toggleBookmark}
          aria-label={bookmarked() ? "取消收藏" : "收藏"}
        >
          {bookmarked() ? "♥" : "♡"}
        </button>
      </div>
      <HeartBurstEffect trigger={bookmarkBurstTrigger} size={60} particleCount={6} />
    </div>
  );
};

export default NovelTextListCard;
