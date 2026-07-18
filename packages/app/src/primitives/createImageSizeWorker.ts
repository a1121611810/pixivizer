import * as Comlink from "comlink";
import type { ImageSizeWorkerAPI } from "./imageSize.worker";

let workerInstance: Comlink.Remote<ImageSizeWorkerAPI> | null = null;
let workerPromise: Promise<Comlink.Remote<ImageSizeWorkerAPI> | null> | null = null;

/**
 * 获取图片尺寸测量 Worker（单例）。
 * Worker 不可用时返回 null，调用方应 fallback 到主线程测量。
 */
export function getImageSizeWorker(): Promise<Comlink.Remote<ImageSizeWorkerAPI> | null> {
  if (workerInstance) {
    return workerInstance;
  }
  if (workerPromise) {
    return workerPromise;
  }

  workerPromise = (() => {
    try {
      const worker = new Worker(new URL("./imageSize.worker.ts", import.meta.url), {
        type: "module",
      });
      workerInstance = Comlink.wrap<ImageSizeWorkerAPI>(worker);
      return workerInstance;
    } catch (error) {
      console.warn("[imageSize] Worker creation failed, falling back to main thread", error);
      return null;
    }
  })();

  return workerPromise;
}
