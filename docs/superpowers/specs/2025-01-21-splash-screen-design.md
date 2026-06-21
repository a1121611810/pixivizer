# Pixivizer 启动画面设计

## 概述

将 App 启动时显示的「启动中...」LoadingSpinner 替换为更简洁干净的 Fluent Design 风格启动画面：ProgressRing + 低对比度应用名称。

## 当前状态

- `src/App.tsx:69`：`<Show when={!isLoading()} fallback={<LoadingSpinner text="启动中..." />}>`
- `LoadingSpinner` 组件在加载完成前全屏居中显示旋转环 + 文字
- `isLoading` 由 `src/stores/authStore.ts` 控制，auth 恢复完成后置为 false
- 加载时间通常很短（仅一次 token 刷新请求）

## 设计

### 布局

```
┌──────────────────────────┐
│                          │
│       (page 背景)         │
│                          │
│          ◌               │  ProgressRing (md / 32px)
│                          │
│       Pixivizer          │  12px Caption, 低对比度
│                          │
└──────────────────────────┘
```

- **容器**：`flex flex-col items-center justify-center`，填满整个 `.page` 区域
- **旋转环**：使用现有 `spinner` shortcut（UnoCSS），`md` 尺寸（32px），品牌色顶边 `colorBrandStroke1`
- **文字**："Pixivizer"，`fontSizeBase200`（12px）+ `colorNeutralForegroundDisabled`，`fontWeightRegular`
- **间距**：环与文字之间 `gap-3`（12px）
- **背景**：由外层 `page` shortcut 提供 `colorNeutralBackground3`

### 动效

| 元素     | 动画            | 时长  | 曲线                 | 延迟  |
| -------- | --------------- | ----- | -------------------- | ----- |
| 容器整体 | `opacity 0 → 1` | 200ms | `curveDecelerateMid` | 0     |
| 文字     | `opacity 0 → 1` | 200ms | `curveDecelerateMid` | 300ms |

- 容器 fade-in 让启动画面平滑出现（避免突兀闪现）
- 文字 300ms 延迟：若 auth 恢复快于 300ms，文字不会出现，用户只看到安静的环闪过
- `curveDecelerateMid` = `cubic-bezier(0,0,0,1)` — Fluent exit/decelerate 曲线

### 初始状态

- 容器初始 `opacity: 0`，通过 CSS animation 或 SolidJS `onMount` 触发
- 由于 splash 仅在 `isLoading=true` 时渲染，最简单的方式是用 CSS `@keyframes` 定义 fade-in 动画，组件挂载时自动播放

### 实现范围

不修改 `LoadingSpinner` 组件（它仍用于 Feed 底部加载等场景）。在 `App.tsx` 的 `<Show fallback>` 中直接内联 splash 布局。改动仅涉及：

1. `src/App.tsx`：替换 fallback 内容为新的 splash 布局
2. `src/styles/base.css`：添加 splash fade-in 关键帧动画（或使用 UnoCSS animate 缩写）

## 交互状态

| 状态     | 行为                                               |
| -------- | -------------------------------------------------- |
| 显示中   | 环持续旋转，文字淡入后静态显示                     |
| 加载完成 | 整个 splash 随 `<Show>` 条件切换消失，进入路由内容 |

## 暗色主题

所有值使用 CSS 变量，暗色主题自动适配。`colorNeutralBackground3` 在暗色下为 `#141414`，`colorNeutralForegroundDisabled` 为 `#5c5c5c`，对比度一致。
