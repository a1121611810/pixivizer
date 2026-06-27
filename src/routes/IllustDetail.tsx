import { type Component, createSignal, onMount, onCleanup, createEffect } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { loadDetail, addBookmark, deleteBookmark, followUser, unfollowUser } from "../api/illust";
import type { PixivIllust } from "../api/types";
import ImageViewer from "../components/ImageViewer";
import UgoiraViewer from "../components/UgoiraViewer";
import LazyDetailImage from "../components/LazyDetailImage";
import PixivImage from "../components/PixivImage";
import LoadingSpinner from "../components/LoadingSpinner";
import PageTransition from "../components/PageTransition";
import HeartBurstEffect from "../components/HeartBurstEffect";
import { detailQuality, showDetailStairs } from "../stores/uiStore";
import { blockUser, isBlocked } from "../stores/blockStore";
import ReportSheet from "../components/ReportSheet";

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
  const [ugoiraCoverHeight, setUgoiraCoverHeight] = createSignal(0);
  const [isFollowed, setIsFollowed] = createSignal(false);
  const [following, setFollowing] = createSignal(false);
  const [showReportSheet, setShowReportSheet] = createSignal(false);
  const [showActionMenu, setShowActionMenu] = createSignal(false);
  const [toastMessage, setToastMessage] = createSignal<string | null>(null);

  async function toggleFollow() {
    const i = illust();
    if (!i || following()) return;
    const prev = isFollowed();
    setIsFollowed(!prev);
    setFollowing(true);
    try {
      if (prev) {
        await unfollowUser(i.user.id);
      } else {
        await followUser(i.user.id);
      }
      setIllust({ ...i, user: { ...i.user, is_followed: !prev } });
    } catch {
      setIsFollowed(prev);
    } finally {
      setFollowing(false);
    }
  }

  async function handleBlockAuthor() {
    const i = illust();
    if (!i) return;
    setShowActionMenu(false);
    if (isBlocked(i.user.id)) {
      setToastMessage("该作者已被屏蔽");
      return;
    }
    if (!window.confirm("确定要屏蔽该作者吗？屏蔽后其作品将不再显示在推荐和关注列表中。")) {
      return;
    }
    await blockUser(i.user.id);
    setToastMessage("已屏蔽该作者");
  }

  function openReport() {
    setShowActionMenu(false);
    setShowReportSheet(true);
  }

  // Auto-hide toast message
  createEffect(() => {
    if (toastMessage()) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      onCleanup(() => clearTimeout(timer));
    }
  });

  function measureCoverContent(e: Event) {
    const img = e.target as HTMLImageElement;
    if (img.naturalHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const midX = Math.floor(img.naturalWidth / 2);
    for (let y = img.naturalHeight - 1; y >= 0; y--) {
      const p = ctx.getImageData(midX, y, 1, 1).data;
      if ((p[0] + p[1] + p[2]) / 3 > 15) {
        setUgoiraCoverHeight(y + 2);
        return;
      }
    }
  }

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

  function onBookmarkPointerDown(_e: PointerEvent) {
    longPressTimer = setTimeout(() => {
      toggleBookmark(true); // private
      longPressTimer = 0 as any;
    }, 500);
  }

  function onBookmarkPointerUp(_e: PointerEvent) {
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
      setIsFollowed(data.illust.user.is_followed ?? false);
      // Multi-page: start observing page visibility for staircase after DOM renders
      if (data.illust.page_count > 1) {
        requestAnimationFrame(() => connectPageObserver());
      }
    } catch (e) {
      setError((e as { message?: string }).message ?? "加载失败");
    } finally {
      setLoading(false);
    }
  });

  // IntersectionObserver — track which page is currently visible for staircase.
  // Created in onMount for cleanup tracking; observe() is called after data loads.
  let pageObserver: IntersectionObserver | null = null;
  onMount(() => {
    pageObserver = new IntersectionObserver(
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
    onCleanup(() => pageObserver?.disconnect());
  });

  /** Start observing LazyDetailImage containers — call after data renders */
  function connectPageObserver() {
    if (!pageObserver) return;
    requestAnimationFrame(() => {
      const containers = document.querySelectorAll("[data-page-index]");
      containers.forEach((el) => pageObserver!.observe(el));
    });
  }

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

  /** Parse Pixiv internal caption links and navigate in-app */
  function handleCaptionClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.tagName !== "A") return;
    const href = target.getAttribute("href");
    if (!href) return;

    // pixiv://users/123456 → /user/123456
    const pixivProtocol = href.match(/^pixiv:\/\/users\/(\d+)/);
    if (pixivProtocol) {
      e.preventDefault();
      navigate(`/user/${pixivProtocol[1]}`);
      return;
    }
    // pixiv://illusts/12345678 → /illust/12345678
    const illustProtocol = href.match(/^pixiv:\/\/illusts\/(\d+)/);
    if (illustProtocol) {
      e.preventDefault();
      navigate(`/illust/${illustProtocol[1]}`);
      return;
    }
    // https://www.pixiv.net/(en/)?users/123456 → /user/123456
    const webUser = href.match(/pixiv\.net\/(?:en\/)?users\/(\d+)/);
    if (webUser) {
      e.preventDefault();
      navigate(`/user/${webUser[1]}`);
      return;
    }
    // https://www.pixiv.net/(en/)?artworks/12345678 → /illust/12345678
    const webArtwork = href.match(/pixiv\.net\/(?:en\/)?artworks\/(\d+)/);
    if (webArtwork) {
      e.preventDefault();
      navigate(`/illust/${webArtwork[1]}`);
      return;
    }
    // External links (fanbox, twitter, etc.) — let browser handle
  }

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
    const q = detailQuality();
    if (i.page_count > 1) {
      // 多图：medium → medium, large/original → large（meta_pages 没有 original）
      return i.meta_pages.map((p) => (q === "medium" ? p.image_urls.medium : p.image_urls.large));
    }
    // 单图
    if (q === "original") {
      return [i.meta_single_page.original_image_url ?? i.image_urls.large];
    }
    if (q === "medium") {
      return [i.image_urls.medium];
    }
    return [i.image_urls.large];
  };

  function scrollToPage(index: number) {
    setCurrentVisiblePage(index);
    ignorePageObserver = true;
    setTimeout(() => {
      ignorePageObserver = false;
    }, 600);
    const el = document.querySelector(`[data-page-index="${index}"]`);
    // block: "center" ensures the clicked page is centered in the viewport,
    // which is more accurate than "start" when pages are shorter than screen height.
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
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
            <header class="relative flex items-center gap-3 px-4 py-3 surface-appbar sticky top-0 z-10">
              <button onClick={() => navigate(-1)} class="btn-icon text-lg" aria-label="返回">
                ←
              </button>
              <h2 class="text-[var(--colorNeutralForeground1)] font-semibold truncate flex-1 [font-size:var(--fontSizeBase300)]">
                {illust()!.title}
              </h2>
              <button
                class="btn-icon text-lg"
                onClick={() => setShowActionMenu((v) => !v)}
                aria-label="更多"
                aria-expanded={showActionMenu()}
              >
                ⋮
              </button>

              {/* Action menu */}
              {showActionMenu() && (
                <div
                  class="absolute right-3 top-12 z-20 min-w-[140px] py-1 surface-flyout flex flex-col"
                  style={{ "box-shadow": "var(--elevation8)" }}
                >
                  <button
                    class="flex items-center gap-3 px-4 py-2.5 text-left [font-size:var(--fontSizeBase300)] text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorNeutralBackground1Hover)] active:bg-[var(--colorNeutralBackground1Pressed)] transition-colors appearance-none border-none outline-none cursor-pointer focus-visible:bg-[var(--colorNeutralBackground1Selected)]"
                    onClick={openReport}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 6a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5A.75.75 0 0 1 12 6zm0 10a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
                        fill="currentColor"
                      />
                    </svg>
                    举报
                  </button>
                  <button
                    class="flex items-center gap-3 px-4 py-2.5 text-left [font-size:var(--fontSizeBase300)] text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorNeutralBackground1Hover)] active:bg-[var(--colorNeutralBackground1Pressed)] transition-colors appearance-none border-none outline-none cursor-pointer focus-visible:bg-[var(--colorNeutralBackground1Selected)]"
                    onClick={handleBlockAuthor}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm4.25 6.25a.75.75 0 0 1 0 1.06l-8.5 8.5a.75.75 0 1 1-1.06-1.06l8.5-8.5a.75.75 0 0 1 1.06 0z"
                        fill="currentColor"
                      />
                    </svg>
                    屏蔽作者
                  </button>
                </div>
              )}
            </header>

            {/* Toast confirmation */}
            {toastMessage() && (
              <div
                class="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-[var(--colorStatusSuccessBackground2)] text-[var(--colorStatusSuccessForeground1)] border border-[var(--colorStatusSuccessForeground1)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation8)] px-5 py-2.5 [font-size:var(--fontSizeBase200)] font-medium whitespace-nowrap pointer-events-none transition-all duration-[var(--durationGentle)]"
                style={{
                  animation:
                    "fluent-scale-enter var(--durationNormal) var(--curveDecelerateMid) both",
                }}
              >
                {toastMessage()}
              </div>
            )}

            {/* Images — multi-page: vertical stack; single: cover + tap */}
            {illust()!.page_count > 1 ? (
              <div class="flex flex-col px-3" style={{ gap: "var(--spacingVerticalS)" }}>
                {imageUrls().map((url, i) => (
                  <LazyDetailImage
                    src={url}
                    pageIndex={i}
                    totalPages={imageUrls().length}
                    onClick={() => openViewer(i)}
                  />
                ))}
              </div>
            ) : illust()!.type === "ugoira" ? (
              <div
                class="flex justify-center bg-[var(--colorNeutralBackground2)] cursor-pointer border-b border-[var(--colorNeutralStroke2)]"
                onClick={() => openViewer(0)}
              >
                <div
                  style={{
                    "aspect-ratio": `${illust()!.width} / ${ugoiraCoverHeight() || Math.round(illust()!.height * 0.75)}`,
                  }}
                  class="overflow-hidden w-full"
                >
                  <PixivImage
                    src={coverUrl()}
                    alt={illust()!.title}
                    width={illust()!.width}
                    height={illust()!.height}
                    loading="eager"
                    class="w-full h-full object-cover object-top cursor-pointer"
                    onLoad={measureCoverContent}
                  />
                </div>
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
                  class="max-h-[60vh] object-contain cursor-pointer"
                />
              </div>
            )}

            {/* Info section */}
            <div class="px-4 py-4 space-y-4">
              {/* User info */}
              <div class="flex items-center gap-3">
                <PixivImage
                  src={illust()!.user.profile_image_urls.medium ?? ""}
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
                <button
                  class="inline-flex items-center justify-center gap-[var(--spacingHorizontalXS)] rounded-[var(--borderRadiusMedium)] font-semibold [font-size:var(--fontSizeBase200)] [line-height:var(--lineHeightBase200)] min-h-8 px-[var(--spacingHorizontalM)] border transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] active:scale-[0.97] select-none appearance-none outline-none cursor-pointer focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)] flex-shrink-0 ml-auto"
                  classList={{
                    "bg-[var(--colorBrandBackground)] text-white border-[var(--colorBrandBackground)] hover:bg-[var(--colorBrandBackgroundHover)] active:bg-[var(--colorBrandBackgroundPressed)]":
                      !isFollowed(),
                    "bg-transparent text-[var(--colorNeutralForeground2)] border-[var(--colorNeutralStroke2)] hover:text-[var(--colorStatusDangerForeground1)] hover:border-[var(--colorStatusDangerForeground1)]":
                      isFollowed(),
                  }}
                  onClick={toggleFollow}
                  disabled={following()}
                  aria-label={isFollowed() ? "取消关注" : "关注"}
                >
                  {following() ? "…" : isFollowed() ? "已关注" : "关注"}
                </button>
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
                <p
                  class="[font-size:var(--fontSizeBase300)] text-[var(--colorNeutralForeground2)] leading-relaxed whitespace-pre-wrap"
                  innerHTML={illust()!.caption}
                  onClick={handleCaptionClick}
                />
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
            {illust()!.page_count > 1 && showDetailStairs() && (
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

        <ReportSheet
          illustId={illust()?.id ?? 0}
          isOpen={showReportSheet()}
          onClose={() => setShowReportSheet(false)}
        />
      </div>
    </PageTransition>
  );
};

export default IllustDetail;
