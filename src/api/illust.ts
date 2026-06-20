import { apiClient } from './client';
import type {
  PixivIllustListResponse,
  PixivIllustDetailResponse,
  ContentType,
  RestrictType,
} from './types';

// ─── Ugoira 动图 ───

export interface UgoiraFrame {
  file: string;
  delay: number;
}

export interface UgoiraMetadata {
  zip_urls: { medium: string };
  frames: UgoiraFrame[];
}

interface UgoiraMetadataResponse {
  ugoira_metadata: UgoiraMetadata;
}

export async function loadUgoiraMetadata(
  illustId: number,
): Promise<UgoiraMetadata> {
  const res = await apiClient.get<UgoiraMetadataResponse>(
    '/v1/ugoira/metadata',
    { illust_id: String(illustId) },
  );
  return res.ugoira_metadata;
}

// ─── 作品列表 ───

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
