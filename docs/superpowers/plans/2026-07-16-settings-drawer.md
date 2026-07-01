# Settings Drawer 重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前底部弹出 Sheet（`SettingsSheet.tsx`）替换为基于 `<fluent-drawer>` 的左侧滑出抽屉，20 项设置重新归为 4 组。

**Architecture:** 使用 `@fluentui/web-components` 内置 `<fluent-drawer>` 组件（type=modal, position=start），通过 uiStore 中的 signal 控制开关。手势在 TabFeedPage header 左边缘 30px 区域检测右滑触发。

**Tech Stack:** SolidJS 1.9, TypeScript 6.0, @fluentui/web-components 3.0.0-rc.31, @capacitor/preferences

## Global Constraints

- 所有设置项的功能逻辑不变，仅重新分类和编排位置
- 所有 Preferences 持久化键值不变
- 所有 uiStore 导出的 getter/setter 签名不变（新增不删减）
- 遵循 Fluent Design 2 设计令牌（tokens.css）
- 图床代理页（/image-host）和关于页（/about）保持独立路由

---

### Task 1: uiStore — 新增 Drawer signal（与旧 signal 并存）

**Files:**
- Modify: `packages/app/src/stores/uiStore.ts`（在现有 `settingsSheetOpen` signal 旁新增）

**Interfaces:**
- Consumes: 无
- Produces: `export const showSettingsDrawer: () => boolean`, `export const setShowSettingsDrawer: (v: boolean) => void`, `export const openSettingsDrawer: () => void`, `export const closeSettingsDrawer: () => void`

- [ ] **Step 1: 在 `showSettingsSheet` 相关代码块旁新增 Drawer signal**

在 `src/stores/uiStore.ts` 中，找到以下代码（约 132-135 行）：

```typescript
// ── 分离的 signal：设置页开关（独立于 createStore 以排除追踪问题）
const [settingsSheetOpen, setSettingsSheetOpen] = createSignal(false);
export const showSettingsSheet = () => settingsSheetOpen();
export const setShowSettingsSheet = (v: boolean) => setSettingsSheetOpen(v);
```

在其下方追加：

```typescript
// ── Drawer 开关（设置抽屉，替代 SettingsSheet）
const [drawerOpen, setDrawerOpen] = createSignal(false);
export const showSettingsDrawer = () => drawerOpen();
export const setShowSettingsDrawer = (v: boolean) => setDrawerOpen(v);
export const openSettingsDrawer = () => setDrawerOpen(true);
export const closeSettingsDrawer = () => setDrawerOpen(false);
```

- [ ] **Step 2: 运行 TypeScript 检查确认无类型错误**

```bash
cd packages/app && pnpm check
```

Expected: 通过（新增的导出未使用不会报错，因 `noUnusedLocals` 仅检查模块内未使用的局部变量，导出函数不受限）

- [ ] **Step 3: Commit**

```bash
cd /Users/lilianda/develop/pixivizer && git add packages/app/src/stores/uiStore.ts && git commit -m "feat(uiStore): add settingsDrawerOpen signal for drawer migration"
```

---

### Task 2: 创建 SettingsDrawer.tsx 组件

**Files:**
- Create: `packages/app/src/components/SettingsDrawer.tsx`

**Interfaces:**
- Consumes: `showSettingsDrawer`, `closeSettingsDrawer`, `openSettingsDrawer`, 以及所有现有的 uiStore getter/setter（theme, layoutMode, showR18, showR18G, listQuality, detailQuality, cacheSize, usePredictiveBack, autoHideNavBar, showDetailStairs, autoCheckUpdate, hasUpdate, isCheckingUpdate, checkCompleted, latestVersion, latestReleaseUrl, useDnsOverride, ageConfirmed, isAdult 等）
- Produces: 默认导出的 SettingsDrawer 组件

- [ ] **Step 1: 创建 SettingsDrawer.tsx 文件**

文件位于 `packages/app/src/components/SettingsDrawer.tsx`，内容结构如下：

```tsx
import { type Component, Show, createSignal, createEffect, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import FluentIcon from "./ui/FluentIcon";
import {
  showSettingsDrawer,
  closeSettingsDrawer,
  // ... 所有其他 uiStore 导出（同原 SettingsSheet）
} from "../stores/uiStore";
// ... 其他 imports 同原 SettingsSheet
import BlocklistSheet from "./BlocklistSheet";
import { checkForUpdate } from "../services/updateService";
import { imageHostState, setMasterEnabled, modeLabel } from "../stores/imageHostStore";
import { isLoggedIn, logout } from "../stores/authStore";
import { clearImageCache } from "../utils/imageLoader";
import { resetBlockedIds } from "../stores/blockStore";
import { resetReportedIds } from "../stores/reportStore";

const SettingsDrawer: Component = () => {
  const navigate = useNavigate();
  // 所有信号/状态定义同原 SettingsSheet
  const [ageGateMessage, setAgeGateMessage] = createSignal<string | null>(null);
  const [showBlocklist, setShowBlocklist] = createSignal(false);
  const [actionToast, setActionToast] = createSignal<string | null>(null);
  const [dialogState, setDialogState] = createSignal<{ type: "clear" } | { type: "deleteAccount" } | null>(null);

  // 所有 handler 函数同原 SettingsSheet（handleThemeChange, handleCheckUpdate, handleLogout 等）

  // 关闭 Drawer 时清理状态
  createEffect(() => {
    if (!showSettingsDrawer()) {
      setDialogState(null);
      setAgeGateMessage(null);
      setActionToast(null);
    }
  });

  return (
    <>
      {/* 提示 Toast — 同原 SettingsSheet */}
      <Show when={ageGateMessage()}>
        <fluent-message-bar ...>...</fluent-message-bar>
      </Show>
      <Show when={actionToast()}>
        <fluent-message-bar ...>...</fluent-message-bar>
      </Show>

      <fluent-drawer
        type="modal"
        position="start"
        open={showSettingsDrawer()}
        on:toggle={(e: CustomEvent) => {
          if (!e.detail.open) closeSettingsDrawer();
        }}
      >
        {/* ════════════════════════════════════════════ */}
        {/* Drawer Header */}
        {/* ════════════════════════════════════════════ */}
        <div class="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
            设置
          </h2>
          <fluent-button
            appearance="subtle"
            aria-label="关闭设置"
            on:click={closeSettingsDrawer}
            style="min-width:32px;width:32px;height:32px;padding:0"
          >
            {/* X icon SVG — 同原 SettingsSheet */}
          </fluent-button>
        </div>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第1组：显示与交互 */}
        {/* ════════════════════════════════════════════ */}
        <div class="px-5 py-3 flex flex-col">
          <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
            显示与交互
          </p>
          
          {/* Theme — 三段选择器（同原 SettingsSheet） */}
          {/* Layout mode — 三段选择器（同原 SettingsSheet） */}
          {/* Detail stairs — Switch（同原 SettingsSheet） */}
          {/* Auto-hide nav bar — Switch（同原 SettingsSheet） */}
          {/* Predictive back — Switch（同原 SettingsSheet） */}
        </div>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第2组：内容与过滤 */}
        {/* ════════════════════════════════════════════ */}
        <div class="px-5 py-3 flex flex-col">
          <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
            内容与过滤
          </p>

          {/* Show R18 — Switch（同原 SettingsSheet） */}
          {/* Show R-18G — Switch（同原 SettingsSheet） */}
          {/* Reconfirm age — Button（同原 SettingsSheet） */}
          {/* Manage block list — Clickable（同原 SettingsSheet） */}
        </div>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第3组：图片与网络 */}
        {/* ════════════════════════════════════════════ */}
        <div class="px-5 py-3 flex flex-col">
          <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
            图片与网络
          </p>

          {/* List quality — 二段选择器（同原 SettingsSheet） */}
          {/* Detail quality — 三段选择器（同原 SettingsSheet） */}
          {/* Cache size — Slider（同原 SettingsSheet） */}
          {/* Image host proxy — Switch + navigation（同原 SettingsSheet） */}
          {/* DNS over HTTPS — Switch（同原 SettingsSheet） */}
        </div>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第4组：账号与应用 */}
        {/* ════════════════════════════════════════════ */}
        <div class="px-5 py-3 flex flex-col">
          <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
            账号与应用
          </p>

          {/* Logout — Clickable（同原 SettingsSheet） */}
          {/* Clear local data — Clickable danger（同原 SettingsSheet） */}
          {/* Delete Pixiv account — Clickable（同原 SettingsSheet） */}
          {/* Auto check update — Switch（同原 SettingsSheet） */}
          {/* Check update now — Clickable（同原 SettingsSheet） */}
          {/* About — Clickable（同原 SettingsSheet） */}
        </div>

        {/* 底部留白 */}
        <div class="h-8" />
      </fluent-drawer>

      {/* BlocklistSheet（同原 SettingsSheet） */}
      <Show when={showBlocklist()}>
        <BlocklistSheet isOpen={showBlocklist()} onClose={() => setShowBlocklist(false)} />
      </Show>

      {/* 对话框（同原 SettingsSheet） */}
      {/* Clear data dialog */}
      {/* Delete account dialog */}
    </>
  );
};

export default SettingsDrawer;
```

> **注意：** 每个设置行的 JSX 代码从 `SettingsSheet.tsx` 原样复制（包括 SVG 图标、样式类、事件处理），仅改变容器结构。这是为了确保功能零差异。

- [ ] **Step 2: 运行 TypeScript 检查**

```bash
cd packages/app && pnpm check
```

Expected: 无错误（新组件未导入使用暂不报错）

- [ ] **Step 3: Commit**

```bash
cd /Users/lilianda/develop/pixivizer && git add packages/app/src/components/SettingsDrawer.tsx && git commit -m "feat(SettingsDrawer): create drawer component with 4-group layout"
```

---

### Task 3: TabFeedPage — 替换 SettingsSheet + 添加手势检测

**Files:**
- Modify: `packages/app/src/routes/TabFeedPage.tsx`

**Interfaces:**
- Consumes: `openSettingsDrawer`, `closeSettingsDrawer`, `showSettingsDrawer`（来自 uiStore）, `SettingsDrawer`（新组件）
- Removes: `setShowSettingsSheet`, `SettingsSheet`

- [ ] **Step 1: 修改导入**

替换：
```typescript
import { setCurrentTab, setShowSettingsSheet, layoutMode } from "../stores/uiStore";
import SettingsSheet from "../components/SettingsSheet";
```

为：
```typescript
import { setCurrentTab, openSettingsDrawer, closeSettingsDrawer, showSettingsDrawer, layoutMode } from "../stores/uiStore";
import SettingsDrawer from "../components/SettingsDrawer";
```

- [ ] **Step 2: 修改 header 中的齿轮点击触发**

找到：
```tsx
<div onClick={() => setShowSettingsSheet(true)} style="display:inline-flex">
```

改为：
```tsx
<div onClick={() => openSettingsDrawer()} style="display:inline-flex">
```

- [ ] **Step 3: 在 header 区域添加手势检测**

在 header 的 JSX 上添加 touch 事件处理：

```tsx
<header
  class="sticky top-0 z-20 surface-appbar h-12 flex items-center justify-between px-4"
  onDblClick={scrollToTop}
  onTouchStart={(e) => {
    // 仅响应屏幕左边缘 30px 内的触摸
    if (e.touches[0].clientX < 30) {
      (e.currentTarget as HTMLElement).dataset.swipeStart = String(e.touches[0].clientX);
    }
  }}
  onTouchMove={(e) => {
    const startX = (e.currentTarget as HTMLElement).dataset.swipeStart;
    if (!startX) return;
    const deltaX = e.touches[0].clientX - Number(startX);
    if (deltaX > 50) {
      delete (e.currentTarget as HTMLElement).dataset.swipeStart;
      openSettingsDrawer();
    }
  }}
  onTouchEnd={(e) => {
    delete (e.currentTarget as HTMLElement).dataset.swipeStart;
  }}
>
```

- [ ] **Step 4: 替换组件引用**

将 `<SettingsSheet />` 替换为 `<SettingsDrawer />`

找到 `<SettingsSheet />`（约 202 行）替换。

- [ ] **Step 5: 移除旧的 `onSettingsOpen` 回调（如果存在）**

检查 TabFeedPage 中是否有传递 `onSettingsOpen` 给子组件，如有更新为 `onSettingsOpen={() => openSettingsDrawer()}`（`setShowSettingsSheet(true)` → `openSettingsDrawer()`）

- [ ] **Step 6: 运行 TypeScript 检查**

```bash
cd packages/app && pnpm check
```

Expected: 无错误

- [ ] **Step 7: Commit**

```bash
cd /Users/lilianda/develop/pixivizer && git add packages/app/src/routes/TabFeedPage.tsx && git commit -m "feat(TabFeedPage): replace SettingsSheet with SettingsDrawer + left-edge swipe gesture"
```

---

### Task 4: 更新其余路由文件（Bookmarks / Feed / PersonalCenter / UserIllusts）

**Files:**
- Modify: `packages/app/src/routes/Bookmarks.tsx`
- Modify: `packages/app/src/routes/Feed.tsx`
- Modify: `packages/app/src/routes/PersonalCenter.tsx`
- Modify: `packages/app/src/routes/UserIllusts.tsx`

- [ ] **Step 1: 修改 Bookmarks.tsx**

将：
```typescript
import { setShowSettingsSheet, setCurrentTab, layoutMode } from "../stores/uiStore";
import SettingsSheet from "../components/SettingsSheet";
```
改为：
```typescript
import { openSettingsDrawer, closeSettingsDrawer, showSettingsDrawer, setCurrentTab, layoutMode } from "../stores/uiStore";
import SettingsDrawer from "../components/SettingsDrawer";
```

将 `<SettingsSheet />` 改为 `<SettingsDrawer />`

将 `onSettingsOpen={() => setShowSettingsSheet(true)}` 改为 `onSettingsOpen={() => openSettingsDrawer()}`

- [ ] **Step 2: 修改 Feed.tsx**

同上模式：替换 import、组件引用、`setShowSettingsSheet(true)` → `openSettingsDrawer()`

- [ ] **Step 3: 修改 PersonalCenter.tsx**

同上：替换 import 和 `<SettingsSheet />` → `<SettingsDrawer />`

- [ ] **Step 4: 修改 UserIllusts.tsx**

同上：替换 import 和 `<SettingsSheet />` → `<SettingsDrawer />`

- [ ] **Step 5: 格式化所有修改的文件**

```bash
cd packages/app && pnpm fmt
```

- [ ] **Step 6: 运行 TypeScript 检查**

```bash
cd packages/app && pnpm check
```

Expected: 无错误

- [ ] **Step 7: Commit**

```bash
cd /Users/lilianda/develop/pixivizer && git add packages/app/src/routes/Bookmarks.tsx packages/app/src/routes/Feed.tsx packages/app/src/routes/PersonalCenter.tsx packages/app/src/routes/UserIllusts.tsx && git commit -m "feat(routes): replace SettingsSheet with SettingsDrawer in all route files"
```

---

### Task 5: 删除旧组件 + 清理 uiStore

**Files:**
- Delete: `packages/app/src/components/SettingsSheet.tsx`
- Modify: `packages/app/src/stores/uiStore.ts`
- Modify: `packages/app/src/stores/__tests__/feedStore.test.ts`

- [ ] **Step 1: 验证所有对 SettingsSheet 的引用已替换**

```bash
cd /Users/lilianda/develop/pixivizer && grep -r "SettingsSheet" packages/app/src/ --include="*.tsx" --include="*.ts" | grep -v "__tests__"
```

Expected: 只有 `SettingsDrawer`，没有 `SettingsSheet`（测试文件除外）

- [ ] **Step 2: 从 uiStore 移除旧的 showSettingsSheet signal**

找到并删除：
```typescript
const [settingsSheetOpen, setSettingsSheetOpen] = createSignal(false);
export const showSettingsSheet = () => settingsSheetOpen();
export const setShowSettingsSheet = (v: boolean) => setSettingsSheetOpen(v);
```

保留新加的 Drawer signal。

- [ ] **Step 3: 删除 SettingsSheet.tsx**

```bash
rm packages/app/src/components/SettingsSheet.tsx
```

- [ ] **Step 4: 更新 feedStore.test.ts 的 mock**

找到 `packages/app/src/stores/__tests__/feedStore.test.ts` 中的：
```typescript
setShowSettingsSheet: vi.fn(),
```
改为：
```typescript
setShowSettingsDrawer: vi.fn(),
// 或根据测试实际引用更新
```

- [ ] **Step 5: 运行 TypeScript 检查**

```bash
cd packages/app && pnpm check
```

Expected: 无错误

- [ ] **Step 6: 运行测试**

```bash
cd packages/app && pnpm test
```

Expected: 所有测试通过

- [ ] **Step 7: Commit**

```bash
cd /Users/lilianda/develop/pixivizer && git add packages/app/src/stores/uiStore.ts packages/app/src/stores/__tests__/feedStore.test.ts && git rm packages/app/src/components/SettingsSheet.tsx && git commit -m "refactor: remove old SettingsSheet component and legacy showSettingsSheet signal"
```

---

### Task 6: 验证与最终检查

**Files:**
- 无代码修改，仅验证

- [ ] **Step 1: 运行完整检查套件**

```bash
cd packages/app && pnpm check && pnpm test && pnpm lint
```

Expected: 全部通过

- [ ] **Step 2: 验证 drawer 功能完整性**

手动检查清单：
1. Header 左侧边缘右滑 → Drawer 打开（勿在测试环境中测试手势，留待真机验证）
2. 齿轮图标点击 → Drawer 打开
3. 点击遮罩层 → Drawer 关闭
4. Android 返回键 → Drawer 关闭
5. 四组设置项全部显示，无遗漏
6. 每个设置项的功能与原 SettingsSheet 一致
7. 图床代理入口 → 跳转到 /image-host
8. 关于入口 → 跳转到 /about
9. 清除数据对话框正常弹出
10. 退出登录正常执行

- [ ] **Step 3: 最终 commit**

```bash
cd /Users/lilianda/develop/pixivizer && git status
# 确认所有改动已提交
```

- [ ] **Step 4: (可选) 运行 dev server 验证构建**

```bash
cd packages/app && pnpm build
```

Expected: 构建成功，无错误
