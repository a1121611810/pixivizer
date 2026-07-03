import { type Component, createSignal, createEffect, Show, onCleanup } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { loadDetail, fetchNovelData } from "../api/novel";
import type { PixivNovel, SeriesNavigation } from "../api/types";
import { resolveImageUrl } from "../utils/imageLoader";
import PixivImage from "../components/PixivImage";
import LoadingSpinner from "../components/LoadingSpinner";
import { readerStyle } from "../stores/readerSettingsStore";
import { novelCacheEnabled } from "../stores/uiStore";
import { getDetail, setDetail, getText, setText, getNav, setNav } from "../stores/novelCache";
import ReaderSettingsSheet from "../components/ReaderSettingsSheet";

const NovelDetail: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const novelId = () => Number(params.id);

  const [novelData, setNovelData] = createSignal<PixivNovel | null>(null);
  const [novelHtml, setNovelHtml] = createSignal<string | null>(null);
  const [novelNav, setNovelNav] = createSignal<SeriesNavigation | null>(null);
  const [detailLoading, setDetailLoading] = createSignal(false);
  const [detailError, setDetailError] = createSignal<string | null>(null);
  let abortController: AbortController | null = null;

  createEffect(() => {
    const id = novelId();
    if (!id) return;

    // 1. 尝试从缓存读取
    if (novelCacheEnabled()) {
      const cachedDetail = getDetail(id);
      const cachedText = getText(id);
      const cachedNav = getNav(id);
      if (cachedDetail && cachedText) {
        setNovelData(cachedDetail);
        setNovelHtml(cachedText);
        if (cachedNav) setNovelNav(cachedNav);
        setDetailLoading(false);
        return;
      }
      if (cachedDetail) setNovelData(cachedDetail);
      if (cachedNav) setNovelNav(cachedNav);
    }

    abortController?.abort();
    abortController = new AbortController();

    setDetailLoading(!novelData());
    setDetailError(null);
    if (!novelData()) setNovelData(null);
    if (!novelHtml()) setNovelHtml(null);

    Promise.all([loadDetail(id), fetchNovelData(id).catch(() => ({ text: "", navigation: {} }))])
      .then(([detail, novelResult]) => {
        if (!abortController?.signal.aborted) {
          setNovelData(detail.novel);
          setNovelHtml(novelResult.text);
          if (novelResult.navigation.nextNovel || novelResult.navigation.prevNovel) {
            setNovelNav(novelResult.navigation);
          }
          setDetailLoading(false);

          // 2. 写入缓存
          if (novelCacheEnabled() && novelResult.text) {
            setDetail(id, detail.novel);
            setText(id, novelResult.text);
            if (novelResult.navigation.nextNovel || novelResult.navigation.prevNovel) {
              setNav(id, novelResult.navigation);
            }
          }
        }
      })
      .catch((e) => {
        if (!abortController?.signal.aborted) {
          setDetailError((e as { message?: string }).message ?? "加载失败");
          setDetailLoading(false);
        }
      });
  });

  onCleanup(() => {
    abortController?.abort();
  });

  const [settingsOpen, setSettingsOpen] = createSignal(false);

  return (
    <div class="min-h-screen bg-[var(--colorNeutralBackground2)]">
      {/* ── Top navigation bar ── */}
      <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4 gap-2">
        <button
          class="w-8 h-8 flex items-center justify-center rounded-[var(--borderRadiusSmall)] text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorNeutralBackground2)] active:scale-95 transition-all appearance-none border-none outline-none cursor-pointer"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
          </svg>
        </button>
        <h1 class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)]">
          小说
        </h1>
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
                <h1 class="[font-size:var(--fontSizeBase500)] font-bold text-[var(--colorNeutralForeground1)] leading-tight mb-1">
                  {novel().title}
                </h1>
                <button
                  class="[font-size:var(--fontSizeBase200)] text-[var(--colorBrandForeground1)] hover:underline bg-transparent border-none p-0 cursor-pointer"
                  onClick={() => navigate(`/user/${novel().user.id}`)}
                >
                  @{novel().user.name}
                </button>

                <Show when={novel().series}>
                  {(series) => (
                    <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-1">
                      系列：{series().title}
                    </p>
                  )}
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
            <div class="px-4 py-6 max-w-2xl mx-auto">
              <Show when={novelHtml()}>
                {(content) => (
                  <div class="novel-text" style={readerStyle() as Record<string, string>}>
                    {content()
                      .split("\n\n")
                      .map((p) => (
                        <p class="mb-4 indent-2">{p}</p>
                      ))}
                  </div>
                )}
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
            <div class="sticky bottom-0 surface-appbar border-t border-[var(--colorNeutralStroke2)] px-4 py-2">
              <div class="max-w-2xl mx-auto flex items-center justify-center gap-2">
                <Show when={novelNav()?.prevNovel}>
                  {(prev) => (
                    <button
                      class="px-3 py-2 rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase200)] font-medium hover:bg-[var(--colorNeutralBackground3)] active:scale-95 transition-all appearance-none border-none outline-none cursor-pointer flex items-center gap-1"
                      onClick={() => navigate(`/novel/${prev().id}`, { replace: true })}
                    >
                      ◀ 上一章
                    </button>
                  )}
                </Show>
                <button
                  class="px-4 py-2 rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase200)] font-medium hover:bg-[var(--colorNeutralBackground3)] active:scale-95 transition-all appearance-none border-none outline-none cursor-pointer flex items-center gap-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  <span class="font-bold tracking-tight" style="font-size:16px">
                    Aa
                  </span>
                  显示设置
                </button>
                <Show when={novelNav()?.nextNovel}>
                  {(next) => (
                    <button
                      class="px-3 py-2 rounded-[var(--borderRadiusMedium)] bg-[var(--colorBrandBackground)] text-white [font-size:var(--fontSizeBase200)] font-medium hover:opacity-90 active:scale-95 transition-all appearance-none border-none outline-none cursor-pointer flex items-center gap-1"
                      onClick={() => navigate(`/novel/${next().id}`, { replace: true })}
                    >
                      下一章 ▶
                    </button>
                  )}
                </Show>
              </div>
            </div>

            <ReaderSettingsSheet isOpen={settingsOpen()} onClose={() => setSettingsOpen(false)} />

            {/* ── Close the Show fragment ── */}
          </>
        )}
      </Show>
    </div>
  );
};

export default NovelDetail;
