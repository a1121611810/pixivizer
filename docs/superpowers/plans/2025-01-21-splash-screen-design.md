# Pixivizer 启动画面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将启动时的「启动中...」LoadingSpinner 替换为简洁的 Fluent Design 启动画面：ProgressRing + 低对比度 "Pixivizer" 文字，带分层 fade-in 动效。

**Architecture:** 仅修改两个文件：`base.css` 添加 `splash-fade-in` 关键帧，`App.tsx` 替换 `<Show fallback>` 内容。不改动 `LoadingSpinner` 组件。

**Tech Stack:** SolidJS + UnoCSS + CSS 动画

## Global Constraints

- 所有颜色/间距/时长/曲线使用 CSS 变量（Fluent tokens），禁止硬编码
- 动画曲线仅限 Fluent 标准：`var(--curveDecelerateMid)`，时长 `var(--durationNormal)` (200ms)
- 不改动 `src/components/LoadingSpinner.tsx`
- 遵循项目 CSS 分层：关键帧放 `base.css`，组件样式用 UnoCSS shortcuts

---

### Task 1: 添加 splash fade-in 关键帧

**Files:**

- Modify: `src/styles/base.css:144`（在 `fluent-shimmer` 关键帧之后插入）

**Interfaces:**

- Produces: `@keyframes splash-fade-in` — `opacity 0 → 1`，无位移
- Produces: `@keyframes splash-fade-in-text` — `opacity 0 → 1`，与 container 相同，但通过 `animation-delay` 实现延迟

- [ ] **Step 1: 在 base.css 中添加关键帧**

在 `fluent-shimmer` 的 `}` 之后、`/* Accessibility */` 注释之前插入：

```css
/* Splash screen entrance: fade-in only, no movement */
@keyframes splash-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

- [ ] **Step 2: 验证 base.css 语法正确**

运行 `pnpm check` 确认无报错（此文件为 CSS 非 TS，check 命令只跑 TypeScript，手动确认 CSS 语法即可）。

- [ ] **Step 3: 提交**

```bash
git add src/styles/base.css
git commit -m "feat: add splash-fade-in keyframe for startup screen"
```

---

### Task 2: 替换 App.tsx 中的启动画面

**Files:**

- Modify: `src/App.tsx:11`（移除 LoadingSpinner import）
- Modify: `src/App.tsx:69`（替换 `<Show fallback>` 内容）

**Interfaces:**

- Consumes: `@keyframes splash-fade-in` from Task 1
- Consumes: `spinner` UnoCSS shortcut from `uno.config.ts`

- [ ] **Step 1: 移除不再使用的 LoadingSpinner import**

在 `src/App.tsx` 第 11 行，删除：

```typescript
import LoadingSpinner from "./components/LoadingSpinner";
```

- [ ] **Step 2: 替换 fallback 内容**

将第 69 行：

```tsx
<Show when={!isLoading()} fallback={<LoadingSpinner text="启动中..." />}>
```

替换为：

```tsx
<Show when={!isLoading()} fallback={
  <div
    class="flex flex-col items-center justify-center gap-3"
    style="animation: splash-fade-in var(--durationNormal) var(--curveDecelerateMid) both"
  >
    <div class="w-8 h-8 spinner" />
    <p
      class="text-[var(--fontSizeBase200)] text-[var(--colorNeutralForegroundDisabled)] font-400"
      style="animation: splash-fade-in var(--durationNormal) var(--curveDecelerateMid) 300ms both"
    >
      Pixivizer
    </p>
  </div>
}>
```

布局说明：

- 外层 `div`：flex 垂直居中，`gap-3`（12px 环与文字间距），200ms fade-in
- 内层 `div.w-8.h-8.spinner`：ProgressRing (32px)，复用现有 `spinner` shortcut
- `<p>`：12px Caption + 低对比度灰色 `colorNeutralForegroundDisabled`，300ms 延迟 fade-in，`animation-fill-mode: both` 确保延迟期间保持透明

- [ ] **Step 3: TypeScript 类型检查**

```bash
pnpm check
```

预期：无新增错误。如果 `LoadingSpinner` import 移除后无其他引用报错，说明清理干净。

- [ ] **Step 4: 提交**

```bash
git add src/App.tsx
git commit -m "feat: replace startup splash with Fluent Design ProgressRing + Pixivizer text"
```

---

### Task 3: 端到端验证

**Files:**

- 无修改，仅验证

- [ ] **Step 1: 完整构建检查**

```bash
pnpm build
```

预期：TypeScript 类型检查通过，Vite 构建成功。

- [ ] **Step 2: 开发服务器预览**

```bash
pnpm dev
```

在浏览器中打开，验证：

- 刷新页面时看到 fade-in 动画（约 200ms）
- ProgressRing 旋转正常
- "Pixivizer" 文字延迟出现（如果 auth 恢复快可能看不到）
- 加载完成后自动跳转到 `/recommended` 或 `/login`
- 无 console 错误

- [ ] **Step 3: 提交（如有修正）**

如验证中发现问题，修复后提交：

```bash
git add -A
git commit -m "fix: splash screen adjustments from e2e verification"
```
