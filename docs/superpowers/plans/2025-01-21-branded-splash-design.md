# Pixivizer Branded Splash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将启动画面升级为 Fluent 品牌化 splash：64px image icon + "Pixivizer" 标题 + "Pixiv 第三方客户端" 副标题 + 16px 延迟 ProgressRing，带 staggered 入场动画。

**Architecture:** 仅修改两个文件：`base.css` 新增 `splash-fade-slide-up` 关键帧，`App.tsx` 替换 splash fallback 为完整品牌布局。SVG icon path 从 `SettingsSheet.tsx` 中提取的 Fluent `image` (filled) 图标，内联在 JSX 中。

**Tech Stack:** SolidJS + JSX 内联 SVG + CSS 关键帧动画

## Global Constraints

- 所有颜色/间距/时长使用 CSS 变量（Fluent tokens），禁止硬编码
- 动画曲线仅限 Fluent 标准：`var(--curveDecelerateMid)` = `cubic-bezier(0,0,0,1)`
- 不改动 `src/components/LoadingSpinner.tsx`、`src/components/SettingsSheet.tsx`、`uno.config.ts`
- 遵循项目 CSS 分层：关键帧放 `base.css`

---

### Task 1: 添加 splash-fade-slide-up 关键帧

**Files:**

- Modify: `src/styles/base.css`（在 `splash-fade-in` 之后插入）

**Interfaces:**

- Produces: `@keyframes splash-fade-slide-up` — `opacity 0 → 1` + `translateY(4px → 0)`

- [ ] **Step 1: 在 base.css 中添加关键帧**

在 `splash-fade-in` 的 `}` 之后、`/* Accessibility */` 注释之前插入：

```css
/* Splash text entrance: fade + micro-slide-up */
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

- [ ] **Step 2: 构建验证**

```bash
pnpm build
```

预期：无错误。

---

### Task 2: 替换 App.tsx splash 为品牌布局

**Files:**

- Modify: `src/App.tsx:68-83`（替换 `<Show fallback>` 内容）

**Interfaces:**

- Consumes: `@keyframes splash-fade-in`（已有，用于延迟 ProgressRing）
- Consumes: `@keyframes fluent-scale-enter`（已有，用于 icon 入场）
- Consumes: `@keyframes splash-fade-slide-up`（Task 1 新增，用于标题/副标题）
- Consumes: `spinner` UnoCSS shortcut（已修复，用于 ProgressRing）

- [ ] **Step 1: 替换 fallback 内容**

将 `src/App.tsx` 第 68-83 行：

```tsx
      <Show
        when={!isLoading()}
        fallback={
          <div class="flex flex-col items-center justify-center gap-3 min-h-screen">
            <div
              class="w-8 h-8 spinner"
              style="animation: splash-fade-in var(--durationNormal) var(--curveDecelerateMid) both"
            />
            <p
              class="text-[var(--fontSizeBase200)] text-[var(--colorNeutralForegroundDisabled)] font-400"
              style="animation: splash-fade-in var(--durationNormal) var(--curveDecelerateMid) 300ms both"
            >
              Pixivizer
            </p>
          </div>
        }
      >
```

替换为：

```tsx
      <Show
        when={!isLoading()}
        fallback={
          <div class="flex flex-col items-center justify-center min-h-screen gap-4">
            {/* Icon: Fluent image (filled), 64px, brand color, scale entrance */}
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              style="animation: fluent-scale-enter var(--durationNormal) var(--curveDecelerateMid) both"
            >
              <path
                d="M17.75 3A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3zm-1.72 7.78a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5zM5 15.25V17.5l.005.16A1.75 1.75 0 0 0 6.75 19.25h10.5a1.75 1.75 0 0 0 1.745-1.607L19 17.5v-2.25a.75.75 0 0 0-.648-.743L18.25 14.5H5.75a.75.75 0 0 0-.743.648z"
                fill="var(--colorBrandForeground1)"
              />
            </svg>

            {/* Brand text: staggered fade-slide-up */}
            <div class="flex flex-col items-center gap-1">
              <h1
                class="text-[var(--fontSizeBase600)] font-semibold text-[var(--colorNeutralForeground1)] leading-none"
                style="animation: splash-fade-slide-up var(--durationNormal) var(--curveDecelerateMid) 100ms both"
              >
                Pixivizer
              </h1>
              <p
                class="text-[var(--fontSizeBase200)] text-[var(--colorNeutralForegroundDisabled)] font-400"
                style="animation: splash-fade-slide-up var(--durationNormal) var(--curveDecelerateMid) 200ms both"
              >
                Pixiv 第三方客户端
              </p>
            </div>

            {/* ProgressRing: 16px, delayed 500ms — only visible if auth is slow */}
            <div
              class="w-4 h-4 [border-width:var(--strokeWidthThick)] border-solid [border-color:var(--colorNeutralStroke2)] [border-top-color:var(--colorBrandStroke1)] rounded-[var(--borderRadiusCircular)]"
              style="animation: splash-fade-in var(--durationNormal) var(--curveDecelerateMid) 500ms both, spin 1s linear infinite"
            />
          </div>
        }
      >
```

> **注意**：ProgressRing 不使用 `spinner` shortcut（它是为 32px 设计的，3px 边框在 16px 上过粗），改用 `strokeWidthThick`（2px）显式设置。

- [ ] **Step 2: TypeScript 类型检查 + 格式化**

```bash
pnpm check -- --fix
```

预期：0 errors。

- [ ] **Step 3: 构建验证**

```bash
pnpm build
```

预期：无错误。

---

### Task 3: 开发服务器验证

**Files:**

- 无修改，仅验证

- [ ] **Step 1: 启动开发服务器**

```bash
pnpm dev
```

- [ ] **Step 2: 浏览器中验证以下行为**

1. 刷新页面，icon 以 scale-enter 动画出现（200ms，从 96% 缩放 + 淡入）
2. "Pixivizer" 标题在 icon 后 100ms fade-slide-up 出现
3. 副标题在 200ms 出现
4. ProgressRing（16px 小环）在 500ms 后才出现（auth 快则不出现）
5. 所有元素垂直居中于页面
6. Icon 颜色为品牌蓝（`colorBrandForeground1`）
7. 加载完成后自动跳转到 `/recommended` 或 `/login`
8. 无 console 错误

- [ ] **Step 3: 如有问题，修复后重新验证**
