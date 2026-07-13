import {
  type Accessor,
  type Component,
  type JSX,
  createSignal,
  createEffect,
  createMemo,
  Show,
  For,
  onCleanup,
  onMount,
} from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { resolveImageUrl } from "../utils/imageLoader";
import PixivImage from "../components/PixivImage";
import LoadingSpinner from "../components/LoadingSpinner";
import FluentIcon from "../components/ui/FluentIcon";
import NovelSearchBar from "../components/NovelSearchBar";
import { createNovelSearch } from "../primitives/createNovelSearch";
import { createNovelVirtualLayout } from "../primitives/createNovelVirtualLayout";
import { createNovelLoader } from "../primitives/createNovelLoader";
import {
  readerStyle,
  fontSize,
  fontWeight,
  fontFamily,
  lineHeight,
} from "../stores/readerSettingsStore";
import {
  parseNovelBlocks,
  buildSearchText,
  getImageBlocks,
  selectInlineImageUrl,
} from "../utils/novelBlocks";
import type { NovelBlock, TextBlock, ImageBlock } from "../utils/novelBlocks";
import { loadNovelImageDimensions, type NovelImageDimensions } from "../utils/novelImageDimensions";
import ReaderSettingsSheet from "../components/ReaderSettingsSheet";
import SeriesSheet from "../components/SeriesSheet";
import PageTransition from "../components/PageTransition";
import { getRouteStackDepth } from "../services/predictiveBack";

// ── Scroll-driven hide/show constants ──
const HIDE_THRESHOLD = 30;
const BOTTOM_THRESHOLD = 80;

interface NovelProgress {
  paragraphIndex: number;
  charIndex: number;
  progress: number;
}

interface NovelImageBlockProps {
  block: ImageBlock;
  containerWidth: Accessor<number>;
  dimensions: Accessor<NovelImageDimensions>;
  style?: Record<string, string>;
  onClick: () => void;
}

const NovelImageBlock: Component<NovelImageBlockProps> = (props) => {
  const dim = createMemo(() => props.dimensions()[props.block.imageId]);

  function handleClick() {
    if (dim()) props.onClick();
  }

  return (
    <figure
      class="novel-image-block overflow-hidden m-0"
      classList={{ "cursor-pointer": dim() !== null && dim() !== undefined }}
      style={{
        "aspect-ratio":
          dim() && dim().width > 0 && dim().height > 0
            ? `${dim().width} / ${dim().height}`
            : "16 / 9",
      }}
      onClick={handleClick}
    >
      <Switch>
        <Match when={dim() === undefined}>
          <div
            class="w-full h-full flex flex-col items-center justify-center gap-1.5"
            style={{
              background:
                "linear-gradient(90deg, var(--colorNeutralBackground2) 25%, var(--colorNeutralBackground1) 50%, var(--colorNeutralBackground2) 75%)",
              "background-size": "200% 100%",
              animation: "fluent-shimmer var(--durationSlower) var(--curveEasyEase) infinite",
            }}
          >
            <span class="spinner w-4 h-4" />
            <span class="text-[var(--colorNeutralForegroundDisabled)] [font-size:var(--fontSizeBase100)]">
              加载中...
            </span>
          </div>
        </Match>
        <Match when={dim() === null}>
          <div
            class="w-full h-full flex flex-col items-center justify-center gap-1"
            style={{ "background-color": "var(--colorNeutralBackground2)" }}
          >
            <span class="text-[var(--colorNeutralForeground3)] text-xs">⚠</span>
            <span class="text-[var(--colorNeutralForegroundDisabled)] [font-size:var(--fontSizeBase100)]">
              图片加载失败
            </span>
          </div>
        </Match>
        <Match when={dim()}>
          {(d) => (
            <PixivImage
              src={selectInlineImageUrl(props.block.urls, props.containerWidth())}
              alt={`内嵌图片 ${props.block.imageId}`}
              width={d().width}
              height={d().height}
              loading="lazy"
              class="w-full h-full object-cover"
            />
          )}
        </Match>
      </Switch>
    </figure>
  );
};

function parseProgress(raw: string | null): NovelProgress | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "paragraphIndex" in parsed &&
      "charIndex" in parsed &&
      Number.isInteger(parsed.paragraphIndex) &&
      Number.isInteger(parsed.charIndex) &&
      parsed.paragraphIndex >= 0 &&
      parsed.charIndex >= 0
    ) {
      return parsed as NovelProgress;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function isTextBlock(block: NovelBlock): block is TextBlock {
  return block.type === "text";
}

function isImageBlock(block: NovelBlock): block is ImageBlock {
  return block.type === "image";
}

interface NovelContentBlockProps {
  block: Accessor<NovelBlock>;
  imageBlockList: Accessor<ImageBlock[]>;
  imageDimensions: Accessor<NovelImageDimensions>;
  containerWidth: Accessor<number>;
  fontSize: Accessor<number>;
  onImageClick: (index: number) => void;
  renderParagraph: (paragraphIndex: number, text: string) => JSX.Element;
}

const NovelContentBlock: Component<NovelContentBlockProps> = (props) => {
  const block = props.block();

  if (isTextBlock(block)) {
    return (
      <p
        class="novel-text-paragraph"
        style={{
          textIndent: `${props.fontSize() * 2}px`,
        }}
      >
        {props.renderParagraph(block.index, block.text)}
      </p>
    );
  }

  if (isImageBlock(block)) {
    const imageIndex = props.imageBlockList().findIndex((b) => b.imageId === block.imageId);
    return (
      <NovelImageBlock
        block={block}
        containerWidth={props.containerWidth}
        dimensions={props.imageDimensions}
        style={{}}
        onClick={() => props.onImageClick(imageIndex)}
      />
    );
  }
};

const NovelDetail: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();

  function handleBack() {
    if (getRouteStackDepth() > 1) {
      navigate(-1);
    } else {
      navigate("/recommended");
    }
  }

  // 系列内切换只更新内部小说 ID，不 navigate，避免污染浏览器历史栈。
  // 入口 URL 对应的 params.id 作为初始值，后续章节/目录跳转都通过这里。
  let skipRestoreProgress = false;

  const [currentNovelId, setCurrentNovelId] = createSignal(Number(params.id));
  const novelId = currentNovelId;

  function switchNovel(id: number) {
    skipRestoreProgress = true;
    setCurrentNovelId(id);
  }

  const loader = createNovelLoader(novelId);
  const { novelData, novelHtml, novelImages, novelNav, detailLoading, detailError } = loader;

  const [imageDimensions, setImageDimensions] = createSignal<NovelImageDimensions>({});
  const [footerHidden, setFooterHidden] = createSignal(false);
  let lastScrollY = 0;
  let accumulatedDelta = 0;
  let scrollTicking = false;

  // 小说 ID 变化或图片映射重置时，清空已计算的内嵌图尺寸
  createEffect(() => {
    novelImages();
    setImageDimensions({});
  });

  // 加载出错时允许下次恢复阅读进度
  createEffect(() => {
    if (detailError()) {
      skipRestoreProgress = false;
    }
  });

  // 小说正文加载完成后恢复阅读进度
  createEffect(() => {
    const html = novelHtml();
    if (html && html.length > 0) {
      requestAnimationFrame(() => restoreProgress());
    }
  });

  // 获取到图片映射后，预加载每张内嵌图的真实尺寸
  createEffect(() => {
    const images = novelImages();
    const ids = Object.keys(images);
    if (ids.length === 0) return;

    let cancelled = false;
    loadNovelImageDimensions(images).then((dimensions) => {
      if (!cancelled) setImageDimensions(dimensions);
    });

    onCleanup(() => {
      cancelled = true;
    });
  });

  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [seriesOpen, setSeriesOpen] = createSignal(false);
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [textContainerWidth, setTextContainerWidth] = createSignal(0);

  const blocks = createMemo<NovelBlock[]>(() => {
    return parseNovelBlocks(novelHtml() ?? "", novelImages());
  });

  const searchText = createMemo(() => buildSearchText(blocks()));

  const virtualLayout = createNovelVirtualLayout({
    blocks,
    containerWidth: textContainerWidth,
    settings: () => ({
      fontSize: fontSize(),
      fontWeight: fontWeight(),
      fontFamily: fontFamily(),
      fontColor: "",
      lineHeight: lineHeight(),
      bgColor: "",
    }),
    imageDimensions,
    containerRef: () => {},
    novelId,
    useWindowScroll: true,
  });

  const search = createNovelSearch(searchText, { debounceMs: 150 });

  function renderParagraphWithHighlights(paragraphIndex: number, text: string): JSX.Element {
    const matches = search.getMatchesForParagraph(paragraphIndex);
    const activeIndex = search.activeIndex();
    const allMatches = search.matches();
    const activeMatch =
      activeIndex >= 0 && activeIndex < allMatches.length ? allMatches[activeIndex] : null;

    if (matches.length === 0) {
      return <>{text}</>;
    }

    const nodes: JSX.Element[] = [];
    let lastEnd = 0;

    for (const match of matches) {
      if (match.start > lastEnd) {
        nodes.push(text.slice(lastEnd, match.start));
      }
      const isActive =
        activeMatch != null &&
        match.paragraphIndex === activeMatch.paragraphIndex &&
        match.start === activeMatch.start &&
        match.end === activeMatch.end;
      nodes.push(
        <mark class="novel-search-match" classList={{ "novel-search-match-active": isActive }}>
          {text.slice(match.start, match.end)}
        </mark>,
      );
      lastEnd = match.end;
    }

    if (lastEnd < text.length) {
      nodes.push(text.slice(lastEnd));
    }

    return <>{nodes}</>;
  }

  // ── 阅读进度持久化 ──
  let progressSaveTimer: ReturnType<typeof setTimeout> | undefined;
  function saveProgress() {
    if (progressSaveTimer) clearTimeout(progressSaveTimer);
    progressSaveTimer = setTimeout(() => {
      const current = virtualLayout.currentCharIndex();
      const layout = virtualLayout.layoutResult();
      const layoutParagraphs = layout.paragraphs;
      const totalChars = layoutParagraphs.reduce(
        (sum, p) =>
          sum + p.lineRanges.reduce((lineSum, line) => lineSum + (line.end - line.start), 0),
        0,
      );
      const currentOffset =
        layoutParagraphs
          .slice(0, current.paragraphIndex)
          .reduce(
            (sum, p) =>
              sum + p.lineRanges.reduce((lineSum, line) => lineSum + (line.end - line.start), 0),
            0,
          ) + current.charIndex;
      const progress = totalChars > 0 ? currentOffset / totalChars : 0;
      localStorage.setItem(
        `novel_progress_${novelId()}`,
        JSON.stringify({
          paragraphIndex: current.paragraphIndex,
          charIndex: current.charIndex,
          progress,
        }),
      );
    }, 500);
  }

  function restoreProgress() {
    if (skipRestoreProgress) {
      skipRestoreProgress = false;
      return;
    }
    const saved = parseProgress(localStorage.getItem(`novel_progress_${novelId()}`));
    if (!saved) return;
    const layout = virtualLayout.layoutResult();
    const layoutParagraphs = layout.paragraphs;
    if (saved.paragraphIndex >= layoutParagraphs.length) return;
    const paragraph = layoutParagraphs[saved.paragraphIndex];
    if (!paragraph) return;
    const maxCharIndex =
      paragraph.lineRanges[paragraph.lineRanges.length - 1]?.end ?? paragraph.height;
    if (saved.charIndex > maxCharIndex) return;
    virtualLayout.scrollToCharIndex(saved.paragraphIndex, saved.charIndex);
  }

  // 滚动停止 500ms 后保存阅读进度
  createEffect(() => {
    virtualLayout.currentCharIndex();
    saveProgress();
  });

  function onTextContainerRef(el: HTMLElement) {
    if (!el) return;
    setTextContainerWidth(el.clientWidth);
    virtualLayout.containerRef(el);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setTextContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);

    onCleanup(() => ro.disconnect());
  }

  // 同步 sheet 状态到全局返回手势标志，使系统侧滑优先关闭 sheet
  createEffect(() => {
    if (settingsOpen() || seriesOpen()) {
      window.__settingsOpen = true;
    } else {
      window.__settingsOpen = false;
    }
  });

  onMount(() => {
    // ── Close-settings event listener ──
    const onCloseSettings = () => {
      setSettingsOpen(false);
      setSeriesOpen(false);
    };
    window.addEventListener("closeSettings", onCloseSettings);
    onCleanup(() => window.removeEventListener("closeSettings", onCloseSettings));

    // ── Scroll-driven bottom toolbar hide/show ──
    lastScrollY = window.scrollY;
    accumulatedDelta = 0;
    scrollTicking = false;

    function onScroll() {
      const currentY = window.scrollY;

      // 底部区域：距页面底部不足 BOTTOM_THRESHOLD 时强制显示
      const atBottom =
        window.innerHeight + currentY >= document.documentElement.scrollHeight - BOTTOM_THRESHOLD;
      if (atBottom) {
        setFooterHidden(false);
        accumulatedDelta = 0;
        lastScrollY = currentY;
        return;
      }

      const delta = currentY - lastScrollY;
      lastScrollY = currentY;

      // 程序化滚动（页面切换等），重置跟踪
      if (Math.abs(delta) > 200) {
        accumulatedDelta = 0;
        return;
      }

      accumulatedDelta += delta;

      if (accumulatedDelta > HIDE_THRESHOLD) {
        setFooterHidden(true);
        accumulatedDelta = 0;
      } else if (accumulatedDelta < -HIDE_THRESHOLD) {
        setFooterHidden(false);
        accumulatedDelta = 0;
      }
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

  function openSearch() {
    setSearchOpen(true);
  }

  function closeSearch() {
    setSearchOpen(false);
    search.clearSearch();
  }

  // 切换小说时自动关闭搜索、清空高亮，并滚动到页面顶部，重置底部栏显隐状态
  createEffect(() => {
    currentNovelId();
    closeSearch();
    window.scrollTo({ top: 0, behavior: "auto" });
    setFooterHidden(false);
    accumulatedDelta = 0;
    lastScrollY = window.scrollY;
  });

  const [showHeaderTitle, setShowHeaderTitle] = createSignal(false);
  const [titleEl, setTitleEl] = createSignal<HTMLHeadingElement | undefined>();
  const [imageViewerOpen, setImageViewerOpen] = createSignal(false);
  const [imageViewerIndex, setImageViewerIndex] = createSignal(0);

  const imageBlockList = createMemo(() => getImageBlocks(blocks()));
  const imageViewerUrls = createMemo(() => imageBlockList().map((block) => block.urls.original));

  // IntersectionObserver: 检测原始标题元素是否滚出 header 区域
  createEffect(() => {
    const el = titleEl();
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowHeaderTitle(!entry.isIntersecting),
      { rootMargin: "-48px 0px 0px 0px" },
    );
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  return (
    <PageTransition>
      <div class="min-h-screen bg-[var(--colorNeutralBackground2)]">
        {/* ── Top navigation bar ── */}
        <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4 gap-2">
          <fluent-button
            appearance="subtle"
            aria-label="返回"
            on:click={() => handleBack()}
            style="min-width:32px;width:32px;height:32px;padding:0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
            </svg>
          </fluent-button>
          <Show
            when={searchOpen()}
            fallback={
              <h1 class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)] flex items-center gap-1 min-w-0 flex-1">
                <span class="whitespace-nowrap flex-shrink-0">小说</span>
                <span
                  class="truncate text-[var(--colorNeutralForeground2)]"
                  classList={{ "opacity-0": !showHeaderTitle(), "opacity-100": showHeaderTitle() }}
                  style="transition:opacity var(--durationFast) var(--curveEasyEase)"
                >
                  《{novelData()?.title ?? ""}》
                </span>
              </h1>
            }
          >
            <NovelSearchBar
              query={search.query}
              setQuery={search.setQuery}
              matchCount={search.matchCount}
              activeIndex={search.activeIndex}
              onPrev={search.prevMatch}
              onNext={search.nextMatch}
              onClose={closeSearch}
            />
          </Show>
          <Show when={!searchOpen()}>
            <button
              type="button"
              class="w-8 h-8 flex items-center justify-center rounded-[var(--borderRadiusSmall)] text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorNeutralBackground2)] active:scale-95 transition-all appearance-none border-none outline-none cursor-pointer"
              onClick={openSearch}
              aria-label="搜索"
              title="搜索"
            >
              <FluentIcon name="search" size={20} />
            </button>
          </Show>
        </header>

        {/* ── Loading state ── */}
        <Show when={detailLoading() && !novelData()}>
          <div class="flex justify-center py-16">
            <LoadingSpinner text="加载中..." />
          </div>
        </Show>

        {/* ── Error state ── */}
        <Show when={detailError()}>
          <div class="text-center py-16 text-[var(--colorStatusDangerForeground1)]">
            加载失败：{detailError()}
          </div>
        </Show>

        {/* ── Content ── */}
        <Show when={novelData()}>
          {(novel) => (
            <>
              {/* ── Cover & metadata ── */}
              <div class="bg-[var(--colorNeutralBackground1)]">
                <div class="relative w-full aspect-[16/9] max-h-64 overflow-hidden">
                  <PixivImage
                    src={resolveImageUrl(novel().image_urls.large)}
                    alt={novel().title}
                    width={1200}
                    height={675}
                    loading="eager"
                    class="w-full h-full object-cover"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-[var(--colorNeutralBackground1)] to-transparent" />
                </div>

                <div class="px-4 pb-4 -mt-8 relative z-1">
                  <h1
                    ref={setTitleEl}
                    class="[font-size:var(--fontSizeBase500)] font-bold text-[var(--colorNeutralForeground1)] leading-tight mb-1"
                  >
                    {novel().title}
                  </h1>
                  <button
                    class="[font-size:var(--fontSizeBase200)] text-[var(--colorBrandForeground1)] hover:underline bg-transparent border-none p-0 cursor-pointer"
                    onClick={() => navigate(`/user/${novel().user.id}`)}
                  >
                    @{novel().user.name}
                  </button>

                  <Show when={novel().series?.id}>
                    <button
                      class="[font-size:var(--fontSizeBase100)] text-[var(--colorBrandForeground1)] mt-1 bg-transparent border-none p-0 cursor-pointer hover:underline focus-visible:outline focus-visible:outline-[var(--colorStrokeFocus2)] focus-visible:outline-2 focus-visible:-outline-offset-2"
                      onClick={() => setSeriesOpen(true)}
                      aria-label={`打开系列目录：${novel().series?.title ?? ""}`}
                    >
                      系列：{novel().series?.title}
                    </button>
                  </Show>

                  {/* Tags */}
                  <div class="flex flex-wrap gap-1.5 mt-2">
                    {novel().tags.map((tag) => (
                      <span class="[font-size:var(--fontSizeBase100)] px-2 py-0.5 rounded-[var(--borderRadiusSmall)] bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground2)]">
                        {tag.translated_name ?? tag.name}
                      </span>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div class="flex items-center gap-3 mt-2 text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase100)]">
                    <span>📖 {novel().text_length.toLocaleString()}字</span>
                    <span>⭐ {novel().total_bookmarks}</span>
                    <Show when={novel().total_comments != null}>
                      <span>💬 {novel().total_comments}</span>
                    </Show>
                    <Show when={novel().total_view != null}>
                      <span>👁 {novel().total_view}</span>
                    </Show>
                  </div>
                </div>
              </div>

              {/* ── Text content ── */}
              <div class="px-4 py-6 max-w-2xl mx-auto pb-[64px]">
                <Show when={novelHtml()}>
                  <div
                    class="novel-text"
                    ref={onTextContainerRef}
                    style={{
                      ...readerStyle(),
                    }}
                  >
                    <For each={blocks()}>
                      {(block) => (
                        <NovelContentBlock
                          block={() => block}
                          imageBlockList={imageBlockList}
                          imageDimensions={imageDimensions}
                          containerWidth={textContainerWidth}
                          fontSize={fontSize}
                          onImageClick={(imageIndex) => {
                            setImageViewerIndex(imageIndex);
                            setImageViewerOpen(true);
                          }}
                          renderParagraph={renderParagraphWithHighlights}
                        />
                      )}
                    </For>
                  </div>
                </Show>
                <Show when={detailLoading() && !novelHtml()}>
                  <div class="space-y-3 animate-pulse">
                    {Array.from({ length: 6 }).map(() => (
                      <div class="h-4 bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusSmall)]" />
                    ))}
                  </div>
                </Show>
              </div>

              {/* ── Footer: Nav + Settings ── */}
              <div
                class="fixed bottom-0 left-0 right-0 surface-appbar border-t border-[var(--colorNeutralStroke2)] px-4 py-2"
                style={{
                  zIndex: 20,
                  transform: footerHidden()
                    ? "translateY(calc(100% + 8px + env(safe-area-inset-bottom, 0px)))"
                    : "translateY(0)",
                  transition: "transform var(--durationNormal) var(--curveEasyEase)",
                }}
              >
                <div class="max-w-2xl mx-auto flex items-center justify-center gap-1 overflow-x-auto">
                  <Show when={novel().series?.id && novelNav()?.prevNovel}>
                    {(prev) => (
                      <button
                        class="flex-shrink-0 whitespace-nowrap px-3 py-2 rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase200)] font-medium hover:bg-[var(--colorNeutralBackground3)] active:scale-95 transition-all appearance-none border-none outline-none cursor-pointer flex items-center gap-1"
                        onClick={() => switchNovel(prev().id)}
                      >
                        ◀ 上一章
                      </button>
                    )}
                  </Show>
                  <Show when={novel().series?.id}>
                    <button
                      class="flex-shrink-0 whitespace-nowrap px-3 py-2 rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase200)] font-medium hover:bg-[var(--colorNeutralBackground3)] active:scale-95 transition-all appearance-none border-none outline-none cursor-pointer flex items-center gap-2"
                      onClick={() => setSeriesOpen(true)}
                      aria-label="打开系列目录"
                    >
                      <FluentIcon name="list" size={20} />
                      目录
                    </button>
                  </Show>
                  <button
                    class="flex-shrink-0 whitespace-nowrap px-3 py-2 rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase200)] font-medium hover:bg-[var(--colorNeutralBackground3)] active:scale-95 transition-all appearance-none border-none outline-none cursor-pointer flex items-center gap-2"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <span class="font-bold tracking-tight" style="font-size:16px">
                      Aa
                    </span>
                    显示设置
                  </button>
                  <Show when={novel().series?.id && novelNav()?.nextNovel}>
                    {(next) => (
                      <button
                        class="flex-shrink-0 whitespace-nowrap px-3 py-2 rounded-[var(--borderRadiusMedium)] bg-[var(--colorBrandBackground)] text-white [font-size:var(--fontSizeBase200)] font-medium hover:opacity-90 active:scale-95 transition-all appearance-none border-none outline-none cursor-pointer flex items-center gap-1"
                        onClick={() => switchNovel(next().id)}
                      >
                        下一章 ▶
                      </button>
                    )}
                  </Show>
                </div>
              </div>

              <ReaderSettingsSheet isOpen={settingsOpen()} onClose={() => setSettingsOpen(false)} />

              <Show when={novel().series?.id}>
                <SeriesSheet
                  seriesId={novel().series!.id}
                  seriesTitle={novel().series!.title}
                  authorName={novel().user.name}
                  authorId={novel().user.id}
                  isOpen={seriesOpen()}
                  onClose={() => setSeriesOpen(false)}
                  onNovelSelect={(id) => switchNovel(id)}
                  onAuthorClick={() => navigate(`/user/${novel().user.id}`)}
                  activeNovelId={currentNovelId()}
                />
              </Show>

              <Show when={imageViewerOpen() && imageViewerUrls().length > 0}>
                <ImageViewer
                  imageUrls={imageViewerUrls()}
                  initialPage={imageViewerIndex()}
                  onClose={() => setImageViewerOpen(false)}
                />
              </Show>

              {/* ── Close the Show fragment ── */}
            </>
          )}
        </Show>
      </div>
    </PageTransition>
  );
};

export default NovelDetail;
