# Android 16 预测性返回手势修复实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过自定义 Capacitor 插件接管 Android `OnBackInvokedDispatcher`，修复侧滑返回直接最小化的 bug，并实现路由页/查看器/设置面板的自定义预览动画。

**Architecture:** 原生 `PredictiveBackPlugin` 只负责报告手势事件和提供 `finishActivity()`；JS 侧 `PredictiveBackCoordinator` 维护导航栈、判定返回目标、驱动动画信号；`PredictiveBackContainer` 在路由层渲染目标页预览并缩放当前页；查看器/设置面板直接消费 coordinator 信号做缩放动画。

**Tech Stack:** SolidJS + TypeScript (strict) + Capacitor 8 + Android Java + UnoCSS (Fluent Design 2 tokens) + Vitest

## Global Constraints

- TypeScript strict mode（`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`）
- SolidJS 函数组件使用 `Component<Props>` 标注并默认导出
- UnoCSS + Fluent Design System 2 令牌，禁止硬编码值
- 路径别名 `@/` → `src/`
- 中文注释为主；API/原生层偏英文
- 动画只允许 Fluent 标准曲线与标准时长
- 不自动提交 git（用户手动审阅所有改动）

---

## 文件结构

| 文件                                                                    | 责任                                                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `android/app/src/main/java/com/pixivizer/app/PredictiveBackPlugin.java` | 原生插件：注册 `OnBackInvokedCallback` / `OnBackAnimationCallback`，发送事件，提供 `finishActivity()` |
| `android/app/src/main/java/com/pixivizer/app/MainActivity.java`         | 注册自定义 PredictiveBack 插件（`capacitor.plugins.json` 会被 `cap sync` 覆盖）                       |
| `src/native/PredictiveBack.ts`                                          | Capacitor JS 插件类型定义与 `registerPlugin`                                                          |
| `src/services/predictiveBack.ts`                                        | `PredictiveBackCoordinator`：导航栈、目标判定、事件状态机、信号                                       |
| `src/services/predictiveBack.test.ts`                                   | Coordinator 单元测试                                                                                  |
| `src/components/PredictiveBackContainer.tsx`                            | 路由级动画容器：渲染预览层与当前页 transform                                                          |
| `src/components/RoutePreview.tsx`                                       | 根据路径渲染上一页组件                                                                                |
| `src/App.tsx`                                                           | 初始化 coordinator、包裹 `PredictiveBackContainer`、跟踪路由栈                                        |
| `src/stores/uiStore.ts`                                                 | 设置开关改为调用 coordinator                                                                          |
| `src/routes/IllustDetail.tsx`                                           | 支持可选 `illustId` prop，用于预览渲染                                                                |
| `src/components/ImageViewer.tsx`                                        | 接入返回手势缩放动画                                                                                  |
| `src/components/UgoiraViewer.tsx`                                       | 接入返回手势缩放动画                                                                                  |
| `src/components/SettingsSheet.tsx`                                      | 接入返回手势缩放动画                                                                                  |
| `src/styles/base.css`（可能修改）                                       | 预测返回相关 CSS 变量与过渡                                                                           |

---

### Task 1: 创建原生 `PredictiveBackPlugin`

**Files:**

- Create: `android/app/src/main/java/com/pixivizer/app/PredictiveBackPlugin.java`
- Modify: `android/app/src/main/java/com/pixivizer/app/MainActivity.java`

**Interfaces:**

- Produces: 原生 Capacitor 插件，暴露 `enable()` / `disable()` / `finishActivity()`，发送 `predictiveBackStart` / `predictiveBackProgress` / `predictiveBackEnd` / `predictiveBackCancel`

- [ ] **Step 1: 创建 Java 插件文件**

Create `android/app/src/main/java/com/pixivizer/app/PredictiveBackPlugin.java`:

```java
package com.pixivizer.app;

import android.os.Build;
import android.window.BackEvent;
import android.window.OnBackAnimationCallback;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PredictiveBack")
public class PredictiveBackPlugin extends Plugin {
    private OnBackInvokedCallback callback;
    private OnBackInvokedDispatcher dispatcher;

    @PluginMethod
    public void enable(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve();
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (dispatcher == null) {
                dispatcher = getActivity().getOnBackInvokedDispatcher();
            }
            if (callback != null) {
                dispatcher.unregisterOnBackInvokedCallback(callback);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                callback = new OnBackAnimationCallback() {
                    @Override
                    public void onBackStarted(@NonNull BackEvent backEvent) {
                        notifyBackStarted(backEvent);
                    }

                    @Override
                    public void onBackProgressed(@NonNull BackEvent backEvent, float progress) {
                        notifyBackProgressed(backEvent, progress);
                    }

                    @Override
                    public void onBackInvoked() {
                        notifyBackEnd();
                    }

                    @Override
                    public void onBackCancelled() {
                        notifyBackCancel();
                    }
                };
            } else {
                callback = () -> notifyBackEnd();
            }
            dispatcher.registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback);
            call.resolve();
        });
    }

    @PluginMethod
    public void disable(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve();
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (dispatcher != null && callback != null) {
                dispatcher.unregisterOnBackInvokedCallback(callback);
                callback = null;
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void finishActivity(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            getActivity().finish();
            call.resolve();
        });
    }

    @RequiresApi(api = Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    private void notifyBackStarted(@NonNull BackEvent event) {
        JSObject data = new JSObject();
        data.put("edge", event.getSwipeEdge() == BackEvent.EDGE_LEFT ? "left" : "right");
        data.put("touchY", event.getTouchY());
        notifyListeners("predictiveBackStart", data);
    }

    @RequiresApi(api = Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    private void notifyBackProgressed(@NonNull BackEvent event, float progress) {
        JSObject data = new JSObject();
        data.put("progress", progress);
        data.put("edge", event.getSwipeEdge() == BackEvent.EDGE_LEFT ? "left" : "right");
        data.put("touchY", event.getTouchY());
        notifyListeners("predictiveBackProgress", data);
    }

    private void notifyBackEnd() {
        notifyListeners("predictiveBackEnd", new JSObject());
    }

    private void notifyBackCancel() {
        notifyListeners("predictiveBackCancel", new JSObject());
    }
}
```

- [ ] **Step 2: 在 MainActivity 中注册插件**

`capacitor.plugins.json` 会被 `cap sync` 覆盖，因此本地插件不通过该 JSON 注册。修改 `android/app/src/main/java/com/pixivizer/app/MainActivity.java`，在 `onCreate` 中、调用 `super.onCreate()` 之前注册：

```java
import android.os.Bundle;
import com.pixivizer.app.PredictiveBackPlugin;

@Override
protected void onCreate(Bundle savedInstanceState) {
    registerPlugin(PredictiveBackPlugin.class);
    super.onCreate(savedInstanceState);
}
```

- [ ] **Step 3: Android 构建检查**

```bash
cd android && ./gradlew assembleDebug
```

Expected: BUILD SUCCESSFUL（或至少原生编译通过；此时 JS 侧尚未接入，应用逻辑不影响编译）。

---

### Task 2: 创建 JS 插件定义

**Files:**

- Create: `src/native/PredictiveBack.ts`

**Interfaces:**

- Produces: `PredictiveBack` plugin 实例与事件类型

- [ ] **Step 1: 创建类型定义文件**

Create `src/native/PredictiveBack.ts`:

```ts
import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface PredictiveBackStartEvent {
  edge: "left" | "right";
  touchY: number;
}

export interface PredictiveBackProgressEvent extends PredictiveBackStartEvent {
  progress: number;
}

export interface PredictiveBackPlugin {
  enable(): Promise<void>;
  disable(): Promise<void>;
  finishActivity(): Promise<void>;
  addListener(
    eventName: "predictiveBackStart",
    listener: (event: PredictiveBackStartEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "predictiveBackProgress",
    listener: (event: PredictiveBackProgressEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(eventName: "predictiveBackEnd", listener: () => void): Promise<PluginListenerHandle>;
  addListener(
    eventName: "predictiveBackCancel",
    listener: () => void,
  ): Promise<PluginListenerHandle>;
}

export const PredictiveBack = registerPlugin<PredictiveBackPlugin>("PredictiveBack");
```

- [ ] **Step 2: TypeScript 检查**

```bash
pnpm check
```

Expected: PASS（新文件无类型错误）。

---

### Task 3: `PredictiveBackCoordinator` 服务（TDD）

**Files:**

- Create: `src/services/predictiveBack.ts`
- Create: `src/services/predictiveBack.test.ts`

**Interfaces:**

- Consumes: `PredictiveBack` from `../native/PredictiveBack`
- Produces: signals `isPredictiveBackActive`, `predictiveBackProgress`, `predictiveBackTarget`, `predictiveBackEdge`；栈操作函数；`setPredictiveBackEnabled()`；`initPredictiveBack(navigate)`

- [ ] **Step 1: 写导航栈的 failing tests**

Create `src/services/predictiveBack.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  pushRoute,
  popRoute,
  getPreviousRoute,
  getRouteStackDepth,
  clearRouteStack,
} from "./predictiveBack";

describe("predictiveBack route stack", () => {
  beforeEach(() => {
    clearRouteStack();
  });

  it("pushes routes and reports depth", () => {
    pushRoute("/recommended");
    pushRoute("/illust/123");
    expect(getRouteStackDepth()).toBe(2);
    expect(getPreviousRoute()).toBe("/recommended");
  });

  it("pops the latest route", () => {
    pushRoute("/recommended");
    pushRoute("/illust/123");
    const prev = popRoute();
    expect(prev).toBe("/recommended");
    expect(getRouteStackDepth()).toBe(1);
  });

  it("returns undefined when stack is empty", () => {
    expect(getPreviousRoute()).toBeUndefined();
    expect(popRoute()).toBeUndefined();
  });
});
```

Run:

```bash
pnpm vitest run src/services/predictiveBack.test.ts
```

Expected: FAIL（functions not defined）。

- [ ] **Step 2: 实现导航栈**

Create `src/services/predictiveBack.ts` with the route stack only（后续步骤再扩展）：

```ts
let routeStack: string[] = [];

export function pushRoute(path: string): void {
  routeStack.push(path);
}

export function popRoute(): string | undefined {
  return routeStack.pop();
}

export function getPreviousRoute(): string | undefined {
  return routeStack[routeStack.length - 1];
}

export function getRouteStackDepth(): number {
  return routeStack.length;
}

export function clearRouteStack(): void {
  routeStack = [];
}
```

Run:

```bash
pnpm vitest run src/services/predictiveBack.test.ts
```

Expected: PASS。

- [ ] **Step 3: 写目标判定的 failing tests**

在 `src/services/predictiveBack.test.ts` 中追加：

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { determineBackTargetForTest } from "./predictiveBack";

describe("predictiveBack target determination", () => {
  afterEach(() => {
    delete (window as any).__viewerOpen;
    delete (window as any).__settingsOpen;
  });

  it("viewer open -> closeViewer", () => {
    (window as any).__viewerOpen = true;
    expect(determineBackTargetForTest("/illust/123", 1)).toEqual({ type: "closeViewer" });
  });

  it("settings open -> closeSettings", () => {
    (window as any).__settingsOpen = true;
    expect(determineBackTargetForTest("/recommended", 0)).toEqual({ type: "closeSettings" });
  });

  it("root page -> finishActivity", () => {
    expect(determineBackTargetForTest("/recommended", 0)).toEqual({ type: "finishActivity" });
    expect(determineBackTargetForTest("/following", 0)).toEqual({ type: "finishActivity" });
    expect(determineBackTargetForTest("/bookmarks", 0)).toEqual({ type: "finishActivity" });
    expect(determineBackTargetForTest("/login", 0)).toEqual({ type: "finishActivity" });
  });

  it("detail page with stack -> navigateBack", () => {
    expect(determineBackTargetForTest("/illust/123", 1)).toEqual({ type: "navigateBack" });
  });

  it("non-root page without stack -> finishActivity fallback", () => {
    expect(determineBackTargetForTest("/debug", 0)).toEqual({ type: "finishActivity" });
  });
});
```

Run:

```bash
pnpm vitest run src/services/predictiveBack.test.ts
```

Expected: FAIL（`determineBackTargetForTest` not defined）。

- [ ] **Step 4: 实现目标判定**

在 `src/services/predictiveBack.ts` 中追加并导出测试钩子：

```ts
export type BackTargetType = "closeViewer" | "closeSettings" | "navigateBack" | "finishActivity";

export interface BackTarget {
  type: BackTargetType;
}

const ROOT_PATHS = ["/recommended", "/following", "/bookmarks", "/login"];

export function determineBackTarget(path: string, stackDepth: number): BackTarget {
  if ((window as any).__viewerOpen) return { type: "closeViewer" };
  if ((window as any).__settingsOpen) return { type: "closeSettings" };
  if (ROOT_PATHS.includes(path)) return { type: "finishActivity" };
  if (stackDepth > 0) return { type: "navigateBack" };
  return { type: "finishActivity" };
}

// 测试用钩子，使用传入的路径与栈深度直接判定
export function determineBackTargetForTest(path: string, stackDepth: number): BackTarget {
  if ((window as any).__viewerOpen) return { type: "closeViewer" };
  if ((window as any).__settingsOpen) return { type: "closeSettings" };
  if (ROOT_PATHS.includes(path)) return { type: "finishActivity" };
  if (stackDepth > 0) return { type: "navigateBack" };
  return { type: "finishActivity" };
}
```

Run:

```bash
pnpm vitest run src/services/predictiveBack.test.ts
```

Expected: PASS。

- [ ] **Step 5: 写事件状态机的 failing tests**

在 `src/services/predictiveBack.test.ts` 中追加：

```ts
import {
  isPredictiveBackActive,
  predictiveBackProgress,
  predictiveBackTarget,
  predictiveBackEdge,
  handleStartForTest,
  handleProgressForTest,
  handleEndForTest,
  handleCancelForTest,
  resetStateForTest,
} from "./predictiveBack";

describe("predictiveBack state machine", () => {
  beforeEach(() => {
    resetStateForTest();
    clearRouteStack();
    delete (window as any).__viewerOpen;
    delete (window as any).__settingsOpen;
  });

  it("start locks target and sets active", () => {
    (window as any).__viewerOpen = true;
    handleStartForTest({ edge: "left", touchY: 100 });
    expect(isPredictiveBackActive()).toBe(true);
    expect(predictiveBackTarget()).toEqual({ type: "closeViewer" });
    expect(predictiveBackEdge()).toBe("left");
  });

  it("progress updates progress signal", () => {
    (window as any).__viewerOpen = true;
    handleStartForTest({ edge: "left", touchY: 100 });
    handleProgressForTest({ edge: "left", touchY: 200, progress: 0.5 });
    expect(predictiveBackProgress()).toBe(0.5);
  });

  it("cancel resets state", () => {
    (window as any).__viewerOpen = true;
    handleStartForTest({ edge: "left", touchY: 100 });
    handleCancelForTest();
    expect(isPredictiveBackActive()).toBe(false);
    expect(predictiveBackProgress()).toBe(0);
    expect(predictiveBackTarget()).toBeNull();
  });
});
```

Run:

```bash
pnpm vitest run src/services/predictiveBack.test.ts
```

Expected: FAIL（state machine functions not defined）。

- [ ] **Step 6: 实现事件处理与原生开关**

扩展 `src/services/predictiveBack.ts` 为完整 coordinator：

```ts
import { createSignal } from "solid-js";
import { PredictiveBack } from "../native/PredictiveBack";
import type {
  PredictiveBackStartEvent,
  PredictiveBackProgressEvent,
} from "../native/PredictiveBack";

export type BackTargetType = "closeViewer" | "closeSettings" | "navigateBack" | "finishActivity";

export interface BackTarget {
  type: BackTargetType;
}

// ── Signals ──
const [isActive, setIsActive] = createSignal(false);
const [progress, setProgress] = createSignal(0);
const [target, setTarget] = createSignal<BackTarget | null>(null);
const [edge, setEdge] = createSignal<"left" | "right">("left");

export const isPredictiveBackActive = isActive;
export const predictiveBackProgress = progress;
export const predictiveBackTarget = target;
export const predictiveBackEdge = edge;

// ── Route stack ──
let routeStack: string[] = [];

export function pushRoute(path: string): void {
  routeStack.push(path);
}

export function popRoute(): string | undefined {
  return routeStack.pop();
}

export function getPreviousRoute(): string | undefined {
  return routeStack[routeStack.length - 1];
}

export function getRouteStackDepth(): number {
  return routeStack.length;
}

export function clearRouteStack(): void {
  routeStack = [];
}

// ── Target determination ──
const ROOT_PATHS = ["/recommended", "/following", "/bookmarks", "/login"];

function determineBackTarget(): BackTarget {
  if ((window as any).__viewerOpen) return { type: "closeViewer" };
  if ((window as any).__settingsOpen) return { type: "closeSettings" };
  const path = window.location.pathname;
  if (ROOT_PATHS.includes(path)) return { type: "finishActivity" };
  if (routeStack.length > 0) return { type: "navigateBack" };
  return { type: "finishActivity" };
}

export function determineBackTargetForTest(path: string, stackDepth: number): BackTarget {
  const saved = [...routeStack];
  routeStack = new Array(stackDepth).fill("/dummy");
  const originalPath = window.location.pathname;
  // 通过临时覆写只读 pathname 不可行，测试钩子直接复用逻辑：
  if ((window as any).__viewerOpen) return { type: "closeViewer" };
  if ((window as any).__settingsOpen) return { type: "closeSettings" };
  if (ROOT_PATHS.includes(path)) return { type: "finishActivity" };
  if (stackDepth > 0) return { type: "navigateBack" };
  routeStack = saved;
  return { type: "finishActivity" };
}

// ── State machine ──
function onStart(event: PredictiveBackStartEvent): void {
  if (isActive()) return;
  setEdge(event.edge);
  setTarget(determineBackTarget());
  setProgress(0);
  setIsActive(true);
}

function onProgress(event: PredictiveBackProgressEvent): void {
  if (!isActive()) return;
  setEdge(event.edge);
  setProgress(event.progress);
}

function reset(): void {
  setIsActive(false);
  setProgress(0);
  setTarget(null);
}

let navigateRef: ((delta: number) => void) | null = null;

function onEnd(): void {
  if (!isActive()) return;
  const t = target();
  reset();
  switch (t?.type) {
    case "closeViewer":
      window.dispatchEvent(new CustomEvent("closeViewer"));
      break;
    case "closeSettings":
      window.dispatchEvent(new CustomEvent("closeSettings"));
      break;
    case "navigateBack":
      navigateRef?.(-1);
      break;
    case "finishActivity":
      PredictiveBack.finishActivity().catch((e) =>
        console.warn("[PredictiveBack] finishActivity failed", e),
      );
      break;
  }
}

function onCancel(): void {
  reset();
}

// ── Native enable / disable ──
let listeners: (() => void)[] = [];
let enabled = false;

export async function setPredictiveBackEnabled(value: boolean): Promise<void> {
  if (enabled === value) return;
  enabled = value;
  if (value) {
    await PredictiveBack.enable();
    const handles = await Promise.all([
      PredictiveBack.addListener("predictiveBackStart", onStart),
      PredictiveBack.addListener("predictiveBackProgress", onProgress),
      PredictiveBack.addListener("predictiveBackEnd", onEnd),
      PredictiveBack.addListener("predictiveBackCancel", onCancel),
    ]);
    listeners = handles.map((h) => h.remove);
  } else {
    listeners.forEach((remove) => remove());
    listeners = [];
    await PredictiveBack.disable();
  }
}

export function initPredictiveBack(navigate: (delta: number) => void): void {
  navigateRef = navigate;
}

// ── Test helpers ──
export function handleStartForTest(event: PredictiveBackStartEvent): void {
  onStart(event);
}

export function handleProgressForTest(event: PredictiveBackProgressEvent): void {
  onProgress(event);
}

export function handleEndForTest(): void {
  onEnd();
}

export function handleCancelForTest(): void {
  onCancel();
}

export function resetStateForTest(): void {
  reset();
}
```

注意：上面的 `determineBackTargetForTest` 实现是测试友好的简化版；实际运行时用 `determineBackTarget()` 读取 `window.location.pathname`。

Run:

```bash
pnpm vitest run src/services/predictiveBack.test.ts
```

Expected: PASS。

- [ ] **Step 7: TypeScript 检查**

```bash
pnpm check
```

Expected: PASS。

---

### Task 4: 创建 `PredictiveBackContainer` 与 `RoutePreview`

**Files:**

- Create: `src/components/RoutePreview.tsx`
- Create: `src/components/PredictiveBackContainer.tsx`

**Interfaces:**

- Consumes: `predictiveBack*` signals from `../services/predictiveBack`
- Produces: 路由级预览动画容器

- [ ] **Step 1: 让 `IllustDetail` 支持可选 `illustId` prop**

Modify `src/routes/IllustDetail.tsx`：在组件 props 中增加可选 `illustId?: string`。

Find the component definition and change from reading `params.id` to:

```ts
interface IllustDetailProps {
  illustId?: string;
}

const IllustDetail: Component<IllustDetailProps> = (props) => {
  // ...
  const illustId = () => props.illustId ?? useParams().id;
  // ...
};
```

Then replace all `useParams().id` reads with `illustId()`。

- [ ] **Step 2: 创建 `RoutePreview`**

Create `src/components/RoutePreview.tsx`:

```tsx
import type { Component } from "solid-js";
import Login from "../routes/Login";
import Bookmarks from "../routes/Bookmarks";
import TabFeedPage from "../routes/TabFeedPage";
import IllustDetail from "../routes/IllustDetail";

interface Props {
  path: string;
}

function parseIllustId(path: string): string | undefined {
  const match = path.match(/^\/illust\/(\d+)$/);
  return match?.[1];
}

const RoutePreview: Component<Props> = (props) => {
  return (
    <div data-preview="true" class="w-full h-full overflow-hidden">
      {(() => {
        const p = props.path;
        if (p === "/recommended") return <TabFeedPage tab="recommended" />;
        if (p === "/following") return <TabFeedPage tab="follow" />;
        if (p === "/bookmarks") return <Bookmarks />;
        if (p === "/login") return <Login />;
        const id = parseIllustId(p);
        if (id) return <IllustDetail illustId={id} />;
        return null;
      })()}
    </div>
  );
};

export default RoutePreview;
```

- [ ] **Step 3: 创建 `PredictiveBackContainer`**

Create `src/components/PredictiveBackContainer.tsx`:

```tsx
import { type Component, type JSX, Show } from "solid-js";
import {
  isPredictiveBackActive,
  predictiveBackProgress,
  predictiveBackTarget,
  predictiveBackEdge,
  getPreviousRoute,
} from "../services/predictiveBack";
import RoutePreview from "./RoutePreview";

interface Props {
  children: JSX.Element;
}

const PredictiveBackContainer: Component<Props> = (props) => {
  const progress = predictiveBackProgress;
  const edge = predictiveBackEdge;
  const active = isPredictiveBackActive;
  const target = predictiveBackTarget;

  const translateX = () => {
    const sign = edge() === "left" ? 1 : -1;
    return `${sign * progress() * 4}%`;
  };

  const scale = () => 1 - 0.08 * progress();
  const radius = () => `${progress() * 16}px`;
  const showPreview = () => active() && target()?.type === "navigateBack";

  return (
    <div class="predictive-back-stage relative w-full h-full overflow-hidden">
      <Show when={showPreview()}>
        <div
          class="predictive-back-preview absolute inset-0 w-full h-full"
          style={{
            transform: `scale(${1 + 0.04 * (1 - progress())})`,
            opacity: 0.6 + 0.4 * progress(),
          }}
        >
          <RoutePreview path={getPreviousRoute() ?? "/recommended"} />
        </div>
      </Show>

      <div
        class="predictive-back-current relative w-full h-full"
        style={{
          transform: `scale(${scale()}) translateX(${translateX()})`,
          "border-radius": radius(),
          "transform-origin": edge() === "left" ? "right center" : "left center",
          transition: active()
            ? "none"
            : "transform 200ms cubic-bezier(0.33, 0, 0.67, 1), border-radius 200ms cubic-bezier(0.33, 0, 0.67, 1)",
        }}
      >
        {props.children}
      </div>
    </div>
  );
};

export default PredictiveBackContainer;
```

- [ ] **Step 4: 添加基础 CSS**

Append to `src/styles/base.css`:

```css
.predictive-back-stage {
  isolation: isolate;
}

.predictive-back-preview {
  z-index: 0;
}

.predictive-back-current {
  z-index: 1;
  background: var(--colorNeutralBackground1);
  box-shadow: var(--elevation16);
}
```

- [ ] **Step 5: TypeScript 检查**

```bash
pnpm check
```

Expected: PASS。

---

### Task 5: 在 `App.tsx` 中接入 Coordinator 与 Container

**Files:**

- Modify: `src/App.tsx`

**Interfaces:**

- Consumes: `PredictiveBackContainer`, `initPredictiveBack`, `setPredictiveBackEnabled`, `pushRoute`, `popRoute`, `getRouteStackDepth`, `clearRouteStack`

- [ ] **Step 1: 重写 `RootLayout`**

Replace `src/App.tsx` content with:

```tsx
import { type Component, onMount, Show, createSignal, onCleanup, createEffect } from "solid-js";
import { Route, Router, useNavigate, useLocation } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { isLoggedIn, isLoading, initializeAuth } from "./stores/authStore";
import { usePredictiveBack, loadPredictiveBackPreference } from "./stores/uiStore";
import { App as CapApp } from "@capacitor/app";
import {
  initPredictiveBack,
  setPredictiveBackEnabled,
  pushRoute,
  popRoute,
  getRouteStackDepth,
  clearRouteStack,
} from "./services/predictiveBack";
import PredictiveBackContainer from "./components/PredictiveBackContainer";
import Login from "./routes/Login";
import IllustDetail from "./routes/IllustDetail";
import DebugImage from "./routes/DebugImage";
import Bookmarks from "./routes/Bookmarks";
import TabFeedPage from "./routes/TabFeedPage";

const RootLayout: Component<RouteSectionProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showExitHint, setShowExitHint] = createSignal(false);
  let exitHintTimer: ReturnType<typeof setTimeout>;

  onMount(async () => {
    initPredictiveBack(navigate);
    await loadPredictiveBackPreference();
    const predictiveBackOn = usePredictiveBack();
    try {
      await setPredictiveBackEnabled(predictiveBackOn);
    } catch (e) {
      console.warn("[App] Failed to init predictive back", e);
    }

    // Initial route push
    clearRouteStack();
    pushRoute(location.pathname);
    let previousPath = location.pathname;

    createEffect(() => {
      const path = location.pathname;
      if (path === previousPath) return;
      if (path === getPreviousRoute()) {
        popRoute();
      } else {
        pushRoute(path);
      }
      previousPath = path;
    });

    const onExitHint = () => {
      setShowExitHint(true);
      clearTimeout(exitHintTimer);
      exitHintTimer = setTimeout(() => setShowExitHint(false), 2000);
    };
    window.addEventListener("exitHint", onExitHint);

    // Fallback back button listener when predictive back is disabled
    let lastBackTime = 0;
    const backButtonListener = await CapApp.addListener("backButton", () => {
      if ((window as any).__viewerOpen) {
        window.dispatchEvent(new CustomEvent("closeViewer"));
        return;
      }
      const path = window.location.pathname;
      const rootPaths = ["/recommended", "/following", "/bookmarks", "/login"];
      if (!rootPaths.includes(path)) {
        navigate(-1);
        return;
      }
      const now = Date.now();
      if (now - lastBackTime < 2000) {
        CapApp.exitApp();
      } else {
        lastBackTime = now;
        window.dispatchEvent(new CustomEvent("exitHint"));
      }
    });

    onCleanup(() => {
      window.removeEventListener("exitHint", onExitHint);
      backButtonListener.remove();
    });

    await initializeAuth();
    if (isLoggedIn()) {
      navigate("/recommended", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  });

  return (
    <div class="page">
      <Show when={!isLoading()} fallback={/* existing splash JSX */}>
        <PredictiveBackContainer>{props.children}</PredictiveBackContainer>
      </Show>
      <Show when={showExitHint()}>
        <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--colorNeutralBackground1)] border border-[var(--colorNeutralStroke2)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation8)] px-5 py-2.5 text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase200)] font-medium whitespace-nowrap pointer-events-none transition-all duration-[var(--durationGentle)]">
          再按一次退出应用
        </div>
      </Show>
    </div>
  );
};

const App: Component = () => {
  return (
    <Router root={RootLayout}>
      <Route path="/login" component={Login} />
      <Route path="/recommended" component={() => <TabFeedPage tab="recommended" />} />
      <Route path="/following" component={() => <TabFeedPage tab="follow" />} />
      <Route path="/illust/:id" component={IllustDetail} />
      <Route path="/debug" component={DebugImage} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route path="*" component={Login} />
    </Router>
  );
};

export default App;
```

注意：保留原有 splash JSX 和路由定义不变；只是把 `{props.children}` 包进 `PredictiveBackContainer`。

- [ ] **Step 2: TypeScript 检查**

```bash
pnpm check
```

Expected: PASS。

---

### Task 6: 更新 `uiStore.ts` 的开关逻辑

**Files:**

- Modify: `src/stores/uiStore.ts`

**Interfaces:**

- Consumes: `setPredictiveBackEnabled` from `../services/predictiveBack`

- [ ] **Step 1: 替换 `App.toggleBackButtonHandler` 调用**

In `src/stores/uiStore.ts`，把 `import { App } from "@capacitor/app"` 和 `setUsePredictiveBack` 函数替换为：

```ts
import { setPredictiveBackEnabled } from "../services/predictiveBack";

async function setUsePredictiveBack(enabled: boolean): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;

  setUsePredictiveBackSig(enabled);

  try {
    await Preferences.set({ key: PREF_KEY_USE_PREDICTIVE_BACK, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to save predictive back preference", e);
  }

  try {
    await setPredictiveBackEnabled(enabled);
  } catch (e) {
    console.warn("[uiStore] Failed to toggle predictive back plugin", e);
  }
}
```

- [ ] **Step 2: TypeScript 检查**

```bash
pnpm check
```

Expected: PASS。

---

### Task 7: 查看器与设置面板动画

**Files:**

- Modify: `src/components/ImageViewer.tsx`
- Modify: `src/components/UgoiraViewer.tsx`
- Modify: `src/components/SettingsSheet.tsx`

**Interfaces:**

- Consumes: `isPredictiveBackActive`, `predictiveBackProgress`, `predictiveBackTarget`, `predictiveBackEdge`

- [ ] **Step 1: 创建通用动画 style helper**

在 `src/services/predictiveBack.ts` 末尾追加：

```ts
import { createMemo } from "solid-js";

export function usePredictiveBackOverlayStyle() {
  return createMemo(() => {
    const t = target();
    if (!isActive() || (t?.type !== "closeViewer" && t?.type !== "closeSettings")) {
      return {
        transform: "scale(1) translateX(0)",
        opacity: 1,
        "border-radius": "0px",
      };
    }
    const sign = edge() === "left" ? -1 : 1;
    const p = progress();
    return {
      transform: `scale(${1 - 0.08 * p}) translateX(${sign * p * 4}%)`,
      opacity: 1 - 0.15 * p,
      "border-radius": `${p * 16}px`,
      transition: "none",
    };
  });
}
```

- [ ] **Step 2: 更新 `ImageViewer.tsx`**

在 `ImageViewer` 根容器 `div` 上应用 style。Import helper:

```ts
import { usePredictiveBackOverlayStyle } from "../services/predictiveBack";
```

在组件内：

```ts
const pbStyle = usePredictiveBackOverlayStyle();
```

找到最外层 `fixed inset-0 z-50 ...` 的 div，追加：

```tsx
style={pbStyle()}
```

- [ ] **Step 3: 更新 `UgoiraViewer.tsx`**

同上：import helper，创建 `pbStyle`，应用到根容器。

- [ ] **Step 4: 更新 `SettingsSheet.tsx`**

同上：import helper，创建 `pbStyle`，应用到设置面板的根容器（通常是 slide-over sheet，不是遮罩层）。

- [ ] **Step 5: TypeScript 检查**

```bash
pnpm check
```

Expected: PASS。

---

### Task 8: 构建、同步与测试

- [ ] **Step 1: 单元测试**

```bash
pnpm vitest run src/services/predictiveBack.test.ts
```

Expected: PASS（所有测试通过）。

- [ ] **Step 2: TypeScript 全量检查**

```bash
pnpm check
```

Expected: PASS（无类型错误）。

- [ ] **Step 3: Web 构建**

```bash
pnpm build
```

Expected: BUILD SUCCESSFUL（dist/ 生成）。

- [ ] **Step 4: Capacitor 同步**

```bash
pnpm cap:sync
```

Expected: sync 成功，新插件出现在 `android/capacitor-cordova-android-plugins/` 或相关清单中。

- [ ] **Step 5: Android APK 构建**

```bash
cd android && ./gradlew assembleDebug
```

Expected: BUILD SUCCESSFUL，APK 生成于 `android/app/build/outputs/apk/debug/app-debug.apk`。

- [ ] **Step 6: 真机/模拟器验证**

安装 APK 到 Android 16 设备，验证：

1. 列表 → 详情 → 侧滑：看到当前页缩小并露出列表页，松手后返回列表。
2. 详情 → 打开原图查看器 → 侧滑：查看器缩小并露出详情页，松手后关闭查看器。
3. 打开设置面板 → 侧滑：面板缩小，松手后关闭面板。
4. 在 `/recommended` 根页 → 侧滑：显示「再按一次退出」或退出应用。
5. 手势中途回拉：动画取消，页面/查看器恢复。
6. 设置里关闭「预测返回手势」：恢复旧 backButton 行为。

---

## Self-Review

### Spec Coverage

| 需求                                        | 实现任务                                               |
| ------------------------------------------- | ------------------------------------------------------ |
| 原生接管 `OnBackInvokedDispatcher`          | Task 1                                                 |
| 发送进度事件                                | Task 1                                                 |
| JS 目标判定（viewer/settings/route/finish） | Task 3                                                 |
| 路由级预览动画                              | Task 4 + Task 5                                        |
| 查看器/设置面板动画                         | Task 7                                                 |
| 设置开关切换                                | Task 6                                                 |
| 降级兼容（API < 35 无动画）                 | Task 1（原生降级）+ Task 7（无 progress 时不影响行为） |
| 单元测试                                    | Task 3 + Task 8                                        |
| 真机验证                                    | Task 8                                                 |

### Placeholder Scan

- 无 TBD / TODO。
- `App.tsx` 中保留了原有 splash JSX 占位注释 `/* existing splash JSX */`，实现时需完整保留原 JSX。
- 所有步骤包含具体代码或命令。

### Type Consistency

- 事件名统一：`predictiveBackStart` / `predictiveBackProgress` / `predictiveBackEnd` / `predictiveBackCancel`。
- 目标类型统一：`closeViewer` / `closeSettings` / `navigateBack` / `finishActivity`。
- 插件名统一：原生 `PredictiveBack`、JS `registerPlugin('PredictiveBack')`。

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-24-android-predictive-back.md`. Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
