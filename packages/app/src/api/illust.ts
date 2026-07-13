import { apiClient } from "./client";
import type {
  PixivIllustListResponse,
  PixivIllustDetailResponse,
  PixivUgoiraMetadataResponse,
  ContentType,
  RestrictType,
} from "./types";

export function loadRecommended(
  contentType: ContentType = "illust",
  signal?: AbortSignal,
): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>(
    "/v1/illust/recommended",
    {
      content_type: contentType,
      filter: "for_ios",
    },
    signal,
  );
}

export function loadMangaRecommended(signal?: AbortSignal): Promise<PixivIllustListResponse> {
  return loadRecommended("manga", signal);
}

export function loadFollow(
  restrict: RestrictType = "public",
  signal?: AbortSignal,
): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>("/v2/illust/follow", { restrict }, signal);
}

export function loadDetail(
  illustId: number,
  signal?: AbortSignal,
): Promise<PixivIllustDetailResponse> {
  return apiClient.get<PixivIllustDetailResponse>(
    "/v1/illust/detail",
    { illust_id: String(illustId) },
    signal,
  );
}

export function loadNext(url: string, signal?: AbortSignal): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>(url, undefined, signal);
}

export function loadBookmarks(
  userId: number,
  restrict: RestrictType = "public",
  signal?: AbortSignal,
): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>(
    "/v1/user/bookmarks/illust",
    { user_id: String(userId), restrict },
    signal,
  );
}

export async function loadUgoiraMetadata(
  illustId: number,
  signal?: AbortSignal,
): Promise<PixivUgoiraMetadataResponse["ugoira_metadata"]> {
  const res = await apiClient.get<PixivUgoiraMetadataResponse>(
    "/v1/ugoira/metadata",
    { illust_id: String(illustId) },
    signal,
  );
  return res.ugoira_metadata;
}

export function addBookmark(illustId: number, restrict: RestrictType = "public"): Promise<void> {
  return apiClient.post("/v2/illust/bookmark/add", {
    illust_id: String(illustId),
    restrict,
  });
}

export function deleteBookmark(illustId: number): Promise<void> {
  return apiClient.post("/v1/illust/bookmark/delete", {
    illust_id: String(illustId),
  });
}

export function followUser(userId: number, restrict?: "public" | "private"): Promise<void> {
  return apiClient.post("/v1/user/follow/add", {
    user_id: String(userId),
    restrict: restrict ?? "public",
  });
}

export function unfollowUser(userId: number): Promise<void> {
  return apiClient.post("/v1/user/follow/delete", {
    user_id: String(userId),
  });
}

export function loadUserIllusts(
  userId: number,
  type: ContentType = "illust",
  signal?: AbortSignal,
): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>(
    "/v1/user/illusts",
    { user_id: String(userId), type },
    signal,
  );
}
