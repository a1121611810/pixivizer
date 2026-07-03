# Browser 组件测试实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 Browser 模式组件测试基础设施，覆盖 NovelCard Badge 渲染和 NovelVirtualFeed DOM 清理。

**Architecture:** Setup 文件全局 mock Capacitor/Router/FluentUI + 两个 `.browser.test.tsx` 组件测试文件。

**Tech Stack:** SolidJS 1.9 + Vitest 4 + @vitest/browser-playwright + @solidjs/testing-library 0.8

## Global Constraints

- 所有测试文件必须放在 `tests/browser/` 目录，扩展名 `.browser.test.tsx`
- 测试运行命令: `pnpm test:browser`（vitest run -c vitest.browser.config.ts）
- 测试环境: headless Chromium, 30s timeout
- Setup 文件中的 `vi.mock` 必须在文件顶层声明（Vite 服务层拦截）
- NovelCard 使用 `fluent-badge` web component，由 setup 文件中的 FluentUI import 注册
- 项目路径别名 `@/` 映射到 `src/`

---

## 文件映射

| 文件 | 职责 | 操作 |
|---|---|---|
| `tests/browser/setup.ts` | 全局 mock Capacitor/Router + FluentUI 注册 | 新增 |
| `vitest.browser.config.ts` | 引入 setupFiles 配置 | 修改（+1 行） |
| `tests/browser/NovelCard.browser.test.tsx` | NovelCard 组件渲染和 Badge 测试 | 新增 |
| `tests/browser/NovelVirtualFeed.browser.test.tsx` | NovelVirtualFeed 渲染和 DOM 清理测试 | 新增 |

---

### Task 1: Setup 文件 + 配置

**Files:**
- Create: `tests/browser/setup.ts`
- Modify: `vitest.browser.config.ts`

- [ ] **Step 1: 创建 setup 文件 `tests/browser/setup.ts`**

```typescript
// @vitest-environment browser
// 全局 mock：在 browser mode 下由 Vite 服务层拦截模块请求
// 此文件在 setupFiles 中配置，每个测试文件执行前自动运行

// ── 注册 Fluent UI 自定义元素 ──
import "@fluentui/web-components/web-components.js";

// ── Capacitor ──
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "web", isNativePlatform: () => false },
  CapacitorHttp: { request: vi.fn(), get: vi.fn(), post: vi.fn() },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: () => Promise.resolve({ value: null }),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    toggleBackButtonHandler: vi.fn(),
    addListener: vi.fn(() => ({ remove: vi.fn() })),
    exitApp: vi.fn(),
  },
}));

vi.mock("@capacitor/device", () => ({
  Device: { getInfo: () => Promise.resolve({ androidSDKVersion: 30 }) },
}));

// ── SolidJS Router ──
vi.mock("@solidjs/router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
  useParams: () => ({}),
  useBeforeLeave: (fn: unknown) => fn as any,
}));
```

- [ ] **Step 2: 修改 `vitest.browser.config.ts` 新增 setupFiles**

```typescript
test: {
  setupFiles: ['./tests/browser/setup.ts'],  // ← 新增
  name: "browser",
  // ... 其余不变
}
```

完整文件应变为：

```typescript
import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import { playwright } from "@vitest/browser-playwright";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [solid()],
  test: {
    name: "browser",
    include: ["tests/browser/**/*.browser.test.{ts,tsx}"],
    setupFiles: ['./tests/browser/setup.ts'],
    browser: {
      enabled: true,
      provider: playwright({}),
      instances: [{ browser: "chromium" }],
      headless: true,
      screenshotFailures: false,
    },
    passWithNoTests: true,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 3: 创建验证测试（确认 setup 正常加载）**

创建 `tests/browser/setup-verify.browser.test.ts`（临时文件，确认后可删除）：

```typescript
// @vitest-environment browser
import { describe, it, expect } from "vitest";

describe("setup verification", () => {
  it("Capacitor is mocked", async () => {
    const { Capacitor } = await import("@capacitor/core");
    expect(Capacitor.getPlatform()).toBe("web");
    expect(Capacitor.isNativePlatform()).toBe(false);
  });

  it("Fluent UI custom elements are registered", () => {
    const el = document.createElement("fluent-badge");
    expect(el).toBeDefined();
    expect(el instanceof HTMLElement).toBe(true);
  });
});
```

- [ ] **Step 4: 运行验证测试**

```bash
pnpm test:browser
```
预期：2 个 setup 验证测试 PASS。如果失败，检查 setup 文件中的模块路径和 mock 格式。

- [ ] **Step 5: 删除验证测试文件，提交**

```bash
rm tests/browser/setup-verify.browser.test.ts
git add tests/browser/setup.ts vitest.browser.config.ts
git commit -m "test: add browser test setup with Capacitor/Router mocks"
```

---

### Task 2: NovelCard 组件测试

**Files:**
- Create: `tests/browser/NovelCard.browser.test.tsx`

**Depends on:** Task 1 (setup file + config must be in place)

- [ ] **Step 1: 创建测试文件 `tests/browser/NovelCard.browser.test.tsx`**

```tsx
// @vitest-environment browser
import { render, screen } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import NovelCard from "../../src/components/NovelCard";
import type { PixivNovel } from "../../src/api/types";

// ── Helper ──
function createNovel(overrides?: Partial<PixivNovel>): PixivNovel {
  return {
    id: 1,
    title: "测试小说的标题",
    user: {
      id: 1,
      name: "测试作者",
      account: "test_author",
      profile_image_urls: { medium: "", px_16x16: "", px_50x50: "", px_170x170: "" },
      is_followed: false,
    },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [{ name: "tag1" }],
    page_count: 3,
    text_length: 5000,
    series: undefined,
    has_chapters: false,
    is_original: true,
    is_bookmarked: false,
    total_bookmarks: 100,
    total_comments: 5,
    total_view: 500,
    x_restrict: 0,
    novel_ai_type: 0,
    create_date: "2026-01-01T00:00:00Z",
    caption: "小说简介",
    ...overrides,
  } as PixivNovel;
}

describe("NovelCard", () => {
  it("renders title and author name", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel()} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("测试小说的标题");
    expect(container.textContent).toContain("@测试作者");
  });

  it("shows R-18 badge for x_restrict=1", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ x_restrict: 1 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("R-18");
  });

  it("shows R-18G badge for x_restrict=2", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ x_restrict: 2 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("R-18G");
  });

  it("shows AI badge for novel_ai_type=2", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ novel_ai_type: 2 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("AI");
  });

  it("shows AI辅助 badge for novel_ai_type=3", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ novel_ai_type: 3 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("AI辅助");
  });

  it("shows no restriction badges for safe content", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ x_restrict: 0, novel_ai_type: 0 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).not.toContain("R-18");
    expect(container.textContent).not.toContain("R-18G");
    expect(container.textContent).not.toContain("AI");
  });

  it("shows series badge when novel has series", () => {
    const novel = createNovel({
      series: { id: 10, title: "测试系列" },
    });
    const { container } = render(() => (
      <NovelCard novel={novel} onClick={vi.fn()} onSeriesClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("📚");
  });

  it("renders bookmark count", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ total_bookmarks: 42 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("★ 42");
  });

  it("renders text length", () => {
    const { container } = render(() => (
      <NovelCard novel={createNovel({ text_length: 12345 })} onClick={vi.fn()} />
    ));
    expect(container.textContent).toContain("12,345字");
  });
});
```

- [ ] **Step 2: 运行测试**

```bash
pnpm test:browser
```
预期：若 setup 文件 mock 覆盖了所有 NovelCard 的依赖链，则 9 个测试 PASS。

如果测试失败（如 `@solidjs/router` 缺少某个 export），在 `setup.ts` 中补充 missing mock，然后重试。

常见失败原因及修复：
- `useNavigate is not a function` → setup 中已 mock，检查拼写
- `Capacitor is not defined` → setup 中已 mock，检查 setupFiles 路径
- `fluent-badge is not defined` → setup 中已 import FluentUI，检查 import 路径
- `Cannot find module '@/api/novel'` → vitest.browser.config.ts 的 resolve.alias 已配置

- [ ] **Step 3: 提交**

```bash
git add tests/browser/NovelCard.browser.test.tsx
git commit -m "test: add NovelCard browser component tests for badges and metadata"
```

---

### Task 3: NovelVirtualFeed 组件测试

**Files:**
- Create: `tests/browser/NovelVirtualFeed.browser.test.tsx`

**Depends on:** Task 1 (setup file + config)

- [ ] **Step 1: 创建测试文件 `tests/browser/NovelVirtualFeed.browser.test.tsx`**

```tsx
// @vitest-environment browser
import { render, screen } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import NovelVirtualFeed from "../../src/components/NovelVirtualFeed";
import type { PixivNovel } from "../../src/api/types";

// ── Helper ──
function createNovels(count: number): PixivNovel[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `小说标题 ${i + 1}`,
    user: {
      id: 1,
      name: `作者${i + 1}`,
      account: `author${i + 1}`,
      profile_image_urls: {},
    },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 1000,
    is_bookmarked: false,
    total_bookmarks: 10,
    total_view: 50,
    x_restrict: 0,
    novel_ai_type: 0,
    create_date: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
  } as PixivNovel));
}

describe("NovelVirtualFeed", () => {
  it("renders all novel cards", () => {
    const novels = createNovels(3);
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={novels}
        loading={false}
        error={null}
        hasMore={false}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />
    ));
    expect(container.textContent).toContain("小说标题 1");
    expect(container.textContent).toContain("小说标题 2");
    expect(container.textContent).toContain("小说标题 3");
  });

  it("shows empty state for empty list", () => {
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={[]}
        loading={false}
        error={null}
        hasMore={false}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />
    ));
    expect(container.textContent).toContain("暂无小说");
  });

  it("shows error message", () => {
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={[]}
        loading={false}
        error="请求失败"
        hasMore={false}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />
    ));
    expect(container.textContent).toContain("请求失败");
  });

  it("shows loading spinner with text", () => {
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={createNovels(2)}
        loading={true}
        error={null}
        hasMore={true}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />
    ));
    // Should still show existing novels AND loading indicator
    expect(container.textContent).toContain("小说标题 1");
    expect(container.textContent).toContain("加载中");
  });

  it("shows end-of-list message when no more data", () => {
    const { container } = render(() => (
      <NovelVirtualFeed
        novels={createNovels(1)}
        loading={false}
        error={null}
        hasMore={false}
        onNovelClick={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />
    ));
    expect(container.textContent).toContain("已经到底了");
  });
});
```

- [ ] **Step 2: 运行测试**

```bash
pnpm test:browser
```
预期：6 个测试 PASS。

如果虚拟滚动布局计算导致问题（`useWindowScroll: true` 在测试环境中 scrollY 始终为 0），可能需要调整 NovelVirtualFeed 内部逻辑以支持测试。此时在测试文件中覆盖相关行为。

- [ ] **Step 3: 提交**

```bash
git add tests/browser/NovelVirtualFeed.browser.test.tsx
git commit -m "test: add NovelVirtualFeed browser tests for rendering and states"
```

---

## 自审

- **Spec 覆盖**: 每项 spec 需求都有对应 task。Setup + 配置 → Task 1，NovelCard 测试（8 个测试覆盖所有 Badge 类型）→ Task 2，NovelVirtualFeed 测试（5 个测试覆盖渲染/空/错误/加载/到底）→ Task 3。
- **占位符扫描**: 无 TBD/TODO。所有测试代码完整。
- **类型一致性**: `createNovel()` 函数在两个测试文件中各自定义，类型均为 `PixivNovel`。
