import {
  type Component,
  Show,
  For,
  createSignal,
  createEffect,
  createMemo,
  onCleanup,
} from "solid-js";
import type { PixivComment } from "../api/types";
import {
  loadIllustRootComments,
  loadIllustRootCommentsNext,
  loadIllustReplies,
  postIllustComment,
  deleteIllustComment,
  loadNovelRootComments,
  loadNovelRootCommentsNext,
  loadNovelReplies,
  postNovelComment,
  deleteNovelComment,
} from "../api/comment";

interface CommentOverlayProps {
  type: "illust" | "novel";
  targetId: number;
  isOpen: boolean;
  onClose: () => void;
}

const CommentOverlay: Component<CommentOverlayProps> = (props) => {
  const [rootComments, setRootComments] = createSignal<PixivComment[]>([]);
  const [nextUrl, setNextUrl] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [expandedReplies, setExpandedReplies] = createSignal<Set<number>>(new Set());
  const [repliesMap, setRepliesMap] = createSignal<Record<number, PixivComment[]>>({});
  const [replyLoading, setReplyLoading] = createSignal<number | null>(null);
  const [inputText, setInputText] = createSignal("");
  const [replyingTo, setReplyingTo] = createSignal<PixivComment | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [postError, setPostError] = createSignal<string | null>(null);
  const [posting, setPosting] = createSignal(false);
  const [deletingId, setDeletingId] = createSignal<number | null>(null);

  // 根据 type 选择对应的 API 函数
  const api = createMemo(() => {
    const isIllust = props.type === "illust";
    return {
      loadRoot: isIllust ? loadIllustRootComments : loadNovelRootComments,
      loadRootNext: isIllust ? loadIllustRootCommentsNext : loadNovelRootCommentsNext,
      loadReplies: isIllust ? loadIllustReplies : loadNovelReplies,
      post: isIllust
        ? (comment: string, parentId?: number) =>
            postIllustComment(props.targetId, comment, parentId)
        : (comment: string, parentId?: number) =>
            postNovelComment(props.targetId, comment, parentId),
      del: isIllust ? deleteIllustComment : deleteNovelComment,
    };
  });

  // 首次数据加载
  createEffect(() => {
    if (!props.isOpen) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setRootComments([]);
    setNextUrl(null);
    setExpandedReplies(new Set());
    setRepliesMap({});

    api()
      .loadRoot(props.targetId, ac.signal)
      .then((res) => {
        setRootComments(res.comments);
        setNextUrl(res.next_url);
      })
      .catch((e) => {
        if ((e as { name?: string }).name !== "AbortError") {
          setError("加载评论失败，请重试");
        }
      })
      .finally(() => {
        setLoading(false);
      });

    onCleanup(() => ac.abort());
  });

  // 分页哨兵
  let sentinelRef: HTMLDivElement | undefined;

  async function loadMore() {
    const url = nextUrl();
    if (!url || loadingMore()) return;
    setLoadingMore(true);
    try {
      const res = await api().loadRootNext(url);
      setRootComments((prev) => [...prev, ...res.comments]);
      setNextUrl(res.next_url);
    } catch {
      setError("加载更多失败");
    } finally {
      setLoadingMore(false);
    }
  }

  createEffect(() => {
    if (!props.isOpen) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && nextUrl() && !loadingMore()) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    if (sentinelRef) observer.observe(sentinelRef);
    onCleanup(() => observer.disconnect());
  });

  // 展开/收起回复
  async function toggleReplies(rootCommentId: number) {
    if (expandedReplies().has(rootCommentId)) {
      const next = new Set(expandedReplies());
      next.delete(rootCommentId);
      setExpandedReplies(next);
      return;
    }
    setReplyLoading(rootCommentId);
    try {
      const res = await api().loadReplies(props.targetId, rootCommentId);
      setRepliesMap((prev) => ({ ...prev, [rootCommentId]: res.comments }));
      setExpandedReplies((prev) => new Set(prev).add(rootCommentId));
    } catch {
      setError("加载回复失败");
    } finally {
      setReplyLoading(null);
    }
  }

  // 发表/回复
  async function handleSubmit() {
    const text = inputText().trim();
    if (!text || posting()) return;
    setPosting(true);
    setPostError(null);
    try {
      await api().post(text, replyingTo()?.id);
      setInputText("");
      setReplyingTo(null);
      // 刷新根评论列表
      const res = await api().loadRoot(props.targetId);
      setRootComments(res.comments);
      setNextUrl(res.next_url);
    } catch {
      setPostError("发送失败，请重试");
    } finally {
      setPosting(false);
    }
  }

  function handleReply(comment: PixivComment) {
    setReplyingTo(comment);
    setInputText("");
  }

  function cancelReply() {
    setReplyingTo(null);
    setInputText("");
  }

  // 删除
  async function handleDelete(commentId: number) {
    setDeletingId(commentId);
    try {
      await api().del(commentId);
      setRootComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.root_comment_id !== commentId),
      );
    } catch {
      setError("删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50"
        style={{ "background-color": "rgba(0,0,0,0.5)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) props.onClose();
        }}
      >
        <div
          class="absolute bottom-0 left-0 right-0 h-[80vh] rounded-t-[var(--borderRadiusXLarge)] surface-appbar flex flex-col"
          style={{
            "background-color": "var(--colorNeutralBackground1)",
            "box-shadow": "var(--elevation8)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header class="flex items-center justify-between px-4 h-12 flex-shrink-0 border-b border-[var(--colorNeutralStroke2)]">
            <h2 class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)]">
              评论
            </h2>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-[var(--borderRadiusSmall)] text-[var(--colorNeutralForeground2)] hover:bg-[var(--colorNeutralBackground2)] active:scale-95 transition-all appearance-none border-none outline-none cursor-pointer"
              onClick={props.onClose}
              aria-label="关闭"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </header>

          {/* Error banner */}
          <Show when={error()}>
            <div class="px-4 py-2 text-[var(--colorStatusDangerForeground1)] [font-size:var(--fontSizeBase200)] flex items-center gap-2">
              <span>{error()}</span>
              <button
                class="underline bg-transparent border-none p-0 cursor-pointer text-[var(--colorBrandForeground1)]"
                onClick={() => window.location.reload()}
              >
                重试
              </button>
            </div>
          </Show>

          {/* Comment list */}
          <div class="flex-1 overflow-y-auto">
            <Show when={loading}>
              <div class="flex justify-center py-8">
                <div class="spinner w-6 h-6" />
              </div>
            </Show>

            <Show when={!loading && rootComments().length === 0}>
              <div class="flex flex-col items-center justify-center py-12 text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase200)]">
                <p>还没有评论</p>
                <p class="mt-1">来写第一条吧</p>
              </div>
            </Show>

            <div class="px-4 py-2 space-y-4">
              <For each={rootComments()}>
                {(comment) => (
                  <CommentItem
                    comment={comment}
                    replies={repliesMap()[comment.id] ?? []}
                    isExpanded={expandedReplies().has(comment.id)}
                    replyLoading={replyLoading() === comment.id}
                    isDeleting={deletingId() === comment.id}
                    onToggleReplies={() => toggleReplies(comment.id)}
                    onReply={() => handleReply(comment)}
                    onDelete={() => handleDelete(comment.id)}
                  />
                )}
              </For>

              {/* Sentinel for pagination */}
              <div ref={sentinelRef!}>
                <Show when={loadingMore()}>
                  <div class="flex justify-center py-4">
                    <div class="spinner w-5 h-5" />
                  </div>
                </Show>
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div class="flex-shrink-0 border-t border-[var(--colorNeutralStroke2)] px-4 py-3">
            <Show when={replyingTo()}>
              <div class="flex items-center gap-2 mb-2 text-[var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase200)]">
                <span>回复 @{replyingTo()!.user.name}</span>
                <button
                  class="text-[var(--colorBrandForeground1)] underline bg-transparent border-none p-0 cursor-pointer"
                  onClick={cancelReply}
                >
                  取消
                </button>
              </div>
            </Show>

            <Show when={postError()}>
              <div class="text-[var(--colorStatusDangerForeground1)] [font-size:var(--fontSizeBase200)] mb-1">
                {postError()}
              </div>
            </Show>

            <div class="flex items-center gap-2">
              <input
                type="text"
                class="flex-1 h-9 px-3 rounded-[var(--borderRadiusMedium)] border border-[var(--colorNeutralStroke2)] bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase200)] outline-none focus-visible:border-[var(--colorBrandStroke1)] placeholder:text-[var(--colorNeutralForeground3)]"
                placeholder={replyingTo() ? `回复 @${replyingTo()!.user.name}...` : "写下评论..."}
                value={inputText()}
                onInput={(e) => setInputText((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
              <button
                class="h-9 px-4 rounded-[var(--borderRadiusMedium)] bg-[var(--colorBrandBackground)] text-white [font-size:var(--fontSizeBase200)] font-semibold border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                disabled={!inputText().trim() || posting()}
                onClick={handleSubmit}
              >
                {posting() ? "..." : "发送"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

// ─── Helpers ───

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}天前`;
  return d.toLocaleDateString("zh-CN");
}

// ─── CommentItem (internal sub-component) ───

interface CommentItemProps {
  comment: PixivComment;
  replies: PixivComment[];
  isExpanded: boolean;
  replyLoading: boolean;
  isDeleting: boolean;
  onToggleReplies: () => void;
  onReply: () => void;
  onDelete: () => void;
}

const CommentItem: Component<CommentItemProps> = (props) => {
  const { comment, replies } = props;

  return (
    <div class="flex gap-3" classList={{ "opacity-50 pointer-events-none": props.isDeleting }}>
      {/* Avatar */}
      <div class="w-8 h-8 rounded-[var(--borderRadiusCircular)] flex-shrink-0 overflow-hidden bg-[var(--colorNeutralBackground3)]">
        <Show when={comment.user.profile_image_urls?.medium}>
          <img
            src={comment.user.profile_image_urls.medium!}
            alt={comment.user.name}
            class="w-full h-full object-cover"
          />
        </Show>
      </div>

      {/* Content */}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground1)]">
            {comment.user.name}
          </span>
          <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)]">
            {formatDate(comment.comment_date)}
          </span>
        </div>
        <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground2)] mt-0.5 break-words">
          {comment.comment}
        </p>

        {/* Actions */}
        <div class="flex items-center gap-3 mt-1">
          <button
            class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] hover:text-[var(--colorBrandForeground1)] bg-transparent border-none p-0 cursor-pointer transition-colors"
            onClick={props.onReply}
          >
            回复
          </button>
          <button
            class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] hover:text-[var(--colorStatusDangerForeground1)] bg-transparent border-none p-0 cursor-pointer transition-colors"
            onClick={props.onDelete}
          >
            删除
          </button>
        </div>

        {/* Replies */}
        <Show when={replies && replies.length > 0 && props.isExpanded}>
          <div class="mt-2 pl-3 border-l-2 border-[var(--colorNeutralStroke2)] space-y-2">
            <For each={replies}>
              {(reply) => (
                <div class="flex gap-2">
                  <div class="w-6 h-6 rounded-[var(--borderRadiusCircular)] flex-shrink-0 overflow-hidden bg-[var(--colorNeutralBackground3)]">
                    <Show when={reply.user.profile_image_urls?.medium}>
                      <img
                        src={reply.user.profile_image_urls.medium!}
                        alt={reply.user.name}
                        class="w-full h-full object-cover"
                      />
                    </Show>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="[font-size:var(--fontSizeBase100)] font-semibold text-[var(--colorNeutralForeground1)]">
                        {reply.user.name}
                      </span>
                      <span class="[font-size:var(--fontSizeBase75)] text-[var(--colorNeutralForeground3)]">
                        {formatDate(reply.comment_date)}
                      </span>
                    </div>
                    <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground2)] break-words">
                      {reply.comment}
                    </p>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Toggle replies button */}
        <Show when={props.replyLoading}>
          <div class="mt-1">
            <span class="spinner w-3 h-3 inline-block" />
          </div>
        </Show>
        <Show when={!props.replyLoading && (replies.length > 0 || props.isExpanded)}>
          <button
            class="[font-size:var(--fontSizeBase100)] text-[var(--colorBrandForeground1)] mt-1 bg-transparent border-none p-0 cursor-pointer hover:underline"
            onClick={props.onToggleReplies}
          >
            {props.isExpanded ? "收起回复" : `${replies.length} 条回复`}
          </button>
        </Show>
      </div>
    </div>
  );
};

export default CommentOverlay;
