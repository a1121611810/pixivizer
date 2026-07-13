import { type Component, Show, For, createSignal, createEffect, createMemo, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import type { PixivComment } from "../api/types";
import { user } from "../stores/authStore";
import { resolveImageUrl } from "../utils/imageLoader";
import {
  loadIllustRootComments,
  loadIllustRootCommentsNext,
  postIllustComment,
  deleteIllustComment,
  loadNovelRootComments,
  loadNovelRootCommentsNext,
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
  const navigate = useNavigate();
  const [rootComments, setRootComments] = createSignal<PixivComment[]>([]);
  const [hasLoaded, setHasLoaded] = createSignal(false);
  const [nextUrl, setNextUrl] = createSignal<string | null>(null);
  const [loadingMore, setLoadingMore] = createSignal(false);
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
    setError(null);
    setRootComments([]);
    setNextUrl(null);

    api()
      .loadRoot(props.targetId, ac.signal)
      .then((res) => {
        setRootComments(res.comments);
        setNextUrl(res.next_url);
        setHasLoaded(true);
      })
      .catch((e) => {
        if ((e as { name?: string }).name !== "AbortError") {
          setError("加载评论失败，请重试");
        }
      });

    onCleanup(() => ac.abort());
  });

  // 分页哨兵
  let sentinelRef: HTMLDivElement | undefined;
  let inputRef: HTMLInputElement | undefined;

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
      // 刷新评论列表
      const res = await api().loadRoot(props.targetId);
      setRootComments(res.comments);
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

  function goToUser(userId: number) {
    props.onClose();
    navigate(`/user/${userId}`);
  }

  function cancelReply() {
    setReplyingTo(null);
    setInputText("");
  }

  // 点击回复后自动聚焦到输入框
  createEffect(() => {
    if (replyingTo() && inputRef) {
      inputRef.focus();
    }
  });

  // 删除
  async function handleDelete(commentId: number) {
    setDeletingId(commentId);
    try {
      await api().del(commentId);
      setRootComments((prev) => prev.filter((c) => c.id !== commentId));
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
        style={{ "background-color": "var(--colorOverlayBackground)" }}
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
            <Show when={hasLoaded() && rootComments().length === 0}>
              <div class="flex flex-col items-center justify-center py-12 text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase200)]">
                <p>还没有评论</p>
                <p class="mt-1">来写第一条吧</p>
              </div>
            </Show>

            <Show when={!hasLoaded()}>
              <div class="px-4 py-2 space-y-5">
                {Array.from({ length: 4 }).map(() => (
                  <div class="flex gap-3">
                    <div
                      class="w-8 h-8 rounded-[var(--borderRadiusCircular)] flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(90deg, var(--colorNeutralBackground2) 25%, var(--colorNeutralBackground1) 50%, var(--colorNeutralBackground2) 75%)",
                        "background-size": "200% 100%",
                        animation:
                          "fluent-shimmer var(--durationSlower) var(--curveEasyEase) infinite",
                      }}
                    />
                    <div class="flex-1 min-w-0 space-y-2">
                      <div
                        class="h-3 rounded w-[120px]"
                        style={{
                          background:
                            "linear-gradient(90deg, var(--colorNeutralBackground2) 25%, var(--colorNeutralBackground1) 50%, var(--colorNeutralBackground2) 75%)",
                          "background-size": "200% 100%",
                          animation:
                            "fluent-shimmer var(--durationSlower) var(--curveEasyEase) infinite",
                        }}
                      />
                      <div
                        class="h-3 rounded w-[60%]"
                        style={{
                          background:
                            "linear-gradient(90deg, var(--colorNeutralBackground2) 25%, var(--colorNeutralBackground1) 50%, var(--colorNeutralBackground2) 75%)",
                          "background-size": "200% 100%",
                          animation:
                            "fluent-shimmer var(--durationSlower) var(--curveEasyEase) infinite",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Show>

            <div class="px-4 py-2 space-y-4">
              <For each={rootComments()}>
                {(comment) => (
                  <CommentItem
                    comment={comment}
                    isDeleting={deletingId() === comment.id}
                    currentUserId={user()?.id}
                    onReply={() => handleReply(comment)}
                    onDelete={() => handleDelete(comment.id)}
                    onClickUser={() => goToUser(comment.user.id)}
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
          <div class="flex-shrink-0 border-t border-[var(--colorNeutralStroke2)] px-3 py-2.5 surface-appbar">
            <Show when={replyingTo()}>
              <div class="flex items-center gap-1 mb-1.5 px-1 text-[var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase200)]">
                <span class="truncate">回复 @{replyingTo()!.user.name}</span>
                <button
                  class="text-[var(--colorBrandForeground1)] font-medium bg-transparent border-none p-0 cursor-pointer flex-shrink-0 ml-auto text-[var(--fontSizeBase100)]"
                  onClick={cancelReply}
                >
                  取消回复
                </button>
              </div>
            </Show>

            <Show when={postError()}>
              <div class="text-[var(--colorStatusDangerForeground1)] [font-size:var(--fontSizeBase200)] mb-1">
                {postError()}
              </div>
            </Show>

            <div class="flex items-center gap-2 border border-[var(--colorNeutralStroke2)] rounded-[var(--borderRadiusMedium)] px-3 has-[input:focus-visible]:border-[var(--colorBrandStroke1)] has-[input:focus-visible]:ring-1 has-[input:focus-visible]:ring-[var(--colorBrandStroke1)] transition-all">
              <input
                ref={inputRef!}
                type="text"
                class="flex-1 h-9 bg-transparent text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase200)] outline-none border-none placeholder:text-[var(--colorNeutralForeground3)] p-0"
                placeholder={replyingTo() ? `回复 @${replyingTo()!.user.name}...` : "写下评论..."}
                value={inputText()}
                onInput={(e) => setInputText((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
              <button
                class="h-7 px-3 rounded-[var(--borderRadiusSmall)] bg-[var(--colorBrandBackground)] text-white [font-size:var(--fontSizeBase100)] font-medium border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] transition-all flex-shrink-0"
                disabled={!inputText().trim() || posting()}
                onClick={handleSubmit}
              >
                {posting() ? "···" : "发送"}
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
  isDeleting: boolean;
  currentUserId?: number;
  onReply: () => void;
  onDelete: () => void;
  onClickUser: () => void;
}

const CommentItem: Component<CommentItemProps> = (props) => {
  const parent = () => {
    const p = props.comment.parent_comment as
      | { id: number; comment: string; user: { name: string } }
      | Record<string, never>
      | undefined;
    return p && "id" in p && p.id
      ? (p as { id: number; comment: string; user: { name: string } })
      : null;
  };

  return (
    <div
      class="border border-[var(--colorNeutralStroke2)] rounded-[var(--borderRadiusMedium)] overflow-hidden"
      classList={{ "opacity-50 pointer-events-none": props.isDeleting }}
    >
      {/* Header: avatar + username + time */}
      <div class="flex items-center gap-2 px-3 py-2 bg-[var(--colorNeutralBackground2)] border-b border-[var(--colorNeutralStroke2)]">
        <button
          class="w-6 h-6 rounded-[var(--borderRadiusCircular)] flex-shrink-0 overflow-hidden bg-[var(--colorNeutralBackground3)] border-none p-0 cursor-pointer active:scale-95 transition-all"
          onClick={props.onClickUser}
          aria-label={props.comment.user.name}
        >
          <Show when={props.comment.user.profile_image_urls?.medium}>
            <img
              src={resolveImageUrl(props.comment.user.profile_image_urls.medium!)}
              alt={props.comment.user.name}
              class="w-full h-full object-cover"
            />
          </Show>
        </button>
        <button
          class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground1)] bg-transparent border-none p-0 cursor-pointer hover:underline active:scale-[0.98] transition-all truncate"
          onClick={props.onClickUser}
        >
          {props.comment.user.name}
        </button>
        <span class="[font-size:var(--fontSizeBase75)] text-[var(--colorNeutralForeground3)] ml-auto">
          {formatDate(props.comment.date)}
        </span>
      </div>

      {/* Body */}
      <div class="px-3 py-2">
        {/* Quote block for replies */}
        <Show when={parent()}>
          {(p) => (
            <div class="mb-2 pl-2.5 border-l-[3px] border-[var(--colorBrandStroke1)] py-1">
              <span class="[font-size:var(--fontSizeBase75)] text-[var(--colorBrandForeground1)] font-medium">
                @{p().user.name}
              </span>
              <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground2)] mt-0.5 leading-relaxed break-words">
                {p().comment}
              </p>
            </div>
          )}
        </Show>

        {/* Comment text */}
        <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground1)] leading-relaxed break-words whitespace-pre-wrap">
          {props.comment.comment ||
            (props.comment.stamp && (
              <span class="inline-block w-6 h-6 bg-[var(--colorNeutralBackground3)] rounded" />
            ))}
        </p>

        {/* Actions */}
        <div class="flex items-center gap-3 mt-2 pt-1.5 border-t border-[var(--colorNeutralStroke2)]">
          <button
            class="[font-size:var(--fontSizeBase75)] text-[var(--colorNeutralForeground3)] hover:text-[var(--colorBrandForeground1)] font-medium bg-transparent border-none p-0 cursor-pointer transition-colors"
            onClick={props.onReply}
          >
            回复
          </button>
          <Show when={Number(props.currentUserId) === Number(props.comment.user.id)}>
            <button
              class="[font-size:var(--fontSizeBase75)] text-[var(--colorNeutralForeground3)] hover:text-[var(--colorStatusDangerForeground1)] font-medium bg-transparent border-none p-0 cursor-pointer transition-colors"
              onClick={props.onDelete}
            >
              删除
            </button>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default CommentOverlay;
