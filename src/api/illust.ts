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
): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>("/v1/illust/recommended", {
    content_type: contentType,
  });
}

export function loadFollow(restrict: RestrictType = "public"): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>("/v2/illust/follow", {
    restrict,
  });
}

export function loadDetail(illustId: number): Promise<PixivIllustDetailResponse> {
  return apiClient.get<PixivIllustDetailResponse>("/v1/illust/detail", {
    illust_id: String(illustId),
  });
}

export function loadNext(url: string): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>(url);
}

export function loadBookmarks(
  userId: number,
  restrict: RestrictType = "public",
): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>("/v1/user/bookmarks/illust", {
    user_id: String(userId),
    restrict,
  });
}

export async function loadUgoiraMetadata(
  illustId: number,
): Promise<PixivUgoiraMetadataResponse["ugoira_metadata"]> {
  const res = await apiClient.get<PixivUgoiraMetadataResponse>("/v1/ugoira/metadata", {
    illust_id: String(illustId),
  });
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

export function loadUserIllusts(userId: number): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>("/v1/user/illusts", {
    user_id: String(userId),
    type: "illust",
  });
}
