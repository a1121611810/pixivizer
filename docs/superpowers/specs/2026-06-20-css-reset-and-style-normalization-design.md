# CSS Reset & 样式规范化设计

> 日期：2026-06-20  
> 状态：设计完成，待用户审查

## 1. 问题概述

当前项目存在三个层面的样式不一致问题：

| 层面         | 问题                                                                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reset 层** | `input/textarea/select` 未继承字体；`img` 默认 `inline` 产生底部空隙；`a` 链接无重置；tap highlight 仅覆盖 button                                                           |
| **Token 层** | 缺少 overlay 相关 token；`--colorNeutralBackground4` 不存在却被引用（bug）；缺少 image badge 相关 token                                                                     |
| **代码层**   | `text-[var]` 与 `[color:var]` 两种语法混用；`spinner` shortcut 定义了但未使用；LoadingSpinner/ImageViewer/UgoiraViewer 大量硬编码颜色；VirtualFeed 用中文关键词匹配错误颜色 |

## 2. 样式架构

采用 4 层样式架构，从底到顶：

```
┌──────────────────────────────────────┐
│  Layer 4: 组件样式                     │
│  UnoCSS shortcuts (btn/input/card…)   │
│  + 组件内 token 引用                   │
├──────────────────────────────────────┤
│  Layer 3: Token 定义                   │
│  CSS 变量 — 颜色/间距/圆角/阴影/动画     │
│  src/styles/tokens.css               │
├──────────────────────────────────────┤
│  Layer 2: 基础样式 (Base)              │
│  html/body 字体、背景色、滚动条          │
│  + Fluent keyframes                  │
│  src/styles/base.css                 │
├──────────────────────────────────────┤
│  Layer 1: CSS Reset                   │
│  modern-css-reset (Andy Bell, ~1KB)    │
│  + 项目专属补充 (button/tap-highlight)  │
│  src/styles/reset.css                │
└──────────────────────────────────────┘
```

**导入顺序**（`main.tsx` 中，在 `virtual:uno.css` 之前）：

```tsx
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "virtual:uno.css";
```

## 3. Layer 1: CSS Reset

### 3.1 引入 modern-css-reset

- **来源**: Andy Bell 的 [modern-css-reset](https://github.com/Andy-set-studio/modern-css-reset)
- **npm 包名**: `modern-css-reset`（v1.4.0）
- **引入方式**: 在 `src/styles/reset.css` 中 `@import "modern-css-reset";`

modern-css-reset 覆盖的规则（v1.4.0）：

| 规则                                                                          | 说明                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------- |
| `*, *::before, *::after { box-sizing: border-box }`                           | 统一盒模型（已有）                        |
| `body, h1-h6, p, figure, blockquote, dl, dd { margin: 0 }`                    | 去除默认 margin（已有 `* { margin: 0 }`） |
| `ul[role="list"], ol[role="list"] { list-style: none }`                       | 列表样式重置                              |
| `html:focus-within { scroll-behavior: smooth }`                               | 平滑滚动                                  |
| `body { min-height: 100vh; text-rendering: optimizeSpeed; line-height: 1.5 }` | 基础排版                                  |
| `a:not([class]) { text-decoration-skip-ink: auto }`                           | 无 class 链接的 ink skip                  |
| `img, picture { max-width: 100%; display: block }`                            | **新增** — 解决 img 底部空隙              |
| `input, button, textarea, select { font: inherit }`                           | **部分新增** — input/textarea/select 继承 |
| `@media (prefers-reduced-motion)`                                             | 与现有规则重叠，取其更完整版本            |

### 3.2 项目专属补充

叠在 modern-css-reset 之上，保留并扩展现有规则：

```css
/* 保留现有的完整 button reset */
button {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: inherit;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

/* tap highlight 从仅 button 扩展到全局 */
* {
  -webkit-tap-highlight-color: transparent;
}

/* 支持动画到 auto 高度 */
html {
  interpolate-size: skip-nothing;
}
```

## 4. Layer 2 & 3: Token 定义 + 基础样式

### 4.1 文件拆分

现有 `index.html` 中 `<style>` 标签内容拆分到三个文件：

**`src/styles/tokens.css`** — 全部 CSS 变量定义：

- `:root` 亮色主题变量
- `:root.dark` 暗色主题变量

**`src/styles/base.css`** — 基础样式：

- `html`, `body`, `#root` 尺寸和字体
- `::-webkit-scrollbar` 滚动条
- `::selection` 选中样式
- `@keyframes` 动画关键帧
- `@media (prefers-reduced-motion)` 无障碍

**`index.html`** 中仅保留最小化的内联样式（防止 FOUC）或完全清空。

### 4.2 新增 Token

**Overlay 相关**（全屏查看器 ImageViewer / UgoiraViewer）：

| Token                        | 值                          | 用途                |
| ---------------------------- | --------------------------- | ------------------- |
| `--colorOverlayBackground`   | `rgba(0, 0, 0, 0.85)`       | 全屏查看器背景      |
| `--colorOverlayForeground`   | `#FFFFFF`                   | 工具栏前景文字/图标 |
| `--colorOverlaySurface`      | `rgba(255, 255, 255, 0.10)` | 按钮背景            |
| `--colorOverlaySurfaceHover` | `rgba(255, 255, 255, 0.20)` | 按钮 hover 背景     |

**Image Badge 相关**（卡片角标）：

| Token                         | 值                    | 用途     |
| ----------------------------- | --------------------- | -------- |
| `--colorImageBadgeBackground` | `rgba(0, 0, 0, 0.50)` | 角标背景 |
| `--colorImageBadgeForeground` | `#FFFFFF`             | 角标文字 |

**Light 和 Dark 主题中 Overlay token 保持一致**（overlay 始终为暗色背景 + 白色前景）。

### 4.3 Bug 修复

- `Bookmarks.tsx` 中 `--colorNeutralBackground4` 不存在 → 改为 `--colorNeutralBackground2`

## 5. Layer 4: 代码规范 + 组件修复

### 5.1 Bracket 语法统一

**规定：颜色/尺寸类 token 引用统一使用 UnoCSS 工具类缩写形式。**

| ❌ 禁止                              | ✅ 使用                     |
| ------------------------------------ | --------------------------- |
| `[color:var(--colorXxx)]`            | `text-[var(--colorXxx)]`    |
| `[background-color:var(--colorXxx)]` | `bg-[var(--colorXxx)]`      |
| `[font-size:var(--fontSizeXxx)]`     | `text-[var(--fontSizeXxx)]` |
| `[border-color:var(--colorXxx)]`     | `border-[var(--colorXxx)]`  |

**例外：** UnoCSS 没有对应工具类的属性（如 `box-shadow`、`backdrop-filter`），继续用 `[property:value]` 形式。

### 5.2 动画时长统一

| ❌               | ✅                                 |
| ---------------- | ---------------------------------- |
| `duration-200`   | `duration-[var(--durationNormal)]` |
| `duration-300`   | `duration-[var(--durationGentle)]` |
| `transition-all` | 明确指定过渡属性                   |

### 5.3 禁止清单更新

在 `AGENTS.md` 禁止清单中新增：

| 禁止                                      | 必须使用                              |
| ----------------------------------------- | ------------------------------------- |
| `[color:var(--colorXxx)]` 形式            | `text-[var(--colorXxx)]`              |
| `[background-color:var(--colorXxx)]` 形式 | `bg-[var(--colorXxx)]`                |
| `duration-200` / `duration-300` 等        | `duration-[var(--durationNormal)]` 等 |

### 5.4 组件修复清单

| 文件                 | 问题                                                                         | 修复                                                               |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `LoadingSpinner.tsx` | `spinner` shortcut 未使用，硬编码颜色/尺寸                                   | 改用 `class="spinner"` + token 文本色                              |
| `ImageCard.tsx`      | 角标 `bg-black/50 text-white`                                                | 改用 `--colorImageBadgeBackground` / `--colorImageBadgeForeground` |
| `ImageViewer.tsx`    | 全屏 `bg-black`，硬编码圆角/时长/颜色                                        | 改用 overlay token                                                 |
| `UgoiraViewer.tsx`   | 同上 + `rounded-full` `text-xl` 混用 token                                   | 统一使用 overlay token                                             |
| `Bookmarks.tsx`      | 引用不存在的 `--colorNeutralBackground4`                                     | 改为 `--colorNeutralBackground2`                                   |
| `VirtualFeed.tsx`    | 中文关键词匹配决定错误颜色                                                   | 基于 error 类型显式判断                                            |
| `SettingsSheet.tsx`  | `[background-color:var]` 写法                                                | 统一为 `bg-[var]`                                                  |
| `NavBar.tsx`         | `[color:var]` 写法                                                           | 统一为 `text-[var]`                                                |
| `UnoCSS shortcuts`   | `surfaces` / `btn` / `segmented` 内 `[color:var]` / `[background-color:var]` | 统一为 `text-[var]` / `bg-[var]`                                   |

## 6. 实施要点

1. 安装 `modern-css-reset` npm 包
2. 创建 `src/styles/` 目录及三个 CSS 文件
3. 将 `index.html` 中 `<style>` 内容迁移到对应文件
4. 在 `main.tsx` 中添加 CSS 导入
5. 清理 `index.html` 的 `<style>` 标签（保留最小防 FOUC 内容）
6. 补全新增 token
7. 统一 `uno.config.ts` shortcuts 中的 bracket 语法
8. 逐组件修复硬编码和语法不一致
9. 更新 `AGENTS.md` 禁止清单
10. TypeScript 检查 + Vite 构建验证
