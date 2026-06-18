import { onMount, onCleanup } from 'solid-js';
import type { Component } from 'solid-js';
import ImageCard from './ImageCard';
import LoadingSpinner from './LoadingSpinner';
import type { PixivIllust } from '../api/types';

interface Props {
  illusts: PixivIllust[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onIllustClick: (id: number) => void;
  onLoadMore: () => void;
}

const VirtualFeed: Component<Props> = (props) => {
  let sentinel: HTMLDivElement | undefined;

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && props.hasMore && !props.loading) {
          props.onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );
    if (sentinel) observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="px-3 py-4">
      {props.error && (
        <div class="text-red-400 text-center py-3 mb-3 bg-red-900/20 rounded-lg">
          {props.error}
        </div>
      )}

      <div class="columns-2 gap-3">
        {props.illusts.map((illust) => (
          <ImageCard
            illust={illust}
            onClick={props.onIllustClick}
          />
        ))}
      </div>

      {props.loading && <LoadingSpinner text="加载中..." />}

      {!props.hasMore && props.illusts.length > 0 && (
        <p class="text-gray-500 text-center py-4">已经到底了</p>
      )}

      {props.illusts.length === 0 && !props.loading && !props.error && (
        <p class="text-gray-400 text-center py-16">暂无新作品</p>
      )}

      <div ref={sentinel} class="h-1" />
    </div>
  );
};

export default VirtualFeed;
