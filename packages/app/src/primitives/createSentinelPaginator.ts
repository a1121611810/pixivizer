import { onMount, onCleanup } from "solid-js";

export interface SentinelPaginatorOptions {
  /**
   * IntersectionObserver rootMargin，默认 "200px"。
   * VirtualFeed 中用 "0px 0px 30% 0px"（视口高度 30%），
   * PersonalCenter 中用 "200px"（固定像素）。
   */
  rootMargin?: string;
  /**
   * 指定局部滚动容器作为 IntersectionObserver 的 root。
   * 未传时默认以浏览器视口为 root（兼容历史行为）。
   * 返回元素或 null，便于与 SolidJS 信号联动。
   */
  root?: () => HTMLElement | null;
  /**
   * 哨兵进入视口时调用。调用方在此执行分页请求逻辑。
   * 无返回值的同步函数，或返回 Promise。
   */
  onTrigger: () => void;
  /**
   * 是否允许触发分页。
   * 通常传 `() => hasMore && !loading` 作为阀门。
   * 未传时哨兵进视口即触发（无条件）。
   */
  enabled?: () => boolean;
}

export interface SentinelPaginatorResult {
  /** 绑定到哨兵 DOM 元素的 ref 回调 */
  attach: (el: HTMLDivElement) => void;
}

/**
 * 哨兵分页原语：封装 IntersectionObserver 驱动的"加载更多"模式。
 *
 * 与 createViewportLazy 的区别：
 *   - 不 disconnect（持久监听），每次哨兵进入视口时重复触发
 *   - 无 everVisible 状态，只有 onTrigger 回调
 *   - 通过 enabled 阀门控制触发条件（hasMore && !loading）
 *
 * 内置并发防护：Observer 回调本身是同步的，但配合 enabled 阀门
 * 确保 loading 期间不会重复触发。
 *
 * 用法：
 * ```ts
 * const { attach } = createSentinelPaginator({
 *   rootMargin: "200px",
 *   enabled: () => hasMore && !loading,
 *   onTrigger: () => loadMore(),
 * });
 * return <div ref={attach} class="h-1" />;
 * ```
 */
export function createSentinelPaginator(
  options: SentinelPaginatorOptions,
): SentinelPaginatorResult {
  const { rootMargin = "200px", root, enabled, onTrigger } = options;

  let el: HTMLDivElement | undefined;

  onMount(() => {
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        // 阀门检查：enabled 返回 false 时不触发
        if (enabled && !enabled()) return;
        onTrigger();
      },
      { rootMargin, root: root ? root() : undefined },
    );

    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  return {
    attach: (element: HTMLDivElement) => {
      el = element;
    },
  };
}
