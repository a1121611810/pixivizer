import { createEffect, onCleanup, type Accessor } from "solid-js";

const RESTORE_TIMEOUT_MS = 1000;
/** 从首次满足恢复条件起，至少等待一帧/一小段时间再执行滚动，避免测试/布局抖动导致过早 scroll */
const RESTORE_MIN_DELAY_MS = 50;

interface CreateScrollRestorationOptions {
  /** 需要恢复的滚动偏移量 */
  restoreScrollTop: Accessor<number | undefined>;
  /** 当前布局信息，需包含总高度 */
  layout: Accessor<{ totalHeight: number }>;
  /** 容器宽度，用于确认布局已完成测量 */
  containerWidth: Accessor<number>;
}

/**
 * 虚拟滚动列表的滚动恢复原语。
 * 在容器宽度与布局总高度都大于 0 后，将滚动位置恢复到目标偏移量（不超过布局总高度）。
 * 若布局仍在增长，会持续重试直到目标偏移可恢复，或超过 1000ms 超时。
 */
export function createScrollRestoration(options: CreateScrollRestorationOptions) {
  let initialRestored = false;
  let rafId: number | undefined;
  let restoreStartTime: number | undefined;

  onCleanup(() => {
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
    }
  });

  function checkAndRestore() {
    if (initialRestored) return;

    const restore = options.restoreScrollTop();
    if (restore === undefined || restore <= 0) {
      initialRestored = true;
      return;
    }

    const width = options.containerWidth();
    const totalHeight = options.layout().totalHeight;
    if (width > 0 && totalHeight > 0) {
      if (restoreStartTime === undefined) {
        restoreStartTime = performance.now();
      }
      const elapsed = performance.now() - restoreStartTime;
      if (elapsed >= RESTORE_MIN_DELAY_MS && totalHeight >= restore) {
        initialRestored = true;
        rafId = requestAnimationFrame(() => {
          window.scrollTo(0, Math.min(restore, options.layout().totalHeight));
        });
      } else if (elapsed >= RESTORE_TIMEOUT_MS) {
        initialRestored = true;
        rafId = requestAnimationFrame(() => {
          window.scrollTo(0, Math.min(restore, options.layout().totalHeight));
        });
      } else {
        rafId = requestAnimationFrame(checkAndRestore);
      }
    }
  }

  createEffect(() => {
    if (initialRestored) return;

    const restore = options.restoreScrollTop();
    if (restore === undefined || restore <= 0) {
      initialRestored = true;
      return;
    }

    const width = options.containerWidth();
    const totalHeight = options.layout().totalHeight;
    if (width > 0 && totalHeight > 0) {
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
      }
      checkAndRestore();
    }
  });
}
