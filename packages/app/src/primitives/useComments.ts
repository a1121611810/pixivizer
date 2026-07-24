import { createSignal, createEffect, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";
import type { PixivComment } from "../api/types";
import type { CommentContentType } from "../api/comment";
import {
  loadRootComments,
  loadRootCommentsNext,
  postComment as apiPostComment,
  deleteComment as apiDeleteComment,
} from "../api/comment";
import { createSentinel } from "./visibility";
import { SHEET_LAZY_MARGIN } from "./rootMargins";

export interface UseCommentsResult {
  comments: Accessor<PixivComment[]>;
  hasLoaded: Accessor<boolean>;
  loading: Accessor<boolean>;
  error: Accessor<string | null>;
  postError: Accessor<string | null>;
  posting: Accessor<boolean>;
  deletingId: Accessor<number | null>;
  hasMore: Accessor<boolean>;
  loadMore: () => void;
  post: (text: string, parentId?: number) => Promise<void>;
  remove: (commentId: number) => Promise<void>;
  sentinelAttach: (el: HTMLDivElement) => void;
}

export function useComments(
  type: Accessor<CommentContentType>,
  targetId: Accessor<number>,
  enabled: Accessor<boolean>,
): UseCommentsResult {
  const [rootComments, setRootComments] = createSignal<PixivComment[]>([]);
  const [hasLoaded, setHasLoaded] = createSignal(false);
  const [nextUrl, setNextUrl] = createSignal<string | null>(null);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [postError, setPostError] = createSignal<string | null>(null);
  const [posting, setPosting] = createSignal(false);
  const [deletingId, setDeletingId] = createSignal<number | null>(null);

  // 加载根评论（当 enabled + targetId 变化时触发）
  createEffect(() => {
    if (!enabled()) return;
    const id = targetId();
    const t = type();
    const ac = new AbortController();

    setError(null);
    setHasLoaded(false);
    setRootComments([]);
    setNextUrl(null);

    loadRootComments(t, id, ac.signal)
      .then((res) => {
        setRootComments(res.comments);
        setNextUrl(res.next_url);
        setHasLoaded(true);
      })
      .catch((err) => {
        if ((err as { name?: string }).name !== "AbortError") {
          setError("加载评论失败，请重试");
        }
      });

    onCleanup(() => ac.abort());
  });

  // 分页加载更多
  async function loadMore() {
    const url = nextUrl();
    if (!url || loadingMore()) return;
    setLoadingMore(true);
    try {
      const res = await loadRootCommentsNext(url);
      setRootComments((prev) => [...prev, ...res.comments]);
      setNextUrl(res.next_url);
    } catch {
      setError("加载更多失败");
    } finally {
      setLoadingMore(false);
    }
  }

  // 分页哨兵
  const { attach: sentinelAttach } = createSentinel({
    rootMargin: SHEET_LAZY_MARGIN,
    enabled: () => nextUrl() !== null && !loadingMore(),
    onTrigger: () => void loadMore(),
  });

  // 发表/回复评论
  async function post(text: string, parentId?: number): Promise<void> {
    setPosting(true);
    setPostError(null);
    try {
      await apiPostComment(type(), targetId(), text, parentId);
      const res = await loadRootComments(type(), targetId());
      setRootComments(res.comments);
      setNextUrl(res.next_url);
    } catch {
      setPostError("发送失败，请重试");
    } finally {
      setPosting(false);
    }
  }

  // 删除评论
  async function remove(commentId: number): Promise<void> {
    setDeletingId(commentId);
    try {
      await apiDeleteComment(type(), commentId);
      setRootComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      setError("删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  return {
    comments: rootComments,
    hasLoaded,
    loading: () => !hasLoaded() && !error(),
    error,
    postError,
    posting,
    deletingId,
    hasMore: () => nextUrl() !== null,
    loadMore,
    post,
    remove,
    sentinelAttach,
  };
}
