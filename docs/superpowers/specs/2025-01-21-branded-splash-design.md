# Pixivizer Branded Splash 设计

## 概述

将当前 ProgressRing + "Pixivizer" 文字的启动画面，升级为类似 Windows 11 / Microsoft 365 Fluent 应用的品牌化启动画面：大图标 + 标题 + 副标题 + 可选延迟 ProgressRing。

## 当前状态

- `src/App.tsx`：splash 显示 32px ProgressRing + "Pixivizer" 文字，各自 fade-in
- `src/styles/base.css`：已定义 `splash-fade-in`、`fluent-scale-enter` 关键帧
- `uno.config.ts`：`spinner` shortcut 已修复为 `[border-width:var(--strokeWidthThicker)]`

## 设计

### 布局

```
┌──────────────────────────┐
│                          │
│         🖼️               │  64×64px Fluent image icon
│                          │
│      Pixivizer           │  标题
│                          │
│   Pixiv 第三方客户端       │  副标题
│                          │
│           ◌              │  16px ProgressRing (延迟 500ms)
│                          │
└──────────────────────────┘
```

- **容器**：`flex flex-col items-center justify-center min-h-screen gap-4`（标题离 icon 16px）
- **Icon 区**：64×64px SVG，`colorBrandForeground1` 品牌色
- **标题区**：标题 + 副标题 `gap-1`（4px），紧贴 title 下方
- **ProgressRing**：16px 直径，与品牌区用 `mt-6` 或 `mt-auto` 分离，延迟 500ms 显示

### 排版

| 元素         | 字号                      | 字重     | 颜色                             |
| ------------ | ------------------------- | -------- | -------------------------------- |
| 标题         | `fontSizeBase600`（24px） | Semibold | `colorNeutralForeground1`        |
| 副标题       | `fontSizeBase200`（12px） | Regular  | `colorNeutralForegroundDisabled` |
| ProgressRing | 16px                      | —        | `spinner` shortcut               |

### 图标

- 来源：复用项目中已有的 Fluent `image` icon SVG（`SettingsSheet.tsx` 中定义）
- Icon 语义：山脉 + 太阳 = 图像/图库，与 Pixiv 插画平台天然契合
- 放大到 64px，颜色 `colorBrandForeground1`
- 实现方式：直接内联 SVG path，不引入额外依赖

### 动效

| 元素         | 动画                                   | 时长  | 曲线                 | 延迟  |
| ------------ | -------------------------------------- | ----- | -------------------- | ----- |
| Icon         | `fluent-scale-enter`（opacity+scale）  | 200ms | `curveDecelerateMid` | 0     |
| 标题         | `splash-fade-in` + `translateY(4px→0)` | 200ms | `curveDecelerateMid` | 100ms |
| 副标题       | 同上                                   | 200ms | `curveDecelerateMid` | 200ms |
| ProgressRing | `splash-fade-in`                       | 200ms | `curveDecelerateMid` | 500ms |

- Icon 用已有的 `fluent-scale-enter` 关键帧（`opacity 0 + scale(0.96) → 1`）
- 标题和副标题需要新的 `splash-fade-slide-up` 关键帧（opacity + 4px slide-up）
- ProgressRing 延迟 500ms：auth 通常在 200-300ms 完成，正常使用中不会出现

### 新增关键帧

在 `base.css` 中添加：

```css
@keyframes splash-fade-slide-up {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 实现范围

仅修改两个文件：

1. `src/styles/base.css`：添加 `splash-fade-slide-up` 关键帧
2. `src/App.tsx`：替换 splash fallback 内容

不改动 `LoadingSpinner` 组件、`uno.config.ts`、`SettingsSheet.tsx`。

## 交互状态

| 状态          | 行为                                                         |
| ------------- | ------------------------------------------------------------ |
| splash 显示中 | icon → 标题 → 副标题 staggered 入场，ProgressRing 延迟不可见 |
| auth 超慢     | 500ms 后 ProgressRing fade-in，提示用户仍在加载              |
| 加载完成      | 整个 splash 随 `<Show>` 条件切换消失                         |

## 暗色主题

所有值使用 CSS 变量，暗色主题自动适配。
