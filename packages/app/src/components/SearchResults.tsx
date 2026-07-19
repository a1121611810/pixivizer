import { For, Show, type Component } from "solid-js";
import type { SearchResultItem, ApiError, PixivIllust, PixivNovel } from "@/api/types";
import ImageCard from "@/components/ImageCard";
import NovelCard from "@/components/NovelCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";

interface Props {
  results: SearchResultItem[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onIllustClick: (id: number) => void;
  onNovelClick: (id: number) => void;
  onRefresh: () => Promise<void> | void;
  error?: ApiError | null;
}

const SearchResults: Component<Props> = (props) => {
  return (
    <div>
      <Show when={props.error}>
        <ErrorDisplay error={props.error!} onRetry={props.onRefresh} />
      </Show>

      <Show when={!props.error}>
        {/* Results list */}
        <div class="flex flex-col gap-3">
          <For each={props.results}>
            {(item) => (
              <Show
                when={item.type === "illust"}
                fallback={
                  <NovelCard
                    novel={item.entity as PixivNovel}
                    onClick={() => props.onNovelClick(item.entity.id)}
                  />
                }
              >
                <ImageCard
                  illust={item.entity as PixivIllust}
                  onClick={() => props.onIllustClick(item.entity.id)}
                />
              </Show>
            )}
          </For>
        </div>

        {/* Loading indicator */}
        <Show when={props.loading}>
          <div class="py-6">
            <LoadingSpinner text="加载中..." />
          </div>
        </Show>

        {/* Load more button or end indicator */}
        <Show when={!props.loading}>
          <Show when={props.hasMore && props.results.length > 0}>
            <div class="flex justify-center py-4">
              <button
                class="px-6 py-3 min-h-11 rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground1)] text-sm font-medium hover:bg-[var(--colorNeutralBackground3)] active:scale-[0.98] transition-all duration-[var(--durationFast)]"
                onClick={props.onLoadMore}
              >
                加载更多
              </button>
            </div>
          </Show>

          <Show when={!props.hasMore && props.results.length > 0}>
            <p class="text-center py-6 text-[var(--colorNeutralForeground4)] text-sm">已经到底了</p>
          </Show>
        </Show>

        {/* Empty state */}
        <Show when={!props.loading && props.results.length === 0 && !props.hasMore && !props.error}>
          <div class="flex flex-col items-center gap-3 py-16 text-center">
            <p class="text-[var(--colorNeutralForeground3)] text-base">没有找到相关作品</p>
            <p class="text-[var(--colorNeutralForeground4)] text-sm">
              试试其他关键词或调整筛选条件
            </p>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default SearchResults;
