import { type Component, createSignal, onMount, onCleanup } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { loadDetail, addBookmark, deleteBookmark } from "../api/illust";
import type { PixivIllust } from "../api/types";
import ImageViewer from "../components/ImageViewer";
import UgoiraViewer from "../components/UgoiraViewer";
import LazyDetailImage from "../components/LazyDetailImage";
import PixivImage from "../components/PixivImage";
import LoadingSpinner from "../components/LoadingSpinner";
import PageTransition from "../components/PageTransition";
import HeartBurstEffect from "../components/HeartBurstEffect";
import { detailQuality } from "../stores/uiStore";

interface IllustDetailProps {
  illustId?: string;
}

const IllustDetail: Component<IllustDetailProps> = (props) => {
  const params = useParams<{ id: string }>();
  const illustId = () => props.illustId ?? params.id;
  const navigate = useNavigate();
  const [illust, setIllust] = createSignal<PixivIllust | null>(null);
  const [viewerOpen, setViewerOpen] = createSignal(false);
  const [viewerStartPage, setViewerStartPage] = createSignal(0);
  const [currentVisiblePage, setCurrentVisiblePage] = createSignal(0);
  const [showBackToTop, setShowBackToTop] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [bookmarking, setBookmarking] = createSignal(false);
  const [bookmarkBurstTrigger, setBookmarkBurstTrigger] = createSignal(0);

  let longPressTimer: ReturnType<typeof setTimeout>;

  async function toggleBookmark(privateBookmark = false) {
    const i = illust();
    if (!i || bookmarking()) return;
    setBookmarking(true);
    try {
      if (i.is_bookmarked) {
        await deleteBookmark(i.id);
      } else {
        await addBookmark(i.id, privateBookmark ? "private" : "public");
      }
      setIllust({
        ...i,
        is_bookmarked: !i.is_bookmarked,
        total_bookmarks: i.is_bookmarked ? i.total_bookmarks - 1 : i.total_bookmarks + 1,
      });

      if (!i.is_bookmarked) {
        setBookmarkBurstTrigger((n) => n + 1);
      }
    } catch (e) {
      console.error("Bookmark toggle failed:", e);
    } finally {
      setBookmarking(false);
    }
  }

  function onBookmarkPointerDown(e: PointerEvent) {
    longPressTimer = setTimeout(() => {
      toggleBookmark(true); // private
      longPressTimer = 0 as any;
    }, 500);
  }

  function onBookmarkPointerUp(e: PointerEvent) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = 0 as any;
      toggleBookmark(false); // public
    }
  }

  // Guard flag — suppress IntersectionObserver during programmatic scrollToPage
  let ignorePageObserver = false;

  // Open/close viewer with global flag for Capacitor back-button handling
  function openViewer(startPage = 0) {
    (window as any).__viewerOpen = true;
    setViewerStartPage(startPage);
    setViewerOpen(true);
  }

  function closeViewer() {
    (window as any).__viewerOpen = false;
    setViewerOpen(false);
  }

  onMount(() => {
    // Listen for system back when viewer is open
    const onCloseViewer = () => {
      (window as any).__viewerOpen = false;
      setViewerOpen(false);
    };
    window.addEventListener("closeViewer", onCloseViewer);
    onCleanup(() => window.removeEventListener("closeViewer", onCloseViewer));
  });

  onMount(async () => {
    try {
      const data = await loadDetail(Number(illustId()));
      setIllust(data.illust);
    } catch (e) {
      setError((e as { message?: string }).message ?? "加载失败");
    } finally {
      setLoading(false);
    }
  });

  // IntersectionObserver — track which page is currently visible for staircase
  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (entry.intersectionRatio > 0) {
            const idx = Number((entry.target as HTMLElement).dataset.pageIndex);
            if (!Number.isNaN(idx) && entry.intersectionRatio > (best?.ratio ?? 0)) {
              best = { index: idx, ratio: entry.intersectionRatio };
            }
          }
        }
        if (best && !ignorePageObserver) setCurrentVisiblePage(best.index);
      },
      { threshold: [0, 0.25, 0.5, 0.75] },
    );

    // Observe LazyDetailImage containers once they appear in DOM
    requestAnimationFrame(() => {
      const containers = document.querySelectorAll("[data-page-index]");
      containers.forEach((el) => observer.observe(el));
    });

    onCleanup(() => observer.disconnect());
  });

  // Scroll listener — show back-to-top FAB after scrolling down
  onMount(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run once to set initial state
    handleScroll();
    onCleanup(() => window.removeEventListener("scroll", handleScroll));
  });

  function coverUrl(): string {
    const i = illust();
    if (!i) return "";
    const q = detailQuality();
    if (q === "medium") return i.image_urls.medium;
    if (q === "large") return i.image_urls.large;
    // original: use original_image_url if available, fallback to large
    return i.meta_single_page?.original_image_url ?? i.image_urls.large;
  }

  const imageUrls = () => {
    const i = illust();
    if (!i) return [];
    if (i.page_count > 1) {
      return i.meta_pages.map((p) => p.image_urls.large);
    }
    return [i.meta_single_page.original_image_url ?? i.image_urls.large];
  };

  function scrollToPage(index: number) {
    setCurrentVisiblePage(index);
    ignorePageObserver = true;
    setTimeout(() => {
      ignorePageObserver = false;
    }, 600);
    const el = document.querySelector(`[data-page-index="${index}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <PageTransition>
      <div class="page">
        {loading() && <LoadingSpinner text="加载作品中..." />}

        {error() && (
          <div class="flex flex-col items-center justify-center h-screen gap-4 px-6">
            <p class="text-[var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase300)]">
              {error()}
            </p>
            <button class="btn-secondary" onClick={() => navigate(-1)}>
              返回
            </button>
          </div>
        )}

        {illust() && !viewerOpen() && (
          <>
            {/* App bar header */}
            <header class="flex items-center gap-3 px-4 py-3 surface-appbar sticky top-0 z-10">
              <button onClick={() => navigate(-1)} class="btn-icon text-lg" aria-label="返回">
                ←
              </button>
              <h2 class="text-[var(--colorNeutralForeground1)] font-semibold truncate flex-1 [font-size:var(--fontSizeBase300)]">
                {illust()!.title}
              </h2>
            </header>

            {/* Images — multi-page: vertical stack; single: cover + tap */}
            {illust()!.page_count > 1 ? (
              <div class="flex flex-col px-3" style={{ gap: "var(--spacingVerticalS)" }}>
                {imageUrls().map((url, i) => (
                  <LazyDetailImage
                    src={url}
                    pageIndex={i}
                    totalPages={imageUrls().length}
                    width={illust()!.width}
                    height={illust()!.height}
                    onClick={() => openViewer(i)}
                  />
                ))}
              </div>
            ) : (
              <div
                class="flex justify-center bg-[var(--colorNeutralBackground2)] cursor-pointer border-b border-[var(--colorNeutralStroke2)]"
                onClick={() => openViewer(0)}
              >
                <PixivImage
                  src={coverUrl()}
                  alt={illust()!.title}
                  width={illust()!.width}
                  height={illust()!.height}
                  loading="eager"
                  class="max-h-[60vh] object-cover cursor-pointer"
                />
              </div>
            )}

            {/* Info section */}
            <div class="px-4 py-4 space-y-4">
              {/* User info */}
              <div class="flex items-center gap-3">
                <PixivImage
                  src={illust()!.user.profile_image_urls.medium}
                  alt={illust()!.user.name}
                  width={40}
                  height={40}
                  class="w-10 h-10 rounded-[var(--borderRadiusCircular)] object-cover ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]"
                />
                <div>
                  <p class="text-[var(--colorNeutralForeground1)] font-semibold [font-size:var(--fontSizeBase300)]">
                    {illust()!.user.name}
                  </p>
                  <p class="text-[var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase200)]">
                    @{illust()!.user.account}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div class="flex gap-4 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground2)]">
                <span class="flex items-center gap-1">
                  <span>♡</span>
                  <span>{illust()!.total_bookmarks}</span>
                </span>
                {illust()!.total_view !== undefined && (
                  <span class="flex items-center gap-1">
                    <span>👁</span>
                    <span>{illust()!.total_view}</span>
                  </span>
                )}
                {illust()!.page_count > 1 && (
                  <span class="flex items-center gap-1">
                    <span>📄</span>
                    <span>{illust()!.page_count}P</span>
                  </span>
                )}
              </div>

              {/* Bookmark toggle */}
              <div class="relative inline-flex">
                <button
                  class={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--borderRadiusMedium)] text-[var(--fontSizeBase200)] font-medium transition-all active:scale-95 select-none ${
                    illust()!.is_bookmarked
                      ? "bg-[var(--colorStatusDangerBackground2)] text-[var(--colorStatusDangerForeground1)]"
                      : "bg-[var(--colorBrandStroke2)] text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorBrandBackground)] hover:text-white"
                  }`}
                  onPointerDown={onBookmarkPointerDown}
                  onPointerUp={onBookmarkPointerUp}
                  onPointerLeave={() => {
                    if (longPressTimer) {
                      clearTimeout(longPressTimer);
                      longPressTimer = 0 as any;
                    }
                  }}
                  disabled={bookmarking()}
                >
                  {illust()!.is_bookmarked ? "♥ 已收藏" : "♡ 收藏"}
                </button>
                <HeartBurstEffect trigger={bookmarkBurstTrigger} />
              </div>

              {/* Tags */}
              <div class="flex flex-wrap gap-1.5">
                {illust()!.tags.map((tag) => (
                  <span class="badge">{tag.translated_name || tag.name}</span>
                ))}
              </div>

              {/* Caption */}
              {illust()!.caption && (
                <p class="[font-size:var(--fontSizeBase300)] text-[var(--colorNeutralForeground2)] leading-relaxed whitespace-pre-wrap">
                  {illust()!.caption}
                </p>
              )}
            </div>

            {/* Viewer hint — only for single page */}
            {illust()!.page_count === 1 && (
              <div class="px-4 pb-8">
                <p class="text-center text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase200)]">
                  {illust()!.type === "ugoira"
                    ? "点击图片播放动图"
                    : "点击图片查看原图 · 双指缩放 · 左右滑动翻页"}
                </p>
              </div>
            )}

            {/* ── Multi-page: back-to-top FAB ── */}
            {illust()!.page_count > 1 && (
              <button
                class="rounded-[var(--borderRadiusCircular)] w-10 h-10 flex items-center justify-center text-[var(--colorOverlayForeground)] text-lg transition-all duration-[var(--durationFast)] bg-[var(--colorOverlaySurface)] backdrop-blur-[30px] backdrop-saturate-[125%] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)] hover:bg-[var(--colorOverlaySurfaceHover)] active:bg-[var(--colorOverlaySurfaceHover)] active:scale-90 focus-visible:[box-shadow:0_0_0_var(--strokeWidthThick)_var(--colorStrokeFocus2),0_0_0_calc(var(--strokeWidthThick)+var(--strokeWidthThin))_var(--colorStrokeFocus1)]"
                style={{
                  position: "fixed",
                  bottom: "calc(var(--spacingVerticalXXL) + 64px)",
                  right: "var(--spacingHorizontalL)",
                  opacity: showBackToTop() ? 1 : 0,
                  "pointer-events": showBackToTop() ? "auto" : "none",
                  "z-index": "20",
                }}
                onClick={() => {
                  setCurrentVisiblePage(0);
                  ignorePageObserver = true;
                  setTimeout(() => {
                    ignorePageObserver = false;
                  }, 600);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                aria-label="回顶"
              >
                ↑
              </button>
            )}

            {/* ── Multi-page: staircase (right-side page strip) ── */}
            {illust()!.page_count > 1 && (
              <nav
                class="backdrop-blur-[30px] backdrop-saturate-[125%] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)] rounded-[var(--borderRadiusXLarge)] flex flex-col items-center z-20"
                style={{
                  "background-color": "transparent",
                  position: "fixed",
                  top: "50%",
                  right: "var(--spacingHorizontalS)",
                  transform: "translateY(-50%)",
                  gap: "var(--spacingVerticalXXS)",
                  padding: "var(--spacingVerticalS) var(--spacingHorizontalXS)",
                  "max-height": imageUrls().length > 20 ? "60vh" : "none",
                  "overflow-y": imageUrls().length > 20 ? "auto" : "visible",
                }}
                aria-label="页面导航"
              >
                {imageUrls().map((_, i) => (
                  <button
                    class="flex items-center justify-center rounded-[var(--borderRadiusCircular)] [font-size:var(--fontSizeBase200)] font-medium transition-all duration-[var(--durationFast)]"
                    classList={{
                      "bg-[var(--colorNeutralBackground1Selected)] text-[var(--colorNeutralForeground1)] font-semibold":
                        i === currentVisiblePage(),
                      "text-white/85 hover:text-white": i !== currentVisiblePage(),
                    }}
                    style={{
                      "min-width": "36px",
                      "min-height": "36px",
                      "text-shadow":
                        i !== currentVisiblePage() ? "0 1px 3px rgba(0,0,0,0.6)" : "none",
                    }}
                    onClick={() => scrollToPage(i)}
                    aria-label={`第 ${i + 1} 页`}
                    aria-current={i === currentVisiblePage() ? "true" : undefined}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}

        {viewerOpen() && illust()!.type === "ugoira" && (
          <UgoiraViewer illustId={illust()!.id} coverUrl={imageUrls()[0]} onClose={closeViewer} />
        )}

        {viewerOpen() && illust()!.type !== "ugoira" && (
          <ImageViewer
            imageUrls={imageUrls()}
            initialPage={viewerStartPage()}
            onClose={closeViewer}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default IllustDetail;
