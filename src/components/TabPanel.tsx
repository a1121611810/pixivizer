import { type Component, createSignal, createEffect, Show } from "solid-js";
import VirtualFeed from "./VirtualFeed";
import {
  illusts as feedIllusts,
  nextUrl as feedNextUrl,
  loading as feedLoading,
  refreshing as feedRefreshing,
  error as feedError,
  ensureLoaded as feedEnsureLoaded,
  fetchMore as feedFetchMore,
  refresh as feedRefresh,
} from "../stores/feedStore";
import {
  illusts as bookmarkIllusts,
  nextUrl as bookmarkNextUrl,
  loading as bookmarkLoading,
  error as bookmarkError,
  restrict,
  setRestrict,
  ensureLoaded as bookmarkEnsureLoaded,
  fetchMore as bookmarkFetchMore,
  refresh as bookmarkRefresh,
} from "../stores/bookmarkStore";
import type { Tab } from "../stores/uiStore";

interface Props {
  tab: Tab;
  visible: boolean;
  onIllustClick: (id: number) => void;
  onSettingsOpen?: () => void;
}

const TabPanel: Component<Props> = (props) => {
  // 首次激活后永久保持渲染
  const [everActivated, setEverActivated] = createSignal(false);

  createEffect(() => {
    if (props.visible) setEverActivated(true);
  });

  // 根据 tab 选择正确的 store 数据源
  const isFeedTab = () => props.tab === "recommended" || props.tab === "follow";
  const isBookmarkTab = () => props.tab === "bookmarks";

  // 激活时触发数据加载（仅 feed tab，bookmark tab 由自身 ensureLoaded 处理）
  createEffect(() => {
    if (props.visible && isFeedTab()) {
      // feedStore.ensureLoaded() 依赖 uiStore.currentTab，需在调用前设置
      // currentTab 由 FeedShell 管理，此处仅触发 ensureLoaded
      feedEnsureLoaded();
    }
    if (props.visible && isBookmarkTab()) {
      bookmarkEnsureLoaded();
    }
  });

  return (
    <div style={{ display: props.visible ? "block" : "none" }}>
      {everActivated() && (
        <Show
          when={isFeedTab()}
          fallback={
            <>
              {/* Segmented: 公开收藏 / 非公开收藏 */}
              <div class="flex justify-center py-3 px-4">
                <div
                  class="inline-flex rounded-[var(--borderRadiusMedium)] p-0.5"
                  style={{ background: "var(--colorNeutralBackground2)" }}
                >
                  <button
                    class="px-4 py-1.5 rounded-[var(--borderRadiusSmall)] text-sm font-medium transition-colors"
                    classList={{
                      "bg-[var(--colorBrandBackground)] text-white": restrict() === "public",
                      "text-[var(--colorNeutralForeground2)]": restrict() !== "public",
                    }}
                    onClick={() => setRestrict("public")}
                  >
                    公开收藏
                  </button>
                  <button
                    class="px-4 py-1.5 rounded-[var(--borderRadiusSmall)] text-sm font-medium transition-colors"
                    classList={{
                      "bg-[var(--colorBrandBackground)] text-white": restrict() === "private",
                      "text-[var(--colorNeutralForeground2)]": restrict() !== "private",
                    }}
                    onClick={() => setRestrict("private")}
                  >
                    非公开收藏
                  </button>
                </div>
              </div>
              <VirtualFeed
                illusts={bookmarkIllusts()}
                loading={bookmarkLoading()}
                error={bookmarkError()}
                hasMore={bookmarkNextUrl() !== null}
                onIllustClick={props.onIllustClick}
                onLoadMore={bookmarkFetchMore}
                onRefresh={bookmarkRefresh}
                onSettingsOpen={props.onSettingsOpen}
                skipAnimation={true}
              />
            </>
          }
        >
          <VirtualFeed
            illusts={feedIllusts()}
            loading={feedLoading() || feedRefreshing()}
            error={feedError()}
            hasMore={feedNextUrl() !== null}
            onIllustClick={props.onIllustClick}
            onLoadMore={feedFetchMore}
            onRefresh={feedRefresh}
            onSettingsOpen={props.onSettingsOpen}
            skipAnimation={true}
          />
        </Show>
      )}
    </div>
  );
};

export default TabPanel;
