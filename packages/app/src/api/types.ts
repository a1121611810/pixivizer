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
  profile_image_urls: {
    medium?: string;
    px_16x16?: string;
    px_50x50?: string;
    px_170x170?: string;
  };
  is_followed?: boolean;
}

// ─── 作品 ───
export interface PixivIllustImageUrls {
  square_medium: string;
  medium: string;
  large: string;
  /** 全尺寸原图，只在 meta_pages 下有（meta_single_page 用单独的 original_image_url） */
  original?: string;
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
  type: "illust" | "manga" | "ugoira";
  user: PixivUser;
  image_urls: PixivIllustImageUrls;
  width: number;
  height: number;
  page_count: number;
  is_bookmarked: boolean;
  total_bookmarks: number;
  total_comments?: number;
  total_view?: number;
  illust_ai_type?: number;
  tags: PixivIllustTag[];
  x_restrict: number;
  create_date: string;
  caption?: string;
  meta_pages: PixivIllustMetaPage[];
  meta_single_page: { original_image_url?: string };
}

// ─── 小说 ───
export interface PixivNovel {
  id: number;
  title: string;
  user: PixivUser;
  image_urls: PixivIllustImageUrls;
  tags: { name: string; translated_name?: string }[];
  page_count: number;
  text_length: number;
  series?: { id: number; title: string };
  has_chapters?: boolean;
  is_original?: boolean;
  is_bookmarked: boolean;
  total_bookmarks: number;
  total_comments?: number;
  total_view?: number;
  x_restrict: number;
  create_date: string;
  caption?: string;
  novel_ai_type?: number;
}

export interface PixivNovelListResponse {
  novels: PixivNovel[];
  next_url: string | null;
}

export interface PixivNovelDetailResponse {
  novel: PixivNovel;
}

// ─── 小说导航 ───
export interface NovelNavItem {
  id: number;
  title: string;
  viewable?: boolean;
}

export interface SeriesNavigation {
  nextNovel?: NovelNavItem | null;
  prevNovel?: NovelNavItem | null;
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

// ─── 用户关注/粉丝 ───
export interface PixivUserPreview {
  user: PixivUser;
  illusts: PixivIllust[];
  novels: unknown[];
  is_muted: boolean;
}

export interface PixivUserFollowingResponse {
  user_previews: PixivUserPreview[];
  next_url: string | null;
}

export interface PixivProfile {
  webpage?: string;
  gender: string;
  birth: string;
  birth_day: string;
  birth_year: number;
  region: string;
  country_code: string;
  job: string;
  total_follow_users: number;
  total_mypixiv_users: number;
  total_illusts: number;
  total_manga: number;
  total_novels: number;
  total_illust_bookmarks_public: number;
  background_image_url?: string;
  twitter_account?: string;
  is_premium: boolean;
}

export interface PixivUserDetailResponse {
  user: PixivUser;
  profile: PixivProfile;
  profile_publicity: Record<string, string>;
  workspace: Record<string, string>;
}

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
