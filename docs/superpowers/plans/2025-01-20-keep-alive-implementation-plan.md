# Pixivizer Keep-Alive 页面保活 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现全链路页面保活——Feed/详情/大图查看器在 Tab 切换和详情导航时均不重载组件，仅下拉刷新和设置改画质时触发重载。

**Architecture:** 放弃 Solid Router 在 Feed/Detail 之间的路由切换，改为手动页面栈管理（pushState/popstate）+ CSS display 可见性切换。Feed 和 Detail 始终存活在 DOM 中。Tab 切换在 FeedShell 内部用同样方式保活。

**Tech Stack:** SolidJS + TypeScript (strict) + Solid Router + Capacitor

**Source spec:** `docs/superpowers/specs/2025-01-20-keep-alive-architecture-design.md`

## Global Constraints

- TypeScript strict mode: `strict: true`, `noUnusedLocals`, `noUnusedParameters`
- Fluent Design System 2: 所有样式使用 CSS 变量令牌，禁止硬编码
- UnoCSS `min-w-0` 修复已存在（commit `d3f9b15`）
- 项目使用中文注释
- `src/stores/` 中的信号直接导出，不额外封装

## File Map

| 文件                           | 操作     | 职责                                                             |
| ------------------------------ | -------- | ---------------------------------------------------------------- |
| `src/components/TabPanel.tsx`  | **新建** | 懒激活容器：首次可见时才渲染内容，之后 DOM 保持存活              |
| `src/routes/FeedShell.tsx`     | **新建** | Feed 主页面：Header + 三 TabPanel + NavBar + 设置回调            |
| `src/components/MainShell.tsx` | **新建** | 页面栈管理：pushState/popstate、Feed/Detail 可见性切换           |
| `src/routes/IllustDetail.tsx`  | **改造** | 改为 props 驱动（illustId + onBack），移除 useParams/useNavigate |
| `src/App.tsx`                  | **改造** | 路由简化为 Login + MainShell + Debug                             |
| `src/stores/feedStore.ts`      | **改造** | 添加 listQuality 变化监听，触发自动刷新                          |
| `src/stores/bookmarkStore.ts`  | **改造** | 导出 refreshing 信号（供 VirtualFeed 的 loading 合并使用）       |
| `src/routes/TabFeedPage.tsx`   | **删除** | 被 FeedShell 取代                                                |

---

### Task 1: 创建 TabPanel 懒激活容器

**Files:**

- Create: `src/components/TabPanel.tsx`

**Interfaces:**

- Consumes: `PixivIllust` (from `../api/types`), VirtualFeed Props
- Produces: `TabPanel` component with props `{ tab, visible, onIllustClick }`

TabPanel 负责：首次 `visible=true` 时渲染 VirtualFeed 内容，之后 DOM 保持存活。隐藏时用 `display: none` 而非卸载。

- [ ] **Step 1: 编写 TabPanel 组件**

```typescript
// src/components/TabPanel.tsx
import { type Component, createSignal, createEffect, Show, Switch, Match } from "solid-js";
import VirtualFeed from "./VirtualFeed";
import {
  illusts as feedIllusts,
  nextUrl as feedNextUrl,
  loading as feedLoading,
  refreshing as feedRefreshing,
  error as feedError,
  ensureLoaded as feedEnsureLoaded,
  fetchMore as feedFetchMore,
  refresh as feedRefresh,
} from "../stores/feedStore";
import {
  illusts as bookmarkIllusts,
  nextUrl as bookmarkNextUrl,
  loading as bookmarkLoading,
  error as bookmarkError,
  restrict,
  setRestrict,
  ensureLoaded as bookmarkEnsureLoaded,
  fetchMore as bookmarkFetchMore,
  refresh as bookmarkRefresh,
} from "../stores/bookmarkStore";
import type { Tab } from "../stores/uiStore";

interface Props {
  tab: Tab;
  visible: boolean;
  onIllustClick: (id: number) => void;
  onSettingsOpen?: () => void;
}

const TabPanel: Component<Props> = (props) => {
  // 首次激活后永久保持渲染
  const [everActivated, setEverActivated] = createSignal(false);

  createEffect(() => {
    if (props.visible) setEverActivated(true);
  });

  // 根据 tab 选择正确的 store 数据源
  const isFeedTab = () => props.tab === "recommended" || props.tab === "follow";
  const isBookmarkTab = () => props.tab === "bookmarks";

  // 激活时触发数据加载（仅 feed tab，bookmark tab 由自身 ensureLoaded 处理）
  createEffect(() => {
    if (props.visible && isFeedTab()) {
      // feedStore.ensureLoaded() 依赖 uiStore.currentTab，需在调用前设置
      // currentTab 由 FeedShell 管理，此处仅触发 ensureLoaded
      feedEnsureLoaded();
    }
    if (props.visible && isBookmarkTab()) {
      bookmarkEnsureLoaded();
    }
  });

  return (
    <div style={{ display: props.visible ? "block" : "none" }}>
      {everActivated() && (
        <Show
          when={isFeedTab()}
          fallback={
            <>
              {/* Segmented: 公开收藏 / 非公开收藏 */}
              <div class="flex justify-center py-3 px-4">
                <div
                  class="inline-flex rounded-[var(--borderRadiusMedium)] p-0.5"
                  style={{ background: "var(--colorNeutralBackground2)" }}
                >
                  <button
                    class="px-4 py-1.5 rounded-[var(--borderRadiusSmall)] text-sm font-medium transition-colors"
                    classList={{
                      "bg-[var(--colorBrandBackground)] text-white": restrict() === "public",
                      "text-[var(--colorNeutralForeground2)]": restrict() !== "public",
                    }}
                    onClick={() => setRestrict("public")}
                  >
                    公开收藏
                  </button>
                  <button
                    class="px-4 py-1.5 rounded-[var(--borderRadiusSmall)] text-sm font-medium transition-colors"
                    classList={{
                      "bg-[var(--colorBrandBackground)] text-white": restrict() === "private",
                      "text-[var(--colorNeutralForeground2)]": restrict() !== "private",
                    }}
                    onClick={() => setRestrict("private")}
                  >
                    非公开收藏
                  </button>
                </div>
              </div>
              <VirtualFeed
                illusts={bookmarkIllusts()}
                loading={bookmarkLoading()}
                error={bookmarkError()}
                hasMore={bookmarkNextUrl() !== null}
                onIllustClick={props.onIllustClick}
                onLoadMore={bookmarkFetchMore}
                onRefresh={bookmarkRefresh}
                onSettingsOpen={props.onSettingsOpen}
                skipAnimation={true}
              />
            </>
          }
        >
          <VirtualFeed
            illusts={feedIllusts()}
            loading={feedLoading() || feedRefreshing()}
            error={feedError()}
            hasMore={feedNextUrl() !== null}
            onIllustClick={props.onIllustClick}
            onLoadMore={feedFetchMore}
            onRefresh={feedRefresh}
            onSettingsOpen={props.onSettingsOpen}
            skipAnimation={true}
          />
        </Show>
      )}
    </div>
  );
};

export default TabPanel;
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | grep -E "TabPanel" || echo "TabPanel: no errors"
```

---

### Task 2: 创建 FeedShell 主页面 + 改造 NavBar

**Files:**

- Create: `src/routes/FeedShell.tsx`
- Modify: `src/components/NavBar.tsx`

**Interfaces:**

- Consumes: `TabPanel` (from `../components/TabPanel`), `NavBar`, `currentTab` (from `../stores/uiStore`)
- Produces: `FeedShell` component with props `{ onIllustClick, onSettingsOpen }`

FeedShell 合并当前 TabFeedPage 的 Header + NavBar + 三 TabPanel。

- [ ] **Step 1: 编写 FeedShell 组件**

```typescript
// src/routes/FeedShell.tsx
import { type Component } from "solid-js";
import { currentTab, setCurrentTab } from "../stores/uiStore";
import TabPanel from "../components/TabPanel";
import NavBar from "../components/NavBar";

interface Props {
  onIllustClick: (id: number) => void;
  onSettingsOpen: () => void;
}

const FeedShell: Component<Props> = (props) => {
  return (
    <>
      <div class="pb-16">
        <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4">
          <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none">
            Pixivizer
          </h1>
        </header>

        <TabPanel
          tab="recommended"
          visible={currentTab() === "recommended"}
          onIllustClick={props.onIllustClick}
          onSettingsOpen={props.onSettingsOpen}
        />
        <TabPanel
          tab="follow"
          visible={currentTab() === "follow"}
          onIllustClick={props.onIllustClick}
          onSettingsOpen={props.onSettingsOpen}
        />
        <TabPanel
          tab="bookmarks"
          visible={currentTab() === "bookmarks"}
          onIllustClick={props.onIllustClick}
          onSettingsOpen={props.onSettingsOpen}
        />
      </div>

      <NavBar />
    </>
  );
};

export default FeedShell;
```

注意：`NavBar` 当前在 onClick 中调用了 `navigate()` 触发路由跳转。现在 Tab 切换通过 `setCurrentTab` + CSS 实现，不再需要路由跳转。

- [ ] **Step 2: 改造 NavBar，移除 navigate 调用**

当前 `NavBar.tsx` 中每个 tab 按钮的 onClick 类似：

```typescript
onClick={() => {
  setCurrentTab(tab.key);
  if (tab.key === "bookmarks") {
    navigate("/bookmarks");
  } else if (tab.key === "follow") {
    navigate("/following");
  } else {
    navigate("/recommended");
  }
}}
```

改为仅设置 `currentTab`：

```typescript
onClick={() => {
  setCurrentTab(tab.key);
}}
```

同时：

1. 移除 `import { useNavigate } from "@solidjs/router"`
2. 移除 `const navigate = useNavigate()`
3. 移除组件内对 `navigate` 的调用

NavBar 不需要新增 Props。`setCurrentTab` 已在组件内部 import，FeedShell 通过 `currentTab()` 被动响应变化。

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | grep -E "FeedShell|NavBar" || echo "FeedShell+NavBar: no errors"
```

---

### Task 3: 创建 MainShell 页面栈管理器

**Files:**

- Create: `src/components/MainShell.tsx`

**Interfaces:**

- Consumes: `FeedShell`, `IllustDetail` (refactored), `SettingsSheet`
- Produces: `MainShell` component (无 props)

MainShell 是页面保活的核心。管理 `currentView` 信号和浏览器历史栈。

- [ ] **Step 1: 编写 MainShell 组件**

```typescript
// src/components/MainShell.tsx
import { type Component, createSignal, onMount, onCleanup } from "solid-js";
import FeedShell from "../routes/FeedShell";
import IllustDetail from "../routes/IllustDetail";
import SettingsSheet from "../components/SettingsSheet";
import { setShowSettingsSheet } from "../stores/uiStore";

type View = "feed" | "detail";

const MainShell: Component = () => {
  const [currentView, setCurrentView] = createSignal<View>("feed");
  const [detailIllustId, setDetailIllustId] = createSignal<number | null>(null);

  // ── 导航函数 ──

  function navigateToDetail(illustId: number) {
    setDetailIllustId(illustId);
    setCurrentView("detail");
    window.history.pushState(
      { view: "detail", id: illustId },
      "",
      `/illust/${illustId}`,
    );
  }

  function navigateToFeed() {
    setCurrentView("feed");
    // 替换当前历史条目，避免 push 新条目
    window.history.replaceState({ view: "feed" }, "", "/feed");
  }

  function goBack() {
    window.history.back();
  }

  // ── popstate 监听（系统侧滑返回 / 浏览器后退） ──

  function handlePopState(event: PopStateEvent) {
    if (event.state?.view === "feed") {
      setCurrentView("feed");
    } else if (event.state?.view === "detail" && event.state.id != null) {
      setDetailIllustId(event.state.id);
      setCurrentView("detail");
    } else {
      // 无状态记录时回退到 feed
      setCurrentView("feed");
    }
  }

  onMount(() => {
    // 初始化历史条目
    const path = window.location.pathname;
    const match = path.match(/^\/illust\/(\d+)$/);
    if (match) {
      const id = Number(match[1]);
      setDetailIllustId(id);
      setCurrentView("detail");
      window.history.replaceState({ view: "detail", id }, "", path);
    } else {
      setCurrentView("feed");
      window.history.replaceState({ view: "feed" }, "", "/feed");
    }

    window.addEventListener("popstate", handlePopState);
  });

  onCleanup(() => {
    window.removeEventListener("popstate", handlePopState);
  });

  // ── 渲染 ──

  return (
    <>
      {/* Feed — 始终存活，仅 CSS 切换 */}
      <div style={{ display: currentView() === "feed" ? "block" : "none" }}>
        <FeedShell
          onIllustClick={(id) => navigateToDetail(id)}
          onSettingsOpen={() => setShowSettingsSheet(true)}
        />
      </div>

      {/* Detail — 始终存活，仅 CSS 切换 */}
      <div style={{ display: currentView() === "detail" ? "block" : "none" }}>
        <IllustDetail
          illustId={detailIllustId()}
          onBack={() => goBack()}
        />
      </div>

      <SettingsSheet />
    </>
  );
};

export default MainShell;
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | grep -E "MainShell" || echo "MainShell: no errors"
```

---

### Task 4: 改造 IllustDetail 为 props 驱动

**Files:**

- Modify: `src/routes/IllustDetail.tsx`

**Interfaces:**

- Consumes: `detailQuality` (from `../stores/uiStore`)
- Produces: `IllustDetail` component with props `{ illustId: number | null, onBack: () => void }`

核心改动：移除 `useParams`/`useNavigate`，改为接收 `illustId` prop。数据加载从 `onMount` 改为 `createEffect` 响应 `illustId` 变化。

- [ ] **Step 1: 编写改造后的 IllustDetail**

```typescript
// src/routes/IllustDetail.tsx
import { type Component, createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { loadDetail } from "../api/illust";
import type { PixivIllust } from "../api/types";
import ImageViewer from "../components/ImageViewer";
import UgoiraViewer from "../components/UgoiraViewer";
import PixivImage from "../components/PixivImage";
import LoadingSpinner from "../components/LoadingSpinner";
import { detailQuality } from "../stores/uiStore";

interface Props {
  illustId: number | null;
  onBack: () => void;
}

const IllustDetail: Component<Props> = (props) => {
  const [illust, setIllust] = createSignal<PixivIllust | null>(null);
  const [viewerOpen, setViewerOpen] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // 当前正在加载/显示的作品 ID，用于防止竞态
  let currentLoadingId: number | null = null;

  function openViewer() {
    (window as any).__viewerOpen = true;
    setViewerOpen(true);
  }

  function closeViewer() {
    (window as any).__viewerOpen = false;
    setViewerOpen(false);
  }

  onMount(() => {
    const onCloseViewer = () => setViewerOpen(false);
    window.addEventListener("closeViewer", onCloseViewer);
    onCleanup(() => window.removeEventListener("closeViewer", onCloseViewer));
  });

  // 响应 illustId 变化加载数据
  createEffect(() => {
    const id = props.illustId;
    if (id == null) return;

    // 如果已经在显示该作品（从 keep-alive 恢复），跳过
    if (illust()?.id === id) return;

    setLoading(true);
    setError(null);
    setIllust(null);
    currentLoadingId = id;

    loadDetail(id).then((data) => {
      // 防止竞态：忽略过时的请求结果
      if (currentLoadingId !== id) return;
      setIllust(data.illust);
      setLoading(false);
    }).catch((e) => {
      if (currentLoadingId !== id) return;
      setError((e as { message?: string }).message ?? "加载失败");
      setLoading(false);
    });
  });

  // 响应详情画质变化：如果有当前作品则重新拉取
  createEffect(() => {
    detailQuality(); // 追踪变化
    const id = props.illustId;
    const current = illust();
    if (id == null || !current) return;

    // 重新加载以获取新画质的 URL
    setLoading(true);
    currentLoadingId = id;
    loadDetail(id).then((data) => {
      if (currentLoadingId !== id) return;
      setIllust(data.illust);
      setLoading(false);
    }).catch((e) => {
      if (currentLoadingId !== id) return;
      setError((e as { message?: string }).message ?? "加载失败");
      setLoading(false);
    });
  });

  function coverUrl(): string {
    const i = illust();
    if (!i) return "";
    const q = detailQuality();
    if (q === "medium") return i.image_urls.medium;
    if (q === "large") return i.image_urls.large;
    return i.meta_single_page?.original_image_url ?? i.image_urls.large;
  }

  const imageUrls = () => {
    const i = illust();
    if (!i) return [];
    if (i.page_count > 1) {
      return i.meta_pages.map((p) => p.image_urls.large);
    }
    return [i.meta_single_page.original_image_url ?? i.image_urls.large];
  };

  // 无 illustId 时不渲染
  if (props.illustId == null) {
    return null;
  }

  return (
    <div class="page">
      {loading() && !illust() && <LoadingSpinner text="加载作品中..." />}

      {error() && (
        <div class="flex flex-col items-center justify-center h-screen gap-4 px-6">
          <p class="text-[var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase300)]">
            {error()}
          </p>
          <button class="btn-secondary" onClick={props.onBack}>
            返回
          </button>
        </div>
      )}

      {illust() && !viewerOpen() && (
        <>
          {/* App bar header */}
          <header class="flex items-center gap-3 px-4 py-3 surface-appbar sticky top-0 z-10">
            <button onClick={props.onBack} class="btn-icon text-lg" aria-label="返回">
              ←
            </button>
            <h2 class="text-[var(--colorNeutralForeground1)] font-semibold truncate flex-1 [font-size:var(--fontSizeBase300)]">
              {illust()!.title}
            </h2>
          </header>

          {/* Cover image */}
          <div
            class="flex justify-center bg-[var(--colorNeutralBackground2)] cursor-pointer border-b border-[var(--colorNeutralStroke2)]"
            onClick={() => openViewer()}
          >
            <PixivImage
              src={coverUrl()}
              alt={illust()!.title}
              width={illust()!.width}
              height={illust()!.height}
              loading="eager"
              class="max-h-[60vh] object-contain cursor-pointer"
            />
          </div>

          {/* Info section — 保持原有结构 */}
          <div class="px-4 py-4 space-y-4">
            <div class="flex items-center gap-3">
              <PixivImage
                src={illust()!.user.profile_image_urls.medium}
                alt={illust()!.user.name}
                width={40}
                height={40}
                class="w-10 h-10 rounded-[var(--borderRadiusCircular)] object-cover ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]"
              />
              <div>
                <p class="text-[var(--colorNeutralForeground1)] font-semibold [font-size:var(--fontSizeBase300)]">
                  {illust()!.user.name}
                </p>
                <p class="text-[var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase200)]">
                  @{illust()!.user.account}
                </p>
              </div>
            </div>

            <div class="flex gap-4 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground2)]">
              <span class="flex items-center gap-1"><span>♡</span><span>{illust()!.total_bookmarks}</span></span>
              {illust()!.total_view !== undefined && (
                <span class="flex items-center gap-1"><span>👁</span><span>{illust()!.total_view}</span></span>
              )}
              {illust()!.page_count > 1 && (
                <span class="flex items-center gap-1"><span>📄</span><span>{illust()!.page_count}P</span></span>
              )}
            </div>

            <div class="flex flex-wrap gap-1.5">
              {illust()!.tags.map((tag) => (
                <span class="badge">{tag.translated_name || tag.name}</span>
              ))}
            </div>

            {illust()!.caption && (
              <p class="[font-size:var(--fontSizeBase300)] text-[var(--colorNeutralForeground2)] leading-relaxed whitespace-pre-wrap">
                {illust()!.caption}
              </p>
            )}
          </div>

          <div class="px-4 pb-8">
            <p class="text-center text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase200)]">
              {illust()!.type === "ugoira"
                ? "点击图片播放动图"
                : "点击图片查看原图 · 双指缩放 · 左右滑动翻页"}
            </p>
          </div>
        </>
      )}

      {viewerOpen() && illust()!.type === "ugoira" && (
        <UgoiraViewer illustId={illust()!.id} coverUrl={imageUrls()[0]} onClose={closeViewer} />
      )}

      {viewerOpen() && illust()!.type !== "ugoira" && (
        <ImageViewer imageUrls={imageUrls()} onClose={closeViewer} />
      )}
    </div>
  );
};

export default IllustDetail;
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | grep -E "IllustDetail" || echo "IllustDetail: no errors"
```

---

### Task 5: 更新 App.tsx 路由

**Files:**

- Modify: `src/App.tsx`

**Interfaces:**

- Consumes: `MainShell`, `Login`, `DebugImage`
- Produces: 简化后的路由结构

- [ ] **Step 1: 重写 App.tsx 路由**

```typescript
// src/App.tsx
import { type Component, onMount, Show } from "solid-js";
import { Route, Router, useNavigate } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { isLoggedIn, isLoading, initializeAuth } from "./stores/authStore";
import { App as CapApp } from "@capacitor/app";
import Login from "./routes/Login";
import DebugImage from "./routes/DebugImage";
import MainShell from "./components/MainShell";
import LoadingSpinner from "./components/LoadingSpinner";

const RootLayout: Component<RouteSectionProps> = (props) => {
  const navigate = useNavigate();

  onMount(async () => {
    // Handle Android back button / gesture
    CapApp.addListener("backButton", () => {
      // If viewer is open, close it first
      if ((window as any).__viewerOpen) {
        window.dispatchEvent(new CustomEvent("closeViewer"));
        return;
      }
      // Root pages — exit app
      const path = window.location.pathname;
      if (path === "/feed" || path === "/login") {
        CapApp.exitApp();
      } else {
        window.history.back();
      }
    });

    await initializeAuth();
    if (isLoggedIn()) {
      navigate("/feed", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  });

  return (
    <div class="page">
      <Show when={!isLoading()} fallback={<LoadingSpinner text="启动中..." />}>
        {props.children}
      </Show>
    </div>
  );
};

const App: Component = () => {
  return (
    <Router root={RootLayout}>
      <Route path="/login" component={Login} />
      <Route path="/feed" component={MainShell} />
      <Route path="/illust/:id" component={MainShell} />
      <Route path="/debug" component={DebugImage} />
      <Route path="*" component={Login} />
    </Router>
  );
};

export default App;
```

注意：`/feed` 和 `/illust/:id` 都指向 `MainShell`。MainShell 在 `onMount` 中根据 `window.location.pathname` 初始化状态，所以两个路由入口都能正确处理。

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | grep -E "App\.tsx" || echo "App.tsx: no errors"
```

---

### Task 6: 添加画质变化重载逻辑

**Files:**

- Modify: `src/stores/feedStore.ts`
- Modify: `src/routes/IllustDetail.tsx`（已在 Task 4 中处理）

**feedStore 改动：** 添加 `createEffect` 监听 `listQuality` 变化，触发当前活跃 Tab 的刷新。

- [ ] **Step 1: 在 feedStore 中添加画质监听**

在 `src/stores/feedStore.ts` 文件末尾添加：

```typescript
// src/stores/feedStore.ts — 在现有 import 后添加：

import { createEffect } from "solid-js";
import { listQuality, currentTab } from "./uiStore";

// 监听列表画质变化：画质改变时自动刷新当前活跃 Tab
let lastListQuality = listQuality();
createEffect(() => {
  const q = listQuality();
  if (q !== lastListQuality) {
    lastListQuality = q;
    const tab = currentTab();
    if (tab === "recommended" || tab === "follow") {
      // 强制重新加载以获取新画质图片
      setIllusts([]);
      if (tab === "recommended") fetchRecommended();
      else fetchFollow();
    }
  }
});
```

`setIllusts([])` 清空后触发重新拉取，VirtualFeed 会显示短暂的 skeleton 然后展示新画质图片。这符合用户「列表需要重载」的需求。

- [ ] **Step 2: 确认 IllustDetail 已包含画质监听**

Task 4 的 `IllustDetail` 已有 `createEffect` 监听 `detailQuality`，当画质变化时重新 fetch 当前 illust 数据。此步骤仅确认代码已包含。

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

### Task 7: 清理与最终验证

**Files:**

- Delete: `src/routes/TabFeedPage.tsx`
- Delete: `src/routes/Bookmarks.tsx`（功能已合并到 FeedShell → TabPanel 的 bookmarks tab）

- [ ] **Step 1: 删除废弃文件**

```bash
rm src/routes/TabFeedPage.tsx
rm src/routes/Bookmarks.tsx
```

- [ ] **Step 2: 全量 TypeScript 检查**

```bash
npx tsc --noEmit 2>&1
```

预期：所有新增/改造文件的类型错误为零。可能存在已有的无关错误（如 `@book000/pixivts` 模块声明缺失），这些不在本次修复范围内。

- [ ] **Step 3: 构建验证**

```bash
pnpm build 2>&1 | tail -20
```

预期：构建成功，输出到 `dist/`。

- [ ] **Step 4: 功能验证清单**

启动开发服务器 (`pnpm dev`)，逐项验证：

| #   | 场景                     | 预期行为                         |
| --- | ------------------------ | -------------------------------- |
| 1   | 刷新页面 → 推荐 Tab 加载 | 正常显示骨架屏 → 作品列表        |
| 2   | 切换到关注 Tab           | 瞬间切换，若已加载则不显示骨架屏 |
| 3   | 切换到收藏 Tab           | 瞬间切换                         |
| 4   | 切回推荐 Tab             | 瞬间切回，列表位置/状态保留      |
| 5   | 点击作品 → 进入详情      | 详情正常加载                     |
| 6   | 详情点返回 → 回到列表    | 列表不重载，位置保留             |
| 7   | 详情侧滑返回 → 回到列表  | 同上                             |
| 8   | 详情点大图 → 返回详情    | 详情不重载                       |
| 9   | 详情侧滑返回（有大图时） | 先关大图，再返回列表             |
| 10  | 列表下拉刷新             | 正常刷新                         |
| 11  | 设置改列表画质           | 列表重载                         |

---

## 自检清单

**1. Spec coverage:**

- ✅ 详情点返回/侧滑返回列表不重载 → MainShell popstate + CSS 切换
- ✅ 详情→大图→返回/侧滑返回详情不重载 → ImageViewer 已是 overlay
- ✅ NavTab 互相切换不重载 → FeedShell + TabPanel 懒激活
- ✅ 下拉刷新重载 → 现有 refresh() 不变
- ✅ 改列表画质重载 → feedStore createEffect
- ✅ 改详情画质重载 → IllustDetail createEffect

**2. Placeholder scan:** 无 TBD/TODO/模糊描述。每个步骤含完整代码。

**3. Type consistency:**

- ✅ `TabPanel.tab` 类型 `Tab` = `"recommended" | "follow" | "bookmarks"`（来自 uiStore）
- ✅ `MainShell.navigateToDetail(id: number)` ↔ `FeedShell.onIllustClick(id: number)`
- ✅ `IllustDetail.illustId: number | null` ↔ `MainShell.detailIllustId`
- ✅ `IllustDetail.onBack: () => void` ↔ `MainShell.goBack()`
- ✅ NavBar 不再调用 navigate()，仅调 setCurrentTab；FeedShell 通过 currentTab() 被动响应
