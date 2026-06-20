# CSS Reset & 样式规范化 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 规范化 CSS Reset 层、Token 层和组件层，消除硬编码值和不一致的代码风格，建立 4 层样式架构。

**Architecture:** 引入 `modern-css-reset` 作为 Layer 1 reset 基础，将 `index.html` 的 `<style>` 内容迁移到独立的 `src/styles/` CSS 文件，补全 overlay/image-badge token，统一所有组件的 bracket 语法为 `text-[var]` / `bg-[var]` 缩写形式。

**Tech Stack:** TypeScript, SolidJS, UnoCSS, modern-css-reset v1.4.0, Fluent Design 2 tokens

## Global Constraints

- 所有颜色/尺寸必须使用 CSS 变量，禁止硬编码
- Bracket 语法统一：`text-[var]` / `bg-[var]` / `border-[var]`（禁止 `[color:var]` / `[background-color:var]`）
- 动画时长使用 token：`duration-[var(--durationXxx)]`
- UnoCSS shortcuts 统一在 `uno.config.ts` 中定义
- 触控目标最小 40×40px（移动端优先）
- 不自动 commit，等待用户审查

---

### Task 1: 安装 modern-css-reset 并创建 CSS 文件结构

**Files:**

- Create: `src/styles/reset.css`
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Modify: `package.json`（添加依赖）

**Interfaces:**

- Produces: `src/styles/reset.css` 引入 `modern-css-reset` + 项目补充规则
- Produces: `src/styles/tokens.css` 包含所有 `:root` 和 `:root.dark` CSS 变量
- Produces: `src/styles/base.css` 包含 html/body 基础样式、keyframes、scrollbar、reduced-motion

---

- [ ] **Step 1: 安装 modern-css-reset**

```bash
pnpm add -D modern-css-reset
```

Expected: 安装成功，`package.json` 中新增 `"modern-css-reset": "^1.4.0"`

---

- [ ] **Step 2: 创建 `src/styles/reset.css`**

写入 `/Users/lilianda/develop/pixivizer/src/styles/reset.css`:

```css
/* ═══════════════════════════════════════════════════════
   Layer 1: CSS Reset
   1. modern-css-reset (Andy Bell, v1.4.0)
   2. Project-specific additions
   ═══════════════════════════════════════════════════════ */

@import "modern-css-reset";

/* ── 全局 tap highlight 抑制（移动端） ── */
* {
  -webkit-tap-highlight-color: transparent;
}

/* ── 按钮全局重置：剥除所有浏览器原生样式 ── */
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

/* ── 支持通过 CSS transition 动画到 auto 高度 ── */
html {
  interpolate-size: skip-nothing;
}
```

---

- [ ] **Step 3: 创建 `src/styles/tokens.css`**

将 `index.html` 中 `:root` 和 `:root.dark` 所有 CSS 变量定义复制到 `src/styles/tokens.css`，并在文件末尾追加新增的 overlay 和 image badge token。

写入 `/Users/lilianda/develop/pixivizer/src/styles/tokens.css`:

```css
/* ═══════════════════════════════════════════════════════
   Layer 3: Microsoft Fluent Design System 2 — Design Tokens
   Based on @fluentui/tokens v9 + fluent2.microsoft.design
   ═══════════════════════════════════════════════════════ */

:root {
  /* ── Typography ── */
  --fontFamilyBase:
    "Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto,
    "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;

  /* ── Font sizes (Fluent type ramp) ── */
  --fontSizeBase100: 10px;
  --fontSizeBase200: 12px;
  --fontSizeBase300: 14px;
  --fontSizeBase400: 16px;
  --fontSizeBase500: 20px;
  --fontSizeBase600: 24px;
  --fontSizeHero700: 28px;
  --fontSizeHero800: 32px;
  --fontSizeHero900: 40px;
  --fontSizeHero1000: 68px;

  /* ── Line heights ── */
  --lineHeightBase100: 14px;
  --lineHeightBase200: 16px;
  --lineHeightBase300: 20px;
  --lineHeightBase400: 22px;
  --lineHeightBase500: 28px;
  --lineHeightBase600: 32px;

  /* ── Font weights ── */
  --fontWeightRegular: 400;
  --fontWeightMedium: 500;
  --fontWeightSemibold: 600;
  --fontWeightBold: 700;

  /* ── Border radius ── */
  --borderRadiusNone: 0;
  --borderRadiusSmall: 2px;
  --borderRadiusMedium: 4px;
  --borderRadiusLarge: 6px;
  --borderRadiusXLarge: 8px;
  --borderRadius2XLarge: 12px;
  --borderRadius3XLarge: 16px;
  --borderRadius4XLarge: 24px;
  --borderRadiusCircular: 10000px;

  /* ── Stroke widths ── */
  --strokeWidthThin: 1px;
  --strokeWidthThick: 2px;
  --strokeWidthThicker: 3px;

  /* ── Spacing (4px base grid) ── */
  --spacingHorizontalNone: 0;
  --spacingHorizontalXXS: 2px;
  --spacingHorizontalXS: 4px;
  --spacingHorizontalSNudge: 6px;
  --spacingHorizontalS: 8px;
  --spacingHorizontalMNudge: 10px;
  --spacingHorizontalM: 12px;
  --spacingHorizontalL: 16px;
  --spacingHorizontalXL: 20px;
  --spacingHorizontalXXL: 24px;

  --spacingVerticalNone: 0;
  --spacingVerticalXXS: 2px;
  --spacingVerticalXS: 4px;
  --spacingVerticalSNudge: 6px;
  --spacingVerticalS: 8px;
  --spacingVerticalMNudge: 10px;
  --spacingVerticalM: 12px;
  --spacingVerticalL: 16px;
  --spacingVerticalXL: 20px;
  --spacingVerticalXXL: 24px;

  /* ── Motion durations ── */
  --durationUltraFast: 50ms;
  --durationFaster: 100ms;
  --durationFast: 150ms;
  --durationNormal: 200ms;
  --durationGentle: 250ms;
  --durationSlow: 300ms;
  --durationSlower: 400ms;
  --durationUltraSlow: 500ms;

  /* ── Motion easing curves ── */
  --curveAccelerateMax: cubic-bezier(0.9, 0.1, 1, 0.2);
  --curveAccelerateMid: cubic-bezier(1, 0, 1, 1);
  --curveAccelerateMin: cubic-bezier(0.8, 0, 0.78, 1);
  --curveDecelerateMax: cubic-bezier(0.1, 0.9, 0.2, 1);
  --curveDecelerateMid: cubic-bezier(0, 0, 0, 1);
  --curveDecelerateMin: cubic-bezier(0.33, 0, 0.1, 1);
  --curveEasyEaseMax: cubic-bezier(0.8, 0, 0.2, 1);
  --curveEasyEase: cubic-bezier(0.33, 0, 0.67, 1);
  --curveLinear: cubic-bezier(0, 0, 1, 1);

  /* ── Colors: Light theme ── */
  --colorNeutralBackground1: #ffffff;
  --colorNeutralBackground2: #fafafa;
  --colorNeutralBackground3: #f5f5f5;
  --colorNeutralBackground1Hover: #f5f5f5;
  --colorNeutralBackground1Pressed: #ebebeb;
  --colorNeutralBackground1Selected: #ebebeb;

  --colorNeutralForeground1: #242424;
  --colorNeutralForeground2: #424242;
  --colorNeutralForeground3: #616161;
  --colorNeutralForegroundDisabled: #bdbdbd;

  --colorNeutralStroke1: #d1d1d1;
  --colorNeutralStroke2: #e0e0e0;
  --colorNeutralStrokeAccessible: #616161;
  --colorNeutralStrokeDisabled: #e0e0e0;

  --colorBrandBackground: #0078d4;
  --colorBrandBackgroundHover: #106ebe;
  --colorBrandBackgroundPressed: #005a9e;
  --colorBrandBackgroundSelected: #005a9e;
  --colorBrandForeground1: #0078d4;
  --colorBrandForegroundLink: #106ebe;
  --colorBrandForegroundLinkHover: #005a9e;
  --colorBrandForegroundLinkPressed: #004578;
  --colorBrandStroke1: #0078d4;
  --colorBrandStroke2: #c2e0f4;

  --colorCompoundBrandBackground: #0078d4;
  --colorCompoundBrandBackgroundHover: #106ebe;
  --colorCompoundBrandBackgroundPressed: #005a9e;
  --colorCompoundBrandForeground1: #0078d4;
  --colorCompoundBrandStroke1: #0078d4;

  --colorNeutralBackgroundAlpha: rgba(255, 255, 255, 0.8);
  --colorNeutralBackgroundAlpha2: rgba(255, 255, 255, 0.6);

  /* ── Overlay scrim ── */
  --colorScrim: rgba(0, 0, 0, 0.4);

  /* ── Dual-layer shadows (ambient + key) — Light ── */
  --shadowAmbient: rgba(0, 0, 0, 0.12);
  --shadowKey: rgba(0, 0, 0, 0.14);
  --shadowAmbientLighter: rgba(0, 0, 0, 0.06);
  --shadowKeyLighter: rgba(0, 0, 0, 0.07);
  --shadowAmbientDarker: rgba(0, 0, 0, 0.2);
  --shadowKeyDarker: rgba(0, 0, 0, 0.24);

  --elevation2: 0 0 2px var(--shadowAmbient), 0 1px 2px var(--shadowKey);
  --elevation4: 0 0 2px var(--shadowAmbient), 0 2px 4px var(--shadowKey);
  --elevation8: 0 0 2px var(--shadowAmbient), 0 4px 8px var(--shadowKey);
  --elevation16: 0 0 2px var(--shadowAmbient), 0 8px 16px var(--shadowKey);
  --elevation28: 0 0 8px var(--shadowAmbient), 0 14px 28px var(--shadowKey);
  --elevation64: 0 0 8px var(--shadowAmbient), 0 32px 64px var(--shadowKey);

  /* ── Focus indicator ── */
  --colorStrokeFocus1: #ffffff;
  --colorStrokeFocus2: #000000;

  /* ── Status colors ── */
  --colorStatusDangerBackground1: #c42b1c;
  --colorStatusDangerForeground1: #c42b1c;
  --colorStatusDangerBackground2: #fde7e5;
  --colorStatusSuccessBackground1: #107c10;
  --colorStatusSuccessForeground1: #107c10;
  --colorStatusSuccessBackground2: #dff6dd;
  --colorStatusWarningBackground1: #ff8c00;
  --colorStatusWarningForeground1: #ff8c00;
  --colorStatusWarningBackground2: #fff4ce;

  /* ── Overlay (full-screen viewer) ── */
  --colorOverlayBackground: rgba(0, 0, 0, 0.85);
  --colorOverlayForeground: #ffffff;
  --colorOverlaySurface: rgba(255, 255, 255, 0.1);
  --colorOverlaySurfaceHover: rgba(255, 255, 255, 0.2);

  /* ── Image badge (card corner label) ── */
  --colorImageBadgeBackground: rgba(0, 0, 0, 0.5);
  --colorImageBadgeForeground: #ffffff;
}

/* ── Dark theme ── */
:root.dark {
  --colorNeutralBackground1: #292929;
  --colorNeutralBackground2: #1f1f1f;
  --colorNeutralBackground3: #141414;
  --colorNeutralBackground1Hover: #333333;
  --colorNeutralBackground1Pressed: #3d3d3d;
  --colorNeutralBackground1Selected: #3d3d3d;

  --colorNeutralForeground1: #ffffff;
  --colorNeutralForeground2: #d6d6d6;
  --colorNeutralForeground3: #adadad;
  --colorNeutralForegroundDisabled: #5c5c5c;

  --colorNeutralStroke1: #666666;
  --colorNeutralStroke2: #4d4d4d;
  --colorNeutralStrokeAccessible: #adadad;
  --colorNeutralStrokeDisabled: #333333;

  --colorBrandBackground: #106ebe;
  --colorBrandBackgroundHover: #0078d4;
  --colorBrandBackgroundPressed: #005a9e;
  --colorBrandBackgroundSelected: #005a9e;
  --colorBrandForeground1: #479ef5;
  --colorBrandForegroundLink: #2899f5;
  --colorBrandForegroundLinkHover: #479ef5;
  --colorBrandForegroundLinkPressed: #60aaff;
  --colorBrandStroke1: #2899f5;
  --colorBrandStroke2: #1a3a5c;

  --colorCompoundBrandBackground: #0078d4;
  --colorCompoundBrandBackgroundHover: #106ebe;
  --colorCompoundBrandBackgroundPressed: #005a9e;
  --colorCompoundBrandForeground1: #479ef5;
  --colorCompoundBrandStroke1: #2899f5;

  --colorNeutralBackgroundAlpha: rgba(41, 41, 41, 0.8);
  --colorNeutralBackgroundAlpha2: rgba(41, 41, 41, 0.6);

  --colorScrim: rgba(0, 0, 0, 0.6);

  --shadowAmbient: rgba(0, 0, 0, 0.24);
  --shadowKey: rgba(0, 0, 0, 0.28);
  --shadowAmbientLighter: rgba(0, 0, 0, 0.12);
  --shadowKeyLighter: rgba(0, 0, 0, 0.14);
  --shadowAmbientDarker: rgba(0, 0, 0, 0.32);
  --shadowKeyDarker: rgba(0, 0, 0, 0.36);

  --elevation2: 0 0 2px var(--shadowAmbient), 0 1px 2px var(--shadowKey);
  --elevation4: 0 0 2px var(--shadowAmbient), 0 2px 4px var(--shadowKey);
  --elevation8: 0 0 2px var(--shadowAmbient), 0 4px 8px var(--shadowKey);
  --elevation16: 0 0 2px var(--shadowAmbient), 0 8px 16px var(--shadowKey);
  --elevation28: 0 0 8px var(--shadowAmbient), 0 14px 28px var(--shadowKey);
  --elevation64: 0 0 8px var(--shadowAmbient), 0 32px 64px var(--shadowKey);

  --colorStrokeFocus1: #000000;
  --colorStrokeFocus2: #ffffff;

  --colorStatusDangerBackground2: #3e1d1a;
  --colorStatusSuccessBackground2: #1a2e1a;
  --colorStatusWarningBackground2: #3a2e0f;

  /* Overlay token 在 dark 主题中不变（overlay 始终暗色） */
  --colorOverlayBackground: rgba(0, 0, 0, 0.85);
  --colorOverlayForeground: #ffffff;
  --colorOverlaySurface: rgba(255, 255, 255, 0.1);
  --colorOverlaySurfaceHover: rgba(255, 255, 255, 0.2);

  --colorImageBadgeBackground: rgba(0, 0, 0, 0.5);
  --colorImageBadgeForeground: #ffffff;
}
```

---

- [ ] **Step 4: 创建 `src/styles/base.css`**

将 `index.html` 中 Reset & Base 部分 + Animation Keyframes 部分迁移至此。

写入 `/Users/lilianda/develop/pixivizer/src/styles/base.css`:

```css
/* ═══════════════════════════════════════════════════════
   Layer 2: Base Styles
   html/body root, scrollbar, selection, keyframes, reduced-motion
   ═══════════════════════════════════════════════════════ */

html,
body,
#root {
  width: 100%;
  height: 100%;
}

html {
  background-color: var(--colorNeutralBackground3);
  color: var(--colorNeutralForeground1);
  transition:
    background-color var(--durationNormal) var(--curveEasyEase),
    color var(--durationNormal) var(--curveEasyEase);
}

body {
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  font-weight: var(--fontWeightRegular);
  line-height: var(--lineHeightBase300);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Override modern-css-reset: restore font rendering quality ── */
body {
  text-rendering: auto;
}

/* ── Scrollbar ── */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--colorNeutralStrokeAccessible);
  border-radius: var(--borderRadiusCircular);
}

/* ── Selection ── */
::selection {
  background: var(--colorBrandStroke2);
  color: var(--colorNeutralForeground1);
}

/* ═══════════════════════════════════════════════════════
   Fluent Design 2 — Animation Keyframes
   ═══════════════════════════════════════════════════════ */

/* Page / element entrance: fade + micro-slide-up */
@keyframes fluent-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* List item staggered entrance */
@keyframes fluent-list-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dialog / overlay entrance: fade + scale-up */
@keyframes fluent-scale-enter {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Overlay exit */
@keyframes fluent-scale-exit {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.96);
  }
}

/* Sheet / panel entrance: slide down from top */
@keyframes fluent-slide-down {
  from {
    opacity: 0;
    transform: translateY(-16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Sheet / panel exit: slide up to top */
@keyframes fluent-slide-up {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-16px);
  }
}

/* Skeleton shimmer loading */
@keyframes fluent-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Accessibility: respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

- [ ] **Step 5: Commit**

```bash
git add pnpm-lock.yaml package.json src/styles/
git commit -m "chore: add modern-css-reset, create src/styles/ files with token and base styles"
```

---

### Task 2: 迁移 index.html 样式 + 更新 main.tsx 导入

**Files:**

- Modify: `index.html`（移除 `<style>` 标签中的已迁移内容）
- Modify: `src/main.tsx`（添加 CSS 导入）

**Interfaces:**

- Consumes: `src/styles/reset.css`, `src/styles/tokens.css`, `src/styles/base.css`
- Produces: 简化的 `index.html`，`main.tsx` 添加 CSS 导入链

---

- [ ] **Step 1: 精简 `index.html` 的 `<style>` 标签**

将 `index.html` 的 `<style>` 标签内容替换为最小化防 FOUC 内联样式。

在 `/Users/lilianda/develop/pixivizer/index.html` 中，将第 7-350 行的 `<style>` 标签内容替换为：

```html
<style>
  /* 最小化防 FOUC：在 CSS 文件加载前设置背景和主题 */
  html {
    background-color: #f5f5f5;
    color: #242424;
  }
  html.dark {
    background-color: #141414;
    color: #ffffff;
  }
</style>
```

---

- [ ] **Step 2: 更新 `main.tsx` 添加 CSS 导入**

在 `/Users/lilianda/develop/pixivizer/src/main.tsx` 中，在 `virtual:uno.css` 之前添加三个 CSS 导入：

```diff
 import { render } from 'solid-js/web';
 import App from './App';
+import './styles/reset.css';
+import './styles/tokens.css';
+import './styles/base.css';
 import 'virtual:uno.css';

 const root = document.getElementById('root');
 if (root) {
   render(() => <App />, root);
 }
```

---

- [ ] **Step 3: Commit**

```bash
git add index.html src/main.tsx
git commit -m "refactor: migrate styles from index.html to src/styles/, add CSS imports to main.tsx"
```

---

### Task 3: 统一 UnoCSS shortcuts 括号语法 + 新增 overlay badge shortcuts

**Files:**

- Modify: `uno.config.ts`

**Interfaces:**

- Consumes: `src/styles/tokens.css` 中新增的 `--colorImageBadge*` token
- Produces: 所有 shortcut 使用统一的 `text-[var]` / `bg-[var]` 语法；新增 `badge-overlay` shortcut

---

- [ ] **Step 1: 修复 `uno.config.ts` 中所有 `[color:var]` → `text-[var]`，`[background-color:var]` → `bg-[var]`**

在 `/Users/lilianda/develop/pixivizer/uno.config.ts` 中应用以下修改：

**修改 1 — `page` shortcut（line 11）：已使用 `[background-color:var]`**

```diff
-  'page':
-    'min-h-screen [background-color:var(--colorNeutralBackground3)] [color:var(--colorNeutralForeground1)]',
+  'page':
+    'min-h-screen bg-[var(--colorNeutralBackground3)] text-[var(--colorNeutralForeground1)]',
```

**修改 2 — 所有 surface shortcuts（lines 14-25）：**

```diff
-  'surface-card':
-    '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] border border-[var(--colorNeutralStroke2)]',
-  'surface-card-elevated':
-    '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)]',
-  'surface-flyout':
-    '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadiusLarge)] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)]',
-  'surface-appbar':
-    '[background-color:var(--colorNeutralBackgroundAlpha)] backdrop-blur-[30px] backdrop-saturate-[125%] border-b border-[var(--colorNeutralStroke2)] rounded-[var(--borderRadiusNone)]',
-  'surface-overlay':
-    '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadiusXLarge)] shadow-[var(--elevation16)]',
-  'surface-dialog':
-    '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation28)]',
+  'surface-card':
+    'bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] border border-[var(--colorNeutralStroke2)]',
+  'surface-card-elevated':
+    'bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)]',
+  'surface-flyout':
+    'bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusLarge)] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)]',
+  'surface-appbar':
+    'bg-[var(--colorNeutralBackgroundAlpha)] backdrop-blur-[30px] backdrop-saturate-[125%] border-b border-[var(--colorNeutralStroke2)] rounded-[var(--borderRadiusNone)]',
+  'surface-overlay':
+    'bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusXLarge)] shadow-[var(--elevation16)]',
+  'surface-dialog':
+    'bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation28)]',
```

**修改 3 — `image-card` shortcut（line 29）：**

```diff
-  'image-card':
-    '[background-color:var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] overflow-hidden shadow-[var(--elevation2)] border border-[var(--colorNeutralStroke2)] cursor-pointer transition-all active:scale-[0.98] select-none',
+  'image-card':
+    'bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] overflow-hidden shadow-[var(--elevation2)] border border-[var(--colorNeutralStroke2)] cursor-pointer transition-all active:scale-[0.98] select-none',
```

**修改 4 — `btn` shortcut（line 33）：已使用 `bg-transparent` 和 `text-white`（这些不涉及 CSS 变量，保持不变）。但 `btn-primary` (line 35) 和 `btn-secondary` (line 37) 使用了 `[background-color:var]` 和 `[border-color:var]`：**

```diff
-  'btn-primary':
-    'btn [background-color:var(--colorBrandBackground)] text-white [border-color:var(--colorBrandBackground)] hover:[background-color:var(--colorBrandBackgroundHover)] hover:[border-color:var(--colorBrandBackgroundHover)] active:[background-color:var(--colorBrandBackgroundPressed)] active:[border-color:var(--colorBrandBackgroundPressed)] disabled:opacity-50 disabled:cursor-not-allowed',
+  'btn-primary':
+    'btn bg-[var(--colorBrandBackground)] text-white border-[var(--colorBrandBackground)] hover:bg-[var(--colorBrandBackgroundHover)] hover:border-[var(--colorBrandBackgroundHover)] active:bg-[var(--colorBrandBackgroundPressed)] active:border-[var(--colorBrandBackgroundPressed)] disabled:opacity-50 disabled:cursor-not-allowed',
```

```diff
-  'btn-secondary':
-    'btn [background-color:var(--colorNeutralBackground1)] [color:var(--colorNeutralForeground1)] [border-color:var(--colorNeutralStroke1)] hover:[background-color:var(--colorNeutralBackground1Hover)] hover:[border-color:var(--colorNeutralStrokeAccessible)] active:[background-color:var(--colorNeutralBackground1Pressed)] active:[border-color:var(--colorNeutralStrokeAccessible)] disabled:opacity-50 disabled:cursor-not-allowed',
+  'btn-secondary':
+    'btn bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] border-[var(--colorNeutralStroke1)] hover:bg-[var(--colorNeutralBackground1Hover)] hover:border-[var(--colorNeutralStrokeAccessible)] active:bg-[var(--colorNeutralBackground1Pressed)] active:border-[var(--colorNeutralStrokeAccessible)] disabled:opacity-50 disabled:cursor-not-allowed',
```

```diff
-  'btn-subtle':
-    'btn bg-transparent [color:var(--colorNeutralForeground2)] border-transparent hover:[background-color:var(--colorNeutralBackground1Hover)] active:[background-color:var(--colorNeutralBackground1Pressed)] disabled:opacity-50 disabled:cursor-not-allowed',
+  'btn-subtle':
+    'btn bg-transparent text-[var(--colorNeutralForeground2)] border-transparent hover:bg-[var(--colorNeutralBackground1Hover)] active:bg-[var(--colorNeutralBackground1Pressed)] disabled:opacity-50 disabled:cursor-not-allowed',
```

```diff
-  'btn-icon':
-    'inline-flex items-center justify-center w-8 h-8 rounded-[var(--borderRadiusMedium)] [color:var(--colorNeutralForeground2)] bg-transparent border-transparent hover:[background-color:var(--colorNeutralBackground1Hover)] active:[background-color:var(--colorNeutralBackground1Pressed)] active:scale-90 transition-all select-none',
+  'btn-icon':
+    'inline-flex items-center justify-center w-8 h-8 rounded-[var(--borderRadiusMedium)] text-[var(--colorNeutralForeground2)] bg-transparent border-transparent hover:bg-[var(--colorNeutralBackground1Hover)] active:bg-[var(--colorNeutralBackground1Pressed)] active:scale-90 transition-all select-none',
```

**修改 5 — `input` shortcut（line 44-45）：**

```diff
-  'input':
-    'w-full px-[var(--spacingHorizontalMNudge)] py-[var(--spacingVerticalSNudge)] rounded-[var(--borderRadiusMedium)] [background-color:var(--colorNeutralBackground1)] [color:var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase300)] [line-height:var(--lineHeightBase300)] border border-[var(--colorNeutralStroke1)] placeholder:text-[var(--colorNeutralForegroundDisabled)] focus:outline-none focus:border-[var(--colorBrandStroke1)] focus:shadow-[0_0_0_1px_var(--colorBrandStroke1)] transition-all disabled:opacity-50 disabled:[background-color:var(--colorNeutralBackground2)]',
+  'input':
+    'w-full px-[var(--spacingHorizontalMNudge)] py-[var(--spacingVerticalSNudge)] rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] text-[var(--fontSizeBase300)] leading-[var(--lineHeightBase300)] border border-[var(--colorNeutralStroke1)] placeholder:text-[var(--colorNeutralForegroundDisabled)] focus:outline-none focus:border-[var(--colorBrandStroke1)] focus:shadow-[0_0_0_1px_var(--colorBrandStroke1)] transition-all disabled:opacity-50 disabled:bg-[var(--colorNeutralBackground2)]',
```

注意：`[font-size:var]` → `text-[var]`，`[line-height:var]` → `leading-[var]`。

**修改 6 — `label` shortcut（line 50-51）：**

```diff
-  'label':
-    '[font-size:var(--fontSizeBase200)] font-400 [color:var(--colorNeutralForeground2)] [line-height:var(--lineHeightBase200)]',
+  'label':
+    'text-[var(--fontSizeBase200)] font-400 text-[var(--colorNeutralForeground2)] leading-[var(--lineHeightBase200)]',
```

**修改 7 — `badge` shortcut（line 54-55）：**

```diff
-  'badge':
-    'inline-flex items-center rounded-[var(--borderRadiusCircular)] px-[var(--spacingHorizontalS)] py-[var(--spacingVerticalXXS)] [font-size:var(--fontSizeBase200)] font-400 [color:var(--colorNeutralForeground2)] [background-color:var(--colorNeutralBackground2)] border border-[var(--colorNeutralStroke2)]',
+  'badge':
+    'inline-flex items-center rounded-[var(--borderRadiusCircular)] px-[var(--spacingHorizontalS)] py-[var(--spacingVerticalXXS)] text-[var(--fontSizeBase200)] font-400 text-[var(--colorNeutralForeground2)] bg-[var(--colorNeutralBackground2)] border border-[var(--colorNeutralStroke2)]',
```

**修改 8 — `segmented` / `segmented-item-active` / `segmented-item-inactive` shortcuts（lines 58-65）：**

```diff
-  'segmented':
-    'flex [background-color:var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1',
+  'segmented':
+    'flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1',
```

```diff
-  'segmented-item-active':
-    'segmented-item [background-color:var(--colorNeutralBackground1)] [color:var(--colorNeutralForeground1)] shadow-[var(--elevation2)]',
-  'segmented-item-inactive':
-    'segmented-item [background-color:transparent] [color:var(--colorNeutralForeground2)] hover:[color:var(--colorNeutralForeground1)] hover:[background-color:var(--colorNeutralBackground2)]',
+  'segmented-item-active':
+    'segmented-item bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]',
+  'segmented-item-inactive':
+    'segmented-item bg-transparent text-[var(--colorNeutralForeground2)] hover:text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorNeutralBackground2)]',
```

---

- [ ] **Step 2: 新增 `badge-overlay` shortcut（用于 ImageCard 角标）**

在 `uno.config.ts` 的 shortcuts 末尾（`spinner` 后面，`});` 之前）添加：

```typescript
    // ── Image badge overlay (card corner label) ──
    'badge-overlay':
      'flex items-center gap-1 bg-[var(--colorImageBadgeBackground)] backdrop-blur-sm rounded-[var(--borderRadiusSmall)] px-1.5 py-0.5 text-[var(--colorImageBadgeForeground)] [font-size:var(--fontSizeBase100)] font-medium select-none pointer-events-none',
```

---

- [ ] **Step 3: Commit**

```bash
git add uno.config.ts
git commit -m "refactor: unify bracket syntax in UnoCSS shortcuts, add badge-overlay shortcut"
```

---

### Task 4: 修复 LoadingSpinner 使用 spinner shortcut

**Files:**

- Modify: `src/components/LoadingSpinner.tsx`

**Interfaces:**

- Consumes: `spinner` shortcut from `uno.config.ts`
- Produces: LoadingSpinner 使用 token 化样式

---

- [ ] **Step 1: 重写 LoadingSpinner 使用 shortcut + token**

将 `/Users/lilianda/develop/pixivizer/src/components/LoadingSpinner.tsx` 替换为：

```tsx
import type { Component } from "solid-js";

interface Props {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizes = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" };

const LoadingSpinner: Component<Props> = (props) => (
  <div class="flex flex-col items-center justify-center gap-3 py-8">
    <div class={`${sizes[props.size ?? "md"]} spinner`} />
    {props.text && (
      <p class="text-[var(--colorNeutralForegroundDisabled)] text-[var(--fontSizeBase200)]">
        {props.text}
      </p>
    )}
  </div>
);
```

---

- [ ] **Step 2: Commit**

```bash
git add src/components/LoadingSpinner.tsx
git commit -m "refactor: LoadingSpinner uses spinner shortcut and token colors"
```

---

### Task 5: 修复 ImageCard 角标使用 overlay token

**Files:**

- Modify: `src/components/ImageCard.tsx`

**Interfaces:**

- Consumes: `badge-overlay` shortcut from `uno.config.ts`
- Produces: 角标样式 token 化

---

- [ ] **Step 1: 替换角标 class**

在 `/Users/lilianda/develop/pixivizer/src/components/ImageCard.tsx` 中：

**Ugoira 角标（line 40）：**

```diff
-          <div class="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-[var(--borderRadiusSmall)] px-1.5 py-0.5 text-white [font-size:var(--fontSizeBase100)] font-medium select-none pointer-events-none">
+          <div class="absolute top-1.5 right-1.5 badge-overlay">
             ▶ 动图
           </div>
```

**多页角标（line 45）：**

```diff
-          <div class="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-[var(--borderRadiusSmall)] px-1.5 py-0.5 text-white [font-size:var(--fontSizeBase100)] font-medium select-none pointer-events-none">
+          <div class="absolute bottom-1.5 left-1.5 badge-overlay">
             📄 {props.illust.page_count}
           </div>
```

---

- [ ] **Step 2: Commit**

```bash
git add src/components/ImageCard.tsx
git commit -m "refactor: ImageCard badges use badge-overlay shortcut and overlay tokens"
```

---

### Task 6: 修复 ImageViewer 全屏覆盖层使用 overlay token

**Files:**

- Modify: `src/components/ImageViewer.tsx`

**Interfaces:**

- Consumes: Overlay token from `src/styles/tokens.css`
- Produces: 全屏查看器样式 token 化

---

- [ ] **Step 1: 替换硬编码值**

在 `/Users/lilianda/develop/pixivizer/src/components/ImageViewer.tsx` 中：

**全屏背景（line 90）：**

```diff
-      class="fixed inset-0 z-50 bg-black touch-none select-none"
+      class="fixed inset-0 z-50 touch-none select-none"
+      style={{ "background-color": "var(--colorOverlayBackground)" }}
```

**图片过渡（lines 96-98, 104-108）：**

```diff
-        class="flex h-full transition-transform duration-200"
+        class="flex h-full transition-transform duration-[var(--durationNormal)]"
         style={{
           transform: `translateX(-${currentPage() * 100}%)`,
         }}
       >
         {props.imageUrls.map((url, i) => (
           <div class="min-w-full h-full flex items-center justify-center">
             <img
               src={imgUrl(url)}
               alt={`page ${i + 1}`}
-              class="max-w-full max-h-full object-contain transition-transform duration-200"
+              class="max-w-full max-h-full object-contain transition-transform duration-[var(--durationNormal)]"
               style={{
```

**页面指示器（lines 124-126）：**

```diff
-              class={`w-2 h-2 rounded-full transition-colors ${
-                i === currentPage() ? 'bg-white' : 'bg-white/30'
+              class={`w-2 h-2 rounded-[var(--borderRadiusCircular)] transition-colors ${
+                i === currentPage() ? 'bg-[var(--colorOverlayForeground)]' : 'bg-[var(--colorOverlaySurface)]'
               }`}
```

**关闭按钮（lines 132-134）：**

```diff
       <button
-        class="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white text-xl"
+        class="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-[var(--borderRadiusCircular)] bg-[var(--colorOverlaySurface)] text-[var(--colorOverlayForeground)] text-xl"
         onClick={props.onClose}
       >
         ←
       </button>
```

---

- [ ] **Step 2: Commit**

```bash
git add src/components/ImageViewer.tsx
git commit -m "refactor: ImageViewer uses overlay tokens instead of hardcoded colors"
```

---

### Task 7: 修复 UgoiraViewer 全屏覆盖层使用 overlay token

**Files:**

- Modify: `src/components/UgoiraViewer.tsx`

**Interfaces:**

- Consumes: Overlay token from `src/styles/tokens.css`
- Produces: Ugoira 查看器样式 token 化

---

- [ ] **Step 1: 替换硬编码值**

在 `/Users/lilianda/develop/pixivizer/src/components/UgoiraViewer.tsx` 中：

**全屏背景（lines 90-91）：**

```diff
-      class="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm touch-none select-none flex items-center justify-center"
+      class="fixed inset-0 z-50 touch-none select-none flex items-center justify-center"
+      style={{ "background-color": "var(--colorOverlayBackground)" }}
```

**关闭按钮（lines 95-96）：**

```diff
       <button
-        class="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-[var(--borderRadiusCircular)] bg-white/10 backdrop-blur text-white text-xl hover:bg-white/20 active:bg-white/30 transition-all duration-[var(--durationFast)] border-none outline-none appearance-none cursor-pointer z-10"
+        class="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-[var(--borderRadiusCircular)] bg-[var(--colorOverlaySurface)] text-[var(--colorOverlayForeground)] text-xl hover:bg-[var(--colorOverlaySurfaceHover)] active:bg-[var(--colorOverlaySurfaceHover)] transition-all duration-[var(--durationFast)] border-none outline-none appearance-none cursor-pointer z-10"
         onClick={(e) => {
           e.stopPropagation();
           props.onClose();
```

**状态标签（lines 108-109, 113-114）：**

```diff
       {status() === "loading" && (
-        <div class="absolute top-4 right-4 px-2.5 py-1 rounded-[var(--borderRadiusCircular)] bg-white/10 backdrop-blur text-white [font-size:var(--fontSizeBase200)] font-medium z-10">
+        <div class="absolute top-4 right-4 px-2.5 py-1 rounded-[var(--borderRadiusCircular)] bg-[var(--colorOverlaySurface)] text-[var(--colorOverlayForeground)] text-[var(--fontSizeBase200)] font-medium z-10">
           加载中...
         </div>
       )}
       {status() === "paused" && (
-        <div class="absolute top-4 right-4 px-2.5 py-1 rounded-[var(--borderRadiusCircular)] bg-white/10 backdrop-blur text-white [font-size:var(--fontSizeBase200)] font-medium z-10">
+        <div class="absolute top-4 right-4 px-2.5 py-1 rounded-[var(--borderRadiusCircular)] bg-[var(--colorOverlaySurface)] text-[var(--colorOverlayForeground)] text-[var(--fontSizeBase200)] font-medium z-10">
           已暂停
         </div>
       )}
```

**错误状态文字（line 120）：**

```diff
-        <div class="text-white text-center px-6">
+        <div class="text-[var(--colorOverlayForeground)] text-center px-6">
```

---

- [ ] **Step 2: Commit**

```bash
git add src/components/UgoiraViewer.tsx
git commit -m "refactor: UgoiraViewer uses overlay tokens instead of hardcoded colors"
```

---

### Task 8: 修复 Bookmarks 不存在的 token + NavBar/SettingsSheet 括号语法

**Files:**

- Modify: `src/routes/Bookmarks.tsx`
- Modify: `src/components/NavBar.tsx`
- Modify: `src/components/SettingsSheet.tsx`

**Interfaces:**

- Consumes: `--colorNeutralBackground2` (替代不存在的 `--colorNeutralBackground4`)
- Produces: 组件统一使用 `text-[var]` / `bg-[var]` 语法

---

- [ ] **Step 1: 修复 Bookmarks.tsx — 替换不存在的 token**

在 `/Users/lilianda/develop/pixivizer/src/routes/Bookmarks.tsx` line 63：

```diff
-              style={{ background: "var(--colorNeutralBackground4)" }}
+              style={{ background: "var(--colorNeutralBackground2)" }}
```

---

- [ ] **Step 2: 修复 NavBar.tsx — 统一括号语法**

在 `/Users/lilianda/develop/pixivizer/src/components/NavBar.tsx` lines 20-22：

```diff
           classList={{
-            '[color:var(--colorBrandForeground1)]': currentTab() === tab.key,
-            '[color:var(--colorNeutralForeground2)] hover:[color:var(--colorNeutralForeground1)] active:[background-color:var(--colorNeutralBackground1Pressed)]':
+            'text-[var(--colorBrandForeground1)]': currentTab() === tab.key,
+            'text-[var(--colorNeutralForeground2)] hover:text-[var(--colorNeutralForeground1)] active:bg-[var(--colorNeutralBackground1Pressed)]':
               currentTab() !== tab.key,
           }}
```

---

- [ ] **Step 3: 修复 SettingsSheet.tsx — 统一括号语法**

在 `/Users/lilianda/develop/pixivizer/src/components/SettingsSheet.tsx` 中：

**Line 161 — listQuality segmented background：**

```diff
-              <div class="flex [background-color:var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
+              <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
```

**Lines 166-167 — listQuality active/inactive：**

```diff
                     classList={{
-                      '[background-color:var(--colorNeutralBackground1)] [color:var(--colorNeutralForeground1)] shadow-[var(--elevation2)]': listQuality() === q,
-                      '[background-color:transparent] [color:var(--colorNeutralForeground2)]': listQuality() !== q,
+                      'bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]': listQuality() === q,
+                      'bg-transparent text-[var(--colorNeutralForeground2)]': listQuality() !== q,
                     }}
```

**Line 182 — detailQuality segmented background：**

```diff
-              <div class="flex [background-color:var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
+              <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
```

**Lines 187-188 — detailQuality active/inactive：**

```diff
                     classList={{
-                      '[background-color:var(--colorNeutralBackground1)] [color:var(--colorNeutralForeground1)] shadow-[var(--elevation2)]': detailQuality() === q,
-                      '[background-color:transparent] [color:var(--colorNeutralForeground2)]': detailQuality() !== q,
+                      'bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]': detailQuality() === q,
+                      'bg-transparent text-[var(--colorNeutralForeground2)]': detailQuality() !== q,
                     }}
```

---

- [ ] **Step 4: Commit**

```bash
git add src/routes/Bookmarks.tsx src/components/NavBar.tsx src/components/SettingsSheet.tsx
git commit -m "fix: fix non-existent token in Bookmarks, unify bracket syntax in NavBar and SettingsSheet"
```

---

### Task 9: 修复 VirtualFeed 错误颜色逻辑

**Files:**

- Modify: `src/components/VirtualFeed.tsx`

**Interfaces:**

- Consumes: `props.error` string
- Produces: 统一使用 danger 样式显示所有错误

---

- [ ] **Step 1: 简化错误颜色逻辑**

在 `/Users/lilianda/develop/pixivizer/src/components/VirtualFeed.tsx` lines 199-206，移除中文关键词匹配，统一使用 danger 样式：

```diff
-      {props.error && (
-        <div
-          class="text-center py-4 px-4 mb-3 rounded-[var(--borderRadiusMedium)] mx-3"
-          classList={{
-            'bg-[var(--colorStatusDangerBackground2)] text-[var(--colorStatusDangerForeground1)]':
-              props.error.includes('失败') || props.error.includes('错误') || props.error.includes('登录') || props.error.includes('网络') || props.error.includes('权限'),
-            'bg-[var(--colorBrandStroke2)] text-[var(--colorNeutralForeground1)]':
-              !(props.error.includes('失败') || props.error.includes('错误') || props.error.includes('登录') || props.error.includes('网络') || props.error.includes('权限')),
-          }}
-        >
+      {props.error && (
+        <div class="text-center py-4 px-4 mb-3 rounded-[var(--borderRadiusMedium)] mx-3 bg-[var(--colorStatusDangerBackground2)] text-[var(--colorStatusDangerForeground1)]">
           <p class="[font-size:var(--fontSizeBase200)] leading-relaxed">{props.error}</p>
         </div>
       )}
```

---

- [ ] **Step 2: Commit**

```bash
git add src/components/VirtualFeed.tsx
git commit -m "fix: simplify VirtualFeed error colors, remove fragile keyword matching"
```

---

### Task 10: 更新 AGENTS.md 禁止清单 + 构建验证

**Files:**

- Modify: `AGENTS.md`

**Interfaces:**

- Produces: 更新后的禁止清单

---

- [ ] **Step 1: 更新 AGENTS.md 禁止清单**

在 `/Users/lilianda/develop/pixivizer/AGENTS.md` 的「禁止清单」表格中新增 4 行：

找到现有表格：

```markdown
| 禁止                               | 必须使用                                             |
| ---------------------------------- | ---------------------------------------------------- |
| 硬编码颜色值（`#xxx`、`rgb()`）    | `var(--colorXxx)`                                    |
| 硬编码圆角值（`8px`、`0.5rem`）    | `var(--borderRadiusXxx)`                             |
| 硬编码阴影值                       | `var(--elevationN)`                                  |
| 非 Fluent 缓动曲线                 | Fluent 标准曲线（见上表）                            |
| 非标准动画时长                     | Fluent duration（见上表）                            |
| 自定义字体大小（`15px`、`1.2rem`） | `var(--fontSizeBaseXxx)` 或 `var(--fontSizeHeroXxx)` |
| 裸 `:focus` 伪类                   | `:focus-visible`                                     |
```

在其后新增：

```markdown
| `[color:var(--colorXxx)]` 形式 | `text-[var(--colorXxx)]` |
| `[background-color:var(--colorXxx)]` 形式 | `bg-[var(--colorXxx)]` |
| `duration-200` / `duration-300` 等 | `duration-[var(--durationNormal)]` 等 |
| `bg-black` / `text-white` 硬编码 | 使用 overlay token（`--colorOverlay*`） |
```

---

- [ ] **Step 2: TypeScript 检查**

```bash
pnpm check
```

Expected: 无新增错误（0 errors）。

---

- [ ] **Step 3: Vite 构建验证**

```bash
pnpm build
```

Expected: 构建成功，无 CSS 相关错误。

---

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md prohibition list with bracket syntax and overlay rules"
```
