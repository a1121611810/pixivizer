import { createSignal, createEffect, onCleanup, untrack, batch, type Accessor } from "solid-js";
import { loadDetail, fetchNovelData, type NovelImagesMap } from "@/api/novel";
import type { PixivNovel, SeriesNavigation } from "@/api/types";
import { novelCacheEnabled } from "@/stores/uiStore";
import {
  getDetail,
  setDetail,
  getText,
  setText,
  getNav,
  setNav,
  getImages,
  setImages,
} from "@/stores/novelCache";

export interface NovelLoaderResult {
  novelData: Accessor<PixivNovel | null>;
  novelHtml: Accessor<string | null>;
  novelImages: Accessor<NovelImagesMap>;
  novelNav: Accessor<SeriesNavigation | null>;
  detailLoading: Accessor<boolean>;
  detailError: Accessor<string | null>;
}

/**
 * 小说详情页数据加载器。
 *
 * 封装了按 novelId 加载作品元数据、正文、系列导航与内嵌图片映射的生命周期，
 * 并解决 `createEffect` 因读取自身写入的 signal 而自我触发的问题。
 */
export function createNovelLoader(novelId: Accessor<number>): NovelLoaderResult {
  const [novelData, setNovelData] = createSignal<PixivNovel | null>(null);
  const [novelHtml, setNovelHtml] = createSignal<string | null>(null);
  const [novelImages, setNovelImages] = createSignal<NovelImagesMap>({});
  const [novelNav, setNovelNav] = createSignal<SeriesNavigation | null>(null);
  const [detailLoading, setDetailLoading] = createSignal(false);
  const [detailError, setDetailError] = createSignal<string | null>(null);

  let abortController: AbortController | null = null;

  createEffect(() => {
    const id = novelId();
    if (!id) return;

    // 读取旧状态但不对其产生依赖，避免设值后自我触发。
    const hadData = untrack(() => novelData()) != null;
    const hadHtml = untrack(() => novelHtml()) != null;

    // 1. 尝试从缓存读取
    if (novelCacheEnabled()) {
      const cachedDetail = getDetail(id);
      const cachedText = getText(id);
      const cachedNav = getNav(id);
      const cachedImages = getImages(id);
      if (cachedDetail && cachedText) {
        setNovelData(cachedDetail);
        setNovelImages(cachedImages ?? {});
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

    setDetailLoading(!hadData);
    setDetailError(null);
    if (!hadData) setNovelData(null);
    if (!hadHtml) setNovelHtml(null);
    setNovelImages({});

    Promise.all([
      loadDetail(id),
      fetchNovelData(id).catch(() => ({ text: "", navigation: {}, images: {} })),
    ])
      .then(([detail, novelResult]) => {
        if (abortController?.signal.aborted) return;

        batch(() => {
          setNovelData(detail.novel);
          setNovelHtml(novelResult.text);
          setNovelImages(novelResult.images ?? {});
          if (novelResult.navigation.nextNovel || novelResult.navigation.prevNovel) {
            setNovelNav(novelResult.navigation);
          }
          setDetailLoading(false);
        });

        // 2. 写入缓存
        if (novelCacheEnabled() && novelResult.text) {
          setDetail(id, detail.novel);
          setText(id, novelResult.text);
          if (novelResult.navigation.nextNovel || novelResult.navigation.prevNovel) {
            setNav(id, novelResult.navigation);
          }
          setImages(id, novelResult.images ?? {});
        }
      })
      .catch((e) => {
        if (abortController?.signal.aborted) return;
        setDetailError((e as { message?: string }).message ?? "加载失败");
        setDetailLoading(false);
      });
  });

  onCleanup(() => {
    abortController?.abort();
  });

  return {
    novelData,
    novelHtml,
    novelImages,
    novelNav,
    detailLoading,
    detailError,
  };
}
