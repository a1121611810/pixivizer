import { vi, type Mock } from "vitest";

export interface MockedObserver {
  callback: IntersectionObserverCallback;
  elements: Element[];
  observe: Mock<(el: Element) => void>;
  unobserve: Mock<(el: Element) => void>;
  disconnect: Mock<() => void>;
}

/** 当前测试中创建的所有 Mock IntersectionObserver 实例 */
export let observers: MockedObserver[] = [];

let originalIntersectionObserver: typeof IntersectionObserver;

/** 在每个测试用例前调用，替换全局 IntersectionObserver */
export function setupIntersectionObserverMock() {
  observers = [];
  originalIntersectionObserver = window.IntersectionObserver;
  window.IntersectionObserver = vi.fn(function IntersectionObserverMock(
    callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {
    const observer: MockedObserver = {
      callback,
      elements: [],
      observe: vi.fn((el: Element) => observer.elements.push(el)),
      unobserve: vi.fn((el: Element) => {
        observer.elements = observer.elements.filter((e) => e !== el);
      }),
      disconnect: vi.fn(() => {
        observer.elements = [];
      }),
    };
    observers.push(observer);
    return observer as unknown as IntersectionObserver;
  }) as unknown as typeof IntersectionObserver;
}

/** 在每个测试用例后调用，恢复全局 IntersectionObserver */
export function cleanupIntersectionObserverMock() {
  window.IntersectionObserver = originalIntersectionObserver;
  observers = [];
}

/** 触发指定元素在所有观察它的 observer 上的 intersection 回调 */
export function triggerIntersection(
  target: Element,
  isIntersecting: boolean,
  intersectionRatio = 0,
) {
  for (const observer of observers) {
    if (observer.elements.includes(target)) {
      observer.callback(
        [{ target, isIntersecting, intersectionRatio } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver,
      );
    }
  }
}

/** 把当前任务队列中的微任务全部 flush，用于等待 Solid 的 effect 执行 */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
