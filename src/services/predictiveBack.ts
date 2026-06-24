import { createSignal, createMemo } from "solid-js";
import type { PluginListenerHandle } from "@capacitor/core";
import {
  PredictiveBack,
  type PredictiveBackStartEvent,
  type PredictiveBackProgressEvent,
} from "../native/PredictiveBack";

declare global {
  interface Window {
    __viewerOpen?: boolean;
    __settingsOpen?: boolean;
  }
}

let routeStack: string[] = [];
const EXIT_DOUBLE_PRESS_INTERVAL = 2000;
let lastFinishRequestTime = 0;

export function pushRoute(path: string): void {
  routeStack.push(path);
}

export function popRoute(): string | undefined {
  return routeStack.pop();
}

export function getCurrentRoute(): string | undefined {
  return routeStack[routeStack.length - 1];
}

export function getPreviousRoute(): string | undefined {
  return routeStack[routeStack.length - 2];
}

export function getRouteStackDepth(): number {
  return routeStack.length;
}

export function clearRouteStack(): void {
  routeStack = [];
}

export type BackTargetType = "closeViewer" | "closeSettings" | "navigateBack" | "finishActivity";

export interface BackTarget {
  type: BackTargetType;
}

const ROOT_PATHS = ["/recommended", "/following", "/bookmarks", "/login"];

function determineBackTarget(): BackTarget {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const stackDepth = routeStack.length;
  const flags =
    typeof window !== "undefined"
      ? { __viewerOpen: window.__viewerOpen, __settingsOpen: window.__settingsOpen }
      : {};
  return determineBackTargetForTest(path, stackDepth, flags);
}

export function determineBackTargetForTest(
  path: string,
  _stackDepth: number,
  flags: { __viewerOpen?: boolean; __settingsOpen?: boolean } = {},
): BackTarget {
  if (flags.__viewerOpen) {
    return { type: "closeViewer" };
  }
  if (flags.__settingsOpen) {
    return { type: "closeSettings" };
  }
  if (ROOT_PATHS.includes(path)) {
    return { type: "finishActivity" };
  }
  return { type: "navigateBack" };
}

const [isActive, setIsActive] = createSignal(false);
const [progress, setProgress] = createSignal(0);
const [target, setTarget] = createSignal<BackTarget | null>(null);
const [edge, setEdge] = createSignal<"left" | "right">("left");

export const isPredictiveBackActive = isActive;
export const predictiveBackProgress = progress;
export const predictiveBackTarget = target;
export const predictiveBackEdge = edge;

let navigateRef: ((delta: number) => void) | null = null;
let removeListeners: Array<() => void> = [];
let enabled = false;

// 某些 Android 16 / OEM 系统（如 vivo OriginOS）不会给 BackEvent 分发有效的 progress，
// 始终返回 0.0。这种情况下启动合成进度动画，让用户至少能看到预览效果。
let syntheticRafId: number | null = null;
let syntheticStartTime = 0;
const SYNTHETIC_DURATION_MS = 250;
const SYNTHETIC_CANCEL_DURATION_MS = 200;
const SYNTHETIC_COMPLETE_DURATION_MS = 200;

function canUseSyntheticAnimation(): boolean {
  return typeof window !== "undefined" && typeof requestAnimationFrame === "function";
}

function clearSyntheticAnimation(): void {
  if (syntheticRafId !== null) {
    cancelAnimationFrame(syntheticRafId);
    syntheticRafId = null;
  }
}

function startSyntheticProgress(): void {
  if (!canUseSyntheticAnimation()) return;
  clearSyntheticAnimation();
  syntheticStartTime = performance.now();

  function tick(now: number): void {
    const elapsed = now - syntheticStartTime;
    const p = Math.min(1, elapsed / SYNTHETIC_DURATION_MS);
    setProgress(p);
    if (p < 1 && isActive()) {
      syntheticRafId = requestAnimationFrame(tick);
    } else {
      syntheticRafId = null;
    }
  }
  syntheticRafId = requestAnimationFrame(tick);
}

function animateProgressToZero(onDone?: () => void): void {
  if (!canUseSyntheticAnimation()) {
    setProgress(0);
    onDone?.();
    return;
  }
  clearSyntheticAnimation();
  const startP = progress();
  const startTime = performance.now();

  function tick(now: number): void {
    const elapsed = now - startTime;
    const p = Math.max(0, startP * (1 - elapsed / SYNTHETIC_CANCEL_DURATION_MS));
    setProgress(p);
    if (p > 0) {
      syntheticRafId = requestAnimationFrame(tick);
    } else {
      syntheticRafId = null;
      onDone?.();
    }
  }
  syntheticRafId = requestAnimationFrame(tick);
}

function animateProgressToOne(onDone?: () => void): void {
  if (!canUseSyntheticAnimation()) {
    setProgress(1);
    onDone?.();
    return;
  }
  clearSyntheticAnimation();
  const startP = progress();
  const startTime = performance.now();

  function tick(now: number): void {
    const elapsed = now - startTime;
    const p = Math.min(1, startP + (1 - startP) * (elapsed / SYNTHETIC_COMPLETE_DURATION_MS));
    setProgress(p);
    if (p < 1) {
      syntheticRafId = requestAnimationFrame(tick);
    } else {
      syntheticRafId = null;
      onDone?.();
    }
  }
  syntheticRafId = requestAnimationFrame(tick);
}

export function initPredictiveBack(navigate: (delta: number) => void): void {
  navigateRef = navigate;
}

function executeBackTarget(backTarget: BackTarget): void {
  switch (backTarget.type) {
    case "closeViewer": {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("closeViewer"));
      }
      break;
    }
    case "closeSettings": {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("closeSettings"));
      }
      break;
    }
    case "navigateBack": {
      navigateRef?.(-1);
      break;
    }
  }
}

export function onStart(event: PredictiveBackStartEvent): void {
  if (isActive()) return;
  clearSyntheticAnimation();
  setEdge(event.edge);
  setProgress(0);
  const backTarget = determineBackTarget();
  setTarget(backTarget);
  setIsActive(true);
  // 系统 progress 不可靠时启用合成动画
  startSyntheticProgress();
  if (typeof window !== "undefined") {
    console.log("[PredictiveBack] onStart", event.edge, backTarget);
  }
}

export function onProgress(event: PredictiveBackProgressEvent): void {
  if (!isActive()) return;
  // 如果原生 progress 有效（> 0.01），优先使用原生进度并停止合成动画
  if (event.progress > 0.01) {
    clearSyntheticAnimation();
    setProgress(event.progress);
  }
  if (typeof window !== "undefined") {
    console.log(
      "[PredictiveBack] onProgress",
      event.progress.toFixed(4),
      "activeProgress",
      progress().toFixed(4),
    );
  }
}

export function onEnd(): void {
  if (!isActive()) return;
  const backTarget = target();
  clearSyntheticAnimation();

  const complete = (): void => {
    setIsActive(false);
    setProgress(0);
    setTarget(null);
    if (typeof window !== "undefined") {
      console.log("[PredictiveBack] onEnd", backTarget);
    }
    if (!backTarget) return;
    if (backTarget.type === "finishActivity") {
      const now = Date.now();
      if (now - lastFinishRequestTime < EXIT_DOUBLE_PRESS_INTERVAL) {
        PredictiveBack.finishActivity().catch((e) =>
          console.warn("[PredictiveBack] finishActivity failed", e),
        );
      } else {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("exitHint"));
        }
        lastFinishRequestTime = now;
      }
      return;
    }
    executeBackTarget(backTarget);
  };

  // 返回路由时添加短暂的完成动画，让松手后的页面退出不那么突兀
  if (backTarget?.type === "navigateBack") {
    animateProgressToOne(complete);
  } else {
    complete();
  }
}

export function onCancel(): void {
  if (!isActive()) return;
  clearSyntheticAnimation();
  setIsActive(false);
  setTarget(null);
  animateProgressToZero();
  if (typeof window !== "undefined") {
    console.log("[PredictiveBack] onCancel");
  }
}

let lock: Promise<void> = Promise.resolve();
let pendingTarget: boolean | null = null;

async function applyPredictiveBackEnabled(shouldEnable: boolean): Promise<void> {
  if (shouldEnable) {
    const wasEnabled = enabled;
    const oldRemoveListeners = wasEnabled ? removeListeners : [];

    if (!wasEnabled) {
      await PredictiveBack.enable();
    }

    const addedHandles: Array<PluginListenerHandle> = [];
    try {
      const startHandle = await PredictiveBack.addListener("predictiveBackStart", onStart);
      addedHandles.push(startHandle);
      const progressHandle = await PredictiveBack.addListener("predictiveBackProgress", onProgress);
      addedHandles.push(progressHandle);
      const endHandle = await PredictiveBack.addListener("predictiveBackEnd", onEnd);
      addedHandles.push(endHandle);
      const cancelHandle = await PredictiveBack.addListener("predictiveBackCancel", onCancel);
      addedHandles.push(cancelHandle);

      // 新监听器注册成功后再清理旧监听器，失败时可以安全回滚。
      oldRemoveListeners.forEach((remove) => remove());
      removeListeners = [
        () => void startHandle.remove(),
        () => void progressHandle.remove(),
        () => void endHandle.remove(),
        () => void cancelHandle.remove(),
      ];
      enabled = true;
    } catch (error) {
      addedHandles.forEach((handle) => void handle.remove());
      if (wasEnabled) {
        // 保留原有监听器，保持启用状态
        removeListeners = oldRemoveListeners;
      } else {
        removeListeners = [];
        enabled = false;
        try {
          await PredictiveBack.disable();
        } catch {
          // 回滚 native enable 失败不影响抛出原始注册错误
        }
      }
      console.warn("[predictiveBack] Failed to register predictive back listener", error);
      throw error;
    }
  } else {
    if (!enabled) {
      return;
    }
    removeListeners.forEach((remove) => remove());
    removeListeners = [];
    await PredictiveBack.disable();
    enabled = false;
  }
}

export async function setPredictiveBackEnabled(shouldEnable: boolean): Promise<void> {
  if (pendingTarget === shouldEnable) {
    return lock;
  }
  pendingTarget = shouldEnable;
  lock = lock
    .catch(() => {})
    .then(() => applyPredictiveBackEnabled(shouldEnable))
    .finally(() => {
      if (pendingTarget === shouldEnable) {
        pendingTarget = null;
      }
    });
  return lock;
}

export function handleStartForTest(event: PredictiveBackStartEvent): void {
  onStart(event);
}

export function handleProgressForTest(event: { progress: number }): void {
  const fullEvent: PredictiveBackProgressEvent = {
    edge: edge(),
    touchY: 0,
    progress: event.progress,
  };
  onProgress(fullEvent);
}

export function handleCancelForTest(): void {
  onCancel();
}

export function resetStateForTest(): void {
  clearSyntheticAnimation();
  setIsActive(false);
  setProgress(0);
  setTarget(null);
  setEdge("left");
  routeStack = [];
  navigateRef = null;
  enabled = false;
  lastFinishRequestTime = 0;
  removeListeners.forEach((remove) => remove());
  removeListeners = [];
  lock = Promise.resolve();
  pendingTarget = null;
}

export function usePredictiveBackOverlayStyle() {
  return createMemo(() => {
    const t = target();
    if (!isActive() || (t?.type !== "closeViewer" && t?.type !== "closeSettings")) {
      // 非手势期间移除 transform，避免破坏 fixed 定位元素（查看器内部按钮等）的视口定位。
      return { transform: "none" as const, opacity: 1, "border-radius": "0px" };
    }
    const sign = edge() === "left" ? -1 : 1;
    const p = progress();
    return {
      transform: `scale(${1 - 0.08 * p}) translateX(${sign * p * 4}%)`,
      opacity: 1 - 0.15 * p,
      "border-radius": `calc(var(--borderRadiusXLarge) * ${p})`,
      transition: "none",
    };
  });
}
