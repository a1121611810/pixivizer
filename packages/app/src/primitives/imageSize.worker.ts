import * as Comlink from "comlink";

export interface ImageSizeInput {
  id: string;
  blob: Blob;
}

export type ImageSizeOutput =
  | { id: string; width: number; height: number }
  | { id: string; error: true };

/**
 * 在 Worker 中使用 createImageBitmap 测量图片原始尺寸。
 * 读取后立即 close() 释放位图内存。
 */
async function measureImages(items: ImageSizeInput[]): Promise<ImageSizeOutput[]> {
  return Promise.all(
    items.map(async (item): Promise<ImageSizeOutput> => {
      try {
        const bitmap = await createImageBitmap(item.blob);
        const { width, height } = bitmap;
        bitmap.close();
        return { id: item.id, width, height };
      } catch {
        return { id: item.id, error: true };
      }
    }),
  );
}

const api = {
  measureImages,
};

Comlink.expose(api);

export type ImageSizeWorkerAPI = typeof api;
