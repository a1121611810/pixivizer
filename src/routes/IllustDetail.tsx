import { type Component, createSignal, onMount, onCleanup } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { loadDetail } from '../api/illust';
import type { PixivIllust } from '../api/types';
import ImageViewer from '../components/ImageViewer';
import UgoiraViewer from '../components/UgoiraViewer';
import PixivImage from '../components/PixivImage';
import LoadingSpinner from '../components/LoadingSpinner';
import PageTransition from '../components/PageTransition';
import { detailQuality } from '../stores/uiStore';

const IllustDetail: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [illust, setIllust] = createSignal<PixivIllust | null>(null);
  const [viewerOpen, setViewerOpen] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Open/close viewer with global flag for Capacitor back-button handling
  function openViewer() {
    (window as any).__viewerOpen = true;
    setViewerOpen(true);
  }

  function closeViewer() {
    (window as any).__viewerOpen = false;
    setViewerOpen(false);
  }

  onMount(() => {
    // Listen for system back when viewer is open
    const onCloseViewer = () => setViewerOpen(false);
    window.addEventListener('closeViewer', onCloseViewer);
    onCleanup(() => window.removeEventListener('closeViewer', onCloseViewer));
  });

  onMount(async () => {
    try {
      const data = await loadDetail(Number(params.id));
      setIllust(data.illust);
    } catch (e) {
      setError((e as { message?: string }).message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  });

  function coverUrl(): string {
    const i = illust();
    if (!i) return '';
    const q = detailQuality();
    if (q === 'medium') return i.image_urls.medium;
    if (q === 'large') return i.image_urls.large;
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

  return (
    <PageTransition>
      <div class="page">
      {loading() && <LoadingSpinner text="加载作品中..." />}

      {error() && (
        <div class="flex flex-col items-center justify-center h-screen gap-4 px-6">
          <p class="text-[var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase300)]">{error()}</p>
          <button class="btn-secondary" onClick={() => navigate('/feed')}>
            返回
          </button>
        </div>
      )}

      {illust() && !viewerOpen() && (
        <>
          {/* App bar header */}
          <header class="flex items-center gap-3 px-4 py-3 surface-appbar sticky top-0 z-10">
            <button
              onClick={() => navigate(-1)}
              class="btn-icon text-lg"
              aria-label="返回"
            >
              ←
            </button>
            <h2 class="text-[var(--colorNeutralForeground1)] font-semibold truncate flex-1 [font-size:var(--fontSizeBase300)]">
              {illust()!.title}
            </h2>
          </header>

          {/* Cover image (tap → viewer) */}
          <div
            class="flex justify-center bg-[var(--colorNeutralBackground2)] cursor-pointer border-b border-[var(--colorNeutralStroke2)]"
            onClick={() => openViewer()}
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
              <span class="flex items-center gap-1"><span>♡</span><span>{illust()!.total_bookmarks}</span></span>
              {illust()!.total_view !== undefined && (
                <span class="flex items-center gap-1"><span>👁</span><span>{illust()!.total_view}</span></span>
              )}
              {illust()!.page_count > 1 && (
                <span class="flex items-center gap-1"><span>📄</span><span>{illust()!.page_count}P</span></span>
              )}
            </div>

            {/* Tags */}
            <div class="flex flex-wrap gap-1.5">
              {illust()!.tags.map((tag) => (
                <span class="badge">
                  {tag.translated_name || tag.name}
                </span>
              ))}
            </div>

            {/* Caption */}
            {illust()!.caption && (
              <p class="[font-size:var(--fontSizeBase300)] text-[var(--colorNeutralForeground2)] leading-relaxed whitespace-pre-wrap">
                {illust()!.caption}
              </p>
            )}
          </div>

          {/* Viewer hint — different text for ugoira */}
          <div class="px-4 pb-8">
            <p class="text-center text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase200)]">
              {illust()!.type === 'ugoira'
                ? '点击图片播放动图'
                : '点击图片查看原图 · 双指缩放 · 左右滑动翻页'}
            </p>
          </div>
        </>
      )}

      {viewerOpen() && illust()!.type === 'ugoira' && (
        <UgoiraViewer
          illustId={illust()!.id}
          coverUrl={imageUrls()[0]}
          onClose={closeViewer}
        />
      )}

      {viewerOpen() && illust()!.type !== 'ugoira' && (
        <ImageViewer
          imageUrls={imageUrls()}
          onClose={closeViewer}
        />
      )}
    </div>
    </PageTransition>
  );
};

export default IllustDetail;
