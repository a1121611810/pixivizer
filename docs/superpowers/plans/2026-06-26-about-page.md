# About Page (关于页) 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Pixivizer 新增 `/about` 路由页面（Fluent 列表式布局，数据驱动渲染），入口在设置面板底部。

**Architecture:** 新增 `src/routes/About.tsx` 组件（PageTransition 包裹 + sticky header + 数据驱动 sections 列表）；在 `src/App.tsx` 添加 `/about` 路由；在 `src/components/SettingsSheet.tsx` 底部版本号改为可点击列表行入口；Vite `define` 注入 `APP_VERSION`。

**Tech Stack:** SolidJS + TypeScript (strict) + Fluent Design System 2 (CSS tokens)

## Global Constraints

- 所有颜色/字号/间距使用 Fluent 设计令牌（`var(--colorXxx)`, `var(--fontSizeXxx)` 等）
- 动画使用 Fluent duration tokens（`var(--durationNormal)`, `var(--durationGentle)` 等）
- 缓动曲线使用 Fluent 标准曲线（`var(--curveEasyEase)`, `var(--curveDecelerateMid)` 等）
- 可交互元素覆盖 hover / active (`scale(0.98)`) / focus-visible 三种状态
- 触控目标最小 40×40px
- 版本号从 `package.json` 读取，构建时注入，不硬编码
- 数据驱动渲染：sections 数组遍历，扩展只需 push 新条目
- 不 commit（用户自行审查后提交）

---

### Task 1: Vite define 注入 APP_VERSION + 类型声明

**Files:**

- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Create: `src/types/env.d.ts`

**Produced by this task:**

- 构建时全局常量 `APP_VERSION`（类型 `string`）

- [ ] **Step 1: 在 tsconfig.json 中启用 resolveJsonModule**

在 `tsconfig.json` 第 13 行 `"verbatimModuleSyntax": true,` 之后添加：

```json
    "resolveJsonModule": true,
```

- [ ] **Step 2: 在 vite.config.ts 中添加 define**

在 `vite.config.ts` 第 6 行（`import postcssPxToRem` 之后）插入 import：

```ts
import pkg from "./package.json";
```

在配置对象中（`plugins: [solid(), UnoCSS()],` 之后）插入：

```ts
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
  },
```

- [ ] **Step 3: 创建类型声明文件 `src/types/env.d.ts`**

```ts
// src/types/env.d.ts
declare const APP_VERSION: string;
```

- [ ] **Step 4: 验证 — 运行 TypeScript 检查**

```bash
pnpm check
```

预期：TypeScript 编译无错误。

---

### Task 2: 创建 About 页面组件

**Files:**

- Create: `src/routes/About.tsx`

**Consumes:** `APP_VERSION` 全局常量（from Task 1）
**Produces:** `About` 组件（默认导出，`Component` 类型，无 props）

- [ ] **Step 1: 编写 About.tsx 完整代码**

```tsx
// src/routes/About.tsx
import { type Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import PageTransition from "../components/PageTransition";

// ── Fluent UI System Icons (24px) — SVG path data ──
const iconPaths = {
  info: {
    regular:
      "M12 1.999c5.524 0 10 4.476 10 10s-4.476 10-10 10-10-4.476-10-10 4.476-10 10-10zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm0 12a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0-8.75a1.25 1.25 0 0 1 1.25 1.25v4.75a1.25 1.25 0 0 1-2.5 0V7.999A1.25 1.25 0 0 1 12 6.749z",
    filled:
      "M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10 10-4.477 10-10zM12 16.499a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0-9.75a1.25 1.25 0 0 1 1.25 1.25v4.75a1.25 1.25 0 0 1-2.5 0V7.999c0-.69.56-1.25 1.25-1.25z",
  },
  wrench: {
    regular:
      "M13.497 2a4.502 4.502 0 0 0-4.305 5.881l-6.34 6.34a2.001 2.001 0 0 0 2.83 2.83l6.335-6.334A4.503 4.503 0 0 0 18 6.502 4.502 4.502 0 0 0 13.497 2zm-3.003 4.5A3.003 3.003 0 0 1 13.499 3.5 3.003 3.003 0 0 1 16.049 8.25l-1.812-1.812a.75.75 0 0 0-1.06 0l-.343.343a.75.75 0 0 0 0 1.06l1.812 1.812A3.003 3.003 0 0 1 10.494 6.5zm-4.06 8.25 1.813-1.812a.75.75 0 0 0 0-1.06l-.343-.343a.75.75 0 0 0-1.06 0L5 13.347l-1.47-1.47a.752.752 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0z",
    filled:
      "M16.75 2a5.25 5.25 0 0 0-5.039 3.63l-5.648 5.648a2.751 2.751 0 0 0 3.89 3.89l5.643-5.644A5.252 5.252 0 0 0 22 7.252 5.251 5.251 0 0 0 16.75 2zM6.05 13.036l-1.99 1.99a1.251 1.251 0 0 0 1.77 1.77l1.99-1.99z",
  },
  chevronRight: {
    regular:
      "M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z",
    filled:
      "M8.22 4.22a.75.75 0 0 1 1.06 0l6.75 6.75c.29.29.29.77 0 1.06l-6.75 6.75a.75.75 0 0 1-1.06-1.06L14.44 12 8.22 5.28a.75.75 0 0 1 0-1.06z",
  },
};

type IconName = keyof typeof iconPaths;

const FluentIcon: Component<{ name: IconName; size?: number }> = (props) => {
  const paths = iconPaths[props.name];
  const size = props.size ?? 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={paths.regular} fill="currentColor" />
    </svg>
  );
};

// ── Data model ──
interface AboutRow {
  label: string;
  value: string;
  icon: IconName;
}

interface AboutSection {
  title: string;
  rows: AboutRow[];
}

const sections: AboutSection[] = [
  {
    title: "应用信息",
    rows: [
      { label: "应用版本", value: APP_VERSION, icon: "info" },
      { label: "构建目标", value: "Android (Capacitor)", icon: "wrench" },
    ],
  },
  // 后续扩展只需在此数组 push 新 section 或 row
];

// ── Component ──
const About: Component = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div class="min-h-screen pb-16">
        {/* Sticky header — same pattern as PersonalCenter */}
        <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4 gap-3">
          <button onClick={() => navigate(-1)} class="btn-icon flex-shrink-0" aria-label="返回">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15.53 4.22a.75.75 0 0 1 0 1.06L8.81 12l6.72 6.72a.75.75 0 1 1-1.06 1.06l-7.25-7.25a.75.75 0 0 1 0-1.06l7.25-7.25a.75.75 0 0 1 1.06 0z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] flex-1">
            关于
          </h1>
        </header>

        {/* ── Brand area ── */}
        <div class="flex flex-col items-center pt-10 pb-6 gap-3">
          {/* Pixivizer logo — same SVG as splash screen (64px version) */}
          <svg width="64" height="64" viewBox="0 0 192 192" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="aboutPGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#0078d4" />
                <stop offset="55%" stop-color="#2899f5" />
                <stop offset="100%" stop-color="#60aaff" />
              </linearGradient>
            </defs>
            <rect
              x="12"
              y="12"
              width="168"
              height="168"
              rx="44"
              fill="var(--colorNeutralBackground2)"
            />
            <path d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z" fill="url(#aboutPGrad)" />
            <path
              d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
              fill="white"
              fill-opacity="0.12"
            />
          </svg>

          <div class="text-center">
            <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
              Pixivizer
            </p>
            <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug mt-0.5">
              Pixiv 第三方客户端
            </p>
          </div>
        </div>

        {/* ── Info sections ── */}
        {sections.map((section) => (
          <section class="mb-1">
            <p class="px-5 py-2 [font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground2)] uppercase tracking-wide">
              {section.title}
            </p>
            <div class="mx-4 rounded-[var(--borderRadiusLarge)] bg-[var(--colorNeutralBackground1)] overflow-hidden">
              {section.rows.map((row, idx, arr) => (
                <>
                  <div class="flex items-center justify-between px-4 min-h-11 py-3">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                      <div class="w-5 h-5 flex-shrink-0 text-[var(--colorNeutralForeground2)] flex items-center justify-center">
                        <FluentIcon name={row.icon} size={20} />
                      </div>
                      <span class="[font-size:var(--fontSizeBase300)] text-[var(--colorNeutralForeground1)] leading-snug truncate">
                        {row.label}
                      </span>
                    </div>
                    <span class="[font-size:var(--fontSizeBase300)] text-[var(--colorNeutralForeground2)] leading-snug text-right flex-shrink-0 ml-3">
                      {row.value}
                    </span>
                  </div>
                  {idx < arr.length - 1 && <div class="mx-4 divider" />}
                </>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageTransition>
  );
};

export default About;
```

- [ ] **Step 2: 验证 — TypeScript 检查**

```bash
pnpm check
```

预期：无新增 TS 错误。

---

### Task 3: 添加 /about 路由

**Files:**

- Modify: `src/App.tsx`

**Consumes:** `About` 组件默认导出（from Task 2）

- [ ] **Step 1: 在 App.tsx 中添加 import 和路由**

在 `src/App.tsx` 的 import 区域（第 26 行 `import UserIllusts` 之后）插入：

```ts
import About from "./routes/About";
```

在路由表区域（第 229 行 `</Route>` 关闭后、第 230 行 `*` fallback 之前）插入：

```tsx
<Route path="/about" component={About} />
```

完整上下文（第 228-231 行区域）：

```tsx
      <Route path="/user/:id" component={PersonalCenter} />
      <Route path="/about" component={About} />
      <Route path="*" component={Login} />
```

- [ ] **Step 2: 验证 — TypeScript 检查**

```bash
pnpm check
```

预期：无新增 TS 错误。

---

### Task 4: 修改 SettingsSheet 底部版本号为可点击入口

**Files:**

- Modify: `src/components/SettingsSheet.tsx`

**Consumes:** `APP_VERSION` 全局常量（from Task 1）

- [ ] **Step 1: 添加 navigate import**

在 `SettingsSheet.tsx` 顶部（第 1 行 import 区域），将 `import { type Component, Show, createSignal, createEffect, onCleanup } from "solid-js";` 行中 Simon 的 import 保持不变，但需要新增 `useNavigate`：

在现有 import 行之后添加：

```ts
import { useNavigate } from "@solidjs/router";
```

或者在组件内部添加：

```ts
const navigate = useNavigate();
```

在 `SettingsSheet` 函数内部（约第 113 行 `const [closing, setClosing] = createSignal(false);` 之前或之后）添加：

```ts
const navigate = useNavigate();
```

- [ ] **Step 2: 替换版本号 footer 为可点击列表行入口**

将 `src/components/SettingsSheet.tsx` 第 604-612 行的：

```tsx
{
  /* Divider */
}
<div class="divider mx-5" />;

{
  /* Version footer */
}
<div class="px-5 py-4">
  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForegroundDisabled)] text-center select-none">
    Pixivizer v0.1.0
  </p>
</div>;
```

替换为：

```tsx
{
  /* Divider */
}
<div class="divider mx-5" />;

{
  /* About entry — clickable row */
}
<div
  class="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] mx-4 mb-4"
  onClick={() => {
    close();
    navigate("/about");
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      close();
      navigate("/about");
    }
  }}
  role="button"
  tabindex="0"
  aria-label="关于"
>
  <div class="flex items-center gap-3 min-w-0">
    {/* Pixivizer logo — small 32px */}
    <svg
      width="32"
      height="32"
      viewBox="0 0 192 192"
      fill="none"
      aria-hidden="true"
      class="flex-shrink-0"
    >
      <defs>
        <linearGradient id="settingsPGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0078d4" />
          <stop offset="55%" stop-color="#2899f5" />
          <stop offset="100%" stop-color="#60aaff" />
        </linearGradient>
      </defs>
      <rect x="12" y="12" width="168" height="168" rx="44" fill="var(--colorNeutralBackground2)" />
      <path d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z" fill="url(#settingsPGrad)" />
      <path
        d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
        fill="white"
        fill-opacity="0.12"
      />
    </svg>
    <div class="min-w-0">
      <p class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
        Pixivizer
      </p>
      <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
        关于 · v{APP_VERSION}
      </p>
    </div>
  </div>
  {/* Chevron right */}
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    class="flex-shrink-0 text-[var(--colorNeutralForeground3)] ml-2"
  >
    <path
      d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z"
      fill="currentColor"
    />
  </svg>
</div>;
```

- [ ] **Step 3: 验证 — TypeScript 检查**

```bash
pnpm check
```

预期：无新增 TS 错误。

---

### Task 5: 端到端验证

- [ ] **Step 1: 启动开发服务器**

```bash
pnpm dev
```

- [ ] **Step 2: 手动验证清单**
  1. 打开设置面板 → 底部出现 "Pixivizer · 关于 · v0.1.0" 可点击行
  2. 点击该行 → 跳转到 `/about` 页面，设置面板关闭
  3. 关于页显示：顶部品牌区（logo + "Pixivizer" + "Pixiv 第三方客户端"）
  4. 下方 "应用信息" 分组：应用版本 `0.1.0`、构建目标 `Android (Capacitor)`
  5. 左上角返回按钮 → 返回到上一页
  6. Android 返回键/手势 → 返回到上一页
  7. 页面进出动画流畅（Fluent fade transition）

- [ ] **Step 3: 运行完整构建验证**

```bash
pnpm build
```

预期：构建成功，无错误。
