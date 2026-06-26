# Pixivizer 应用图标 / Logo 设计规范

## 状态

已确认（2026-06-26），按本文档参数进入实现。

## 背景

Pixivizer 是基于 SolidJS + Capacitor 的 Pixiv 第三方 Android 客户端，设计系统强制遵循 Microsoft Fluent Design System 2。当前工程没有独立应用图标：启动页使用 Fluent 通用图片图标作为占位，Android 启动器图标仍沿用 Capacitor 默认生成的图标。本文档为应用设计一个符合 Fluent 风格、可落地的软件图标，并明确所有输出参数。

## 目标

1. 为 Pixivizer 设计一个可在 Android 启动器、应用内 Splash、Web favicon / PWA 中使用的统一图标。
2. 视觉语言符合 Microsoft Fluent Design System 2：几何化、圆角、层级、柔和投影、渐变克制。
3. 所有颜色、尺寸、路径、阴影参数必须可量化，禁止模糊描述。

## 约束

- 必须复用项目已有的 Fluent 设计令牌：`--colorNeutralBackground2`（dark）和 `--colorBrandBackground` 色系。
- 不可直接使用 Pixiv 官方商标图形，避免版权风险。
- Android 自适应图标必须满足 66×66 dp 安全区，前景/背景分层输出。
- 保持小尺寸（48dp 以下）可识别。

## 设计决策

### 核心意象

- **字母 P**：直接对应应用名 Pixivizer / Pixiv，建立品牌识别。
- **Fluent 几何**：P 由圆角矩形与半圆弧线构成，无手写感；通过渐变与投影营造层级。
- **深色背景 + 渐变图形**：用户明确选择的配色方向，与 App 暗色主题一致。

### 最终图形

图标为圆角方形，深色背景中央放置一个蓝色渐变、带柔和投影的粗体 P 形。

#### 精确参数

| 项目         | 值                                                                                 |
| ------------ | ---------------------------------------------------------------------------------- |
| 画布尺寸     | 192 × 192 dp                                                                       |
| 背景圆角矩形 | x=12, y=12, width=168, height=168, rx=44                                           |
| 背景色       | `#1f1f1f`（dark 主题 `--colorNeutralBackground2`）                                 |
| P 形路径     | `M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z`                               |
| P 形填充     | 线性渐变 `#0078d4 → #2899f5 → #60aaff`                                             |
| 高光         | 同一路径叠加白色，fill-opacity=0.12                                                |
| 投影         | `0 6px 16px rgba(0, 120, 212, 0.35)`（SVG feDropShadow: dx=0 dy=6 stdDeviation=8） |

#### SVG 源码（192×192 主版本）

```svg
<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0078d4"/>
      <stop offset="55%" stop-color="#2899f5"/>
      <stop offset="100%" stop-color="#60aaff"/>
    </linearGradient>
    <filter id="pShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="6" stdDeviation="8"
                    flood-color="#0078d4" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect x="12" y="12" width="168" height="168" rx="44" fill="#1f1f1f"/>
  <path d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
        fill="url(#pGrad)" filter="url(#pShadow)"/>
  <path d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
        fill="white" fill-opacity="0.12"/>
</svg>
```

### 设计理由

- **识别度**：粗体 P 在小尺寸下仍清晰可辨。
- **Fluent 一致性**：圆角节奏（rx=44 约 26%）与 Fluent 应用图标规范接近；渐变与投影克制，避免过度炫光。
- **暗色主题统一**：背景色直接取自项目 dark 主题令牌，确保启动页与主界面视觉连贯。
- **版权安全**：完全原创的几何图形，不借用 Pixiv 官方标识。

## 交付物

### 1. Android 自适应图标

- **前景层**（`android/app/src/main/res/mipmap-*/ic_launcher_foreground.png`）
  - 108 × 108 dp，66 × 66 dp 安全区居中。
  - 内容：192×192 主图标等比缩放，使 P 形落在安全区内。
  - 密度：mdpi、hdpi、xhdpi、xxhdpi、xxxhdpi。
- **背景层**（`android/app/src/main/res/mipmap-*/ic_launcher_background.png`）
  - 纯色 `#1f1f1f`。
  - 密度同上。
- **旧版启动器图标**（`ic_launcher.png` / `ic_launcher_round.png`）同步替换为相同设计。

### 2. 应用内 Splash 图标

- 替换 `src/App.tsx` 启动页 fallback 中的占位 Fluent 图片图标。
- 使用同一 SVG，尺寸 64×64 dp（与现有占位尺寸一致），颜色使用渐变而非单色。

### 3. Web favicon / PWA

- `public/favicon.svg`：复用主 SVG，viewBox 0 0 192 192。
- `public/favicon-32x32.png` / `public/favicon-16x16.png`：从 SVG 导出。
- 在 `index.html` 中引用 favicon。
- 如需 PWA manifest，补充 192×192 和 512×512 PNG。

### 4. 源文件归档

- `assets/logo/pixivizer-logo.svg`：主 SVG 源文件。
- `assets/logo/pixivizer-logo-*.png`：各尺寸导出（可选，由实现计划决定是否保留）。

## 工程集成点

- `src/App.tsx`：启动页 `<svg>` 替换为最终 Logo SVG。
- `android/app/src/main/res/mipmap-*/*`：Android 图标资源替换。
- `index.html`：添加 favicon 链接。
- `capacitor.config.ts`：如配置了 splash 背景色，确认与 `#1f1f1f` 一致。

## 未包含范围

- 动画版本 Logo（启动页可保留现有 fade/slide 入场动画，图标本身静态）。
- 浅色主题变体：当前仅定义暗色版，若未来需要浅色主题可在浅色背景上使用 `#0078d4` 单色 P 形。
- 应用商店\_feature 图 / 宣传图：仅交付图标资源。

## 决策记录

| 日期       | 决策                             | 原因                         |
| ---------- | -------------------------------- | ---------------------------- |
| 2026-06-26 | 意象 = 字母 P + 抽象 Fluent 几何 | 用户选择                     |
| 2026-06-26 | 配色 = 深色背景 + 蓝色渐变       | 用户选择，与项目暗色主题一致 |
| 2026-06-26 | 用途 = Android 启动器 + Splash   | 用户选择                     |
| 2026-06-26 | 最终方向 = Bold P                | 用户在 v2 方案中选择 A       |
