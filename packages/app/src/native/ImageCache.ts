import { registerPlugin } from "@capacitor/core";

export interface ImageCachePlugin {
  /** 保存图片到磁盘缓存 */
  saveImage(options: { key: string; base64: string }): Promise<{ path: string }>;
  /** 从磁盘缓存读取图片 */
  getImage(options: { key: string }): Promise<{ base64?: string }>;
  /** 获取所有已缓存的 key 列表 */
  getCachedKeys(): Promise<{ keys: string[] }>;
  /** 清理全部缓存 */
  clearCache(): Promise<void>;
}

export const ImageCache = registerPlugin<ImageCachePlugin>("ImageCache");
