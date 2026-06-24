# Android 16 预测性返回手势修复设计

## 背景与问题

当前实现已在 `AndroidManifest.xml` 中开启 `android:enableOnBackInvokedCallback="true"`，并在设置页提供「预测返回手势」开关。但实际打包到 Android 16 真机后，侧滑返回会导致应用直接最小化（Activity 被 finish），而不是返回列表或关闭查看器。

根本原因：`@capacitor/app` 的 `App.toggleBackButtonHandler({ enabled: false })` 只禁用了 Capacitor 自己的 `OnBackPressedCallback`。在 Android 16 上，系统把侧滑交给 `OnBackInvokedDispatcher`；由于我们没有注册 `OnBackInvokedCallback`，系统 fallback 是默认行为——直接 finish Activity。

## 目标

1. 修复行为：Android 16 侧滑返回时，应用自己决定是「关闭查看器/设置面板」「返回上一页」还是「退出应用」。
2. 提供自定义预览动画：侧滑过程中，当前页面/浮层随手指缩放/位移，露出目标页面，而不是显示系统默认的「返回桌面」预览。
3. 保持非 Android 16 设备原有行为不变。

## 总体架构

新增自定义 Capacitor 插件 `PredictiveBackPlugin`，完全接管 Android 的 `OnBackInvokedDispatcher`。原生层只负责「报告手势」，业务决策全部放在 JS 侧。

数据流：

1. 用户在详情页/查看器侧滑。
2. 原生 `PredictiveBackPlugin` 的 `OnBackInvokedCallback` 被触发，通过 `OnBackAnimationCallback`（Android 15+，API 35+，项目 compileSdk=36 可用）监听进度。
3. 插件向 JS 发送事件：
   - `predictiveBackStart`
   - `predictiveBackProgress({ progress: number, swipeEdge: 'left' | 'right' })`
   - `predictiveBackEnd`
   - `predictiveBackCancel`
4. JS 侧 `PredictiveBackCoordinator` 订阅事件，根据当前状态决定目标动作。
5. 动画层根据 `progress` 实时对「当前层」做缩放/位移，对「目标预览层」做反向缩放/淡入。

关键原则：

- 原生插件不判断业务，只暴露手势事件和一个 `finishActivity()` 方法。
- 业务逻辑集中在 `App.tsx` 附近，避免分散。
- 动画实现为纯 CSS transform，JS 只更新 CSS 变量或 style。

## 原生插件 `PredictiveBackPlugin`

文件：`android/app/src/main/java/com/pixivizer/app/PredictiveBackPlugin.java`

### 生命周期

- `load()`：保存 `Activity` 引用，但不自动注册手势监听；由 JS 显式调用 `enable()` 开启。
- JS 调用 `enable()` 时：
  - `Build.VERSION.SDK_INT >= 33` 才注册 `OnBackInvokedCallback`。
  - Android 15+（API 35+）使用 `OnBackAnimationCallback` 获取进度；否则降级为普通 `OnBackInvokedCallback`，只能收到 `onBackInvoked()`。
- JS 调用 `disable()` 时注销回调。
- 提供 `finishActivity()` PluginMethod：在根页且用户确认退出时调用 `activity.finish()`。

### 事件格式

| 事件名                   | payload                                                         | 触发时机               |
| ------------------------ | --------------------------------------------------------------- | ---------------------- |
| `predictiveBackStart`    | `{ edge: 'left' \| 'right', touchY: number }`                   | 手指开始侧滑           |
| `predictiveBackProgress` | `{ progress: number, edge: 'left' \| 'right', touchY: number }` | 手指移动，progress 0→1 |
| `predictiveBackEnd`      | `{}`                                                            | 手指松开并触发返回     |
| `predictiveBackCancel`   | `{}`                                                            | 手指回拉取消返回       |

- 优先级：`PRIORITY_DEFAULT`。
- `edge` 由 `BackEvent.getSwipeEdge()` 转换：`EDGE_LEFT` → `'left'`，`EDGE_RIGHT` → `'right'`。
- `progress` 由 `onBackProgressed` 回调直接提供；降级模式下不发送 `predictiveBackProgress`。

### 注册

Capacitor 的 `cap sync` 会覆盖 `android/app/src/main/assets/capacitor.plugins.json`，因此本地自定义插件不通过该 JSON 注册。改为在 `MainActivity.onCreate()` 中、调用 `super.onCreate()` **之前**注册：

```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    registerPlugin(PredictiveBackPlugin.class);
    super.onCreate(savedInstanceState);
}
```

`AndroidManifest.xml` 已开启 `android:enableOnBackInvokedCallback="true"`，无需改动。

## JS 协调器 `PredictiveBackCoordinator`

文件：`src/services/predictiveBack.ts`

### 状态

Solid signals：

- `isPredictiveBackActive()`：手势是否进行中。
- `predictiveBackProgress()`：0 → 1。
- `predictiveBackTarget()`：本次手势目标动作。

### 导航栈维护

- 监听 `useLocation().pathname` 变化。
- 前进时把 `{ path, params }` 压栈。
- 调用 `navigate(-1)` 返回时出栈。
- 栈顶即为返回目标路径与参数。

### 手势目标判定

按优先级：

1. `window.__viewerOpen` → 关闭查看器（分发 `closeViewer` 事件）。
2. `window.__settingsOpen` → 关闭设置面板（分发 `closeSettings` 事件）。
3. 当前路径为 `/illust/:id` 且栈非空 → `navigate(-1)`。
4. 当前路径为 `/recommended` / `/following` / `/bookmarks` / `/login` → 调用原生 `finishActivity()` 退出应用。
5. 兜底 → `navigate(-1)`。

### 事件处理

- `predictiveBackStart`：锁定 `target`，设置 `isActive(true)`。
- `predictiveBackProgress`：更新 `progress()`。
- `predictiveBackEnd`：执行目标动作，然后重置状态。
- `predictiveBackCancel`：重置状态，不执行动作。

### 原生开关

- `setPredictiveBackEnabled(true)`：注册插件监听器并调用插件 `enable()`。
- `setPredictiveBackEnabled(false)`：注销监听器并调用插件 `disable()`，恢复 `@capacitor/app` 的 `backButton` 监听。

## 路由级预览动画

新增/修改：`src/App.tsx` 中包裹 `Routes` 的 `PredictiveBackContainer`。

渲染结构：

```tsx
<div class="predictive-back-stage">
  <div
    class="predictive-back-preview"
    classList={{ visible: isActive() && target()?.type === "navigateBack" }}
  >
    <RoutePreview path={previousPath()} params={previousParams()} />
  </div>
  <div
    class="predictive-back-current"
    style={{
      transform: `scale(${1 - 0.08 * progress()}) translateX(${edgeSign() * progress() * 4}%)`,
      "border-radius": `${progress() * 16}px`,
    }}
  >
    <Routes>...</Routes>
  </div>
</div>
```

### `RoutePreview`

- 接收目标路径、参数和路由专属 props，根据路由映射渲染对应组件：
  - `/recommended` → `TabFeedPage tab="recommended"`
  - `/following` → `TabFeedPage tab="follow"`
  - `/bookmarks` → `Bookmarks`
  - `/illust/:id` → `IllustDetail`
  - `/login` → `Login`
- 路由栈中需保存足够信息以重建这些 props（如 `tab`、路径参数 `id`）。
- 渲染时标记 `data-preview="true"`，组件内部可据此跳过滚动恢复、懒加载等首屏优化逻辑。
- 使用 Solid `Suspense` 做骨架屏占位，避免预览层白屏。
- 只在 `isPredictiveBackActive() && target()?.type === 'navigateBack'` 时渲染。

### 动画参数

- 当前页：`scale(1)` → `scale(0.92)`；left edge 时 `translateX(0)` → `translateX(4%)`，right edge 时 `translateX(0)` → `translateX(-4%)`；圆角 `0` → `16px`。
- 预览层：`scale(1.04) opacity(0.6)` → `scale(1) opacity(1)`。
- 曲线：Fluent `cubic-bezier(0.33, 0, 0.67, 1)`。
- 通过 CSS `transition` 驱动；JS 只更新 `--pb-progress` 或直接内联 style。

## 查看器/设置面板预览动画

查看器和设置面板本身是全屏浮层，盖在当前页之上，因此不需要额外预览层。

- 手势目标为 `closeViewer` 或 `closeSettings` 时，对当前浮层根容器做 transform：
  - `scale(1)` → `scale(0.92)`
  - `opacity(1)` → `opacity(0.85)`
  - 向侧滑边缘方向位移：left edge 时 `translateX(-4%)`，right edge 时 `translateX(4%)`
- 底部自然露出 `IllustDetail` 或 `TabFeedPage`。
- `predictiveBackEnd` 触发时调用 `props.onClose()` 或分发 `closeViewer` / `closeSettings` 事件。

涉及文件：

- `src/components/ImageViewer.tsx`
- `src/components/UgoiraViewer.tsx`
- `src/components/SettingsSheet.tsx`

## 错误处理与边界情况

- **降级无进度事件**：API 34 及以下（或 `OnBackAnimationCallback` 不可用）时，插件退化为普通 `OnBackInvokedCallback`，只触发 `predictiveBackEnd`。JS 看不到进度，但仍能正确返回/关闭。
- **手势冲突**：查看器内部横向翻页远离屏幕边缘，不会与边缘侧滑返回冲突；由系统识别边缘手势。
- **快速连续侧滑**：`isActive()` 为 true 时忽略新的 `predictiveBackStart`。
- **JS 未注册**：原生插件独立存在，即使 JS 未处理事件，也不会让系统直接 finish Activity。
- **设置开关动态切换**：关闭预测返回时，插件 `disable()` 注销原生回调，同时重新启用 `@capacitor/app` 的 `backButton` 监听。
- **MainActivity WebViewClient**：`MainActivity` 已包装 `WebViewClient` 做图片代理；插件实现不得覆盖该 client。

## 测试方案

### 单元测试（Vitest）

- `predictiveBack.ts` 导航栈：前进压栈、返回出栈、根页判定。
- 目标判定：`__viewerOpen` / `__settingsOpen` / `/illust/:id` / 根页 各场景。
- 状态机：`start → progress → end / cancel` 转换与 signal 更新。

### 真机/模拟器集成测试

在 Android 16 设备上验证：

- 详情页侧滑 → 返回列表，不最小化。
- 图片查看器侧滑 → 关闭查看器，不最小化。
- 设置面板侧滑 → 关闭面板。
- 根页侧滑 → 退出应用。
- 手势中途回拉 → 页面/查看器恢复原状。
- 关闭设置开关后 → 恢复旧的 `backButton` 行为。

## 改动文件清单

新增：

- `android/app/src/main/java/com/pixivizer/app/PredictiveBackPlugin.java`
- `src/services/predictiveBack.ts`
- `src/components/PredictiveBackContainer.tsx`（或合并进 `App.tsx`）

修改：

- `src/App.tsx`
- `src/stores/uiStore.ts`
- `src/components/ImageViewer.tsx`
- `src/components/UgoiraViewer.tsx`
- `src/components/SettingsSheet.tsx`
- `android/app/src/main/assets/capacitor.plugins.json`

## 后续步骤

1. 按本文档实现原生插件和 JS 协调器。
2. 接入路由和浮层动画。
3. 运行单元测试与真机验证。
4. 如性能或实现复杂度超出预期，可考虑将「路由级预览层」降级为「仅当前页缩放 + 模糊背景」，保留行为正确性。
