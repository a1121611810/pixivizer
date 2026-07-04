# 标签展示功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在列表卡片和插画详情页中展示作品标签，首版仅做展示，不做点击跳转或搜索。

**Architecture:** 新增一个轻量可复用的 `IllustTags` 组件，供 `ImageCard` 和 `IllustDetail` 使用；调整 Masonry 布局计算，将标签区域高度纳入卡片总高度估算；所有标签数据来自已有的 `PixivIllustTag` 类型。

**Tech Stack:** SolidJS 1.9 + TypeScript 6.0 (strict) + Fluent UI Web Components + UnoCSS + Web Worker (Comlink)

## Global Constraints

- 不新增第三方依赖。
- 不改动 API 类型定义。
- 不改动 API 请求逻辑或虚拟滚动核心。
- 样式必须使用 Fluent Design tokens，禁止硬编码颜色、字号、圆角、阴影、缓动曲线。
- 标签文本优先使用 `translated_name`，不存在时回退到 `name`。
- 纯文本渲染，禁止使用 `dangerouslySetInnerHTML` 或类似 API。
- 标签不可点击，无跳转、无搜索、无收藏、无屏蔽。
- 触控目标最小 40×40px（仅适用于后续可点击交互，本版纯展示可放宽到 Fluent badge 默认）。
- 非 Fluent 缓动曲线禁用；动画时长只允许 `100ms / 150ms / 200ms / 300ms / 500ms`。

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/app/src/components/IllustTags.tsx` | 新增：可复用标签展示组件，接收 `PixivIllustTag[]` 和尺寸参数。 |
| `packages/app/src/components/ImageCard.tsx` | 修改：在卡片底部信息区插入 `IllustTags`，使用 small 尺寸。 |
| `packages/app/src/routes/IllustDetail.tsx` | 修改：将现有内联标签块替换为 `<IllustTags tags={illust()!.tags} size="medium" />`，去除重复逻辑。 |
| `packages/app/src/primitives/computeMasonryLayout.ts` | 修改：新增标签高度估算辅助函数，将标签区域高度纳入卡片总高度计算。 |
| `packages/app/src/primitives/LayoutEngine.tsx` | 修改：调用新版布局计算函数，传入 `PixivIllust` 的 `tags` 数据。 |
| `packages/app/src/primitives/masonryWorker.ts` | 修改：同步导出标签估算工具，供 Worker 内调用。 |
| `packages/app/src/primitives/__tests__/computeMasonryLayout.test.ts`（如不存在则创建） | 测试：验证标签高度估算对布局的影响。 |

---

## Task 1: 新增 `IllustTags` 展示组件

**Files:**
- Create: `packages/app/src/components/IllustTags.tsx`

**Interfaces:**
- Consumes: `PixivIllustTag` from `../api/types`
- Produces: `IllustTags` SolidJS component with props `{ tags: PixivIllustTag[]; size?: "small" | "medium"; class?: string }`

- [ ] **Step 1: Write the failing test**

Create `packages/app/src/components/__tests__/IllustTags.test.tsx`:

```tsx
import { render, screen } from "solid-testing-library";
import { describe, it, expect } from "vitest";
import IllustTags from "../IllustTags";

describe("IllustTags", () => {
  it("renders tags with translated name", () => {
    render(() => <IllustTags tags={[{ name: "猫", translated_name: "cat" }]} />);
    expect(screen.getByText("cat")).toBeInTheDocument();
  });

  it("falls back to original name when translated name is missing", () => {
    render(() => <IllustTags tags={[{ name: "犬" }]} />);
    expect(screen.getByText("犬")).toBeInTheDocument();
  });

  it("renders all tags", () => {
    render(() => <IllustTags tags={[{ name: "a" }, { name: "b" }, { name: "c" }]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/__tests__/IllustTags.test.tsx`  
Expected: FAIL with "IllustTags is not defined" or similar.

- [ ] **Step 3: Write minimal implementation**

Create `packages/app/src/components/IllustTags.tsx`:

```tsx
import { type Component, For } from "solid-js";
import type { PixivIllustTag } from "../api/types";

interface IllustTagsProps {
  tags: PixivIllustTag[];
  size?: "small" | "medium";
  class?: string;
}

const sizeClasses: Record<NonNullable<IllustTagsProps["size"]>, string> = {
  small: "[font-size:var(--fontSizeBase100)] [line-height:var(--lineHeightBase100)] px-[var(--spacingHorizontalXS)] py-[var(--spacingVerticalXXS)]",
  medium: "[font-size:var(--fontSizeBase200)] [line-height:var(--lineHeightBase200)] px-[var(--spacingHorizontalS)] py-[var(--spacingVerticalXS)]",
};

const IllustTags: Component<IllustTagsProps> = (props) => {
  const size = () => props.size ?? "small";
  return (
    <div
      class={`flex flex-wrap gap-[var(--spacingHorizontalXXS)] ${props.class ?? ""}`}
      role="list"
      aria-label="作品标签"
    >
      <For each={props.tags}>
        {(tag) => (
          <span
            class={`inline-flex items-center rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground3)] text-[var(--colorNeutralForeground2)] ${sizeClasses[size()]}`}
            role="listitem"
          >
            {tag.translated_name ?? tag.name}
          </span>
        )}
      </For>
    </div>
  );
};

export default IllustTags;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/__tests__/IllustTags.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/app/src/components/IllustTags.tsx packages/app/src/components/__tests__/IllustTags.test.tsx
git commit -m "feat(tags): add IllustTags display component"
```

---

## Task 2: 在 `ImageCard` 中展示标签

**Files:**
- Modify: `packages/app/src/components/ImageCard.tsx`

**Interfaces:**
- Consumes: `IllustTags` component (default import from `./IllustTags`)
- Produces: Updated `ImageCard` rendering with small tag list below title/author row

- [ ] **Step 1: Import `IllustTags` and insert into card info section**

At the top of `ImageCard.tsx`, add:

```tsx
import IllustTags from "./IllustTags";
```

Replace the existing `p-2.5` info block (lines 187-211) with:

```tsx
      <div class="p-2.5">
        <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground1)] truncate font-semibold">
          {props.illust.title}
        </p>
        <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground2)] truncate mt-0.5 flex items-baseline gap-1">
          <span class="truncate">@{props.illust.user.name}</span>
          <span class="text-[var(--colorNeutralForegroundDisabled)] flex-shrink-0 select-none">
            ·
          </span>
          <button
            class="inline-flex items-center min-h-[40px] font-semibold [font-size:var(--fontSizeBase100)] cursor-pointer select-none transition-colors duration-[var(--durationFast)] ease-[var(--curveEasyEase)] active:scale-[0.95] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)] appearance-none border-none bg-transparent p-0 flex-shrink-0"
            classList={{
              "text-[var(--colorBrandForeground1)] hover:text-[var(--colorBrandForeground1Hover)]":
                !isFollowed(),
              "text-[var(--colorNeutralForeground3)] hover:text-[var(--colorStatusDangerForeground2)]":
                isFollowed(),
            }}
            onClick={(e) => toggleFollow(e)}
            disabled={following()}
            aria-label={isFollowed() ? "取消关注" : "关注"}
          >
            {following() ? "…" : isFollowed() ? "已关注" : "关注"}
          </button>
        </p>
        <IllustTags tags={props.illust.tags} size="small" class="mt-1.5" />
      </div>
```

- [ ] **Step 2: Verify TypeScript and lint**

Run: `pnpm check`  
Expected: No errors.

Run: `pnpm lint`  
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add packages/app/src/components/ImageCard.tsx
git commit -m "feat(tags): show tags on image cards"
```

---

## Task 3: 在 `IllustDetail` 中使用 `IllustTags` 组件

**Files:**
- Modify: `packages/app/src/routes/IllustDetail.tsx`

**Interfaces:**
- Consumes: `IllustTags` component (default import from `../components/IllustTags`)
- Produces: Tags section uses `IllustTags` with size "medium"

- [ ] **Step 1: Import `IllustTags` and replace inline tags block**

At the top of `IllustDetail.tsx`, add:

```tsx
import IllustTags from "../components/IllustTags";
```

Replace the existing inline tags block (lines 620-625):

```tsx
              {/* Tags */}
              <div class="flex flex-wrap gap-1.5">
                {illust()!.tags.map((tag) => (
                  <fluent-badge appearance="subtle">{tag.translated_name || tag.name}</fluent-badge>
                ))}
              </div>
```

With:

```tsx
              {/* Tags */}
              <IllustTags tags={illust()!.tags} size="medium" />
```

- [ ] **Step 2: Verify TypeScript and lint**

Run: `pnpm check`  
Expected: No errors.

Run: `pnpm lint`  
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add packages/app/src/routes/IllustDetail.tsx
git commit -m "feat(tags): use IllustTags component in detail page"
```

---

## Task 4: 将标签高度纳入 Masonry 布局估算

**Files:**
- Modify: `packages/app/src/primitives/computeMasonryLayout.ts`
- Modify: `packages/app/src/primitives/masonryWorker.ts`
- Modify: `packages/app/src/primitives/LayoutEngine.tsx`

**Interfaces:**
- Consumes: `PixivIllustTag[]` from `PixivIllust`
- Produces: `estimateTagAreaHeight(tags, columnWidth, options)` pure function; updated `ComputeMasonryInput` to optionally carry tags; updated `LayoutEngine` to pass tags through

### 4.1 `computeMasonryLayout.ts`

- [ ] **Step 1: Add tag height estimation function**

After `CARD_INFO_HEIGHT`, add:

```ts
export interface TagHeightEstimateOptions {
  /** Width of a single character in pixels for small tag text (fontSizeBase100 ~10px) */
  charWidth: number;
  /** Horizontal gap between tags in pixels */
  tagGap: number;
  /** Horizontal padding inside a tag pill in pixels */
  tagPaddingX: number;
  /** Line height of one tag row in pixels */
  lineHeight: number;
  /** Vertical gap between tag rows */
  rowGap: number;
}

const defaultTagOptions: TagHeightEstimateOptions = {
  charWidth: 6,     // small font ~10px, conservative CJK width estimate
  tagGap: 4,        // matches spacingHorizontalXXS
  tagPaddingX: 8,   // matches spacingHorizontalXS * 2
  lineHeight: 18,   // lineHeightBase100 * 10px ≈ 14px + vertical padding
  rowGap: 4,        // matches spacingVerticalXXS
};

/**
 * Estimate the height of the tag area for a single card.
 * Tags are laid out as rounded pills that wrap within the card width.
 * The estimate is intentionally conservative to avoid underestimating height.
 */
export function estimateTagAreaHeight(
  tags: ReadonlyArray<{ name: string; translated_name?: string }> | undefined,
  columnWidth: number,
  options: Partial<TagHeightEstimateOptions> = {},
): number {
  if (!tags || tags.length === 0 || columnWidth <= 0) return 0;

  const opts = { ...defaultTagOptions, ...options };
  const availableWidth = Math.max(0, columnWidth - 16); // subtract card horizontal padding (2.5rem ≈ 10px each side, rounded to 16px)

  let currentRowWidth = 0;
  let rows = 1;

  for (const tag of tags) {
    const text = tag.translated_name ?? tag.name;
    const textWidth = text.length * opts.charWidth;
    const tagWidth = textWidth + opts.tagPaddingX * 2;

    if (currentRowWidth + tagWidth > availableWidth && currentRowWidth > 0) {
      rows++;
      currentRowWidth = tagWidth;
    } else {
      currentRowWidth += tagWidth + opts.tagGap;
    }
  }

  return rows * opts.lineHeight + (rows - 1) * opts.rowGap;
}
```

- [ ] **Step 2: Update `ComputeMasonryInput` to include optional tags**

Change:

```ts
export interface ComputeMasonryInput {
  items: ReadonlyArray<{ width: number; height: number }>;
  columnWidth: number;
  columnCount: number;
  gap: number;
  columnGap?: number;
}
```

To:

```ts
export interface ComputeMasonryInput {
  items: ReadonlyArray<{ width: number; height: number; tags?: { name: string; translated_name?: string }[] }>;
  columnWidth: number;
  columnCount: number;
  gap: number;
  columnGap?: number;
}
```

- [ ] **Step 3: Update `computeMasonryLayout` and `appendToLayout` to add tag height**

In `computeMasonryLayout`, change:

```ts
    const aspectRatio = width > 0 && height > 0 ? width / height : 1;
    const cardHeight = columnWidth / aspectRatio + CARD_INFO_HEIGHT;
```

To:

```ts
    const aspectRatio = width > 0 && height > 0 ? width / height : 1;
    const tagHeight = estimateTagAreaHeight(item.tags, columnWidth);
    const cardHeight = columnWidth / aspectRatio + CARD_INFO_HEIGHT + tagHeight;
```

In `appendToLayout`, apply the same change to the new-items loop.

### 4.2 `masonryWorker.ts`

- [ ] **Step 4: Export the tag estimation helper**

At the top of `masonryWorker.ts`, add:

```ts
import { estimateTagAreaHeight } from "./computeMasonryLayout";
```

Expose it through the worker API so it is tree-shaken for worker but still importable:

```ts
const api = {
  compute(input: ComputeMasonryInput): MasonryLayout {
    return computeMasonryLayout(input);
  },
  append(
    existing: MasonryLayout,
    newItems: ReadonlyArray<{ width: number; height: number; tags?: { name: string; translated_name?: string }[] }>,
  ): MasonryLayout {
    return appendToLayout(existing, newItems);
  },
  estimateTagAreaHeight,
};
```

Also update the `MasonryWorkerAPI` type signature if needed (Comlink infers from `typeof api`).

### 4.3 `LayoutEngine.tsx`

- [ ] **Step 5: Pass tags into layout computation**

In `LayoutEngine.tsx`, update all places where `items` arrays are mapped to include `tags`:

- `syncLayout` waterfall input (line ~92)
- `syncLayout` incremental append `newItems` (line ~116)
- `syncLayout` single and grid modes (tag height not needed for grid, but harmless to include)
- `createEffect` worker input (line ~145)

For example, the waterfall `input` becomes:

```ts
    const input: ComputeMasonryInput = {
      items: currentIllusts.map((ill) => ({
        width: ill.width,
        height: ill.type === "ugoira" ? Math.round(ill.height * 0.75) : ill.height,
        tags: ill.tags,
      })),
      columnWidth: cw,
      columnCount: cc,
      gap: g,
      columnGap: cg,
    };
```

- [ ] **Step 6: Verify TypeScript and lint**

Run: `pnpm check`  
Expected: No errors.

Run: `pnpm lint`  
Expected: No new errors.

- [ ] **Step 7: Commit**

```bash
git add packages/app/src/primitives/computeMasonryLayout.ts packages/app/src/primitives/masonryWorker.ts packages/app/src/primitives/LayoutEngine.tsx
git commit -m "feat(tags): estimate tag area height in masonry layout"
```

---

## Task 5: 添加 Masonry 标签高度估算测试

**Files:**
- Create: `packages/app/src/primitives/__tests__/computeMasonryLayout.test.ts`

**Interfaces:**
- Consumes: `estimateTagAreaHeight` from `../computeMasonryLayout`
- Produces: Passing unit tests

- [ ] **Step 1: Write the test**

Create `packages/app/src/primitives/__tests__/computeMasonryLayout.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { estimateTagAreaHeight, computeMasonryLayout } from "../computeMasonryLayout";

describe("estimateTagAreaHeight", () => {
  it("returns 0 for empty tags", () => {
    expect(estimateTagAreaHeight([], 200)).toBe(0);
  });

  it("returns 0 for undefined tags", () => {
    expect(estimateTagAreaHeight(undefined, 200)).toBe(0);
  });

  it("fits short tags on a single row", () => {
    const tags = [{ name: "a" }, { name: "b" }];
    expect(estimateTagAreaHeight(tags, 200)).toBeGreaterThan(0);
  });

  it("adds extra rows for tags that overflow", () => {
    const tags = Array.from({ length: 30 }, (_, i) => ({ name: `tag-${i}` }));
    expect(estimateTagAreaHeight(tags, 100)).toBeGreaterThan(18);
  });
});

describe("computeMasonryLayout with tags", () => {
  it("includes tag height in total card height", () => {
    const tags = Array.from({ length: 10 }, (_, i) => ({ name: `tag-${i}` }));
    const withTags = computeMasonryLayout({
      items: [{ width: 100, height: 100, tags }],
      columnWidth: 100,
      columnCount: 1,
      gap: 12,
    });
    const withoutTags = computeMasonryLayout({
      items: [{ width: 100, height: 100 }],
      columnWidth: 100,
      columnCount: 1,
      gap: 12,
    });
    expect(withTags.items[0].height).toBeGreaterThan(withoutTags.items[0].height);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test src/primitives/__tests__/computeMasonryLayout.test.tsx`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/app/src/primitives/__tests__/computeMasonryLayout.test.ts
git commit -m "test(tags): add masonry tag height estimation tests"
```

---

## Task 6: 最终验证

- [ ] **Step 1: Run full TypeScript check**

Run: `pnpm check`  
Expected: No errors.

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`  
Expected: All tests pass, including new ones.

- [ ] **Step 3: Run linter**

Run: `pnpm lint`  
Expected: No new errors.

- [ ] **Step 4: Run formatter check**

Run: `pnpm fmt:check`  
Expected: No formatting issues.

- [ ] **Step 5: Build**

Run: `pnpm build`  
Expected: Build succeeds.

- [ ] **Step 6: Commit any final fixes**

```bash
git add -A
git commit -m "chore(tags): final verification and formatting"
```

---

## Spec Coverage Check

| Spec Section | Implementing Task |
| --- | --- |
| 新增 `IllustTags` 组件 | Task 1 |
| 列表卡片展示标签 | Task 2 |
| 详情页展示标签 | Task 3 |
| 标签高度纳入 Masonry 计算 | Task 4 |
| 无点击跳转/搜索 | All tasks (no onClick handlers) |
| 优先 `translated_name`，否则 `name` | Task 1 |
| 纯文本渲染，无 HTML | Task 1 |
| Fluent Design tokens | Task 1, 2, 3 |
| 测试覆盖 | Task 5 |

## Placeholder Scan

No TBD/TODO placeholders. All code snippets, commands, and expected outputs are concrete.
