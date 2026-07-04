# 小说封面墙布局 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为小说列表新增「封面墙」排版模式（大封面+下方精选文字，2列排布），用户可在设置面板中独立于插画布局切换。覆盖所有小说列表视图（推荐/关注 Tab、收藏页）。

**Architecture:** 复用现有的 uiStore 持久化模式（Preferences），在 NovelVirtualFeed 内部根据 `novelLayoutMode` 条件渲染不同卡片组件。封面墙布局不经过 LayoutEngine（该引擎仅支持 PixivIllust），而是在 NovelVirtualFeed 中用 2 列 Flex 布局自行管理。

**Tech Stack:** SolidJS 1.9, TypeScript 6.0 (strict), UnoCSS, Capacitor Preferences

**Design Doc:** `docs/superpowers/specs/2026-07-04-novel-cover-wall-layout-design.md`

## Global Constraints

- 遵循 Fluent Design 2 令牌：颜色使用 `var(--colorXxx)`，圆角 `var(--borderRadiusMedium)`，间距 `var(--spacingHorizontal/VerticalXxx)`，字体 `var(--fontSizeBaseXxx)`
- TypeScript strict 模式，启用 `noUnusedLocals`、`noUnusedParameters`、`verbatimModuleSyntax`
- 封面图片通过 `resolveImageUrl()` + `/pixiv-img/` 代理加载，不直接引用 Pixiv CDN
- 测试使用 Vitest，文件位于 `src/**/__tests__/*.test.ts`

---
## 文件结构总览

| 文件 | 改动类型 | 职责 |
|------|----------|------|
| `src/stores/uiStore.ts` | 修改 | 新增 `novelLayoutMode` 类型、state 字段、getter/setter、持久化 |
| `src/components/NovelCard.tsx` | 修改 | 新增 `NovelCoverCard` 组件导出 |
| `src/components/NovelVirtualFeed.tsx` | 修改 | 接收 `layoutMode` prop，条件渲染 list/coverWall 两种布局 |
| `src/components/SettingsDrawer.tsx` | 修改 | 新增「布局模式（小说）」切换按钮行 |
| `src/routes/NovelFeedPage.tsx` | 修改 | 读取 `novelLayoutMode` 并传给 `NovelVirtualFeed` |
| `src/routes/NovelBookmarks.tsx` | 修改 | 同上 |

---

### Task 1: uiStore — 新增 novelLayoutMode 状态与持久化

**Files:**
- Modify: `src/stores/uiStore.ts`

**Interfaces:**
- Produces: `NovelLayoutMode` 类型、`novelLayoutMode()` getter、`setNovelLayoutMode()` setter、`loadNovelLayoutModePreference()` 加载函数
- 后续任务依赖：`novelLayoutMode()`、`setNovelLayoutMode()`

- [ ] **Step 1: 新增类型别名和常量键**

  在 `LayoutMode` 类型定义下方（第 16 行附近）新增：
  ```ts
  export type NovelLayoutMode = "list" | "coverWall";
  ```

  在常量区新增（第 37 行附近，`PREF_KEY_CONTENT_TYPE` 之后）：
  ```ts
  const PREF_KEY_NOVEL_LAYOUT_MODE = "novel_layout_mode";
  ```

- [ ] **Step 2: 在 initialState 中新增字段**

  在 `initialState` 函数中，`layoutMode` 字段之后（第 79 行附近）新增：
  ```ts
  novelLayoutMode: "list" as NovelLayoutMode,
  ```

- [ ] **Step 3: 新增 getter/setter**

  在 `setLayoutMode` 函数之后（第 196 行附近）新增：
  ```ts
  export const novelLayoutMode = () => state.novelLayoutMode;

  export const setNovelLayoutMode = async (mode: NovelLayoutMode): Promise<void> => {
    setState("novelLayoutMode", mode);
    try {
      await Preferences.set({ key: PREF_KEY_NOVEL_LAYOUT_MODE, value: mode });
    } catch (e) {
      console.warn("[uiStore] Failed to persist novelLayoutMode", e);
    }
    window.dispatchEvent(new CustomEvent("novelLayoutModeChanged"));
  };
  ```

- [ ] **Step 4: 新增持久化加载函数**

  在 `loadLayoutModePreference` 函数之后（第 366 行附近）新增：
  ```ts
  export async function loadNovelLayoutModePreference(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: PREF_KEY_NOVEL_LAYOUT_MODE });
      if (value !== null && (value === "list" || value === "coverWall")) {
        setState("novelLayoutMode", value as NovelLayoutMode);
      }
    } catch (e) {
      console.warn("[uiStore] Failed to load novelLayoutMode preference", e);
    }
  }
  ```

- [ ] **Step 5: 在 resetUiStore 中重置 novelLayoutMode**

  在 `resetUiStore` 函数中（第 581 行附近，`setLayoutMode("waterfall")` 之后）新增：
  ```ts
  await setNovelLayoutMode("list");
  ```

- [ ] **Step 6: 运行 TypeScript 检查**

  ```bash
  cd /Users/lilianda/develop/pixivizer && pnpm check
  ```
  预期：通过，无新错误。

- [ ] **Step 7: 提交**

  ```bash
  cd /Users/lilianda/develop/pixivizer && git add packages/app/src/stores/uiStore.ts && git commit -m "feat: add novelLayoutMode state with persistence"
  ```

---

### Task 2: NovelCard — 新增 NovelCoverCard 组件

**Files:**
- Modify: `packages/app/src/components/NovelCard.tsx`

**Interfaces:**
- Consumes: `PixivNovel` 类型、`resolveImageUrl`、`HeartBurstEffect`
- Produces: 新增导出 `NovelCoverCard` 组件
- 后续任务依赖：`NovelCoverCard` 可供 `NovelVirtualFeed` 导入

- [ ] **Step 1: 在 NovelCard.tsx 末尾新增 NovelCoverCard 组件**

  在 `export default NovelCard;` 之前，新增 `NovelCoverCard` 组件：

  ```tsx
  /** 小说封面墙卡片 — 封面在上，文字信息在下，2列排布 */
  export const NovelCoverCard: Component<Props> = (props) => {
    const [bookmarked, setBookmarked] = createSignal(props.novel.is_bookmarked);
    const [bookmarkBurstTrigger, setBookmarkBurstTrigger] = createSignal(0);
    const [privateHint, setPrivateHint] = createSignal(false);
    let hintTimer: ReturnType<typeof setTimeout>;

    const showPrivateToast = () => {
      setPrivateHint(true);
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => setPrivateHint(false), 1500);
    };

    const toggleBookmark = async (e: MouseEvent, privateBookmark = false) => {
      e.stopPropagation();
      try {
        if (bookmarked()) {
          await deleteBookmark(props.novel.id);
          setBookmarked(false);
        } else {
          await addBookmark(props.novel.id, privateBookmark ? "private" : "public");
          setBookmarked(true);
          setBookmarkBurstTrigger((n) => n + 1);
          if (privateBookmark) showPrivateToast();
        }
      } catch {
        /* silently fail */
      }
    };

    let longPressTimer: ReturnType<typeof setTimeout>;

    const onPointerDown = (e: PointerEvent) => {
      longPressTimer = setTimeout(() => {
        toggleBookmark(e as any, true);
        longPressTimer = 0 as any;
      }, 500);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = 0 as any;
        toggleBookmark(e as any, false);
      }
    };

    const tags = () => {
      const t = props.novel.tags;
      const visible = t.slice(0, 2);
      const overflow = t.length - 2;
      return { visible, overflow };
    };

    return (
      <div
        class="bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] shadow-[var(--elevation2)] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-[var(--durationFast)] ease-[var(--curveEasyEase)] flex flex-col h-full"
        onClick={() => props.onClick(props.novel.id)}
      >
        {/* Cover image — square, fills card width */}
        <div class="relative w-full aspect-square rounded-[var(--borderRadiusSmall)] overflow-hidden">
          <img
            src={resolveImageUrl(props.novel.image_urls.square_medium)}
            alt={props.novel.title}
            class="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Badge group — 左上角 */}
          <div class="absolute top-1 left-1 flex items-center gap-1 pointer-events-none z-1">
            {props.novel.x_restrict > 0 && (
              <fluent-badge
                appearance="filled"
                color={props.novel.x_restrict === 1 ? "danger" : "warning"}
              >
                {props.novel.x_restrict === 1 ? "R-18" : "R-18G"}
              </fluent-badge>
            )}
            {props.novel.novel_ai_type != null && props.novel.novel_ai_type > 1 && (
              <fluent-badge appearance="filled">
                {props.novel.novel_ai_type === 2 ? "AI" : "AI辅助"}
              </fluent-badge>
            )}
          </div>
          {/* Bookmark button — 右下角 */}
          <div class="absolute bottom-1.5 right-1.5 z-1">
            <button
              class="w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-sm transition-all active:scale-90 select-none"
              classList={{
                "text-red-400": bookmarked(),
                "text-white/70 hover:text-red-300": !bookmarked(),
              }}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerLeave={() => {
                if (longPressTimer) {
                  clearTimeout(longPressTimer);
                  longPressTimer = 0 as any;
                }
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label={bookmarked() ? "取消收藏" : "收藏"}
            >
              {bookmarked() ? "♥" : "♡"}
            </button>
            <HeartBurstEffect trigger={bookmarkBurstTrigger} size={60} particleCount={6} />
          </div>
        </div>

        {/* Info area — 封面下方 */}
        <div class="flex flex-col gap-1 p-2 flex-1 min-w-0">
          <p class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)] line-clamp-2 leading-tight">
            {props.novel.title}
          </p>
          <div class="flex items-center gap-1.5 text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase200)]">
            <span>📄 {props.novel.page_count || 1}p</span>
            <span aria-hidden="true">·</span>
            <span>⭐ {props.novel.total_bookmarks}</span>
          </div>
          <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorBrandForeground1)] truncate">
            @{props.novel.user.name}
          </p>
          <div class="flex items-center gap-1 flex-wrap min-w-0">
            <For each={tags().visible}>
              {(tag) => (
                <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] bg-[var(--colorNeutralBackground2)] px-1.5 py-0.5 rounded-[var(--borderRadiusSmall)] truncate max-w-[80px]">
                  {tag.translated_name || tag.name}
                </span>
              )}
            </For>
            {tags().overflow > 0 && (
              <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)]">
                +{tags().overflow}
              </span>
            )}
          </div>
          {props.novel.series?.title && (
            <button
              class="self-start inline-flex items-center bg-transparent border-none p-0 cursor-pointer mt-0.5"
              onClick={(e) => {
                e.stopPropagation();
                props.onSeriesClick?.(props.novel.series!.id!);
              }}
              aria-label={`查看系列: ${props.novel.series.title}`}
            >
              <fluent-badge appearance="subtle" class="[font-size:var(--fontSizeBase100)]">
                📖 {props.novel.series.title}
              </fluent-badge>
            </button>
          )}
        </div>

        {/* Private bookmark toast */}
        {privateHint() && (
          <div class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-[var(--borderRadiusMedium)] pointer-events-none z-10">
            <span class="text-white [font-size:var(--fontSizeBase200)] font-medium">已私密收藏</span>
          </div>
        )}
      </div>
    );
  };
  ```

  > 注意：组件已在文件顶部导入 `createSignal`、`For`、`Component`、`PixivNovel`、`HeartBurstEffect`、`resolveImageUrl`，`For` 需要从 `solid-js` 导入。

  **确保 `For` 已从 `solid-js` 导入。** 检查文件顶部第 1 行，目前是：
  ```ts
  import { type Component, createSignal } from "solid-js";
  ```
  需要改为：
  ```ts
  import { type Component, createSignal, For } from "solid-js";
  ```

- [ ] **Step 2: 运行 TypeScript 检查**

  ```bash
  cd /Users/lilianda/develop/pixivizer && pnpm check
  ```
  预期：通过。

- [ ] **Step 3: 提交**

  ```bash
  cd /Users/lilianda/develop/pixivizer && git add packages/app/src/components/NovelCard.tsx && git commit -m "feat: add NovelCoverCard component for cover wall layout"
  ```

---

### Task 3: NovelVirtualFeed — 支持 layoutMode prop 和封面墙布局

**Files:**
- Modify: `packages/app/src/components/NovelVirtualFeed.tsx`

**Interfaces:**
- Consumes: `NovelCoverCard`（从 `./NovelCard` 导入）、`NovelLayoutMode`（从 `../stores/uiStore` 导入）
- Produces: 接收 `layoutMode?: NovelLayoutMode` prop，默认 `"list"`

- [ ] **Step 1: 添加 NovelLayoutMode 导入和 Show 导入**

  文件顶部第 1 行（solid-js 导入）缺少 `Show`，改为：
  ```ts
  import { createSignal, createEffect, For, createMemo, Show } from "solid-js";
  ```

  在 `NovelCard` 导入旁新增 `NovelCoverCard`：
  ```ts
  import NovelCard, { NovelCoverCard } from "./NovelCard";
  ```

  新增 uiStore 导入：
  ```ts
  import type { NovelLayoutMode } from "../stores/uiStore";
  ```

- [ ] **Step 2: 在 Props 接口中新增 layoutMode 字段**

  将 `Props` 接口改为：
  ```ts
  interface Props {
    novels: PixivNovel[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    onNovelClick: (id: number) => void;
    onLoadMore: () => void;
    onRefresh: () => Promise<void> | void;
    onSeriesClick?: (seriesId: number) => void;
    restoreScrollTop?: number;
    layoutMode?: NovelLayoutMode;
  }
  ```

- [ ] **Step 3: 将默认值设为 "list"**

  在组件函数体内，`const { attach: sentinelAttach } = ...` 之前（第 27 行附近）新增：
  ```ts
  const mode = () => props.layoutMode ?? "list";
  ```

- [ ] **Step 4: 新增封面墙布局计算**

  在第 94 行之后，现有的 `layout` createMemo 下方新增覆盖墙布局计算：
  ```tsx
  // 封面墙布局：2列，高度自适应
  const coverWallLayout = createMemo((): MasonryLayout => {
    const cw = containerWidth();
    if (cw <= 0) {
      return { items: [], totalHeight: 0, columns: 1, columnWidth: 0, gap: GAP, columnGap: 0 };
    }
    const columnWidth = (cw - GAP) / 2;
    // 每行2个卡片，高度取 max(cardHeight1, cardHeight2)
    // 每行高度 = coverAspect + infoHeight + padding
    // 封面正方形占 columnWidth，info 区约 110px
    const CARD_INFO_HEIGHT = 112; // 标题(40) + 元数据(24) + 作者(20) + tags(20) + padding(8)
    const items = props.novels.map((_, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cardHeight = columnWidth + CARD_INFO_HEIGHT;
      // 同行两个卡片高度一致
      return {
        index: i,
        x: col * (columnWidth + GAP),
        y: row * (cardHeight + GAP),
        width: columnWidth,
        height: cardHeight,
        column: col,
      };
    });

    const rows = Math.ceil(props.novels.length / 2);
    const rowHeight = columnWidth + CARD_INFO_HEIGHT;
    const totalHeight = rows > 0 ? rows * rowHeight + (rows - 1) * GAP : 0;

    return {
      items,
      totalHeight,
      columns: 2,
      columnWidth,
      gap: GAP,
      columnGap: GAP,
    };
  });
  ```

- [ ] **Step 5: 根据 mode 选择布局**

  在第 120 行附近，将现有的：
  ```ts
  const vs = createVirtualScroll({
    layout,
    overscan: 400,
    useWindowScroll: true,
  });
  ```
  改为：
  ```ts
  const activeLayout = () => (mode() === "coverWall" ? coverWallLayout() : layout());
  const vs = createVirtualScroll({
    layout: activeLayout,
    overscan: 400,
    useWindowScroll: true,
  });
  ```

- [ ] **Step 6: 条件渲染卡片组件**

  在 JSX 的 `For` 循环中，将：
  ```tsx
  <NovelCard
    novel={novel}
    onClick={props.onNovelClick}
    onSeriesClick={props.onSeriesClick}
  />
  ```
  改为：
  ```tsx
  <Show when={mode() === "coverWall"} fallback={
    <NovelCard
      novel={novel}
      onClick={props.onNovelClick}
      onSeriesClick={props.onSeriesClick}
    />
  }>
    <NovelCoverCard
      novel={novel}
      onClick={props.onNovelClick}
      onSeriesClick={props.onSeriesClick}
    />
  </Show>
  ```

  同时需要从 `solid-js` 导入 `Show`（检查文件中是否已导入 — 第 1 行已包含 `Show`，无需修改）。

- [ ] **Step 7: 运行 TypeScript 检查**

  ```bash
  cd /Users/lilianda/develop/pixivizer && pnpm check
  ```
  预期：通过。

- [ ] **Step 8: 提交**

  ```bash
  cd /Users/lilianda/develop/pixivizer && git add packages/app/src/components/NovelVirtualFeed.tsx && git commit -m "feat: add coverWall layout mode to NovelVirtualFeed"
  ```

---

### Task 4: SettingsDrawer — 新增小说布局模式切换

**Files:**
- Modify: `packages/app/src/components/SettingsDrawer.tsx`

**Interfaces:**
- Consumes: `novelLayoutMode`、`setNovelLayoutMode`（从 `../stores/uiStore` 导入）

- [ ] **Step 1: 导入 novelLayoutMode 和 setNovelLayoutMode**

  检查文件头部已有的 uiStore 导入（约第 5-15 行），在导入中添加：
  ```ts
  import {
    // ... 现有导入 ...
    layoutMode,
    setLayoutMode,
    novelLayoutMode,
    setNovelLayoutMode,
    // ... 其他导入 ...
  } from "../stores/uiStore";
  ```

- [ ] **Step 2: 在插画布局模式下方新增小说布局模式行**

  在插画布局模式的结束 `</div>`（第 513 行 `</div>` 结束标签）之后、「详情页楼梯导航开关」行之前，新增以下代码：

  ```tsx
  {/* ── 小说布局模式 ── */}
  <div class="py-3">
    <div class="flex items-center gap-3 mb-2">
      <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6.5 2A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22h11a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 17.5 2h-11zM5.5 4.5A1 1 0 0 1 6.5 3.5h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15zM7.75 6a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5zM7.75 9a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5z" fill="currentColor"/>
        </svg>
      </div>
      <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
        布局模式（小说）
      </p>
    </div>
    <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
      {(["list", "coverWall"] as NovelLayoutMode[]).map((m) => (
        <button
          class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
          classList={{
            "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]": novelLayoutMode() === m,
            "bg-transparent text-[var(--colorNeutralForeground2)]": novelLayoutMode() !== m,
          }}
          onClick={() => setNovelLayoutMode(m)}
        >
          {m === "list" ? "列表" : "封面墙"}
        </button>
      ))}
    </div>
    <p class="mt-1.5 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
      控制小说推荐、关注及收藏页的展示方式
    </p>
  </div>
  ```

  > 注意：需要确认 `NovelLayoutMode` 类型已导入。如果 SettingsDrawer 通过路径别名导入 uiStore，确保在该文件中导入了 `NovelLayoutMode` 类型：
  ```ts
  import type { NovelLayoutMode, ... } from "../stores/uiStore";
  ```

- [ ] **Step 3: 运行 TypeScript 检查**

  ```bash
  cd /Users/lilianda/develop/pixivizer && pnpm check
  ```
  预期：通过。

- [ ] **Step 4: 提交**

  ```bash
  cd /Users/lilianda/develop/pixivizer && git add packages/app/src/components/SettingsDrawer.tsx && git commit -m "feat: add novel layout mode toggle to settings drawer"
  ```

---

### Task 5: NovelFeedPage — 传递 novelLayoutMode

**Files:**
- Modify: `packages/app/src/routes/NovelFeedPage.tsx`

**Interfaces:**
- Consumes: `novelLayoutMode`（从 `../stores/uiStore` 导入）
- 为 `NovelVirtualFeed` 传递 `layoutMode` prop

- [ ] **Step 1: 导入 novelLayoutMode**

  在第 18 行的导入中，将：
  ```ts
  import { setCurrentTab } from "../stores/uiStore";
  ```
  改为：
  ```ts
  import { setCurrentTab, novelLayoutMode } from "../stores/uiStore";
  ```

- [ ] **Step 2: 传递 layoutMode prop**

  在第 106-116 行的 `<NovelVirtualFeed>` 调用中，新增：
  ```tsx
  <NovelVirtualFeed
    novels={novels()}
    loading={loading() || refreshing()}
    error={error()}
    hasMore={nextUrl() !== null}
    onNovelClick={(id) => navigate(`/novel/${id}`)}
    onLoadMore={fetchMore}
    onRefresh={refresh}
    restoreScrollTop={cached ? getFeedScrollY(props.tab) : undefined}
    onSeriesClick={openSeriesSheet}
    layoutMode={novelLayoutMode()}
  />
  ```

- [ ] **Step 3: 运行 TypeScript 检查**

  ```bash
  cd /Users/lilianda/develop/pixivizer && pnpm check
  ```
  预期：通过。

- [ ] **Step 4: 提交**

  ```bash
  cd /Users/lilianda/develop/pixivizer && git add packages/app/src/routes/NovelFeedPage.tsx && git commit -m "feat: pass novelLayoutMode to NovelVirtualFeed in NovelFeedPage"
  ```

---

### Task 6: NovelBookmarks — 传递 novelLayoutMode

**Files:**
- Modify: `packages/app/src/routes/NovelBookmarks.tsx`

**Interfaces:**
- Consumes: `novelLayoutMode`（从 `../stores/uiStore` 导入）
- 为 `NovelVirtualFeed` 传递 `layoutMode` prop

- [ ] **Step 1: 导入 novelLayoutMode**

  在文件头部的 uiStore 相关导入中新增。目前该文件没有直接 import uiStore，需要新增：
  ```ts
  import { novelLayoutMode } from "../stores/uiStore";
  ```

- [ ] **Step 2: 传递 layoutMode prop**

  在第 104-114 行的 `<NovelVirtualFeed>` 调用中，新增：
  ```tsx
  <NovelVirtualFeed
    novels={novels()}
    loading={loading()}
    error={error()}
    hasMore={nextUrl() !== null}
    onNovelClick={(id) => navigate(`/novel/${id}`)}
    onLoadMore={fetchMore}
    onRefresh={refresh}
    restoreScrollTop={cached ? getFeedScrollY("bookmarks") : undefined}
    onSeriesClick={openSeriesSheet}
    layoutMode={novelLayoutMode()}
  />
  ```

- [ ] **Step 3: 运行 TypeScript 检查**

  ```bash
  cd /Users/lilianda/develop/pixivizer && pnpm check
  ```
  预期：通过。

- [ ] **Step 4: 提交**

  ```bash
  cd /Users/lilianda/develop/pixivizer && git add packages/app/src/routes/NovelBookmarks.tsx && git commit -m "feat: pass novelLayoutMode to NovelVirtualFeed in NovelBookmarks"
  ```

---

### Task 7: 构建验证

- [ ] **Step 1: 完整构建**

  ```bash
  cd /Users/lilianda/develop/pixivizer && pnpm build
  ```
  预期：TypeScript 检查和 Vite 构建通过。

- [ ] **Step 2: 运行现有测试**

  ```bash
  cd /Users/lilianda/develop/pixivizer && pnpm test
  ```
  预期：所有已有测试通过（`passWithNoTests: true` 允许空测试文件）。

- [ ] **Step 3: 最终提交**

  ```bash
  cd /Users/lilianda/develop/pixivizer && git add -A && git commit -m "feat: add cover wall layout mode for novel feeds"
  ```
