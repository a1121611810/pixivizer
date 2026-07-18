import { apiClient } from "./client";
import type { PixivCommentRootResponse, PixivCommentReplyResponse } from "./types";

export function loadIllustRootComments(
  illustId: number,
  signal?: AbortSignal,
): Promise<PixivCommentRootResponse> {
  return apiClient.get<PixivCommentRootResponse>(
    "/v3/illust/comments",
    { illust_id: String(illustId), include_total_comments: "true" },
    signal,
  );
}

export function loadIllustRootCommentsNext(
  url: string,
  signal?: AbortSignal,
): Promise<PixivCommentRootResponse> {
  return apiClient.get<PixivCommentRootResponse>(url, undefined, signal);
}

export function loadIllustReplies(
  commentId: number,
  signal?: AbortSignal,
): Promise<PixivCommentReplyResponse> {
  return apiClient.get<PixivCommentReplyResponse>(
    "/v2/illust/comment/replies",
    { comment_id: String(commentId) },
    signal,
  );
}

export function postIllustComment(
  illustId: number,
  comment: string,
  parentCommentId?: number,
): Promise<void> {
  const body: Record<string, string> = {
    illust_id: String(illustId),
    comment,
  };
  if (parentCommentId != null) {
    body.parent_comment_id = String(parentCommentId);
  }
  return apiClient.post("/v1/illust/comment/add", body);
}

export function deleteIllustComment(commentId: number): Promise<void> {
  return apiClient.post("/v1/illust/comment/delete", {
    comment_id: String(commentId),
  });
}

export function loadNovelRootComments(
  novelId: number,
  signal?: AbortSignal,
): Promise<PixivCommentRootResponse> {
  return apiClient.get<PixivCommentRootResponse>(
    "/v1/novel/comments",
    { novel_id: String(novelId), include_total_comments: "true" },
    signal,
  );
}

export function loadNovelRootCommentsNext(
  url: string,
  signal?: AbortSignal,
): Promise<PixivCommentRootResponse> {
  return apiClient.get<PixivCommentRootResponse>(url, undefined, signal);
}

export function loadNovelReplies(
  commentId: number,
  signal?: AbortSignal,
): Promise<PixivCommentReplyResponse> {
  return apiClient.get<PixivCommentReplyResponse>(
    "/v2/novel/comment/replies",
    { comment_id: String(commentId) },
    signal,
  );
}

export function postNovelComment(
  novelId: number,
  comment: string,
  parentCommentId?: number,
): Promise<void> {
  const body: Record<string, string> = {
    novel_id: String(novelId),
    comment,
  };
  if (parentCommentId != null) {
    body.parent_comment_id = String(parentCommentId);
  }
  return apiClient.post("/v1/novel/comment/add", body);
}

export function deleteNovelComment(commentId: number): Promise<void> {
  return apiClient.post("/v1/novel/comment/delete", {
    comment_id: String(commentId),
  });
}
