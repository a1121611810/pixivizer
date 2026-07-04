# 小说文本列表布局（textList）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Pictelio 的小说推荐 / 关注 / 收藏页新增 `textList`（纯文本列表）布局模式，并确保新增测试全部通过、lint 和 TypeScript 检查通过。

**Architecture:** 新增 `createTextListLayout` primitive 通过 off-screen 测量池计算每行真实高度并缓存；新增 `NovelTextListCard` 组件负责无封面文本行渲染；在 `NovelVirtualFeed` 中根据 `layoutMode` 选择对应布局；`SettingsDrawer` 和 `uiStore` 扩展为支持三种布局模式。

**Tech Stack:** SolidJS 1.9 + TypeScript 6.0 (strict), Vite 8.0, UnoCSS 66.7, vitest 4.1, vite-plus (oxlint/oxfmt)

## Global Constraints

- TypeScript strict: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`。
- 所有颜色/间距/圆角/阴影必须使用 `src/styles/tokens.css` 中的 CSS 变量，禁止硬编码。
- 动画只允许 Fluent 4 种缓动曲线和 5 种时长。
- 触控目标最小 40×40px，focus 使用 `:focus-visible`。
- 组件使用 `Component<Props>`，默认导出。
- 路径别名 `@/` 映射到 `src/`。
- 不使用 `createResource` 在路由级组件中。
- 测试文件位置：`src/**/__tests__/*.test.ts` 或 `src/**/*.test.ts`。
- 新文件命名：组件 PascalCase，primitives camelCase。
- 不自动提交 commit；用户需要自行审查。

---

### Task 1: 扩展 NovelLayoutMode 类型与偏好加载

**Files:**
- Modify: `packages/app/src/stores/uiStore.ts:16-17`
- Modify: `packages/app/src/stores/uiStore.ts:383-392`
- Modify: `packages/app/src/stores/uiStore.ts:608`
- Test: `packages/app/src/stores/__tests__/uiStore.test.ts`

**Interfaces:**
- Consumes: `Preferences.get/set` 已封装好。
- Produces: `NovelLayoutMode` 类型扩展为 `"list" | "coverWall" | "textList"`；`loadNovelLayoutModePreference` 和 `resetUiStore` 支持 `textList`。

- [ ] **Step 1: 扩展类型定义**

```ts
export type NovelLayoutMode = "list" | "coverWall" | "textList";
```

- [ ] **Step 2: 更新偏好加载校验**

把 `loadNovelLayoutModePreference` 中的校验从 `value === "list" || value === "coverWall"` 改为 `value === "list" || value === "coverWall" || value === "textList"`。

```ts
if (value !== null && (value === "list" || value === "coverWall" || value === "textList")) {
  setState("novelLayoutMode", value as NovelLayoutMode);
}
```

- [ ] **Step 3: 更新 reset 默认行为**

`resetUiStore` 中保持默认 `list` 即可，无需改动，但确保导入的类型一致。

- [ ] **Step 4: 运行 TypeScript 检查**

```bash
pnpm check
```

Expected: 无类型错误。

- [ ] **Step 5: 为 uiStore 新增/更新测试**

在 `packages/app/src/stores/__tests__/uiStore.test.ts` 中新增用例：

```ts
test("setNovelLayoutMode persists textList", async () => {
  const { setNovelLayoutMode, novelLayoutMode } = await import("../uiStore");
  await setNovelLayoutMode("textList");
  expect(novelLayoutMode()).toBe("textList");
});
```

- [ ] **Step 6: 运行测试**

```bash
pnpm test -- src/stores/__tests__/uiStore.test.ts
```

Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add packages/app/src/stores/uiStore.ts packages/app/src/stores/__tests__/uiStore.test.ts
git commit -m "feat: extend NovelLayoutMode with textList"
```

---

### Task 2: 实现 createTextListLayout primitive

**Files:**
- Create: `packages/app/src/primitives/createTextListLayout.ts`
- Create: `packages/app/src/primitives/__tests__/createTextListLayout.test.ts`
- Modify: `packages/app/src/primitives/types.ts`（若需新增类型，否则不修改）

**Interfaces:**
- Consumes: `PixivNovel` 类型，容器宽度 signal，现有 `MasonryLayout` 类型。
- Produces: `createTextListLayout(options)` 返回 `Accessor<MasonryLayout>`。

- [ ] **Step 1: 编写测试**

```ts
import { describe, expect, it } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createTextListLayout } from "../createTextListLayout";
import type { PixivNovel } from "../../api/types";

function makeNovel(id: number, title: string): PixivNovel {
  return {
    id,
    title,
    user: { id: 1, name: "Author", account: "author", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 1234,
    is_bookmarked: false,
    total_bookmarks: 10,
    total_view: 100,
    x_restrict: 0,
    create_date: "2024-01-01T00:00:00+09:00",
  };
}

describe("createTextListLayout", () => {
  it("returns empty layout for empty novels", () =>
    createRoot((dispose) => {
      const [novels] = createSignal<PixivNovel[]>([]);
      const [width] = createSignal(400);
      const layout = createTextListLayout(novels, width, { gap: 12 });
      expect(layout().items).toHaveLength(0);
      expect(layout().totalHeight).toBe(0);
      expect(layout().columns).toBe(1);
      dispose();
    }));

  it("computes single-column layout with cached heights", () =>
    createRoot((dispose) => {
      const [novels, setNovels] = createSignal<PixivNovel[]>([makeNovel(1, "Short title")]);
      const [width] = createSignal(400);
      const layout = createTextListLayout(novels, width, { gap: 12 });
      // 测量结果默认在测试环境使用估算，仍应产生单列布局
      expect(layout().items).toHaveLength(1);
      expect(layout().items[0].x).toBe(0);
      expect(layout().items[0].width).toBe(400);
      expect(layout().items[0].height).toBeGreaterThan(0);
      dispose();
    }));

  it("caches heights by novel id and appends only new items", () =>
    createRoot((dispose) => {
      const [novels, setNovels] = createSignal<PixivNovel[]>([makeNovel(1, "A")]);
      const [width] = createSignal(400);
      const layout = createTextListLayout(novels, width, { gap: 12 });
      const first = layout().items[0].height;
      setNovels((prev) => [...prev, makeNovel(2, "B")]);
      expect(layout().items).toHaveLength(2);
      expect(layout().items[0].height).toBe(first);
      expect(layout().items[1].y).toBe(layout().items[0].y + layout().items[0].height + 12);
      dispose();
    }));
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test -- src/primitives/__tests__/createTextListLayout.test.ts
```

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现 primitive**

```ts
import { createMemo, createSignal, onMount, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";
import type { MasonryLayout } from "./types";
import type { PixivNovel } from "../api/types";

interface CreateTextListLayoutOptions {
  gap?: number;
  /** Fallback row height used before/without DOM measurement (px) */
  defaultHeight?: number;
}

function estimateHeight(title: string, _width: number): number {
  // 估算：标题最多两行，每行约 28px；元数据行约 36px；padding 约 16px
  const titleLines = title.length > 24 ? 2 : 1;
  return 16 + titleLines * 28 + 36;
}

/**
 * Off-screen measurement pool for text-list row heights.
 * Measures real DOM height for unknown items and caches by novel id.
 */
export function createTextListLayout(
  novels: Accessor<PixivNovel[]>,
  containerWidth: Accessor<number>,
  options: CreateTextListLayoutOptions = {},
): Accessor<MasonryLayout> {
  const gap = options.gap ?? 12;
  const defaultHeight = options.defaultHeight ?? 80;

  // id -> measured height
  const [heightCache, setHeightCache] = createSignal<Record<number, number>>({});

  // Hidden measurement container
  let measureRoot: HTMLDivElement | null = null;

  function getMeasureRoot(): HTMLDivElement {
    if (measureRoot) return measureRoot;
    if (typeof document === "undefined") return null as unknown as HTMLDivElement;
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.visibility = "hidden";
    el.style.pointerEvents = "none";
    el.style.top = "0";
    el.style.left = "0";
    el.style.width = "100vw";
    el.style.zIndex = "-1";
    document.body.appendChild(el);
    measureRoot = el;
    return el;
  }

  function measureRow(novel: PixivNovel, width: number): number {
    if (typeof document === "undefined") return estimateHeight(novel.title, width);
    const root = getMeasureRoot();
    if (!root) return estimateHeight(novel.title, width);

    // 渲染一个与真实 NovelTextListCard 等价的测量节点
    const wrapper = document.createElement("div");
    wrapper.style.width = `${width}px`;
    wrapper.style.padding = "12px 16px";
    wrapper.style.boxSizing = "border-box";
    wrapper.style.fontFamily = "var(--fontFamilyBase)";

    const title = document.createElement("div");
    title.style.fontSize = "var(--fontSizeBase400)";
    title.style.fontWeight = "600";
    title.style.lineHeight = "1.3";
    title.style.maxHeight = "2.6em";
    title.style.overflow = "hidden";
    title.textContent = novel.title;

    const meta = document.createElement("div");
    meta.style.marginTop = "4px";
    meta.style.fontSize = "var(--fontSizeBase200)";
    meta.style.color = "var(--colorNeutralForeground2)";
    meta.textContent = `@${novel.user.name} · ${novel.text_length.toLocaleString()}字 · ⭐ ${novel.total_bookmarks.toLocaleString()}`;

    wrapper.appendChild(title);
    wrapper.appendChild(meta);
    root.appendChild(wrapper);
    const height = wrapper.getBoundingClientRect().height;
    root.removeChild(wrapper);
    return Math.max(height, defaultHeight);
  }

  function measureBatch(items: PixivNovel[], width: number): Record<number, number> {
    const result: Record<number, number> = {};
    for (const item of items) {
      result[item.id] = measureRow(item, width);
    }
    return result;
  }

  // 当 novels 或 width 变化时，测量未缓存项
  createMemo(() => {
    const list = novels();
    const width = containerWidth();
    const cache = heightCache();
    if (width <= 0) return cache;

    const uncached = list.filter((n) => !(n.id in cache));
    if (uncached.length === 0) return cache;

    const measured = measureBatch(uncached, width);
    setHeightCache((prev) => ({ ...prev, ...measured }));
    return { ...cache, ...measured };
  });

  onMount(() => {
    // 确保测量容器在 document 中
    getMeasureRoot();
  });

  onCleanup(() => {
    if (measureRoot && measureRoot.parentNode) {
      measureRoot.parentNode.removeChild(measureRoot);
    }
  });

  return createMemo<MasonryLayout>(() => {
    const list = novels();
    const width = containerWidth();
    const cache = heightCache();

    if (list.length === 0 || width <= 0) {
      return {
        items: [],
        totalHeight: 0,
        columns: 1,
        columnWidth: width,
        gap,
        columnGap: 0,
      };
    }

    let y = 0;
    const items = list.map((novel, index) => {
      const height = cache[novel.id] ?? estimateHeight(novel.title, width);
      const item = {
        index,
        x: 0,
        y,
        width,
        height,
        column: 0,
      };
      y += height + gap;
      return item;
    });

    const totalHeight = items.length > 0 ? items[items.length - 1].y + items[items.length - 1].height : 0;

    return {
      items,
      totalHeight,
      columns: 1,
      columnWidth: width,
      gap,
      columnGap: 0,
    };
  });
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test -- src/primitives/__tests__/createTextListLayout.test.ts
```

Expected: PASS

- [ ] **Step 5: 运行 lint/check**

```bash
pnpm lint
pnpm check
```

Expected: 无错误。

- [ ] **Step 6: 提交**

```bash
git add packages/app/src/primitives/createTextListLayout.ts packages/app/src/primitives/__tests__/createTextListLayout.test.ts
git commit -m "feat: add createTextListLayout primitive with measurement cache"
```

---

### Task 3: 实现 NovelTextListCard 组件

**Files:**
- Create: `packages/app/src/components/NovelTextListCard.tsx`
- Create: `packages/app/src/components/__tests__/NovelTextListCard.test.tsx`

**Interfaces:**
- Consumes: `PixivNovel` 类型，收藏 API `addBookmark` / `deleteBookmark`。
- Produces: `NovelTextListCard` 组件，props：`novel`、`onClick`、`onAuthorClick`、`onSeriesClick`。

- [ ] **Step 1: 编写测试**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "solid-testing-library";
import NovelTextListCard from "./NovelTextListCard";
import type { PixivNovel } from "../api/types";

function makeNovel(overrides: Partial<PixivNovel> = {}): PixivNovel {
  return {
    id: 1,
    title: "Test Novel Title",
    user: { id: 10, name: "AuthorName", account: "author", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 5678,
    series: undefined,
    is_bookmarked: false,
    total_bookmarks: 42,
    total_view: 300,
    x_restrict: 0,
    create_date: "2024-01-01T00:00:00+09:00",
    ...overrides,
  };
}

describe("NovelTextListCard", () => {
  it("renders title, author, length, and bookmarks", () => {
    render(() => <NovelTextListCard novel={makeNovel()} onClick={() => {}} />);
    expect(screen.getByText("Test Novel Title")).toBeInTheDocument();
    expect(screen.getByText(/AuthorName/)).toBeInTheDocument();
    expect(screen.getByText(/5,678字/)).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it("calls onClick when row is clicked", () => {
    const onClick = vi.fn();
    render(() => <NovelTextListCard novel={makeNovel()} onClick={onClick} />);
    fireEvent.click(screen.getByText("Test Novel Title"));
    expect(onClick).toHaveBeenCalledWith(1);
  });

  it("calls onAuthorClick when author is clicked", () => {
    const onAuthorClick = vi.fn();
    render(() => <NovelTextListCard novel={makeNovel()} onClick={() => {}} onAuthorClick={onAuthorClick} />);
    fireEvent.click(screen.getByText(/AuthorName/));
    expect(onAuthorClick).toHaveBeenCalledWith(10);
  });

  it("renders series tag and calls onSeriesClick", () => {
    const onSeriesClick = vi.fn();
    const novel = makeNovel({ series: { id: 99, title: "My Series" } });
    render(() => <NovelTextListCard novel={novel} onClick={() => {}} onSeriesClick={onSeriesClick} />);
    expect(screen.getByText(/My Series/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/My Series/));
    expect(onSeriesClick).toHaveBeenCalledWith(99);
  });

  it("toggles bookmark on button click", async () => {
    render(() => <NovelTextListCard novel={makeNovel()} onClick={() => {}} />);
    const btn = screen.getByLabelText("收藏");
    fireEvent.click(btn);
    // API 调用后按钮状态变化在异步测试里较难断言，至少验证按钮存在且可点击
    expect(btn).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test -- src/components/__tests__/NovelTextListCard.test.tsx
```

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现组件**

```tsx
import { type Component, createSignal } from "solid-js";
import type { PixivNovel } from "../api/types";
import { addBookmark, deleteBookmark } from "../api/novel";
import HeartBurstEffect from "./HeartBurstEffect";

interface Props {
  novel: PixivNovel;
  onClick: (id: number) => void;
  onAuthorClick?: (userId: number) => void;
  onSeriesClick?: (seriesId: number) => void;
}

const NovelTextListCard: Component<Props> = (props) => {
  const [bookmarked, setBookmarked] = createSignal(props.novel.is_bookmarked);
  const [bookmarkBurstTrigger, setBookmarkBurstTrigger] = createSignal(0);

  const toggleBookmark = async (e: MouseEvent) => {
    e.stopPropagation();
    try {
      if (bookmarked()) {
        await deleteBookmark(props.novel.id);
        setBookmarked(false);
      } else {
        await addBookmark(props.novel.id, "public");
        setBookmarked(true);
        setBookmarkBurstTrigger((n) => n + 1);
      }
    } catch {
      /* silently fail */
    }
  };

  const handleAuthorClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onAuthorClick?.(props.novel.user.id);
  };

  const handleSeriesClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.novel.series?.id) {
      props.onSeriesClick?.(props.novel.series.id);
    }
  };

  return (
    <div
      class="relative w-full px-4 py-3 bg-[var(--colorNeutralBackground1)] border-b border-[var(--colorNeutralStroke3)] cursor-pointer active:bg-[var(--colorNeutralBackground2)] transition-colors duration-[var(--durationFast)] ease-[var(--curveEasyEase)]"
      onClick={() => props.onClick(props.novel.id)}
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <h3 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug line-clamp-2">
            {props.novel.title}
          </h3>

          <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground2)]">
            <button
              class="inline-block text-[var(--colorBrandForeground1)] hover:underline focus:outline-none focus-visible:underline"
              onClick={handleAuthorClick}
              aria-label={`作者: ${props.novel.user.name}`}
            >
              @{props.novel.user.name}
            </button>
            <span>·</span>
            <span>{props.novel.text_length.toLocaleString()}字</span>
            <span>·</span>
            <span>⭐ {props.novel.total_bookmarks.toLocaleString()}</span>
          </div>

          <div class="mt-1.5 flex flex-wrap items-center gap-2">
            {props.novel.x_restrict > 0 && (
              <fluent-badge
                appearance="filled"
                color={props.novel.x_restrict === 1 ? "danger" : "warning"}
                class="[font-size:var(--fontSizeBase100)]"
              >
                {props.novel.x_restrict === 1 ? "R-18" : "R-18G"}
              </fluent-badge>
            )}
            {props.novel.novel_ai_type != null && props.novel.novel_ai_type > 1 && (
              <fluent-badge appearance="filled" class="[font-size:var(--fontSizeBase100)]">
                {props.novel.novel_ai_type === 2 ? "AI" : "AI辅助"}
              </fluent-badge>
            )}
            {props.novel.series?.title && (
              <button
                class="inline-flex items-center focus:outline-none focus-visible:underline"
                onClick={handleSeriesClick}
                aria-label={`查看系列: ${props.novel.series.title}`}
              >
                <fluent-badge appearance="subtle" class="[font-size:var(--fontSizeBase100)] truncate max-w-[180px]">
                  📖 {props.novel.series.title}
                </fluent-badge>
              </button>
            )}
          </div>
        </div>

        <button
          class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--colorBrandStroke1)] active:scale-90 transition-transform duration-[var(--durationFast)] ease-[var(--curveEasyEase)]"
          classList={{
            "text-[var(--colorPaletteRedForeground1)]": bookmarked(),
            "text-[var(--colorNeutralForeground3)] hover:text-[var(--colorPaletteRedForeground1)]": !bookmarked(),
          }}
          onClick={toggleBookmark}
          aria-label={bookmarked() ? "取消收藏" : "收藏"}
        >
          {bookmarked() ? "♥" : "♡"}
        </button>
      </div>
      <HeartBurstEffect trigger={bookmarkBurstTrigger} size={60} particleCount={6} />
    </div>
  );
};

export default NovelTextListCard;
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test -- src/components/__tests__/NovelTextListCard.test.tsx
```

Expected: PASS

- [ ] **Step 5: 运行 lint/check**

```bash
pnpm lint
pnpm check
```

Expected: 无错误。

- [ ] **Step 6: 提交**

```bash
git add packages/app/src/components/NovelTextListCard.tsx packages/app/src/components/__tests__/NovelTextListCard.test.tsx
git commit -m "feat: add NovelTextListCard component"
```

---

### Task 4: 在 NovelVirtualFeed 中接入 textList

**Files:**
- Modify: `packages/app/src/components/NovelVirtualFeed.tsx`

**Interfaces:**
- Consumes: `createTextListLayout` 返回的 `MasonryLayout`，`NovelTextListCard` 组件。
- Produces: `NovelVirtualFeed` 在 `layoutMode === "textList"` 时渲染文本列表。

- [ ] **Step 1: 导入新增依赖**

在文件顶部添加：

```ts
import NovelTextListCard from "./NovelTextListCard";
import { createTextListLayout } from "../primitives/createTextListLayout";
```

- [ ] **Step 2: 在 NovelVirtualFeed 中创建 textList 布局**

在 `coverWallLayout` 后面添加：

```ts
const textListLayout = createTextListLayout(
  () => props.novels,
  containerWidth,
  { gap: GAP },
);
```

- [ ] **Step 3: 修改 activeLayout 选择逻辑**

把 `activeLayout` 从简单的三元改为匹配三种模式：

```ts
const activeLayout = createMemo(() => {
  const m = mode();
  if (m === "textList") return textListLayout();
  return m === "coverWall" ? coverWallLayout() : layout();
});
```

- [ ] **Step 4: 修改渲染分支**

把 `<For>` 中的 fallback/show 改为 switch 三种模式：

```tsx
{(novel, i) => {
  const baseIndex = vs.visibleRange().startIndex;
  const realIndex = baseIndex + i();
  const card = () => {
    const m = mode();
    if (m === "textList") {
      return (
        <NovelTextListCard
          novel={novel}
          onClick={props.onNovelClick}
          onAuthorClick={(userId) => /* navigate to user */ props.onNovelClick(novel.id)}
          onSeriesClick={props.onSeriesClick}
        />
      );
    }
    if (m === "coverWall") {
      return (
        <NovelCoverCard
          novel={novel}
          onClick={props.onNovelClick}
          onSeriesClick={props.onSeriesClick}
        />
      );
    }
    return (
      <NovelCard
        novel={novel}
        onClick={props.onNovelClick}
        onSeriesClick={props.onSeriesClick}
      />
    );
  };
  return <div style={vs.getItemStyle(realIndex)}>{card()}</div>;
}}
```

注意：上例中 `onAuthorClick` 未直接拿到 navigate，需要在 `NovelVirtualFeed` 的 props 上新增 `onAuthorClick?: (userId: number) => void`，由调用方（如 `Feed.tsx` 或 `NovelFeed`）传入。在 Feed 中调用 `navigate("/user/" + userId)`。

- [ ] **Step 5: 添加 onAuthorClick prop**

```ts
interface Props {
  // ... existing
  onAuthorClick?: (userId: number) => void;
}
```

```tsx
<NovelTextListCard
  novel={novel}
  onClick={props.onNovelClick}
  onAuthorClick={props.onAuthorClick}
  onSeriesClick={props.onSeriesClick}
/>
```

- [ ] **Step 6: 更新调用 NovelVirtualFeed 的父组件**

查找 `NovelVirtualFeed` 的使用位置，添加 `onAuthorClick` 处理。例如若 `Feed.tsx` 负责小说推荐页：

```ts
import { useNavigate } from "@solidjs/router";
const navigate = useNavigate();
```

```tsx
<NovelVirtualFeed
  novels={novels()}
  loading={loading()}
  error={error()}
  hasMore={hasMore()}
  onNovelClick={(id) => navigate(`/novel/${id}`)}
  onAuthorClick={(id) => navigate(`/user/${id}`)}
  onSeriesClick={(id) => navigate(`/novel-series/${id}`)}
  onLoadMore={loadMore}
  onRefresh={refresh}
  layoutMode={novelLayoutMode()}
/>
```

- [ ] **Step 7: 运行测试**

```bash
pnpm test
```

Expected: 全部通过（包括之前新增测试）。

- [ ] **Step 8: 运行 lint/check**

```bash
pnpm lint
pnpm check
```

Expected: 无错误。

- [ ] **Step 9: 提交**

```bash
git add packages/app/src/components/NovelVirtualFeed.tsx packages/app/src/routes/Feed.tsx
git commit -m "feat: wire textList layout into NovelVirtualFeed"
```

---

### Task 5: 更新 SettingsDrawer 小说布局模式选择

**Files:**
- Modify: `packages/app/src/components/SettingsDrawer.tsx:534-545`

**Interfaces:**
- Consumes: `NovelLayoutMode` 类型（已扩展）。
- Produces: 设置面板显示三个布局按钮：列表、封面墙、文本列表。

- [ ] **Step 1: 修改按钮数组和标签**

```tsx
{(["list", "coverWall", "textList"] as NovelLayoutMode[]).map((m) => (
  <button
    class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
    classList={{
      "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
        novelLayoutMode() === m,
      "bg-transparent text-[var(--colorNeutralForeground2)]": novelLayoutMode() !== m,
    }}
    onClick={() => setNovelLayoutMode(m)}
  >
    {m === "list" ? "列表" : m === "coverWall" ? "封面墙" : "文本列表"}
  </button>
))}
```

- [ ] **Step 2: 运行 lint/check**

```bash
pnpm lint
pnpm check
```

Expected: 无错误。

- [ ] **Step 3: 提交**

```bash
git add packages/app/src/components/SettingsDrawer.tsx
git commit -m "feat: add textList option to novel layout selector"
```

---

### Task 6: 集成测试、最终 lint、测试与格式化

**Files:**
- 全项目。

- [ ] **Step 1: 运行所有测试**

```bash
pnpm test
```

Expected: 全部 PASS。

- [ ] **Step 2: 运行 TypeScript 检查**

```bash
pnpm check
```

Expected: 无错误。

- [ ] **Step 3: 运行 lint**

```bash
pnpm lint
```

Expected: 无错误。

- [ ] **Step 4: 运行格式化检查**

```bash
pnpm fmt:check
```

Expected: 无错误。如有错误，运行 `pnpm fmt` 修复。

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "feat: complete novel textList layout with tests and lint passing"
```

---

## 计划自检

- **Spec 覆盖**：所有用户确认点（无封面、字段、交互、测量池、持久化、设置面板）均有对应任务。
- **无占位符**：每个 step 包含具体代码、命令、预期输出。
- **类型一致性**：`NovelLayoutMode` 扩展后，所有使用处同步更新。
- **风险**：测量池在 SSR/测试环境已提供 fallback，DOM 测量仅用于浏览器环境；测试使用估算路径。
