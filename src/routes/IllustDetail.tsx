import { type Component, createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { loadDetail } from "../api/illust";
import type { PixivIllust } from "../api/types";
import ImageViewer from "../components/ImageViewer";
import UgoiraViewer from "../components/UgoiraViewer";
import PixivImage from "../components/PixivImage";
import LoadingSpinner from "../components/LoadingSpinner";
import { detailQuality } from "../stores/uiStore";

interface Props {
  illustId: number | null;
  onBack: () => void;
}

const IllustDetail: Component<Props> = (props) => {
  const [illust, setIllust] = createSignal<PixivIllust | null>(null);
  const [viewerOpen, setViewerOpen] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // 当前正在加载/显示的作品 ID，用于防止竞态
  let currentLoadingId: number | null = null;

  function openViewer() {
    (window as any).__viewerOpen = true;
    setViewerOpen(true);
  }

  function closeViewer() {
    (window as any).__viewerOpen = false;
    setViewerOpen(false);
  }

  onMount(() => {
    const onCloseViewer = () => setViewerOpen(false);
    window.addEventListener("closeViewer", onCloseViewer);
    onCleanup(() => window.removeEventListener("closeViewer", onCloseViewer));
  });

  // 响应 illustId 变化加载数据
  createEffect(() => {
    const id = props.illustId;
    if (id == null) return;

    // 如果已经在显示该作品（从 keep-alive 恢复），跳过
    if (illust()?.id === id) return;

    setLoading(true);
    setError(null);
    setIllust(null);
    currentLoadingId = id;

    loadDetail(id)
      .then((data) => {
        // 防止竞态：忽略过时的请求结果
        if (currentLoadingId !== id) return;
        setIllust(data.illust);
        setLoading(false);
      })
      .catch((e) => {
        if (currentLoadingId !== id) return;
        setError((e as { message?: string }).message ?? "加载失败");
        setLoading(false);
      });
  });

  // 响应详情画质变化：如果有当前作品则重新拉取
  createEffect(() => {
    detailQuality(); // 追踪变化
    const id = props.illustId;
    const current = illust();
    if (id == null || !current) return;

    // 重新加载以获取新画质的 URL
    setLoading(true);
    currentLoadingId = id;
    loadDetail(id)
      .then((data) => {
        if (currentLoadingId !== id) return;
        setIllust(data.illust);
        setLoading(false);
      })
      .catch((e) => {
        if (currentLoadingId !== id) return;
        setError((e as { message?: string }).message ?? "加载失败");
        setLoading(false);
      });
  });

  function coverUrl(): string {
    const i = illust();
    if (!i) return "";
    const q = detailQuality();
    if (q === "medium") return i.image_urls.medium;
    if (q === "large") return i.image_urls.large;
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

  // 无 illustId 时不渲染
  if (props.illustId == null) {
    return null;
  }

  return (
    <div class="page">
      {loading() && !illust() && <LoadingSpinner text="加载作品中..." />}

      {error() && (
        <div class="flex flex-col items-center justify-center h-screen gap-4 px-6">
          <p class="text-[var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase300)]">
            {error()}
          </p>
          <button class="btn-secondary" onClick={props.onBack}>
            返回
          </button>
        </div>
      )}

      {illust() && !viewerOpen() && (
        <>
          {/* App bar header */}
          <header class="flex items-center gap-3 px-4 py-3 surface-appbar sticky top-0 z-10">
            <button onClick={props.onBack} class="btn-icon text-lg" aria-label="返回">
              ←
            </button>
            <h2 class="text-[var(--colorNeutralForeground1)] font-semibold truncate flex-1 [font-size:var(--fontSizeBase300)]">
              {illust()!.title}
            </h2>
          </header>

          {/* Cover image */}
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

          {/* Info section — 保持原有结构 */}
          <div class="px-4 py-4 space-y-4">
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

            <div class="flex flex-wrap gap-1.5">
              {illust()!.tags.map((tag) => (
                <span class="badge">{tag.translated_name || tag.name}</span>
              ))}
            </div>

            {illust()!.caption && (
              <p class="[font-size:var(--fontSizeBase300)] text-[var(--colorNeutralForeground2)] leading-relaxed whitespace-pre-wrap">
                {illust()!.caption}
              </p>
            )}
          </div>

          <div class="px-4 pb-8">
            <p class="text-center text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase200)]">
              {illust()!.type === "ugoira"
                ? "点击图片播放动图"
                : "点击图片查看原图 · 双指缩放 · 左右滑动翻页"}
            </p>
          </div>
        </>
      )}

      {viewerOpen() && illust()!.type === "ugoira" && (
        <UgoiraViewer illustId={illust()!.id} coverUrl={imageUrls()[0]} onClose={closeViewer} />
      )}

      {viewerOpen() && illust()!.type !== "ugoira" && (
        <ImageViewer imageUrls={imageUrls()} onClose={closeViewer} />
      )}
    </div>
  );
};

export default IllustDetail;
