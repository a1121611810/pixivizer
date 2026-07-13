import { apiClient } from "./client";
import type { PixivCommentRootResponse, PixivCommentReplyResponse } from "./types";

export function loadIllustRootComments(
  illustId: number,
  signal?: AbortSignal,
): Promise<PixivCommentRootResponse> {
  return apiClient.get<PixivCommentRootResponse>(
    "/v1/illust/comment/root",
    { illust_id: String(illustId) },
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
  illustId: number,
  rootCommentId: number,
  signal?: AbortSignal,
): Promise<PixivCommentReplyResponse> {
  return apiClient.get<PixivCommentReplyResponse>(
    "/v1/illust/comment/reply",
    { illust_id: String(illustId), root_comment_id: String(rootCommentId) },
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
  if (parentCommentId != null) body.parent_comment_id = String(parentCommentId);
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
    "/v1/novel/comment/root",
    { novel_id: String(novelId) },
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
  novelId: number,
  rootCommentId: number,
  signal?: AbortSignal,
): Promise<PixivCommentReplyResponse> {
  return apiClient.get<PixivCommentReplyResponse>(
    "/v1/novel/comment/reply",
    { novel_id: String(novelId), root_comment_id: String(rootCommentId) },
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
  if (parentCommentId != null) body.parent_comment_id = String(parentCommentId);
  return apiClient.post("/v1/novel/comment/add", body);
}

export function deleteNovelComment(commentId: number): Promise<void> {
  return apiClient.post("/v1/novel/comment/delete", {
    comment_id: String(commentId),
  });
}
