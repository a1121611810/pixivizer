# ADR-0017: VirtualFeed/NovelVirtualFeed 统一 — 集成 createFeedVirtualizer

## 状态

批准 — 立即执行

## 背景

`VirtualFeed.tsx`（405 行）和 `NovelVirtualFeed.tsx`（346 行）共享约 80% 的虚拟滚动基础设施代码，包括 TanStack Virtualizer 生命周期、scroll/resize 监听、ResizeObserver、哨兵分页、pull-to-refresh 事件处理。差异仅在卡片子组件和个别增强。

`primitives/createFeedVirtualizer.ts`（241 行）已存在，封装了上述重复逻辑，但从未被集成。

## 设计决策

### D1: 集成而非重写

增强 `createFeedVirtualizer`，两个 Feed 组件改为内部使用它，保持同名导出和 props 接口不变。

### D2: 原语增强

| 特性 | 现状 | 增强后 |
|------|------|--------|
| Pull-to-refresh | 单段式 60px | 可选两段式（settingsThreshold 配置） |
| Scroll restoration | 不支持 | 接收 scrollRestore 配置对象 |
| measureElement | 不支持 | 暴露 measureElement 方法 |

### D3: 接口向后兼容

所有消费者零修改，`createFeedVirtualizer` 新增字段均为可选。

## 收益

| 指标 | 之前 | 之后 |
|------|------|------|
| VirtualFeed.tsx | 405 行 | ~260 行 (-35%) |
| NovelVirtualFeed.tsx | 346 行 | ~200 行 (-42%) |
| 重复 Virtualizer 代码 | 2 份 | 1 份 |
