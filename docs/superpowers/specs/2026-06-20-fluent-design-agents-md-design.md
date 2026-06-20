# AGENTS.md Fluent Design 规范强化

**日期**: 2026-06-20  
**状态**: 已确认

## 目标

在 AGENTS.md 中明确：Pixivizer 项目所有视觉与交互决策**强制**遵循 Microsoft Fluent Design System 2，不得例外。

## 变更内容

### 1. 新增「Fluent Design 规范」章节

位置：插入在「约定」之前。

包含 4 个子块：

**1.1 设计令牌（强制）**

- 颜色、间距、圆角、阴影、字体大小必须使用 `index.html` 中定义的 CSS 变量
- 禁止硬编码具体值（`#xxx`、`rgb()`、`px`/`rem` 字面量）
- 确需新增令牌时，来源必须是 Fluent 2 官方设计令牌，在 `:root` 中声明后使用

**1.2 动画与动效（强制）**

- 缓动曲线只允许：
  - `cubic-bezier(0,0,0,1)` — exit / decelerate
  - `cubic-bezier(0.33,0,0.67,1)` — standard
  - `cubic-bezier(0.33,0,0,1)` — enter / accelerate
  - `linear` — 仅限 loading spinner
- 禁止 `ease`、`ease-in`、`ease-out`、`ease-in-out`
- 动画时长只允许：100ms / 150ms / 200ms / 300ms / 500ms
- 页面过渡通过 `PageTransition.tsx`，组件动效使用 Fluent motion tokens

**1.3 交互状态（强制）**

- 每个可交互元素必须覆盖 `hover`、`active`（pressed）、`focus-visible` 三种状态
- active: `scale(0.98)` 或 Fluent pressed 颜色
- focus: `outline` + `outline-offset`，禁止裸 `:focus`
- 触控目标最小 40×40px

**1.4 禁止清单**

- 硬编码颜色 → 必须用 `var(--colorXxx)`
- 硬编码圆角 → 必须用 `var(--borderRadiusXxx)`
- 硬编码阴影 → 必须用 `var(--elevationN)`
- 非 Fluent 缓动曲线 → 必须用 Fluent 标准曲线
- 非标准动画时长 → 必须用 Fluent duration
- 自定义字体大小 → 必须用 `var(--fontSizeBaseXxx)` / `var(--fontSizeHeroXxx)`
- 裸 `:focus` → 必须用 `:focus-visible`

### 2. 「项目概览」微调

将：

> - **设计系统**: Microsoft Fluent Design System 2（CSS 自定义属性 + UnoCSS shortcuts）

改为：

> - **设计系统**: **强制** Microsoft Fluent Design System 2 — 所有视觉和交互决策基于 Fluent 令牌和规范（详见「Fluent Design 规范」章节）

### 3. 「约定」微调

删除与 Fluent 重复的样式/CSS 变量条目，替换为一条简短引用：

> - **样式与交互**：见「Fluent Design 规范」章节，不得例外

## 影响范围

- 仅修改 `AGENTS.md` 一个文件
- 不影响任何源代码
- 后续所有开发以此为强制约束
