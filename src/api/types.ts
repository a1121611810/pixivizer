// ─── 认证 ───
export interface PixivAuthResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  user: PixivUser;
}

export interface PixivUser {
  id: number;
  name: string;
  account: string;
  profile_image_urls: { medium: string };
}

// ─── 作品 ───
export interface PixivIllustImageUrls {
  square_medium: string;
  medium: string;
  large: string;
}

export interface PixivIllustMetaPage {
  image_urls: PixivIllustImageUrls;
}

export interface PixivIllustTag {
  name: string;
  translated_name?: string;
}

export interface PixivIllust {
  id: number;
  title: string;
  type: "illust" | "manga";
  user: PixivUser;
  image_urls: PixivIllustImageUrls;
  width: number;
  height: number;
  page_count: number;
  is_bookmarked: boolean;
  total_bookmarks: number;
  total_comments?: number;
  total_view?: number;
  tags: PixivIllustTag[];
  x_restrict: number;
  create_date: string;
  meta_pages: PixivIllustMetaPage[];
  meta_single_page: { original_image_url?: string };
}

// ─── 响应包装 ───
export interface PixivIllustListResponse {
  illusts: PixivIllust[];
  next_url: string | null;
}

export interface PixivIllustDetailResponse {
  illust: PixivIllust;
}

export interface PixivUgoiraFrame {
  file: string;
  delay: number;
}

export interface PixivUgoiraMetadata {
  zip_urls: {
    medium: string;
  };
  frames: PixivUgoiraFrame[];
}

export interface PixivUgoiraMetadataResponse {
  ugoira_metadata: PixivUgoiraMetadata;
}

// ─── 请求参数 ───
export type ContentType = "illust" | "manga";
export type RestrictType = "public" | "private";

// ─── 错误 ───
export enum ApiErrorType {
  NETWORK = "NETWORK",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  RATE_LIMIT = "RATE_LIMIT",
  SERVER = "SERVER",
  UNKNOWN = "UNKNOWN",
}

export interface ApiError {
  type: ApiErrorType;
  message: string;
  status?: number;
}
