import { type Component, createSignal, onMount, onCleanup, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  novels,
  nextUrl,
  loading,
  refreshing,
  error,
  ensureLoaded,
  fetchMore,
  refresh,
  saveTabScroll,
  getFeedScrollY,
  isNovelCached,
} from "../stores/novelStore";
import { setCurrentTab } from "../stores/uiStore";
import type { Tab } from "../stores/uiStore";
import NovelVirtualFeed from "../components/NovelVirtualFeed";
import SeriesSheet from "../components/SeriesSheet";

interface Props {
  tab: Tab;
}

const NovelFeedPage: Component<Props> = (props) => {
  const navigate = useNavigate();
  const cached = isNovelCached(props.tab);

  const [sheetOpen, setSheetOpen] = createSignal(false);
  const [sheetSeries, setSheetSeries] = createSignal<{
    id: number;
    title: string;
    authorName: string;
    authorId: number;
  } | null>(null);

  function openSeriesSheet(seriesId: number) {
    const novel = novels().find((n) => n.series?.id === seriesId);
    if (!novel?.series) return;
    setSheetSeries({
      id: seriesId,
      title: novel.series.title,
      authorName: novel.user.name,
      authorId: novel.user.id,
    });
    setSheetOpen(true);
  }

  onMount(() => {
    setCurrentTab(props.tab);
    void ensureLoaded();
  });

  onCleanup(() => {
    saveTabScroll(props.tab);
  });

  return (
    <>
      {/* Follow tab placeholder — 无 API 可用 */}
      <Show when={props.tab === "follow"}>
        <div class="flex flex-col items-center justify-center py-24 gap-4 text-[var(--colorNeutralForeground2)]">
          <span class="text-4xl">📖</span>
          <p class="[font-size:var(--fontSizeBase300)] font-medium">关注作者的小说</p>
          <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
            功能开发中...
          </p>
          <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground4)]">
            切换回「插画」模式查看关注的作品更新
          </p>
        </div>
      </Show>

      {/* Feed for recommended / bookmarks */}
      <Show when={props.tab !== "follow"}>
        <NovelVirtualFeed
          novels={novels()}
          loading={loading() || refreshing()}
          error={error()}
          hasMore={nextUrl() !== null}
          onNovelClick={(id) => navigate(`/novel/${id}`)}
          onLoadMore={fetchMore}
          onRefresh={refresh}
          restoreScrollTop={cached ? getFeedScrollY(props.tab) : undefined}
          onSeriesClick={openSeriesSheet}
        />
      </Show>
      <Show when={sheetSeries()}>
        {(s) => (
          <SeriesSheet
            seriesId={s().id}
            seriesTitle={s().title}
            authorName={s().authorName}
            authorId={s().authorId}
            isOpen={sheetOpen()}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </Show>
    </>
  );
};

export default NovelFeedPage;
