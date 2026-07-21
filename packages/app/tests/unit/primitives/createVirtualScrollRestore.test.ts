import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot } from "solid-js";
import type { Virtualizer, VirtualItem } from "@tanstack/solid-virtual";
import { createVirtualScrollRestore } from "@/primitives/createVirtualScrollRestore";
import type { ScrollRestoreState } from "@/primitives/createScrollRestore";

type WindowStub = {
  scrollY: number;
  scrollTo: ReturnType<typeof vi.fn>;
};

function makeSnapshot(count: number): VirtualItem[] {
  return Array.from({ length: count }, (_, i) => ({ index: i, start: i * 100 }) as VirtualItem);
}

function makeState(offset: number, count = 5): ScrollRestoreState {
  return { snapshot: makeSnapshot(count), offset, version: 1 };
}

describe("createVirtualScrollRestore", () => {
  let windowStub: WindowStub;
  let roCallbacks: ResizeObserverCallback[];
  let roDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    windowStub = {
      scrollY: 0,
      scrollTo: vi.fn((opts: { top: number }) => {
        windowStub.scrollY = opts.top;
      }),
    };
    vi.stubGlobal("window", windowStub);
    roCallbacks = [];
    roDisconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: ResizeObserverCallback) {
          roCallbacks.push(cb);
        }
        observe() {}
        unobserve() {}
        disconnect = roDisconnect;
      },
    );
    vi.stubGlobal("document", { documentElement: {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function makeVirtualizer(snapshot: VirtualItem[] = []) {
    return { takeSnapshot: () => snapshot } as unknown as Virtualizer<Window, HTMLElement>;
  }

  it("exposes initialOffset and initialMeasurementsCache from saved state", () => {
    const state = makeState(2500);
    createRoot((dispose) => {
      const restore = createVirtualScrollRestore({
        getVirtualizer: () => makeVirtualizer(),
        getState: () => state,
        saveState: () => {},
      });
      expect(restore.initialOffset).toBe(2500);
      expect(restore.initialMeasurementsCache).toEqual(state.snapshot);
      dispose();
    });
  });

  it("exposes undefined offset and empty cache when no saved state", () => {
    createRoot((dispose) => {
      const restore = createVirtualScrollRestore({
        getVirtualizer: () => makeVirtualizer(),
        getState: () => undefined,
        saveState: () => {},
      });
      expect(restore.initialOffset).toBeUndefined();
      expect(restore.initialMeasurementsCache).toEqual([]);
      dispose();
    });
  });

  it("restoreScroll scrolls window to saved offset", () => {
    createRoot((dispose) => {
      const restore = createVirtualScrollRestore({
        getVirtualizer: () => makeVirtualizer(),
        getState: () => makeState(2500),
        saveState: () => {},
      });
      restore.restoreScroll();
      expect(windowStub.scrollTo).toHaveBeenCalledWith({ top: 2500 });
      expect(windowStub.scrollY).toBe(2500);
      dispose();
    });
  });

  it("restoreScroll reads state lazily at call time", () => {
    // 等价于旧 VirtualFeed 在 onMount 中读 savedState() memo 的语义：
    // setup 时无状态、mount 前被其他实例写入状态，恢复应看到最新值
    let state: ScrollRestoreState | undefined;
    createRoot((dispose) => {
      const restore = createVirtualScrollRestore({
        getVirtualizer: () => makeVirtualizer(),
        getState: () => state,
        saveState: () => {},
      });
      expect(restore.initialOffset).toBeUndefined();
      state = makeState(2500);
      restore.restoreScroll();
      expect(windowStub.scrollTo).toHaveBeenCalledWith({ top: 2500 });
      dispose();
    });
  });

  it("restoreScroll is a no-op without saved state", () => {
    createRoot((dispose) => {
      const restore = createVirtualScrollRestore({
        getVirtualizer: () => makeVirtualizer(),
        getState: () => undefined,
        saveState: () => {},
      });
      restore.restoreScroll();
      expect(windowStub.scrollTo).not.toHaveBeenCalled();
      dispose();
    });
  });

  it("restoreScroll is a no-op when saved offset is 0", () => {
    createRoot((dispose) => {
      const restore = createVirtualScrollRestore({
        getVirtualizer: () => makeVirtualizer(),
        getState: () => makeState(0),
        saveState: () => {},
      });
      restore.restoreScroll();
      expect(windowStub.scrollTo).not.toHaveBeenCalled();
      dispose();
    });
  });

  it("retries via ResizeObserver when scrollY is clamped below target", () => {
    createRoot((dispose) => {
      // 模拟 clamp：scrollTo 只滚到 800（文档高度不足）
      windowStub.scrollTo = vi.fn(() => {
        windowStub.scrollY = 800;
      });
      const restore = createVirtualScrollRestore({
        getVirtualizer: () => makeVirtualizer(),
        getState: () => makeState(2500),
        saveState: () => {},
      });
      restore.restoreScroll();
      expect(roCallbacks).toHaveLength(1);

      // 文档生长后触达目标：重试并断开观察
      windowStub.scrollTo = vi.fn((opts: { top: number }) => {
        windowStub.scrollY = opts.top;
      });
      roCallbacks[0]([], {} as ResizeObserver);
      expect(windowStub.scrollTo).toHaveBeenCalledWith({ top: 2500 });
      expect(roDisconnect).toHaveBeenCalled();
      dispose();
    });
  });

  it("stops retrying after fallback timeout", () => {
    vi.useFakeTimers();
    try {
      createRoot((dispose) => {
        windowStub.scrollTo = vi.fn(() => {
          windowStub.scrollY = 800;
        });
        const restore = createVirtualScrollRestore({
          getVirtualizer: () => makeVirtualizer(),
          getState: () => makeState(2500),
          saveState: () => {},
          fallbackTimeoutMs: 500,
        });
        restore.restoreScroll();
        vi.advanceTimersByTime(600);
        expect(roDisconnect).toHaveBeenCalled();
        dispose();
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("saves snapshot and offset on owner disposal", () => {
    const saved: ScrollRestoreState[] = [];
    const snapshot = makeSnapshot(8);
    windowStub.scrollY = 2500;
    const dispose = createRoot((d) => {
      createVirtualScrollRestore({
        getVirtualizer: () => makeVirtualizer(snapshot),
        getState: () => undefined,
        saveState: (st) => saved.push(st),
      });
      return d;
    });
    dispose();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual({ snapshot, offset: 2500, version: 1 });
  });

  it("skips save when snapshot is empty and offset is 0", () => {
    const saved: ScrollRestoreState[] = [];
    windowStub.scrollY = 0;
    const dispose = createRoot((d) => {
      createVirtualScrollRestore({
        getVirtualizer: () => makeVirtualizer([]),
        getState: () => undefined,
        saveState: (st) => saved.push(st),
      });
      return d;
    });
    dispose();
    expect(saved).toHaveLength(0);
  });
});
