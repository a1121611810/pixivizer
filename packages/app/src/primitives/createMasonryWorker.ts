import * as Comlink from "comlink";
import type { MasonryWorkerAPI } from "./masonryWorker";

let workerInstance: Comlink.Remote<MasonryWorkerAPI> | null = null;
let workerPromise: Promise<Comlink.Remote<MasonryWorkerAPI> | null> | null = null;

/**
 * 获取 Masonry Worker 实例（单例）。
 * Worker 不可用时返回 null，调用方应 fallback 到同步计算。
 */
export async function getMasonryWorker(): Promise<Comlink.Remote<MasonryWorkerAPI> | null> {
  if (workerInstance) return workerInstance;
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    try {
      const worker = new Worker(new URL("./masonryWorker.ts", import.meta.url), { type: "module" });
      workerInstance = Comlink.wrap<MasonryWorkerAPI>(worker);
      return workerInstance;
    } catch (e) {
      console.warn("[masonry] Worker creation failed, falling back to sync", e);
      return null;
    }
  })();

  return workerPromise;
}
