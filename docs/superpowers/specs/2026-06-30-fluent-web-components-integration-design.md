# 集成 @fluentui/web-components v3 到 Pictelio 的设计方案

> 状态：最终稿 · 2026-06-30

---

## 1. 背景与目标

### 1.1 现状

Pictelio 是一个基于 SolidJS + UnoCSS 的第三方 Pixiv 插画浏览器，设计语言使用 Microsoft Fluent Design System 2。当前 UI 基础设施存在以下重复劳动：

- **手写 Toggle 开关**：SettingsSheet.tsx 中 6 处完全相同的 toggle 实现，每处 ~25 行 UnoCSS 原子类
- **手写按钮体系**：24 处 `btn-primary` / `btn-secondary` / `btn-icon` 分布在 12 个组件文件中，通过 UnoCSS shortcut 定义
- **手写对话框**：ConfirmDialog 组件内联在 SettingsSheet.tsx 中，无法复用
- **手写徽章**：ImageCard.tsx 中 badge-overlay 实现
- **手写 Spinner**：LoadingSpinner 组件 + 内联 spinner
- **手写 Divider**：多个文件中 `class="divider"`
- **图标组件重复**：NavBar.tsx 和 SettingsSheet.tsx 各自定义了一个 FluentIcon 组件

### 1.2 目标

引入 `@fluentui/web-components` v3（基于 `@microsoft/fast-element` 的 Fluent Design Web Components），替换以上手写通用 UI 元素，保留业务定制组件（ImageCard / VirtualFeed / NavBar 等）继续使用 SolidJS + UnoCSS。

**指导思想**：
- 通用 UI 元素（按钮、开关、对话框、徽章、分隔线、加载指示器）→ Fluent Web Components
- 业务组件（插画卡片、图片查看器、瀑布流、导航栏、动图播放器）→ SolidJS + UnoCSS
- 视觉统一通过 Fluent Design Tokens（CSS 变量）保证

---

## 2. 架构设计

### 2.1 混合渲染模型

```
┌────────────────────────────────────────────────────────────┐
│                    SolidJS App 层                           │
│  Solid Router / Stores / API Layer / Lifecycle / Effects    │
├──────────────────────────┬─────────────────────────────────┤
│   Fluent WC 渲染区域      │   SolidJS + UnoCSS 渲染区域      │
│                          │                                  │
│  <fluent-button>         │  ImageCard (Pixiv 定制卡片)       │
│  <fluent-switch>         │  PixivImage (图片加载/水印处理)    │
│  <fluent-dialog>         │  UgoiraViewer (Ugoira 动图播放)    │
│  <fluent-badge>          │  VirtualFeed (虚拟滚动列表)        │
│  <fluent-spinner>        │  ImageViewer (全屏图片查看器)      │
│  <fluent-divider>        │  NavBar (底部导航 + 滑动指示器)     │
│                          │  PageTransition (路由过渡动效)     │
│                          │  HeartBurstEffect (收藏心形动画)   │
│                          │  PullIndicator (下拉刷新)          │
│                          │  SkeletonCard (骨架屏卡片)         │
└──────────────────────────┴─────────────────────────────────┘
           │                          │
           └──────────┬───────────────┘
                      ▼
      ┌─────────────────────────────────┐
      │   Fluent Design Tokens 统一层     │
      │  setTheme(webLightTheme/dark)    │
      │  + CSS 变量 (--color*, --font*)  │
      └─────────────────────────────────┘
```

### 2.2 数据流

```
SolidJS Signal ──→ fluent-web-component attribute (单向)
fluent-web-component event ──→ SolidJS handler ──→ Signal 更新 (反向)
```

示例：
```tsx
// Signal → 组件属性
<fluent-switch checked={autoHideNavBar()} ... />

// 组件事件 → Signal
<fluent-switch 
  checked={autoHideNavBar()}
  on:change={() => setAutoHideNavBar(!autoHideNavBar())} 
/>
```

Web Components 不参与 SolidJS 的细粒度响应式图。Fluent 组件通过 HTML attribute 接收值，通过 DOM event 回传状态变化。每次事件处理需手动更新对应的 SolidJS signal。每个交互组件增加约 1 行事件处理代码。

---

## 3. 精确组件替换清单

### 3.1 依赖

```json
{
  "@fluentui/web-components": "^3.0.0",
  "@fluentui/tokens": "^1.0.0"
}
```

包体积预估：~40KB gzip（按需 tree-shaking 后，含 button/switch/dialog/badge/spinner/divider）。

### 3.2 初始化（`main.tsx`）

```typescript
import { setTheme } from '@fluentui/web-components';
import { webLightTheme, webDarkTheme } from '@fluentui/tokens';
import '@fluentui/web-components/web-components.js';

function syncFluentTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  setTheme(isDark ? webDarkTheme : webLightTheme);
}
syncFluentTheme();

const observer = new MutationObserver(syncFluentTheme);
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
```

### 3.3 `<fluent-switch>` — 替换 6 处手写 Toggle

| 文件 | 行号 (近似) | Signal | aria-label |
|------|-------------|--------|------------|
| SettingsSheet.tsx | 546 | `autoHideNavBar()` | 自动隐藏导航栏 |
| SettingsSheet.tsx | 592 | `showR18()` | 显示 R18 内容 |
| SettingsSheet.tsx | 638 | `showR18G()` | 显示 R-18G 内容 |
| SettingsSheet.tsx | 766 | `usePredictiveBack()` | 预测性返回手势 |
| SettingsSheet.tsx | ~870 | `showDetailStairs()` | 详情页楼梯导航 |
| SettingsSheet.tsx | 1122 | `autoCheckUpdate()` | 启动时检查更新 |

每处替换删除 ~25 行手写 DOM，合计删除 ~150 行。

```tsx
// 替换前
<button 
  onClick={() => setAutoHideNavBar(!autoHideNavBar())}
  role="switch"
  aria-checked={autoHideNavBar()}
  aria-label="自动隐藏导航栏"
  class="relative flex-shrink-0 w-14 min-h-10 px-0 ..."
>
  <span class="block w-14 h-7 rounded-full ...">
    <span class="absolute top-0.5 left-0 w-6 h-6 ..." />
  </span>
</button>

// 替换后
<fluent-switch 
  checked={autoHideNavBar()}
  on:change={() => setAutoHideNavBar(!autoHideNavBar())}
  aria-label="自动隐藏导航栏"
/>
```

### 3.4 `<fluent-button>` — 替换 24 处按钮

appearance 映射：

| UnoCSS class | fluent-button appearance | 用途 |
|--------------|------------------------|------|
| `btn-primary` | `primary` | 主要操作（确认、提交） |
| `btn-secondary` | `secondary` | 次要操作（取消、返回） |
| `btn-icon` | `subtle` | 图标按钮（关闭、设置齿轮） |
| `btn-subtle` | (保持不变，目前未使用) | 轻量操作 |

| 文件 | 行号 | 替换前 | 替换后 |
|------|------|--------|--------|
| AgeGate.tsx | 62 | `btn-primary` | `<fluent-button appearance="primary">` |
| AgeGate.tsx | 65 | `btn-secondary` | `<fluent-button appearance="secondary">` |
| AgeConfirmation.tsx | 112 | `btn-primary` | `<fluent-button appearance="primary">` |
| AgeConfirmation.tsx | 115 | `btn-secondary` | `<fluent-button appearance="secondary">` |
| SettingsSheet.tsx | 261 | `btn-secondary` | `<fluent-button appearance="secondary">` |
| SettingsSheet.tsx | 443 | `btn-icon` | `<fluent-button appearance="subtle">` |
| SettingsSheet.tsx | 686 | `btn-secondary` | `<fluent-button appearance="secondary">` |
| BlocklistSheet.tsx | 78 | `btn-icon` | `<fluent-button appearance="subtle">` |
| BlocklistSheet.tsx | 125 | `btn-secondary` | `<fluent-button appearance="secondary">` |
| ReportSheet.tsx | 106 | `btn-icon` | `<fluent-button appearance="subtle">` |
| ReportSheet.tsx | 172 | `btn-primary` | `<fluent-button appearance="primary">` |
| UgoiraViewer.tsx | 128 | `btn-secondary` | `<fluent-button appearance="secondary">` |
| About.tsx | 125 | `btn-icon` | `<fluent-button appearance="subtle">` |
| Feed.tsx | 75 | `btn-icon` | `<fluent-button appearance="subtle">` |
| DebugImage.tsx | 47 | `btn-primary` | `<fluent-button appearance="primary">` |
| IllustDetail.tsx | 343 | `btn-secondary` | `<fluent-button appearance="secondary">` |
| IllustDetail.tsx | 354 | `btn-secondary` | `<fluent-button appearance="secondary">` |
| IllustDetail.tsx | 364 | `btn-icon` | `<fluent-button appearance="subtle">` |
| IllustDetail.tsx | 371 | `btn-icon` | `<fluent-button appearance="subtle">` |
| PersonalCenter.tsx | 144 | `btn-icon` | `<fluent-button appearance="subtle">` |
| TabFeedPage.tsx | 106 | `btn-icon` | `<fluent-button appearance="subtle">` |
| UserIllusts.tsx | 59 | `btn-icon` | `<fluent-button appearance="subtle">` |

### 3.5 `<fluent-dialog>` — 替换 ConfirmDialog + AgeGate

**ConfirmDialog**（SettingsSheet.tsx lines 189-220, 32 行内联组件）：

```tsx
// SettingsSheet.tsx — 替换所有 ConfirmDialog 使用处（clear + deleteAccount）
// 不再需要 ConfirmDialog 组件定义，直接使用 fluent-dialog

// 替换前
<ConfirmDialog
  isOpen={dialogState()?.type === "clear"}
  title="清除所有本地数据？"
  body="这将删除本应用在本机保存的全部数据..."
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
  <p>这将删除本应用在本机保存的全部数据...</p>
  <fluent-button slot="actions" appearance="secondary" on:click={() => setDialogState(null)}>
    取消
  </fluent-button>
  <fluent-button slot="actions" appearance="primary" on:click={handleClearLocalData}>
    确认清除
  </fluent-button>
</fluent-dialog>
```

**AgeGate**（AgeGate.tsx 全部 72 行）：
```tsx
// 替换前 — 手写 dialog 容器 + scrim + scale 动画
// 替换后 — fluent-dialog 包裹现有内容
<fluent-dialog open aria-label="年龄确认">
  <h3 slot="title">年龄确认</h3>
  <p>你是否已满 18 周岁？</p>
  <fluent-button slot="actions" appearance="primary" on:click={confirmAdult}>
    已满 18 岁
  </fluent-button>
  <fluent-button slot="actions" appearance="secondary" on:click={confirmMinor}>
    未满 18 岁
  </fluent-button>
</fluent-dialog>
```

### 3.6 `<fluent-badge>` — 替换 ImageCard 徽章

| 行号 | 现有内容 | 替换后 |
|------|---------|--------|
| 153 | `▶ 动图` badge-overlay | `<fluent-badge appearance="filled">▶ 动图</fluent-badge>` |
| 157 | R-18（红色） | `<fluent-badge appearance="filled" color="danger">R-18</fluent-badge>` |
| 160 | R-18G（橙黄色） | `<fluent-badge appearance="filled" color="warning">R-18G</fluent-badge>` |
| 164 | AI / AI辅助 | `<fluent-badge appearance="filled">AI</fluent-badge>` |
| 169 | `📄 N` 页码 | `<fluent-badge appearance="subtle">📄 N</fluent-badge>` |

### 3.7 `<fluent-spinner>` — 替换 LoadingSpinner + 内联 spinner

**LoadingSpinner.tsx（21 行 → ~10 行）**：

```tsx
// size 映射: sm → tiny, md → small, lg → medium (Fluent 命名不同)
const sizeMap = { sm: "tiny", md: "small", lg: "medium" } as const;
const LoadingSpinner: Component<Props> = (props) => (
  <div class="flex flex-col items-center justify-center gap-3 py-8">
    <fluent-spinner size={sizeMap[props.size ?? "md"]} />
    {props.text && <p class="...">{props.text}</p>}
  </div>
);
```

**内联 spinner**（SettingsSheet.tsx lines 1201-1205）：
```tsx
// 替换前
<div class="w-4 h-4 [border-width:var(--strokeWidthThick)] border-solid ..." 
     style="animation: spin 1s linear infinite" />

// 替换后
<fluent-spinner size="tiny"></fluent-spinner>
```

### 3.8 `<fluent-divider>` — 替换 divider 元素

| 文件 | 行号 | 替换前 | 替换后 |
|------|------|--------|--------|
| SettingsSheet.tsx | 454 | `<div class="divider mx-5" />` | `<fluent-divider style="margin-inline:20px"></fluent-divider>` |
| SettingsSheet.tsx | 900 | `<div class="divider my-1" />` | `<fluent-divider style="margin-block:4px"></fluent-divider>` |
| SettingsSheet.tsx | 954 | 同上 | 同上 |
| SettingsSheet.tsx | 995 | `<div class="divider mx-5" />` | `<fluent-divider style="margin-inline:20px"></fluent-divider>` |
| SettingsSheet.tsx | 1114 | 同上 | 同上 |
| SettingsSheet.tsx | 1230 | 同上 | 同上 |
| BlocklistSheet.tsx | 89 | `<div class="divider mx-5" />` | `<fluent-divider style="margin-inline:20px"></fluent-divider>` |
| ReportSheet.tsx | 117 | `<div class="divider mx-5" />` | `<fluent-divider style="margin-inline:20px"></fluent-divider>` |
| About.tsx | 218 | `<div class="mx-4 divider" />` | `<fluent-divider style="margin-inline:16px"></fluent-divider>` |

### 3.9 FluentIcon 共享组件

**新建 `packages/app/src/components/ui/FluentIcon.tsx`**：

```tsx
import { type Component } from "solid-js";

export type FluentIconName = 
  | 'home' | 'people' | 'bookmark'          // NavBar
  | 'weatherSunny' | 'weatherMoon'          // Settings 主题
  | 'image' | 'imageSearch'                 // Settings 图片质量
  | 'server' | 'settings' | 'signOut'       // Settings 杂项
  | 'delete' | 'open'                       // Settings 危险区
  ;

interface Props {
  name: FluentIconName;
  size?: number;  // default 24
  active?: boolean;  // true = filled variant
}

// SVG path 数据从 fluentui-system-icons 官方源提取
const paths: Record<FluentIconName, { regular: string; filled: string }> = {
  // ... 合并当前 NavBar.tsx 和 SettingsSheet.tsx 中所有 path 数据
  // 共 12 个图标，每个图标有 regular + filled 两种 variant
};

const FluentIcon: Component<Props> = (props) => {
  const size = () => props.size ?? 24;
  const p = paths[props.name];
  return (
    <svg width={size()} height={size()} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={p.regular} fill="currentColor" 
        style={{ opacity: props.active ? 0 : 1, transition: 'opacity 150ms ease' }} />
      <path d={p.filled} fill="currentColor"
        style={{ opacity: props.active ? 1 : 0, transition: 'opacity 150ms ease' }} />
    </svg>
  );
};
```

**改动文件**：
- NavBar.tsx：删除内联 FluentIcon 定义和 iconPaths 对象，改为 `import { FluentIcon } from "../components/ui/FluentIcon"`
- SettingsSheet.tsx：删除内联 FluentIcon 定义和 iconPaths 对象，改为同上 import

---

## 4. 配置清理

### 4.1 uno.config.ts 删除

以下 shortcuts 将被 Fluent Web Components 替代：

```typescript
// 删除这些 shortcuts
btn
btn-primary
btn-secondary
btn-subtle
btn-icon
spinner
divider
badge
badge-overlay
```

### 4.2 保留不受影响的 shortcuts

```typescript
page
surface-card / surface-card-elevated
surface-flyout / surface-appbar / surface-glass
surface-overlay  // surface-dialog 删除
image-card
input / input-mono
label
segmented / segmented-item / segmented-item-active / segmented-item-inactive
bottom-nav / bottom-nav-container / bottom-nav-pill / bottom-nav-item
bottom-nav-item-active / bottom-nav-item-inactive
nav-icon-regular / nav-icon-filled
```

---

## 5. 迁移步骤

| Step | 操作 | 文件 | 时间 |
|------|------|------|------|
| 1 | `pnpm add @fluentui/web-components @fluentui/tokens` | package.json | 2min |
| 2 | main.tsx 添加注册 + 主题同步代码 | main.tsx | 5min |
| 3 | SettingsSheet Toggle 6 处 → fluent-switch | SettingsSheet.tsx | 20min |
| 4 | 24 处按钮 → fluent-button | 12 文件 | 20min |
| 5 | ConfirmDialog 2 处 → fluent-dialog | SettingsSheet.tsx | 10min |
| 6 | ImageCard badges → fluent-badge | ImageCard.tsx | 10min |
| 7 | LoadingSpinner → fluent-spinner | LoadingSpinner.tsx | 5min |
| 8 | 内联 spinner → fluent-spinner | SettingsSheet.tsx | 3min |
| 9 | 9 处 divider → fluent-divider | 4 文件 | 5min |
| 10 | 创建 FluentIcon 共享组件 | packages/app/src/components/ui/FluentIcon.tsx | 10min |
| 11 | NavBar/SettingsSheet 改用共享 FluentIcon | 2 文件 | 10min |
| 12 | 清理 uno.config.ts 被替代的 shortcuts | uno.config.ts | 5min |
| 13 | 构建验证 | `pnpm run build && pnpm run check` | 5min |

**总预计时间：~110 分钟**

---

## 6. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Shadow DOM 导致 UnoCSS 类无效 | 必然 | 中 | Fluent 组件自带 Fluent 样式，不需要外部覆盖；只在外部容器做布局 |
| SolidJS 事件绑定不一致 | 中 | 低 | 用 `on:click` 而非 `onClick`，明确已测试可用 |
| 主题切换不同步 | 中 | 低 | MutationObserver 监听 html class 变化，调用 setTheme() |
| Capacitor WebView 兼容性 | 低 | 高 | Android WebView (Chrome V8) 完全支持 Custom Elements v1 |
| fluent-button 不提供 `w-full` | 中 | 低 | 用 `style="width:100%"` 或 CSS class 在外层容器设置 |
| 编译/类型错误 | 中 | 中 | Fluent WC 不暴露 TypeScript 类型给 SolidJS JSX；使用 `JSX.IntrinsicElements` 类型扩展或 `as any` |

---

## 7. 验收标准

1. `pnpm run dev` 启动无编译错误
2. SettingsSheet 所有开关功能正常、视觉一致
3. 所有按钮点击事件正确触发、hover/active/disabled 状态完整
4. LoadingSpinner 在所有使用处正确显示
5. Dialog 打开/关闭动画流畅
6. 深色/浅色主题切换时 Fluent 组件颜色同步变化
7. `pnpm run build` 构建通过
8. Android 真机测试开关/按钮/对话框交互正常

---

## 8. 附录：对比 FAST 原生接入 vs 混合方案

| 维度 | 纯 FAST Web Components | 混合方案（本文） |
|------|----------------------|-----------------|
| 业务组件（ImageCard 等） | ⚠️ 重写为 FASTElement | ✅ 保持 SolidJS 现有代码 |
| 通用 UI 元素 | ✅ 原生 Fluent | ✅ 原生 Fluent |
| 学习成本 | 高（团队学 FAST+Web Component） | 低（只需知道 Fluent WC 的标签名） |
| 响应式整合 | 两套系统（FAST Observable + SolidJS） | 单向事件桥接，简单可控 |
| 改动范围 | 30+ 文件 | 15+ 文件 |
| UnoCSS 保留 | ❌ 大量淘汰 | ✅ 保留 70% |
| 项目风险 | 中高 | 低（渐进式，可回退） |
