# 0010. 滚动恢复必须显式执行，禁止依赖 Virtualizer initialOffset

## 状态

已接受（2026-07-21）

## 背景

虚拟滚动 Feed 的滚动恢复有两条可能路径：

1. **隐式恢复**：把保存的 offset 传给 TanStack Virtualizer 的 `initialOffset` / `initialMeasurementsCache` 构造参数，依赖 `_willUpdate` 内部的 `_scrollToOffset` 让窗口滚动到目标位置。
2. **显式恢复**：组件挂载后由代码主动执行 `window.scrollTo`，并用 ResizeObserver 监听文档生长做兜底重试。

插画 Feed（`VirtualFeed`）历史上两条都有（显式为主）；小说 Feed（`NovelVirtualFeed`）只有隐式路径。真机实测（Android 9 / WebView 138，CDP 采样 3.6 秒）：小说 Feed 从详情返回后 `window.scrollY` 恒为 0，全程零 scroll 事件——**Virtualizer 的 `initialOffset` 在该环境下从不触发窗口滚动**，仅决定首帧渲染的虚拟窗口位置。

此外 `NovelFeedPage` 用挂载时一次性求值的 `cached` 决定 `scrollKey`，首次访问（数据未缓存）时 `scrollKey=undefined`，保存逻辑整体跳过——这是「开发模式正常、全新安装必现」差异的根源（dev 下 HMR 保活使缓存恒为 true）。

## 决策

1. virtual 模式的滚动恢复**一律显式执行**，统一由 `src/primitives/createVirtualScrollRestore.ts` 实现（三层兜底：同步 `scrollTo` → ResizeObserver 重试 → 超时放弃）。所有虚拟滚动 Feed 必须使用该原语，不得各自手写恢复逻辑。
2. `initialOffset` / `initialMeasurementsCache` 仍传给 Virtualizer，但语义仅限「首帧渲染的虚拟窗口位置」，不构成恢复机制。
3. `scrollKey` 无条件传入；「无缓存可恢复」由存储层读取返回空值自然表达，调用方不做前置 gating。

## 理由

- 隐式路径的正确性依赖 Virtualizer 内部时机与浏览器行为，实测在 WebView 中静默失效（不报错、不滚动），属于不可依赖的接口。
- 显式路径不依赖 Virtualizer 内部实现，且对「文档高度不足导致 scrollY 被 clamp」有时序兜底。
- 收敛到单一原语后，插画/小说/用户作品三处 Feed 的恢复行为逐字节一致，杜绝「每加一个 Feed 重写一次」。

## 后果

- 新增虚拟滚动 Feed 时，滚动恢复只需接线 `createVirtualScrollRestore`（提供 `getVirtualizer` / `getState` / `saveState`），并在自身 `onMount` 末尾调用一次 `restoreScroll()`（恢复必须排在 `_didMount`/`_willUpdate` 之后，此顺序由调用方显式保证）。
- simple 模式（非虚拟滚动页面）不受此决策约束，继续使用 `createScrollRestore` / `scrollRestoreGlobal`。
