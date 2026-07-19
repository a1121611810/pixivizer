import type { VirtualItem } from "@tanstack/solid-virtual";

// ─── 类型 ───

export interface ScrollRestoreState {
  snapshot: VirtualItem[];
  offset: number;
  version: number;
}

export type ScrollRestoreMode = "simple" | "virtual";

export interface ScrollRestoreOptions {
  mode?: ScrollRestoreMode;
  max?: number;
}

export interface ScrollRestoreAPI {
  save: (state?: ScrollRestoreState) => void;
  restore: () => boolean;
  clear: () => void;
  /** virtual 模式返回 ScrollRestoreState，simple 模式返回 undefined。 */
  getSnapshot: () => ScrollRestoreState | undefined;
}

// ─── 模块级 LRU 缓存 ───

const simpleCache = new Map<string, number>();
const virtualCache = new Map<string, ScrollRestoreState>();

const DEFAULT_MAX_SIMPLE = 50;
const DEFAULT_MAX_VIRTUAL = 10;

// ─── 原语 ───

export function createScrollRestore(
  key: () => string | undefined,
  options?: ScrollRestoreOptions,
): ScrollRestoreAPI {
  const mode = options?.mode ?? "simple";
  const max = options?.max ?? (mode === "virtual" ? DEFAULT_MAX_VIRTUAL : DEFAULT_MAX_SIMPLE);

  function simpleLruSet(k: string, v: number): void {
    simpleCache.delete(k);
    simpleCache.set(k, v);
    if (simpleCache.size > max) {
      const first = simpleCache.keys().next();
      if (!first.done) simpleCache.delete(first.value);
    }
  }

  function virtualLruSet(k: string, v: ScrollRestoreState): void {
    virtualCache.delete(k);
    virtualCache.set(k, v);
    if (virtualCache.size > max) {
      const first = virtualCache.keys().next();
      if (!first.done) virtualCache.delete(first.value);
    }
  }

  return {
    save: (state?: ScrollRestoreState) => {
      const k = key();
      if (k === undefined) return;
      if (mode === "virtual") {
        virtualLruSet(k, state ?? { snapshot: [], offset: 0, version: 1 });
      } else {
        simpleLruSet(k, window.scrollY);
      }
    },

    restore: () => {
      const k = key();
      if (k === undefined) return false;
      if (mode === "simple") {
        const v = simpleCache.get(k);
        if (v === undefined) return false;
        queueMicrotask(() => window.scrollTo(0, v));
        return true;
      }
      return virtualCache.has(k);
    },

    clear: () => {
      const k = key();
      if (k === undefined) return;
      simpleCache.delete(k);
      virtualCache.delete(k);
    },

    getSnapshot: (): ScrollRestoreState | undefined => {
      const k = key();
      if (k === undefined) return undefined;
      return virtualCache.get(k);
    },
  };
}
