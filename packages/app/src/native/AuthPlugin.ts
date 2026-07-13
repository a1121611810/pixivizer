import { registerPlugin } from "@capacitor/core";

/**
 * AuthPlugin.refreshToken 的响应结构。
 */
export interface AuthRefreshResult {
  /** 新的 access_token（Bearer token）。 */
  accessToken: string;
  /** 服务端返回的 refresh_token（可能已轮换）。 */
  refreshToken: string;
  /** Pixiv 用户 ID。 */
  userId: number;
  /** 用户显示名称。 */
  userName: string;
  /** 用户登录账号。 */
  userAccount: string;
}

/**
 * AuthPlugin.refreshToken 的请求参数。
 */
export interface AuthRefreshOptions {
  /** 当前有效的 refresh_token。 */
  refreshToken: string;
}

/**
 * AuthPlugin Capacitor 插件类型定义。
 */
export interface AuthPlugin {
  /**
   * 使用 refresh_token 交换新的 access_token。
   *
   * OAuth 凭证（CLIENT_ID / CLIENT_SECRET / HASH_SECRET）
   * 仅存在于 Native 插件中，不暴露给 JS 层。
   *
   * @param options 包含 refreshToken 字段
   * @returns 认证结果
   */
  refreshToken(options: AuthRefreshOptions): Promise<AuthRefreshResult>;
}

export const AuthPlugin = registerPlugin<AuthPlugin>("AuthPlugin");
