/**
 * Pixiv API 跨层共享的 User-Agent 常量。
 *
 * 所有发往 Pixiv 的请求（API、OAuth、图片 CDN）统一使用此 UA，
 * 模拟官方 Pixiv iOS App 的行为，避免因 UA 不一致触发风控。
 *
 * 关联文件（值与此常量保持同步）：
 * - MainActivity.java —— 原生图片代理（注释提示）
 * - vite.config.ts —— Vite 开发代理（注释提示）
 */
export const PIXIV_USER_AGENT = "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)";
