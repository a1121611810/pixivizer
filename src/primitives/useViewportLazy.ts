import { createSignal, createEffect, onMount, onCleanup } from "solid-js";

export interface ViewportLazyOptions {
  /** IntersectionObserver rootMargin，默认 "100px" */
  rootMargin?: string;
  /** 初始可见状态（同步计算），默认 false */
  initialVisible?: boolean;
  /**
   * 外部可见性信号。返回 true 时标记为可见。
   * 常用于父组件已有 IntersectionObserver 跟踪滚动位置的场景（如 IllustDetail 的 pageObserver）。
   */
  externalVisible?: () => boolean;
  /** 跳过 IntersectionObserver（externalVisible 已足够覆盖时） */
  skipObserver?: boolean;
}

export interface ViewportLazyResult {
  /** 当前是否可见 */
  everVisible: () => boolean;
  /** 绑定到容器 DOM 的 ref 回调 */
  attach: (el: HTMLDivElement) => void;
}

/**
 * 视口懒加载原语：封装 IntersectionObserver + 外部信号驱动的可见性管理。
 *
 * 两种触发方式（可组合）：
 *   a) IntersectionObserver（默认）：容器进入视口（含预热距）时触发
 *   b) externalVisible 信号：父组件主动控制（如基于滚动跟踪的页码信号）
 *
 * 一旦设为可见，永久保持（不回溯销毁），避免滚动抖动。
 *
 * 用法：
 * ```ts
 * const { everVisible, attach } = createViewportLazy({ rootMargin: "100px" });
 * return <div ref={attach}>{everVisible() ? <Content /> : <Skeleton />}</div>;
 * ```
 */
export function createViewportLazy(options: ViewportLazyOptions = {}): ViewportLazyResult {
  const {
    rootMargin = "100px",
    initialVisible = false,
    externalVisible,
    skipObserver = false,
  } = options;

  const [everVisible, setEverVisible] = createSignal(initialVisible);
  let el: HTMLDivElement | undefined;

  // ── 外部信号驱动 ──
  createEffect(() => {
    if (externalVisible?.() && !everVisible()) {
      setEverVisible(true);
    }
  });

  // ── IntersectionObserver 驱动 ──
  onMount(() => {
    if (skipObserver || everVisible()) return;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEverVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  return {
    everVisible,
    attach: (element: HTMLDivElement) => {
      el = element;
    },
  };
}
