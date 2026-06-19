import { type Component, createSignal, onMount } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { loadDetail } from '../api/illust';
import type { PixivIllust } from '../api/types';
import ImageViewer from '../components/ImageViewer';
import LoadingSpinner from '../components/LoadingSpinner';

const IllustDetail: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [illust, setIllust] = createSignal<PixivIllust | null>(null);
  const [viewerOpen, setViewerOpen] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

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

  const imageUrls = () => {
    const i = illust();
    if (!i) return [];
    if (i.page_count > 1) {
      return i.meta_pages.map((p) => p.image_urls.large);
    }
    return [i.meta_single_page.original_image_url ?? i.image_urls.large];
  };

  return (
    <div class="page">
      {loading() && <LoadingSpinner text="加载作品中..." />}

      {error() && (
        <div class="flex flex-col items-center justify-center h-screen gap-4 px-6">
          <p class="text-red-400">{error()}</p>
          <button class="btn" onClick={() => navigate('/feed')}>
            返回
          </button>
        </div>
      )}

      {illust() && !viewerOpen() && (
        <>
          {/* 顶部栏 */}
          <header class="flex items-center gap-4 px-4 py-3 border-b border-gray-800">
            <button onClick={() => navigate(-1)} class="text-gray-300 text-xl">
              ←
            </button>
            <h2 class="text-white font-medium truncate flex-1">
              {illust()!.title}
            </h2>
          </header>

          {/* 封面图（点击进入查看器） */}
          <div
            class="flex justify-center bg-dark-900 cursor-pointer"
            onClick={() => setViewerOpen(true)}
          >
            <img
              src={`/pixiv-img/${imageUrls()[0].split('/').slice(3).join('/')}`}
              alt={illust()!.title}
              class="max-h-[60vh] object-contain"
            />
          </div>

          {/* 信息区 */}
          <div class="px-4 py-4 space-y-3">
            <div class="flex items-center gap-3">
              <img
                src={`/pixiv-img/${illust()!.user.profile_image_urls.medium.split('/').slice(3).join('/')}`}
                alt={illust()!.user.name}
                class="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p class="text-white font-medium">{illust()!.user.name}</p>
                <p class="text-gray-400 text-xs">@{illust()!.user.account}</p>
              </div>
            </div>

            <div class="flex gap-4 text-sm text-gray-400">
              <span>♡ {illust()!.total_bookmarks}</span>
              {illust()!.total_view !== undefined && (
                <span>👁 {illust()!.total_view}</span>
              )}
              {illust()!.page_count > 1 && (
                <span>📄 {illust()!.page_count}P</span>
              )}
            </div>

            <div class="flex flex-wrap gap-2">
              {illust()!.tags.map((tag) => (
                <span class="text-xs px-2 py-1 rounded-full bg-dark-800 text-gray-300">
                  {tag.translated_name || tag.name}
                </span>
              ))}
            </div>
          </div>

          {/* 打开查看器提示 */}
          <div class="px-4 pb-8">
            <p class="text-center text-gray-500 text-xs">
              点击图片查看原图 · 双指缩放 · 左右滑动翻页
            </p>
          </div>
        </>
      )}

      {viewerOpen() && (
        <ImageViewer
          imageUrls={imageUrls()}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
};

export default IllustDetail;
