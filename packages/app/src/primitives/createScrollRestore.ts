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

const DEFAULT_MAX_SIMPLE = 80;
const DEFAULT_MAX_VIRTUAL = 20;

// ─── 内部 LRU 原语（供 createScrollRestore 和 scrollRestoreGlobal 共享） ───

function simpleLruSet(k: string, v: number, max: number): void {
  simpleCache.delete(k);
  simpleCache.set(k, v);
  if (simpleCache.size > max) {
    const first = simpleCache.keys().next();
    if (!first.done) simpleCache.delete(first.value);
  }
}

function virtualLruSet(k: string, v: ScrollRestoreState, max: number): void {
  virtualCache.delete(k);
  virtualCache.set(k, v);
  if (virtualCache.size > max) {
    const first = virtualCache.keys().next();
    if (!first.done) virtualCache.delete(first.value);
  }
}

// ─── 模块级静态 API ───
// 供 store 层（feedStore、novelStore、bookmarkStore、userIllustsStore）直接使用，
// 避免各 store 自行管理滚动缓存变量。

export const scrollRestoreGlobal = {
  /** 保存当前 window.scrollY，键名 key。simple 模式。环境无 window 时静默跳过。 */
  saveSimple(key: string): void {
    if (typeof window === "undefined") return;
    simpleLruSet(key, window.scrollY, DEFAULT_MAX_SIMPLE);
  },

  /** 写入指定值（不读取 window.scrollY）。用于 caller 已知确切值的场景。 */
  setSimple(key: string, value: number): void {
    simpleLruSet(key, value, DEFAULT_MAX_SIMPLE);
  },

  /** 读取已保存的 scrollY 值。simple 模式。 */
  getSimple(key: string): number | undefined {
    return simpleCache.get(key);
  },

  /** 保存虚拟滚动状态（VirtualItem[] + offset）。virtual 模式。 */
  saveVirtual(key: string, state: ScrollRestoreState): void {
    virtualLruSet(key, state, DEFAULT_MAX_VIRTUAL);
  },

  /** 读取已保存的虚拟滚动状态。virtual 模式。 */
  getVirtual(key: string): ScrollRestoreState | undefined {
    return virtualCache.get(key);
  },

  /** 删除指定 key 的缓存（simple + virtual 双向清除）。 */
  remove(key: string): void {
    simpleCache.delete(key);
    virtualCache.delete(key);
  },

  /** 清空所有滚动缓存（仅测试或重置场景使用）。 */
  clearAll(): void {
    simpleCache.clear();
    virtualCache.clear();
  },
};

// ─── 组件级 API ───

export function createScrollRestore(
  key: () => string | undefined,
  options?: ScrollRestoreOptions,
): ScrollRestoreAPI {
  const mode = options?.mode ?? "simple";
  const max = options?.max ?? (mode === "virtual" ? DEFAULT_MAX_VIRTUAL : DEFAULT_MAX_SIMPLE);

  return {
    save: (state?: ScrollRestoreState) => {
      const k = key();
      if (k === undefined) return;
      if (mode === "virtual") {
        virtualLruSet(k, state ?? { snapshot: [], offset: 0, version: 1 }, max);
      } else {
        simpleLruSet(k, window.scrollY, max);
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
