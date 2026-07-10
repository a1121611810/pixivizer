import { type Component, createSignal, createEffect } from "solid-js";
import type { PixivIllust, PixivNovel, ContentType } from "../api/types";
import type { LayoutMode } from "../primitives/types";
import VirtualFeed from "./VirtualFeed";
import NovelVirtualFeed from "./NovelVirtualFeed";

interface Props {
  contentType: ContentType;
  illusts: PixivIllust[];
  novels: PixivNovel[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onIllustClick: (id: number) => void;
  onNovelClick: (id: number) => void;
  onLoadMore: () => void;
  onRefresh: () => Promise<void> | void;
  layoutMode?: LayoutMode;
  restoreScrollTop?: number;
}

const UserWorksFeed: Component<Props> = (props) => {
  // Lazy-mount NovelVirtualFeed only on first switch to novel, then keep alive
  const [novelMounted, setNovelMounted] = createSignal(false);
  createEffect(() => {
    if (props.contentType === "novel") {
      setNovelMounted(true);
    }
  });

  return (
    <>
      {/* illust/manga feed: always mounted, hidden via CSS when novel */}
      <div
        data-feed-type="illust"
        style={{ display: props.contentType === "novel" ? "none" : "block" }}
      >
        <VirtualFeed
          illusts={props.illusts}
          loading={props.loading}
          error={props.error}
          hasMore={props.hasMore}
          onIllustClick={props.onIllustClick}
          onLoadMore={props.onLoadMore}
          onRefresh={props.onRefresh}
          layoutMode={props.layoutMode}
          restoreScrollTop={props.restoreScrollTop}
        />
      </div>

      {/* novel feed: mounted once on first switch, then kept alive */}
      <div
        data-feed-type="novel"
        style={{ display: props.contentType === "novel" ? "block" : "none" }}
      >
        {novelMounted() && (
          <NovelVirtualFeed
            novels={props.novels}
            loading={props.loading}
            error={props.error}
            hasMore={props.hasMore}
            onNovelClick={props.onNovelClick}
            onLoadMore={props.onLoadMore}
            onRefresh={props.onRefresh}
            restoreScrollTop={props.restoreScrollTop}
          />
        )}
      </div>
    </>
  );
};

export default UserWorksFeed;
