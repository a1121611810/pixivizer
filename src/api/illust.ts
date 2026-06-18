import { apiClient } from './client';
import type {
  PixivIllustListResponse,
  PixivIllustDetailResponse,
  ContentType,
  RestrictType,
} from './types';

export function loadRecommended(
  contentType: ContentType = 'illust',
): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>('/v1/illust/recommended', {
    content_type: contentType,
  });
}

export function loadFollow(
  restrict: RestrictType = 'public',
): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>('/v1/illust/follow', {
    restrict,
  });
}

export function loadDetail(
  illustId: number,
): Promise<PixivIllustDetailResponse> {
  return apiClient.get<PixivIllustDetailResponse>('/v1/illust/detail', {
    illust_id: String(illustId),
  });
}

export function loadNext(url: string): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>(url);
}
