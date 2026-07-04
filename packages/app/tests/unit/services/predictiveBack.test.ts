import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PluginListenerHandle } from "@capacitor/core";
import {
  pushRoute,
  popRoute,
  getCurrentRoute,
  getPreviousRoute,
  getRouteStackDepth,
  clearRouteStack,
  determineBackTargetForTest,
  isPredictiveBackActive,
  predictiveBackProgress,
  predictiveBackTarget,
  predictiveBackEdge,
  handleStartForTest,
  handleProgressForTest,
  handleCancelForTest,
  resetStateForTest,
  setPredictiveBackEnabled,
  initPredictiveBack,
  onStart,
  onProgress,
  onEnd,
  onCancel,
} from "@/services/predictiveBack";
import { PredictiveBack } from "@/native/PredictiveBack";

vi.mock("@/native/PredictiveBack", () => {
  const listeners: Record<string, Array<(event: unknown) => void>> = {};
  return {
    PredictiveBack: {
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
      finishActivity: vi.fn().mockResolvedValue(undefined),
      addListener: vi
        .fn()
        .mockImplementation(async (eventName: string, listener: (event: unknown) => void) => {
          listeners[eventName] = listeners[eventName] ?? [];
          listeners[eventName].push(listener);
          return {
            remove: vi.fn().mockImplementation(() => {
              const idx = listeners[eventName].indexOf(listener);
              if (idx !== -1) listeners[eventName].splice(idx, 1);
            }),
          } as PluginListenerHandle;
        }),
    },
  };
});

describe("predictiveBack route stack", () => {
  it("starts empty", () => {
    clearRouteStack();
    expect(getRouteStackDepth()).toBe(0);
    expect(getCurrentRoute()).toBeUndefined();
    expect(getPreviousRoute()).toBeUndefined();
  });

  it("pushes routes and reports depth", () => {
    clearRouteStack();
    pushRoute("/recommended");
    pushRoute("/illust/123");
    expect(getRouteStackDepth()).toBe(2);
    expect(getCurrentRoute()).toBe("/illust/123");
    expect(getPreviousRoute()).toBe("/recommended");
  });

  it("pops routes in LIFO order", () => {
    clearRouteStack();
    pushRoute("/recommended");
    pushRoute("/illust/123");
    expect(popRoute()).toBe("/illust/123");
    expect(getPreviousRoute()).toBeUndefined();
    expect(popRoute()).toBe("/recommended");
    expect(popRoute()).toBeUndefined();
  });

  it("clears the stack", () => {
    clearRouteStack();
    pushRoute("/following");
    pushRoute("/bookmarks");
    clearRouteStack();
    expect(getRouteStackDepth()).toBe(0);
    expect(getPreviousRoute()).toBeUndefined();
  });
});

describe("determineBackTargetForTest", () => {
  it("returns closeViewer when viewer is open", () => {
    expect(determineBackTargetForTest("/illust/123", 1, { __viewerOpen: true })).toEqual({
      type: "closeViewer",
    });
  });

  it("returns closeSettings when settings is open", () => {
    expect(determineBackTargetForTest("/recommended", 0, { __settingsOpen: true })).toEqual({
      type: "closeSettings",
    });
  });

  it("returns finishActivity for root paths", () => {
    expect(determineBackTargetForTest("/recommended", 1)).toEqual({ type: "finishActivity" });
    expect(determineBackTargetForTest("/following", 1)).toEqual({ type: "finishActivity" });
    expect(determineBackTargetForTest("/bookmarks", 1)).toEqual({ type: "finishActivity" });
    expect(determineBackTargetForTest("/login", 1)).toEqual({ type: "finishActivity" });
  });

  it("returns navigateBack for non-root paths with route history", () => {
    expect(determineBackTargetForTest("/illust/123", 1)).toEqual({ type: "navigateBack" });
  });

  it("returns navigateBack fallback for non-root paths without history", () => {
    expect(determineBackTargetForTest("/illust/123", 0)).toEqual({ type: "navigateBack" });
  });
});

describe("predictiveBack state machine", () => {
  beforeEach(() => {
    resetStateForTest();
  });

  it("handleStartForTest activates and stores target, edge, progress=0", () => {
    handleStartForTest({ edge: "right", touchY: 100 });
    expect(isPredictiveBackActive()).toBe(true);
    expect(predictiveBackProgress()).toBe(0);
    expect(predictiveBackEdge()).toBe("right");
    expect(predictiveBackTarget()).toEqual({ type: "navigateBack" });
  });

  it("handleProgressForTest updates progress", () => {
    handleStartForTest({ edge: "left", touchY: 50 });
    handleProgressForTest({ progress: 0.5 });
    expect(predictiveBackProgress()).toBe(0.5);
    handleProgressForTest({ progress: 0.9 });
    expect(predictiveBackProgress()).toBe(0.9);
  });

  it("handleCancelForTest resets state", () => {
    handleStartForTest({ edge: "left", touchY: 0 });
    handleProgressForTest({ progress: 0.4 });
    handleCancelForTest();
    expect(isPredictiveBackActive()).toBe(false);
    expect(predictiveBackProgress()).toBe(0);
    expect(predictiveBackTarget()).toBeNull();
    expect(predictiveBackEdge()).toBe("left");
  });
});

describe("onEnd target actions", () => {
  const eventListeners: Record<string, Array<EventListener>> = {};

  beforeEach(() => {
    resetStateForTest();
    Object.keys(eventListeners).forEach((key) => delete eventListeners[key]);
    vi.stubGlobal("window", {
      location: { pathname: "/recommended" },
      addEventListener: vi.fn((event: string, listener: EventListener) => {
        eventListeners[event] = eventListeners[event] ?? [];
        eventListeners[event].push(listener);
      }),
      removeEventListener: vi.fn((event: string, listener: EventListener) => {
        const idx = eventListeners[event]?.indexOf(listener) ?? -1;
        if (idx !== -1) eventListeners[event].splice(idx, 1);
      }),
      dispatchEvent: vi.fn((event: Event) => {
        eventListeners[event.type]?.forEach((listener) => listener(event));
        return true;
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("closeViewer dispatches closeViewer event", () => {
    const listener = vi.fn();
    (window as any).__viewerOpen = true;
    window.addEventListener("closeViewer", listener as EventListener);

    handleStartForTest({ edge: "left", touchY: 0 });
    onEnd();

    expect(listener).toHaveBeenCalled();
    expect(predictiveBackTarget()).toBeNull();
    expect(isPredictiveBackActive()).toBe(false);
  });

  it("navigateBack calls navigate with -1 when route history exists", () => {
    const navigate = vi.fn();
    initPredictiveBack(navigate);
    (window as any).location.pathname = "/illust/123";
    pushRoute("/recommended");
    pushRoute("/illust/123");

    handleStartForTest({ edge: "left", touchY: 0 });
    expect(predictiveBackTarget()).toEqual({ type: "navigateBack" });
    onEnd();

    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it("navigateBack falls back to /recommended when route history is empty", () => {
    const navigate = vi.fn();
    initPredictiveBack(navigate);
    (window as any).location.pathname = "/novel/123";
    clearRouteStack();
    pushRoute("/novel/123");

    handleStartForTest({ edge: "left", touchY: 0 });
    expect(predictiveBackTarget()).toEqual({ type: "navigateBack" });
    onEnd();

    expect(navigate).toHaveBeenCalledWith("/recommended");
  });

  it("finishActivity requires double press within 2 seconds", () => {
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(10000);
    const exitHintListener = vi.fn();
    window.addEventListener("exitHint", exitHintListener);

    // 第一次返回根页：提示“再按一次退出”，不调用原生 finishActivity
    handleStartForTest({ edge: "left", touchY: 0 });
    expect(predictiveBackTarget()).toEqual({ type: "finishActivity" });
    onEnd();

    expect(exitHintListener).toHaveBeenCalledTimes(1);
    expect(PredictiveBack.finishActivity).not.toHaveBeenCalled();

    // 2 秒内再次返回：执行原生 finishActivity
    dateSpy.mockReturnValue(11500);
    handleStartForTest({ edge: "left", touchY: 0 });
    onEnd();

    expect(PredictiveBack.finishActivity).toHaveBeenCalledTimes(1);

    dateSpy.mockRestore();
  });
});

describe("setPredictiveBackEnabled", () => {
  beforeEach(() => {
    resetStateForTest();
  });

  afterEach(async () => {
    await setPredictiveBackEnabled(false);
  });

  it("enables predictive back and registers four listeners", async () => {
    await setPredictiveBackEnabled(true);
    expect(PredictiveBack.enable).toHaveBeenCalledTimes(1);
    expect(PredictiveBack.addListener).toHaveBeenCalledTimes(4);
    expect(PredictiveBack.addListener).toHaveBeenCalledWith("predictiveBackStart", onStart);
    expect(PredictiveBack.addListener).toHaveBeenCalledWith("predictiveBackProgress", onProgress);
    expect(PredictiveBack.addListener).toHaveBeenCalledWith("predictiveBackEnd", onEnd);
    expect(PredictiveBack.addListener).toHaveBeenCalledWith("predictiveBackCancel", onCancel);
  });

  it("double enable removes old listeners before re-adding", async () => {
    await setPredictiveBackEnabled(true);
    const addListenerMock = PredictiveBack.addListener as ReturnType<typeof vi.fn>;
    const firstHandles = await Promise.all(
      addListenerMock.mock.results
        .slice(-4)
        .filter(
          (r): r is { type: "return"; value: Promise<PluginListenerHandle> } => r.type === "return",
        )
        .map((r) => r.value),
    );

    await setPredictiveBackEnabled(true);

    firstHandles.forEach((handle) => {
      expect(handle.remove).toHaveBeenCalled();
    });
    expect(PredictiveBack.enable).toHaveBeenCalledTimes(1);
    expect(addListenerMock).toHaveBeenCalledTimes(8);
  });

  it("disable when not enabled is a no-op", async () => {
    await setPredictiveBackEnabled(false);
    expect(PredictiveBack.disable).not.toHaveBeenCalled();
  });

  it("resetStateForTest clears registration state and removes stored listeners", async () => {
    await setPredictiveBackEnabled(true);
    const addListenerMock = PredictiveBack.addListener as ReturnType<typeof vi.fn>;
    const firstHandles = await Promise.all(
      addListenerMock.mock.results
        .slice(-4)
        .filter(
          (r): r is { type: "return"; value: Promise<PluginListenerHandle> } => r.type === "return",
        )
        .map((r) => r.value),
    );

    resetStateForTest();

    firstHandles.forEach((handle) => {
      expect(handle.remove).toHaveBeenCalled();
    });
    // enabled 已被重置为 false，再次 disable 应为 no-op
    await setPredictiveBackEnabled(false);
    expect(PredictiveBack.disable).not.toHaveBeenCalled();
  });

  it("double enable failure restores old listeners and keeps enabled state", async () => {
    await setPredictiveBackEnabled(true);
    const addListenerMock = PredictiveBack.addListener as ReturnType<typeof vi.fn>;
    const firstHandles = await Promise.all(
      addListenerMock.mock.results
        .slice(-4)
        .filter(
          (r): r is { type: "return"; value: Promise<PluginListenerHandle> } => r.type === "return",
        )
        .map((r) => r.value),
    );

    addListenerMock.mockRejectedValueOnce(new Error("boom"));

    await expect(setPredictiveBackEnabled(true)).rejects.toThrow("boom");

    // 旧监听器未被提前清理，仍然有效
    firstHandles.forEach((handle) => {
      expect(handle.remove).not.toHaveBeenCalled();
    });
    expect(PredictiveBack.enable).toHaveBeenCalledTimes(1);

    // 禁用时应清理旧监听器并调用原生 disable
    await setPredictiveBackEnabled(false);
    firstHandles.forEach((handle) => {
      expect(handle.remove).toHaveBeenCalled();
    });
    expect(PredictiveBack.disable).toHaveBeenCalledTimes(1);
  });

  it("first enable failure rolls back to disabled state", async () => {
    const addListenerMock = PredictiveBack.addListener as ReturnType<typeof vi.fn>;
    addListenerMock.mockRejectedValueOnce(new Error("fail"));

    await expect(setPredictiveBackEnabled(true)).rejects.toThrow("fail");

    expect(PredictiveBack.enable).toHaveBeenCalledTimes(1);
    expect(PredictiveBack.disable).toHaveBeenCalledTimes(1);

    // 状态已回滚，再次 disable 应为 no-op
    await setPredictiveBackEnabled(false);
    expect(PredictiveBack.disable).toHaveBeenCalledTimes(1);
  });
});
