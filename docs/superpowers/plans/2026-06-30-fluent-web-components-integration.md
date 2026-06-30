# Fluent Web Components 集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Pictelio 的手写通用 UI 元素（按钮/开关/对话框/徽章/分隔线/加载指示器）替换为 @fluentui/web-components v3，保留业务定制组件继续使用 SolidJS + UnoCSS

**Architecture:** 混合渲染模型 — Fluent Web Components 负责通用 UI 层（button/switch/dialog/badge/spinner/divider），SolidJS + UnoCSS 负责业务组件层（ImageCard/NavBar/VirtualFeed 等）。两套系统通过 Fluent Design Tokens（CSS 变量）统一视觉语言。数据流为单向事件桥接：Signal → WC attribute, WC event → handler → Signal。

**Tech Stack:** SolidJS 1.9, UnoCSS 66.7, @fluentui/web-components ^3.0.0, @fluentui/tokens ^1.0.0, Capacitor 8, TypeScript 6

## Global Constraints

- 必须使用 `pnpm` 包管理器
- 替换后不得破坏现有业务组件功能
- 所有替换必须保持视觉与 Fluent Design 2 一致
- Web Components 事件使用 `on:eventname` 语法（SolidJS 特有）
- 不引入额外的 Shadow DOM 样式覆盖
- 主题切换必须同步 Fluent token（MutationObserver 监听 html class）
- 构建须通过 `pnpm run build && pnpm run check`

---

### Task 1: 安装依赖 + main.tsx 注册

**Files:**
- Modify: `packages/app/package.json`
- Modify: `packages/app/src/main.tsx`

**Interfaces:**
- Consumes: 无（首个任务）
- Produces: `setTheme()`, `webLightTheme`, `webDarkTheme` 全局可用；所有 `<fluent-*>` 标签注册完毕

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm add @fluentui/web-components@^3.0.0 @fluentui/tokens@^1.0.0
```

Expected: packages/app/package.json 的 dependencies 中出现 `@fluentui/web-components` 和 `@fluentui/tokens`。

- [ ] **Step 2: 修改 main.tsx**

```typescript
// packages/app/src/main.tsx — 在 import 块末尾添加
import { render } from "solid-js/web";
import App from "./App";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "virtual:uno.css";
// ── 新增: Fluent Web Components 注册 + 主题同步 ──
import { setTheme } from "@fluentui/web-components";
import { webLightTheme, webDarkTheme } from "@fluentui/tokens";
import "@fluentui/web-components/web-components.js";

function syncFluentTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  setTheme(isDark ? webDarkTheme : webLightTheme);
}
syncFluentTheme();
const observer = new MutationObserver(syncFluentTheme);
observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});
// ── 结束新增 ──

const root = document.getElementById("root");
if (root) {
  render(() => <App />, root);
}
```

- [ ] **Step 3: 验证注册成功**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm run check
```

Expected: 编译通过，无错误。如报 `JSX element implicitly has type 'any'` 属于预期（Web Components 在 TSX 中没有类型声明），不影响运行。

- [ ] **Step 4: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/package.json packages/app/pnpm-lock.yaml packages/app/src/main.tsx
git commit -m "feat: install and register @fluentui/web-components v3"
```

---

### Task 2: 替换 SettingsSheet 中 6 处 Toggle 为 fluent-switch

**Files:**
- Modify: `packages/app/src/components/SettingsSheet.tsx`

**Interfaces:**
- Consumes: Task 1 (fluent-switch 已注册)
- Produces: 6 处 `<fluent-switch>` 替换完成，功能不变

⚠️ **重要提示**：每个 toggle 替换删除约 25 行手写按钮代码，替换为单行 `<fluent-switch>`。保留 toggle 外层的行容器（icon + label + description），只替换 `<button role="switch">` 元素本身。

- [ ] **Step 1: 替换「自动隐藏导航栏」toggle（line 546-568）**

将以下代码块（从 `<button` 到 `</button>`，共 ~23 行）：
```tsx
<button
  onClick={() => setAutoHideNavBar(!autoHideNavBar())}
  role="switch"
  aria-checked={autoHideNavBar()}
  aria-label="自动隐藏导航栏"
  class="relative flex-shrink-0 w-14 min-h-10 px-0 py-[var(--spacingVerticalSNudge)] ..."
>
  <span class="relative block w-14 h-7 rounded-[var(--borderRadiusCircular)] ...">
    <span class="absolute top-0.5 left-0 w-6 h-6 rounded-[var(--borderRadiusCircular)] ..." />
  </span>
</button>
```

替换为：
```tsx
<fluent-switch
  checked={autoHideNavBar()}
  on:change={() => setAutoHideNavBar(!autoHideNavBar())}
  aria-label="自动隐藏导航栏"
/>
```

- [ ] **Step 2: 替换「显示 R18 内容」toggle（line 592-614）**

找到第二个 `<button role="switch">`，内容结构与 Step 1 相同但 signal 为 `showR18()`，替换为：
```tsx
<fluent-switch
  checked={showR18()}
  on:change={() => requireAdult(() => setShowR18(!showR18()))}
  aria-label="显示 R18 内容"
/>
```

注意：这里的 onClick 是 `() => requireAdult(() => setShowR18(!showR18()))`，需保留 `requireAdult` 调用。

- [ ] **Step 3: 替换「显示 R-18G 内容」toggle（line 638-660）**

signal 为 `showR18G()`，替换为：
```tsx
<fluent-switch
  checked={showR18G()}
  on:change={() => requireAdult(() => setShowR18G(!showR18G()))}
  aria-label="显示 R-18G 内容"
/>
```

- [ ] **Step 4: 替换「预测性返回手势」toggle（line 766-803）**

signal 为 `usePredictiveBack()`，含 `disabled` 逻辑（!isPredictiveBackSupported），替换为：
```tsx
<fluent-switch
  checked={usePredictiveBack()}
  on:change={() => isPredictiveBackSupported() && setUsePredictiveBack(!usePredictiveBack())}
  disabled={!isPredictiveBackSupported()}
  aria-label="预测性返回手势"
/>
```

- [ ] **Step 5: 替换「详情页楼梯导航」toggle（line 874+）**

signal 为 `showDetailStairs()`，替换为：
```tsx
<fluent-switch
  checked={showDetailStairs()}
  on:change={() => setShowDetailStairs(!showDetailStairs())}
  aria-label="详情页楼梯导航"
/>
```

- [ ] **Step 6: 替换「启动时检查更新」toggle（line 1155-1169）**

注意：这个 toggle 的视觉结构略有不同（w-11 h-5 更窄），但替换为 fluent-switch 后统一。signal 为 `autoCheckUpdate()`，替换为：
```tsx
<fluent-switch
  checked={autoCheckUpdate()}
  on:change={() => setAutoCheckUpdate(!autoCheckUpdate())}
  aria-label="启动时检查更新"
/>
```

- [ ] **Step 7: 构建检查**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm run check
```

Expected: 编译通过，无错误。

- [ ] **Step 8: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/src/components/SettingsSheet.tsx
git commit -m "feat: replace 6 hand-written toggle switches with fluent-switch"
```

---

### Task 3: 替换 SettingsSheet 中按钮为 fluent-button

**Files:**
- Modify: `packages/app/src/components/SettingsSheet.tsx`

**Interfaces:**
- Consumes: Task 1 (fluent-button 已注册)
- Produces: SettingsSheet.tsx 中所有原生 `<button>` 替换为 `<fluent-button>`

- [ ] **Step 1: 替换 ConfirmDialog 中的「取消」和「确认清除」按钮（line 261）**

```tsx
// 替换前 (line 261)
<button class="btn-secondary min-h-10 px-4" onClick={close} aria-label={props.cancelText}>
  {props.cancelText}
</button>

// 替换后
<fluent-button appearance="secondary" on:click={close}>
  {props.cancelText}
</fluent-button>
```

```tsx
// 第二个按钮（line ~269），修改类似
// 替换前
<button class="..." onClick={confirm}>{props.confirmText}</button>
// 替换后
<fluent-button appearance="primary" on:click={confirm}>
  {props.confirmText}
</fluent-button>
```

- [ ] **Step 2: 替换 settings sheet 顶部的关闭按钮（line 443）**

```tsx
// 替换前
<button class="btn-icon" onClick={close} aria-label="关闭设置">
  <svg ...>...</svg>
</button>

// 替换后
<fluent-button appearance="subtle" aria-label="关闭设置" on:click={close}>
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="..." fill="currentColor" />
  </svg>
</fluent-button>
```

- [ ] **Step 3: 替换「重新确认年龄」按钮（line 686）**

```tsx
// 替换前
<button class="btn-secondary py-2 px-4" onClick={reconfirmAge} aria-label="重新确认年龄">
  重新确认
</button>

// 替换后
<fluent-button appearance="secondary" on:click={reconfirmAge}>
  重新确认
</fluent-button>
```

- [ ] **Step 4: 构建检查**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm run check
```

Expected: 编译通过。

- [ ] **Step 5: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/src/components/SettingsSheet.tsx
git commit -m "feat: replace SettingsSheet buttons with fluent-button"
```

---

### Task 4: 替换其他组件文件和路由文件中的按钮

**Files:**
- Modify: `packages/app/src/components/AgeGate.tsx` — 2 处
- Modify: `packages/app/src/components/BlocklistSheet.tsx` — 2 处
- Modify: `packages/app/src/components/ReportSheet.tsx` — 2 处
- Modify: `packages/app/src/components/UgoiraViewer.tsx` — 1 处
- Modify: `packages/app/src/routes/AgeConfirmation.tsx` — 2 处
- Modify: `packages/app/src/routes/About.tsx` — 1 处
- Modify: `packages/app/src/routes/Feed.tsx` — 1 处
- Modify: `packages/app/src/routes/DebugImage.tsx` — 1 处
- Modify: `packages/app/src/routes/IllustDetail.tsx` — 4 处
- Modify: `packages/app/src/routes/PersonalCenter.tsx` — 1 处
- Modify: `packages/app/src/routes/TabFeedPage.tsx` — 1 处
- Modify: `packages/app/src/routes/UserIllusts.tsx` — 1 处

**Interfaces:**
- Consumes: Task 1 (fluent-button 已注册)
- Produces: 所有组件/路由文件中的按钮替换完成

- [ ] **Step 1: AgeGate.tsx — 替换 2 个按钮（line 62, 65）**

```tsx
// line 62
// 替换前
<button class="btn-primary w-full py-2.5" onClick={confirmAdult}>已满 18 岁</button>
// 替换后
<fluent-button appearance="primary" style="width:100%" on:click={confirmAdult}>已满 18 岁</fluent-button>

// line 65
// 替换前
<button class="btn-secondary w-full py-2.5" onClick={confirmMinor}>未满 18 岁</button>
// 替换后
<fluent-button appearance="secondary" style="width:100%" on:click={confirmMinor}>未满 18 岁</fluent-button>
```

- [ ] **Step 2: BlocklistSheet.tsx — 替换 2 个按钮（line 78, 125）**

```tsx
// line 78 — 关闭按钮 (btn-icon)
// 替换前
<button class="btn-icon" onClick={close} aria-label="关闭">...</button>
// 替换后
<fluent-button appearance="subtle" aria-label="关闭" on:click={close}>...</fluent-button>

// line 125 — 取消屏蔽 (btn-secondary)
// 替换前
<button class="btn-secondary flex-shrink-0 ml-3" onClick={...}>取消屏蔽</button>
// 替换后
<fluent-button appearance="secondary" on:click={...}>取消屏蔽</fluent-button>
```

- [ ] **Step 3: ReportSheet.tsx — 替换 2 个按钮（line 106, 172）**

```tsx
// line 106 — 关闭按钮 (btn-icon)
// 替换前
<button class="btn-icon" onClick={close} aria-label="关闭">...</button>
// 替换后
<fluent-button appearance="subtle" aria-label="关闭" on:click={close}>...</fluent-button>

// line 172 — 提交按钮 (btn-primary)
// 替换前
<button class="btn-primary w-full justify-center py-3" onClick={submit}>提交举报</button>
// 替换后
<fluent-button appearance="primary" style="width:100%" on:click={submit}>提交举报</fluent-button>
```

- [ ] **Step 4: UgoiraViewer.tsx — 替换 1 个按钮（line 128）**

```tsx
// 替换前
<button class="btn-secondary" onClick={props.onClose}>关闭</button>
// 替换后
<fluent-button appearance="secondary" on:click={props.onClose}>关闭</fluent-button>
```

- [ ] **Step 5: AgeConfirmation.tsx — 替换 2 个按钮（line 112, 115）**

```tsx
// line 112
// 替换前
<button class="btn-primary w-full py-2.5" onClick={confirmAdult}>已满 18 岁</button>
// 替换后
<fluent-button appearance="primary" style="width:100%" on:click={confirmAdult}>已满 18 岁</fluent-button>

// line 115
// 替换前
<button class="btn-secondary w-full py-2.5" onClick={confirmMinor}>未满 18 岁</button>
// 替换后
<fluent-button appearance="secondary" style="width:100%" on:click={confirmMinor}>未满 18 岁</fluent-button>
```

- [ ] **Step 6: About.tsx — 替换返回按钮（line 125）**

```tsx
// 替换前
<button onClick={() => navigate(-1)} class="btn-icon flex-shrink-0" aria-label="返回">...</button>
// 替换后
<fluent-button appearance="subtle" aria-label="返回" on:click={() => navigate(-1)}>...</fluent-button>
```

- [ ] **Step 7: Feed.tsx — 替换设置按钮（line 75）**

```tsx
// 替换前
<button class="btn-icon" onClick={() => setShowSettingsSheet(true)} aria-label="设置">...</button>
// 替换后
<fluent-button appearance="subtle" aria-label="设置" on:click={() => setShowSettingsSheet(true)}>...</fluent-button>
```

- [ ] **Step 8: DebugImage.tsx — 替换测试按钮（line 47）**

```tsx
// 替换前
<button class="btn-primary mb-4" onClick={testFetch}>测试加载</button>
// 替换后
<fluent-button appearance="primary" on:click={testFetch}>测试加载</fluent-button>
```

- [ ] **Step 9: IllustDetail.tsx — 替换 4 个按钮（line 343, 354, 364, 371）**

```tsx
// line 343 — btn-secondary 返回按钮
<fluent-button appearance="secondary" on:click={() => navigate(-1)}>返回</fluent-button>

// line 354 — btn-secondary 返回按钮（同上）
<fluent-button appearance="secondary" on:click={() => navigate(-1)}>返回</fluent-button>

// line 364 — btn-icon 返回按钮
<fluent-button appearance="subtle" aria-label="返回" on:click={() => navigate(-1)}>...</fluent-button>

// line 371 — btn-icon 更多菜单
<fluent-button appearance="subtle" aria-label="更多" on:click={...}>...</fluent-button>
```

- [ ] **Step 10: PersonalCenter.tsx — 替换返回按钮（line 144）**

```tsx
// 替换前
<button onClick={() => navigate(-1)} class="btn-icon flex-shrink-0" aria-label="返回">...</button>
// 替换后
<fluent-button appearance="subtle" aria-label="返回" on:click={() => navigate(-1)}>...</fluent-button>
```

- [ ] **Step 11: TabFeedPage.tsx — 替换操作按钮（line 106）**

```tsx
// 替换前
<button class="btn-icon" onClick={...} aria-label="...">...</button>
// 替换后
<fluent-button appearance="subtle" aria-label="..." on:click={...}>...</fluent-button>
```

- [ ] **Step 12: UserIllusts.tsx — 替换返回按钮（line 59）**

```tsx
// 替换前
<button onClick={() => navigate(-1)} class="btn-icon" aria-label="返回">...</button>
// 替换后
<fluent-button appearance="subtle" aria-label="返回" on:click={() => navigate(-1)}>...</fluent-button>
```

- [ ] **Step 13: 构建检查**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm run check
```

Expected: 编译通过。

- [ ] **Step 14: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/src/components/AgeGate.tsx packages/app/src/components/BlocklistSheet.tsx
git add packages/app/src/components/ReportSheet.tsx packages/app/src/components/UgoiraViewer.tsx
git add packages/app/src/routes/AgeConfirmation.tsx packages/app/src/routes/About.tsx
git add packages/app/src/routes/Feed.tsx packages/app/src/routes/DebugImage.tsx
git add packages/app/src/routes/IllustDetail.tsx packages/app/src/routes/PersonalCenter.tsx
git add packages/app/src/routes/TabFeedPage.tsx packages/app/src/routes/UserIllusts.tsx
git commit -m "feat: replace all remaining buttons with fluent-button across 11 files"
```

---

### Task 5: 替换 ConfirmDialog + AgeGate 为 fluent-dialog

**Files:**
- Modify: `packages/app/src/components/SettingsSheet.tsx` — 删除 ConfirmDialog 组件定义 + 替换 2 处使用
- Modify: `packages/app/src/components/AgeGate.tsx` — 整体替换为 fluent-dialog

**Interfaces:**
- Consumes: Task 1 (fluent-dialog 已注册), Task 3 (fluent-button 已用于 dialog 内)
⚠️ **注意**：`<fluent-dialog>` 的 slot 名称（`title`/`actions`）需对照 `@fluentui/web-components` 文档确认。如实际 slot 名称不同（例如 `header`/`footer`），在实施时调整即可。

- [ ] **Step 1: 删除 ConfirmDialog 组件定义（SettingsSheet.tsx lines 187-220）**

删除从 `const DIALOG_CLOSE_DURATION_MS = 200;` 之后的 ConfirmDialog 组件定义（const ConfirmDialog、ConfirmDialogProps 接口、以及 `fluent-scale-enter/exit` 动画相关的实现），约 34 行。

保留 `ConfirmDialogProps` 接口吗？不需要——因为替换后不再使用 ConfirmDialog 组件。

- [ ] **Step 2: 替换第一处 ConfirmDialog 使用「清除数据」（SettingsSheet.tsx line 1325-1334）**

```tsx
// 替换前
<ConfirmDialog
  isOpen={dialogState()?.type === "clear"}
  title="清除所有本地数据？"
  body="这将删除本应用在本机保存的全部数据，包括：登录凭证、图片缓存、浏览设置、屏蔽列表、举报记录。此操作不可恢复，但不会删除你的 Pixiv 账号及其在 Pixiv 服务器上的数据。"
  cancelText="取消"
  confirmText="确认清除"
  confirmVariant="danger"
  onCancel={() => setDialogState(null)}
  onConfirm={handleClearLocalData}
/>

// 替换后
<fluent-dialog
  open={dialogState()?.type === "clear"}
  on:close={() => setDialogState(null)}
  aria-label="清除所有本地数据？"
>
  <h3 slot="title">清除所有本地数据？</h3>
  <p>这将删除本应用在本机保存的全部数据，包括：登录凭证、图片缓存、浏览设置、屏蔽列表、举报记录。此操作不可恢复，但不会删除你的 Pixiv 账号及其在 Pixiv 服务器上的数据。</p>
  <fluent-button slot="actions" appearance="secondary" on:click={() => setDialogState(null)}>取消</fluent-button>
  <fluent-button slot="actions" appearance="primary" on:click={handleClearLocalData}>确认清除</fluent-button>
</fluent-dialog>
```

- [ ] **Step 3: 替换第二处 ConfirmDialog 使用「删除账号」（SettingsSheet.tsx line 1337-1348）**

```tsx
// 替换前
<ConfirmDialog
  isOpen={dialogState()?.type === "deleteAccount"}
  title="删除 Pixiv 账号？"
  body="Pictelio 是第三方客户端..."
  cancelText="取消"
  confirmText="前往 Pixiv"
  confirmVariant="danger"
  onCancel={() => setDialogState(null)}
  onConfirm={() => { setDialogState(null); openDeleteAccountPage(); }}
/>

// 替换后
<fluent-dialog
  open={dialogState()?.type === "deleteAccount"}
  on:close={() => setDialogState(null)}
  aria-label="删除 Pixiv 账号？"
>
  <h3 slot="title">删除 Pixiv 账号？</h3>
  <p>Pictelio 是第三方客户端...</p>
  <fluent-button slot="actions" appearance="secondary" on:click={() => setDialogState(null)}>取消</fluent-button>
  <fluent-button slot="actions" appearance="primary" on:click={() => { setDialogState(null); openDeleteAccountPage(); }}>前往 Pixiv</fluent-button>
</fluent-dialog>
```

- [ ] **Step 4: 替换 AgeGate.tsx 整体内容**

```tsx
// packages/app/src/components/AgeGate.tsx — 整体替换
import { type Component } from "solid-js";
import { setAgeConfirmation } from "../stores/uiStore";

function confirmAdult() {
  setAgeConfirmation(true, true);
}

function confirmMinor() {
  setAgeConfirmation(true, false);
}

const AgeGate: Component = () => {
  return (
    <fluent-dialog open aria-label="年龄确认">
      <h3 slot="title">年龄确认</h3>
      <p>你是否已满 18 周岁？本应用包含 R-18 / R-18G 内容，未成年人请在监护人指导下使用。</p>
      <fluent-button slot="actions" appearance="primary" on:click={confirmAdult}>
        已满 18 岁
      </fluent-button>
      <fluent-button slot="actions" appearance="secondary" on:click={confirmMinor}>
        未满 18 岁
      </fluent-button>
    </fluent-dialog>
  );
};

export default AgeGate;
```

- [ ] **Step 5: 构建检查**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm run check
```

Expected: 编译通过。

- [ ] **Step 6: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/src/components/SettingsSheet.tsx packages/app/src/components/AgeGate.tsx
git commit -m "feat: replace ConfirmDialog and AgeGate with fluent-dialog"
```

---

### Task 6: 替换 ImageCard 徽章为 fluent-badge

**Files:**
- Modify: `packages/app/src/components/ImageCard.tsx`

**Interfaces:**
- Consumes: Task 1 (fluent-badge 已注册)
- Produces: 5 处 badge 替换完成

- [ ] **Step 1: 替换 ugoira 标识 badge（line 153）**

```tsx
// 替换前
{isUgoira() && <div class="absolute top-1.5 right-1.5 badge-overlay">▶ 动图</div>}
// 替换后
{isUgoira() && (
  <div class="absolute top-1.5 right-1.5">
    <fluent-badge appearance="filled">▶ 动图</fluent-badge>
  </div>
)}
```

注意：`badge-overlay` class 的样式被删除，保留外层 div 定位。

- [ ] **Step 2: 替换 R-18 badge（line 157）**

```tsx
// 替换前
<span class="badge-overlay text-[var(--colorStatusDangerForeground1)]">R-18</span>
// 替换后
<fluent-badge appearance="filled" color="danger">R-18</fluent-badge>
```

- [ ] **Step 3: 替换 R-18G badge（line 160）**

```tsx
// 替换前
<span class="badge-overlay text-[var(--colorStatusWarningForeground1)]">R-18G</span>
// 替换后
<fluent-badge appearance="filled" color="warning">R-18G</fluent-badge>
```

- [ ] **Step 4: 替换 AI 标识 badge（line 164）**

```tsx
// 替换前
<span class="badge-overlay opacity-85">AI</span>
// 替换后
<fluent-badge appearance="filled">AI</fluent-badge>
```

- [ ] **Step 5: 替换页码 badge（line 169）**

```tsx
// 替换前
<div class="absolute bottom-1.5 left-1.5 badge-overlay">📄 {props.illust.page_count}</div>
// 替换后
<fluent-badge appearance="subtle">📄 {props.illust.page_count}</fluent-badge>
```

注意：此处删除了 `absolute` 定位容器。如果 fluent-badge 定位需要调整，可加上外层 `<div class="absolute bottom-1.5 left-1.5">`。

- [ ] **Step 6: 构建检查**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm run check
```

Expected: 编译通过。

- [ ] **Step 7: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/src/components/ImageCard.tsx
git commit -m "feat: replace ImageCard badges with fluent-badge"
```

---

### Task 7: 替换 LoadingSpinner 和内联 spinner 为 fluent-spinner

**Files:**
- Modify: `packages/app/src/components/LoadingSpinner.tsx`
- Modify: `packages/app/src/components/SettingsSheet.tsx`

**Interfaces:**
- Consumes: Task 1 (fluent-spinner 已注册)
- Produces: LoadingSpinner 组件和内联 spinner 替换完成

- [ ] **Step 1: 替换 LoadingSpinner.tsx**

```tsx
// packages/app/src/components/LoadingSpinner.tsx — 整体替换
import type { Component } from "solid-js";

interface Props {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeMap = { sm: "tiny", md: "small", lg: "medium" } as const;

const LoadingSpinner: Component<Props> = (props) => (
  <div class="flex flex-col items-center justify-center gap-3 py-8">
    <fluent-spinner size={sizeMap[props.size ?? "md"]} />
    {props.text && (
      <p class="text-[var(--colorNeutralForegroundDisabled)] text-[var(--fontSizeBase200)]">
        {props.text}
      </p>
    )}
  </div>
);

export default LoadingSpinner;
```

- [ ] **Step 2: 替换 SettingsSheet.tsx 中的内联 spinner（line 1201-1205）**

```tsx
// 替换前
<Show when={isCheckingUpdate()}>
  <div
    class="w-4 h-4 [border-width:var(--strokeWidthThick)] border-solid [border-color:var(--colorNeutralStroke2)] [border-top-color:var(--colorBrandStroke1)] rounded-[var(--borderRadiusCircular)]"
    style="animation: spin 1s linear infinite"
  />
</Show>

// 替换后
<Show when={isCheckingUpdate()}>
  <fluent-spinner size="tiny"></fluent-spinner>
</Show>
```

- [ ] **Step 3: 构建检查**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm run check
```

Expected: 编译通过。

- [ ] **Step 4: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/src/components/LoadingSpinner.tsx packages/app/src/components/SettingsSheet.tsx
git commit -m "feat: replace LoadingSpinner and inline spinner with fluent-spinner"
```

---

### Task 8: 替换 divider 为 fluent-divider

**Files:**
- Modify: `packages/app/src/components/SettingsSheet.tsx` — 6 处
- Modify: `packages/app/src/components/BlocklistSheet.tsx` — 1 处
- Modify: `packages/app/src/components/ReportSheet.tsx` — 1 处
- Modify: `packages/app/src/routes/About.tsx` — 1 处

- [ ] **Step 1: SettingsSheet.tsx 替换 6 处 divider**

找到 `class="divider mx-5"`（共 4 处）和 `class="divider my-1"`（共 2 处），全部替换：

```tsx
// 替换前
<div class="divider mx-5" />
// 替换后
<fluent-divider style="margin-inline:20px"></fluent-divider>

// 替换前
<div class="divider my-1" />
// 替换后
<fluent-divider style="margin-block:4px"></fluent-divider>
```

SettingsSheet.tsx 中 divider 出现位置：
- line 454: `mx-5`
- line 900: `my-1`
- line 954: `my-1`
- line 995: `mx-5`
- line 1114: `mx-5`
- line 1230: `mx-5`

- [ ] **Step 2: BlocklistSheet.tsx 替换 divider（line 89）**

```tsx
// 替换前
<div class="divider mx-5" />
// 替换后
<fluent-divider style="margin-inline:20px"></fluent-divider>
```

- [ ] **Step 3: ReportSheet.tsx 替换 divider（line 117）**

```tsx
// 替换前
<div class="divider mx-5" />
// 替换后
<fluent-divider style="margin-inline:20px"></fluent-divider>
```

- [ ] **Step 4: About.tsx 替换 divider（line 218）**

```tsx
// 替换前
<div class="mx-4 divider" />
// 替换后
<fluent-divider style="margin-inline:16px"></fluent-divider>
```

- [ ] **Step 5: 构建检查**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm run check
```

Expected: 编译通过。

- [ ] **Step 6: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/src/components/SettingsSheet.tsx packages/app/src/components/BlocklistSheet.tsx
git add packages/app/src/components/ReportSheet.tsx packages/app/src/routes/About.tsx
git commit -m "feat: replace dividers with fluent-divider across 4 files"
```

---

### Task 9: 创建共享 FluentIcon 组件

**Files:**
- Create: `packages/app/src/components/ui/FluentIcon.tsx`
- Modify: `packages/app/src/components/NavBar.tsx` — 删除内联 FluentIcon + iconPaths，改用共享组件
- Modify: `packages/app/src/components/SettingsSheet.tsx` — 删除 iconPaths 对象 + 内联 FluentIcon，改用共享组件

**Interfaces:**
- Produces: `FluentIcon` 组件 + `FluentIconName` 类型，可在全项目复用

- [ ] **Step 1: 创建目录**

```bash
mkdir -p /Users/lilianda/develop/pixivizer/packages/app/src/components/ui
```

- [ ] **Step 2: 创建 FluentIcon.tsx**

合并 NavBar.tsx（3 个图标: home/people/bookmark）和 SettingsSheet.tsx（9 个图标: weatherSunny/weatherMoon/image/imageSearch/server/settings/signOut/delete/open）的 SVG path 数据到同一个文件：

```tsx
// packages/app/src/components/ui/FluentIcon.tsx
import { type Component } from "solid-js";

export type FluentIconName =
  | "home"
  | "people"
  | "bookmark"
  | "weatherSunny"
  | "weatherMoon"
  | "image"
  | "imageSearch"
  | "server"
  | "settings"
  | "signOut"
  | "delete"
  | "open";

interface Props {
  name: FluentIconName;
  size?: number;
  active?: boolean;
}

// SVG path data sourced from microsoft/fluentui-system-icons (24px)
const paths: Record<FluentIconName, { regular: string; filled: string }> = {
  home: {
    regular:
      "M10.55 2.532a2.25 2.25 0 0 1 2.9 0l6.75 5.692c.507.428.8 1.057.8 1.72v9.31a1.75 1.75 0 0 1-1.75 1.75h-3.5a1.75 1.75 0 0 1-1.75-1.75v-5.007a.25.25 0 0 0-.25-.25h-3.5a.25.25 0 0 0-.25.25v5.007a1.75 1.75 0 0 1-1.75 1.75h-3.5A1.75 1.75 0 0 1 3 19.254v-9.31c0-.663.293-1.292.8-1.72zm1.933 1.147a.75.75 0 0 0-.966 0L4.767 9.37a.75.75 0 0 0-.267.573v9.31c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-5.007c0-.967.784-1.75 1.75-1.75h3.5c.966 0 1.75.783 1.75 1.75v5.007c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-9.31a.75.75 0 0 0-.267-.573z",
    filled:
      "M13.45 2.533a2.25 2.25 0 0 0-2.9 0L3.8 8.228a2.25 2.25 0 0 0-.8 1.72v9.305c0 .966.784 1.75 1.75 1.75h3a1.75 1.75 0 0 0 1.75-1.75V15.25c0-.68.542-1.232 1.217-1.25h2.566a1.25 1.25 0 0 1 1.217 1.25v4.003c0 .966.784 1.75 1.75 1.75h3a1.75 1.75 0 0 0 1.75-1.75V9.947a2.25 2.25 0 0 0-.8-1.72z",
  },
  people: {
    regular:
      "M5.5 8a2.5 2.5 0 1 1 5 0a2.5 2.5 0 0 1-5 0M8 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8m7.5 5a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0M17 6a3 3 0 1 0 0 6a3 3 0 0 0 0-6m-2.752 13.038c.703.285 1.604.462 2.753.462c2.282 0 3.586-.697 4.297-1.558c.345-.418.52-.84.61-1.163a2.7 2.7 0 0 0 .093-.573v-.027A2.18 2.18 0 0 0 19.822 14H14.18q-.042 0-.082.002c.394.41.68.925.816 1.498h4.908c.372 0 .674.299.679.669l-.003.032q-.006.058-.037.18a1.6 1.6 0 0 1-.32.605c-.35.426-1.172 1.014-3.14 1.014c-.98 0-1.676-.146-2.17-.345c-.108.4-.286.883-.583 1.383M4.25 14A2.25 2.25 0 0 0 2 16.25v.278a2 2 0 0 0 .014.208a4.5 4.5 0 0 0 .778 2.07C3.61 19.974 5.172 21 8 21s4.39-1.025 5.208-2.195a4.5 4.5 0 0 0 .778-2.07a3 3 0 0 0 .014-.207v-.278A2.25 2.25 0 0 0 11.75 14zm-.75 2.507v-.257a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 .75.75v.257l-.007.08a3 3 0 0 1-.514 1.358C11.486 18.65 10.422 19.5 8 19.5s-3.486-.85-3.98-1.555a3 3 0 0 1-.513-1.358z",
    filled:
      "M8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12ZM17 12C18.6569 12 20 10.6569 20 9C20 7.34315 18.6569 6 17 6C15.3431 6 14 7.34315 14 9C14 10.6569 15.3431 12 17 12ZM4.25 14C3.00736 14 2 15.0074 2 16.25V16.5C2 16.5 2 21 8 21C14 21 14 16.5 14 16.5V16.25C14 15.0074 12.9926 14 11.75 14H4.25ZM17.0002 19.5C15.829 19.5 14.9321 19.3189 14.2453 19.0416C14.5873 18.4667 14.7719 17.9142 14.8724 17.4836C14.9328 17.2247 14.9645 17.0027 14.9813 16.8353C14.9897 16.7512 14.9944 16.68 14.997 16.6237C14.9983 16.5955 14.9991 16.5709 14.9996 16.5503L15.0001 16.5222L15.0002 16.5103L15.0002 16.505L15.0002 16.5024C15.0002 16.4992 15.0002 16.5 15.0002 16.5V16.25C15.0002 15.3779 14.6567 14.5861 14.0977 14.0023C14.1316 14.0008 14.1658 14 14.2002 14H19.8002C21.0152 14 22.0002 14.985 22.0002 16.2C22.0002 16.2 22.0002 19.5 17.0002 19.5Z",
  },
  bookmark: {
    regular:
      "M6.19094 21.8547C5.6948 22.2117 5.00293 21.8571 5.00293 21.2459V6.25C5.00293 4.45507 6.458 3 8.25293 3H15.7513C17.5462 3 19.0013 4.45507 19.0013 6.25V21.2459C19.0013 21.8571 18.3094 22.2117 17.8133 21.8547L12.0021 17.6738L6.19094 21.8547ZM17.5013 6.25C17.5013 5.2835 16.7178 4.5 15.7513 4.5H8.25293C7.28643 4.5 6.50293 5.2835 6.50293 6.25V19.7824L11.5641 16.141C11.8258 15.9528 12.1785 15.9528 12.4401 16.141L17.5013 19.7824V6.25Z",
    filled:
      "M6.19 21.855a.75.75 0 0 1-1.187-.61V6.25A3.25 3.25 0 0 1 8.253 3h7.498a3.25 3.25 0 0 1 3.25 3.25v14.996a.75.75 0 0 1-1.188.609l-5.81-4.181z",
  },
  weatherSunny: {
    regular:
      "M12 2.75a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1a.75.75 0 0 1 .75-.75zm0 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-1.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm8.75-8.25a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zM4.25 8a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zm14.44-4.03a.75.75 0 0 1 0 1.06l-.72.72a.75.75 0 1 1-1.06-1.06l.72-.72a.75.75 0 0 1 1.06 0zM6.34 17.66a.75.75 0 0 1 0 1.06l-.72.72a.75.75 0 1 1-1.06-1.06l.72-.72a.75.75 0 0 1 1.06 0zm13.09-9.66a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zM5.34 4.97a.75.75 0 0 1 1.06 0l.72.72a.75.75 0 0 1-1.06 1.06l-.72-.72a.75.75 0 0 1 0-1.06zm12.32 12.32a.75.75 0 0 1 1.06 0l.72.72a.75.75 0 0 1-1.06 1.06l-.72-.72a.75.75 0 0 1 0-1.06z",
    filled:
      "M12 2a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1A.75.75 0 0 1 12 2zm0 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm9.75-9.5h-1a.75.75 0 0 0 0 1.5h1a.75.75 0 0 0 0-1.5zm-19.5 0h-1a.75.75 0 0 0 0 1.5h1a.75.75 0 0 0 0-1.5zm16.97-4.72a.75.75 0 0 0-1.06 0l-.72.72a.75.75 0 0 0 1.06 1.06l.72-.72a.75.75 0 0 0 0-1.06zM7.4 17.66a.75.75 0 0 0-1.06 0l-.72.72a.75.75 0 0 0 1.06 1.06l.72-.72a.75.75 0 0 0 0-1.06zM5.34 4.97a.75.75 0 0 0-1.06 1.06l.72.72a.75.75 0 0 0 1.06-1.06l-.72-.72zm13.32 12.32a.75.75 0 0 0-1.06 1.06l.72.72a.75.75 0 0 0 1.06-1.06l-.72-.72z",
  },
  weatherMoon: {
    regular:
      "M20.026 16.004a.75.75 0 0 1 .236 1.034 8.002 8.002 0 0 1-11.303-11.303.75.75 0 0 1 1.27.27 6.5 6.5 0 0 0 9.826 9.826.75.75 0 0 1-.029.173zm-9.463-1.1a6.5 6.5 0 0 1 8.423-8.423A8.002 8.002 0 0 1 9.078 17.94a6.5 6.5 0 0 1 1.485-3.036z",
    filled:
      "M20.026 16.004a.75.75 0 0 1 .236 1.034A8 8 0 1 1 6.962 5.72a.75.75 0 0 1 1.27.799A6.5 6.5 0 0 0 19.476 15.2a.75.75 0 0 1 .55.803z",
  },
  image: {
    regular:
      "M17.75 3A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3zm0 1.5H6.25A1.75 1.75 0 0 0 4.5 6.25v11.5c0 .966.784 1.75 1.75 1.75h11.5a1.75 1.75 0 0 0 1.75-1.75V6.25a1.75 1.75 0 0 0-1.75-1.75zm-1.72 1.72a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5zm0 1.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM5 15.25V17.5l.005.16A1.75 1.75 0 0 0 6.75 19.25h10.5a1.75 1.75 0 0 0 1.745-1.607L19 17.5v-2.25a.75.75 0 0 0-.648-.743L18.25 14.5H5.75a.75.75 0 0 0-.743.648z",
    filled:
      "M17.75 3A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3zm-1.72 7.78a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5zM5 15.25V17.5l.005.16A1.75 1.75 0 0 0 6.75 19.25h10.5a1.75 1.75 0 0 0 1.745-1.607L19 17.5v-2.25a.75.75 0 0 0-.648-.743L18.25 14.5H5.75a.75.75 0 0 0-.743.648z",
  },
  imageSearch: {
    regular:
      "M17.75 3A3.25 3.25 0 0 1 21 6.25v5.772a3.501 3.501 0 0 0-1.5-.657V12h-3.75a2.25 2.25 0 0 0-2.25 2.25v3.232l-.207-.17-5.23-4.405a.75.75 0 0 0-.982.03l-2.08 1.942V6.25A1.75 1.75 0 0 1 6.25 4.5h11.5a1.75 1.75 0 0 1 1.75 1.75v1.022a3.507 3.507 0 0 0-1.5.15V6.25zM16.03 6.22a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5zm0 1.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5zm-.101 6.53l4.157 4.146a.75.75 0 0 1-1.06 1.06l-4.158-4.146a3.495 3.495 0 0 1 1.061-1.06zm2.572 2.457a2 2 0 1 1-.033.07l.033-.07z",
    filled:
      "M21 10.764v3.486a2.25 2.25 0 0 0 0-3.486zM16.03 6.22a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5zm-.072 8.25a3.487 3.487 0 0 0-1.414.597l-4.267-3.582a.75.75 0 0 0-.982.03l-3.294 3.11V6.25A3.25 3.25 0 0 1 9.25 3h5.5A3.25 3.25 0 0 1 18 6.25v9.757a3.493 3.493 0 0 0-2.042-1.537zm3.114 5.35l-3.646-3.646a2 2 0 1 1 1.06-1.06l3.646 3.646a.75.75 0 0 1-1.06 1.06z",
  },
  server: {
    regular:
      "M9.25 3A3.25 3.25 0 0 0 6 6.25v11.5A3.25 3.25 0 0 0 9.25 21h5.5A3.25 3.25 0 0 0 18 17.75V6.25A3.25 3.25 0 0 0 14.75 3zM7.5 6.25A1.75 1.75 0 0 1 9.25 4.5h5.5a1.75 1.75 0 0 1 1.75 1.75v11.5a1.75 1.75 0 0 1-1.75 1.75h-5.5a1.75 1.75 0 0 1-1.75-1.75zm5.75 11.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zm2.75-9.25a.75.75 0 0 1-.75.75H8.75a.75.75 0 0 1 0-1.5h6.5a.75.75 0 0 1 .75.75zm0 3a.75.75 0 0 1-.75.75H8.75a.75.75 0 0 1 0-1.5h6.5a.75.75 0 0 1 .75.75z",
    filled:
      "M14.75 21H9.25A3.25 3.25 0 0 1 6 17.75V6.25A3.25 3.25 0 0 1 9.25 3h5.5A3.25 3.25 0 0 1 18 6.25v11.5A3.25 3.25 0 0 1 14.75 21zm-2-3a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm2.5-9.25a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 .75-.75zm0 3a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 .75-.75z",
  },
  settings: {
    regular:
      "M12.003.75a.75.75 0 0 1 .75.75v1.087a6.696 6.696 0 0 1 1.97.812l.765-.765a.75.75 0 0 1 1.06 1.06l-.742.743c.488.541.894 1.15 1.194 1.81l1.032-.32a.75.75 0 1 1 .462 1.427l-1.054.342c.05.402.06.813.028 1.22l1.06.382a.75.75 0 0 1-.497 1.416l-1.077-.378a6.687 6.687 0 0 1-1.268 1.849l.753.754a.75.75 0 0 1-1.06 1.06l-.78-.78a6.696 6.696 0 0 1-1.823.789v1.112a.75.75 0 0 1-1.5 0v-1.102a6.67 6.67 0 0 1-1.853-.794l-.777.777a.75.75 0 0 1-1.06-1.06l.75-.75a6.697 6.697 0 0 1-1.27-1.835l-1.08.376a.75.75 0 1 1-.496-1.415l1.06-.384a6.736 6.736 0 0 1 .032-1.245l-1.05-.342a.75.75 0 1 1 .465-1.427l1.032.32c.303-.658.713-1.267 1.204-1.806l-.743-.743a.75.75 0 1 1 1.06-1.06l.766.766a6.694 6.694 0 0 1 1.962-.811V1.5a.75.75 0 0 1 .75-.75zm-.005 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
    filled:
      "M12.003.75a.75.75 0 0 1 .75.75v1.087a6.7 6.7 0 0 1 1.97.812l.765-.765a.75.75 0 0 1 1.06 1.06l-.742.743c.488.541.894 1.15 1.194 1.81l1.032-.32a.75.75 0 1 1 .462 1.427l-1.054.342c.05.402.06.813.028 1.22l1.06.382a.75.75 0 0 1-.497 1.416l-1.077-.378a6.693 6.693 0 0 1-1.268 1.849l.753.754a.75.75 0 0 1-1.06 1.06l-.78-.78a6.716 6.716 0 0 1-1.823.789v1.112a.75.75 0 0 1-1.5 0v-1.102a6.658 6.658 0 0 1-1.853-.794l-.777.777a.75.75 0 0 1-1.06-1.06l.75-.75a6.695 6.695 0 0 1-1.27-1.835l-1.08.376a.75.75 0 1 1-.496-1.415l1.06-.384a6.745 6.745 0 0 1 .032-1.245l-1.05-.342a.75.75 0 1 1 .465-1.427l1.032.32c.303-.658.713-1.267 1.204-1.806l-.743-.743a.75.75 0 1 1 1.06-1.06l.766.766a6.687 6.687 0 0 1 1.962-.811V1.5a.75.75 0 0 1 .75-.75zm-.005 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
  },
  signOut: {
    regular:
      "M12 4.5a1 1 0 0 0-1 1v2a.75.75 0 0 1-1.5 0v-2A2.5 2.5 0 0 1 12 3h3.5A2.5 2.5 0 0 1 18 5.5v13A2.5 2.5 0 0 1 15.5 21H12a2.5 2.5 0 0 1-2.5-2.5v-2a.75.75 0 0 1 1.5 0v2a1 1 0 0 0 1 1h3.5a1 1 0 0 0 1-1v-13a1 1 0 0 0-1-1H12zm-4.22 4.72a.75.75 0 0 1 0 1.06l-1.47 1.47H14a.75.75 0 0 1 0 1.5H6.31l1.47 1.47a.75.75 0 1 1-1.06 1.06l-2.75-2.75a.75.75 0 0 1 0-1.06l2.75-2.75a.75.75 0 0 1 1.06 0z",
    filled:
      "M12 4.5a1 1 0 0 0-1 1v1.75a.75.75 0 0 1-1.5 0V5.5A2.5 2.5 0 0 1 12 3h3.5A2.5 2.5 0 0 1 18 5.5v13A2.5 2.5 0 0 1 15.5 21H12a2.5 2.5 0 0 1-2.5-2.5v-1.75a.75.75 0 0 1 1.5 0v1.75a1 1 0 0 0 1 1h3.5a1 1 0 0 0 1-1v-13a1 1 0 0 0-1-1H12zM6.22 9.22a.75.75 0 0 1 1.06 0l2.75 2.75a.75.75 0 0 1 0 1.06l-2.75 2.75a.75.75 0 0 1-1.06-1.06l1.47-1.47H2.75a.75.75 0 0 1 0-1.5h4.94l-1.47-1.47a.75.75 0 0 1 0-1.06z",
  },
  delete: {
    regular:
      "M10 3.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v1.25h-4V3.25zM6.5 5v13.75a2.25 2.25 0 0 0 2.25 2.25h6.5a2.25 2.25 0 0 0 2.25-2.25V5h-11zm4.25 3.25a.75.75 0 0 1 1.5 0v7.5a.75.75 0 0 1-1.5 0v-7.5zm-3 0a.75.75 0 0 1 1.5 0v7.5a.75.75 0 0 1-1.5 0v-7.5z",
    filled:
      "M10 3.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v1.25h-4V3.25zM5.75 5h12.5a.75.75 0 0 1 0 1.5h-.75v12.25a2.25 2.25 0 0 1-2.25 2.25H8.75a2.25 2.25 0 0 1-2.25-2.25V6.5H5.75a.75.75 0 0 1 0-1.5zm3.5 3.75a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 1.5 0v-7.5zm4 0a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 1.5 0v-7.5z",
  },
  open: {
    regular:
      "M6.25 4.5A1.75 1.75 0 0 0 4.5 6.25v11.5c0 .966.784 1.75 1.75 1.75h11.5a1.75 1.75 0 0 0 1.75-1.75v-5a.75.75 0 0 1 1.5 0v5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3h5a.75.75 0 0 1 0 1.5h-5zm6.5 0a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0V6.31l-6.97 6.97a.75.75 0 1 1-1.06-1.06l6.97-6.97h-3.94a.75.75 0 0 1-.75-.75z",
    filled:
      "M6.25 4.5A1.75 1.75 0 0 0 4.5 6.25v11.5c0 .966.784 1.75 1.75 1.75h11.5a1.75 1.75 0 0 0 1.75-1.75v-5a.75.75 0 0 1 1.5 0v5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3h5a.75.75 0 0 1 0 1.5h-5zm6.5 0a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0V6.31l-6.97 6.97a.75.75 0 1 1-1.06-1.06l6.97-6.97h-3.94a.75.75 0 0 1-.75-.75z",
  },
};

const FluentIcon: Component<Props> = (props) => {
  const size = () => props.size ?? 24;
  const p = paths[props.name];
  return (
    <svg width={size()} height={size()} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={p.regular}
        fill="currentColor"
        style={{
          opacity: props.active ? 0 : 1,
          transition: "opacity var(--durationFast) var(--curveEasyEase)",
        }}
      />
      <path
        d={p.filled}
        fill="currentColor"
        style={{
          opacity: props.active ? 1 : 0,
          transition: "opacity var(--durationFast) var(--curveEasyEase)",
        }}
      />
    </svg>
  );
};

export default FluentIcon;
```

- [ ] **Step 3: 更新 NavBar.tsx — 删除内联 FluentIcon 和 iconPaths，使用共享组件**

删除 NavBar.tsx 中：
1. 从 `// ── Fluent UI System Icons (24px)` 到 `} as const;` 的全部 iconPaths 对象（约 30 行）
2. FluentIcon 组件定义（约 26 行）

在文件顶部添加：
```typescript
import FluentIcon from "./ui/FluentIcon";
```

- [ ] **Step 4: 更新 SettingsSheet.tsx — 删除 iconPaths，使用共享组件**

删除 SettingsSheet.tsx 中：
1. 从 `// ── Fluent UI System Icons (24px)` 到 `} as const;` 的全部 iconPaths 对象（约 55 行）
2. FluentIcon 组件定义（约 24 行）

在文件顶部（import 区域）添加：
```typescript
import FluentIcon from "./ui/FluentIcon";
```

注意：SettingsSheet.tsx 在 `packages/app/src/components/` 目录下，`ui/` 是它的同级子目录，所以 import 路径为 `"./ui/FluentIcon"`。

- [ ] **Step 5: 构建检查**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm run check
```

Expected: 编译通过。如果报 `FluentIconName` 类型错误，检查 SettingsSheet.tsx 中 `<FluentIcon name="...">` 的 name 值是否完全匹配 `FluentIconName` union type。

- [ ] **Step 6: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/src/components/ui/FluentIcon.tsx
git add packages/app/src/components/NavBar.tsx packages/app/src/components/SettingsSheet.tsx
git commit -m "refactor: extract shared FluentIcon component, unify icon paths"
```

---

### Task 10: 清理 uno.config.ts 中被替代的 shortcuts

**Files:**
- Modify: `packages/app/uno.config.ts`

- [ ] **Step 1: 删除被替代的 shortcuts**

从 `packages/app/uno.config.ts` 中删除以下 shortcuts 定义：

```typescript
// 删除整个 btn 到 btn-icon 的块 (lines 33-42):
    // ── Buttons (Fluent 2 anatomy: 14px/600, 32px min-height, 4px radius, 16px h-pad) ──
    btn: "...",
    "btn-primary": "...",
    "btn-secondary": "...",
    "btn-subtle": "...",
    "btn-icon": "...",

// 删除 spinner 行 (line 71-72):
    // ── Spinner (Fluent ProgressRing: thick neutral stroke + brand top edge) ──
    spinner: "...",

// 删除 divider 行 (line 68):
    // ── Divider ──
    divider: "...",

// 删除 badge 和 badge-overlay 行 (lines 54-55, 75-76):
    // ── Badge (Fluent 2 Tag) ──
    badge: "...",
    // ── Image badge overlay (card corner label) ──
    "badge-overlay": "...",
```

保留所有其他 shortcuts。

- [ ] **Step 2: 构建检查**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm run check
```

Expected: 编译通过。如果报某个 shortcut 未定义，说明还有文件引用了这些被删除的 class —— 需要回 Task 2-8 检查是否漏替换。

- [ ] **Step 3: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/uno.config.ts
git commit -m "chore: remove replaced UnoCSS shortcuts (btn, spinner, divider, badge)"
```

---

### Task 11: 最终构建验证

**Files:**
- Run: `pnpm run build` 和 `pnpm run check`

- [ ] **Step 1: 全量构建**

```bash
cd /Users/lilianda/develop/pixivizer
pnpm run build
```

Expected: 构建成功，无 TypeScript 错误，dist/ 目录生成。

- [ ] **Step 2: Check 检查**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
pnpm run check
```

Expected: 通过。

- [ ] **Step 3: 验证 diff 范围**

```bash
cd /Users/lilianda/develop/pixivizer
git diff --stat
```

Expected: 改动的文件数量在 15-18 个左右（package.json, main.tsx, uno.config.ts, 12-15 个组件/路由文件, 1 个新建文件）。

- [ ] **Step 4: 最终 Commit（如果有未提交的修复）**

```bash
cd /Users/lilianda/develop/pixivizer
git add -A
git commit -m "chore: final build fixes after Fluent WC integration"
```

---

## 验收清单

- [ ] `pnpm run dev` 启动无编译错误
- [ ] 6 个 Toggle 开关功能正常
- [ ] 24 个按钮交互正常（点击/hover/active/disabled）
- [ ] LoadingSpinner 在所有使用处正常显示
- [ ] AgeGate dialog 打开/关闭正常
- [ ] SettingsSheet 中 2 个 ConfirmDialog 打开/关闭正常
- [ ] ImageCard 上 R-18/动图/AI 标正常显示
- [ ] 深色/浅色主题切换时 Fluent 组件颜色同步变化
- [ ] `pnpm run build` 构建通过
