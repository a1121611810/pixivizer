# ADR-0016: TanStack Query Phase 2 — feedStore 与 novelStore 迁移

## 状态

批准 — 立即执行

## 背景

ADR-0006 确立了 TanStack Query 的采纳策略，并分三阶段实施。Phase 1（bookmarkStore、userIllustsStore）已成功完成并验证了 Thin Store 封装模式的可行性。Phase 2 目标是将剩余的、使用手写 `createStore` 模式的两个大 Store——`feedStore`（740 行）和 `novelStore`（513 行）——迁移到 TQ `createInfiniteQuery`。

当前痛点：

1. **模板代码重复** — feedStore 和 novelStore 维护着几乎相同的模块级缓存结构（`tabXxx`、`tabNextUrl`、`tabLoaded`）、请求锁（`pendingRefreshKeys`）、归并逻辑（`mergeAndSort`）、以及滚动状态包装器
2. **内存泄漏风险** — 模块级 `tabIllusts`/`tabNovels` 对象存储的数据直到页面刷新才释放，不会因 tab 切换或时间过期自动 GC
3. **缺少自动后台刷新** — 手写模式没有 `staleTime` 概念，用户看到的数据可能过时；TQ 的 `staleTime` + `refetchOnMount` 组合可确保适当时机自动更新
4. **测试碎片化** — 手写 store 的测试需要模拟多个模块级 Map/Set 对象和 async 函数；TQ 模式的测试统一通过 mock `createInfiniteQuery` 返回值即可

## 设计决策

### D1: 多查询实例组合模式

bookmarkStore 使用单 `createInfiniteQuery`。feedStore 和 novelStore 由于具有多数据源合并的需求（public + private 关注、illust + manga 推荐），需要多个 TQ 查询实例组合。

**决策**：每个数据源使用独立的 `createInfiniteQuery`，通过模块级 `createRoot` 创建。`illusts()`/`novels()` 为派生 getter，从当前活跃的查询中提取数据并合并。

**数据源映射**：

| Store | 数据源 | TQ queryKey |
|-------|--------|-------------|
| feedStore | follow_public | `['feed', 'follow_public']` |
| feedStore | follow_private | `['feed', 'follow_private']` |
| feedStore | recommended_illust | `['feed', 'recommended_illust']` |
| feedStore | recommended_manga | `['feed', 'recommended_manga']` |
| novelStore | follow_novel_public | `['novel', 'follow_public']` |
| novelStore | follow_novel_private | `['novel', 'follow_private']` |
| novelStore | recommended_novel | `['novel', 'recommended']` |
| novelStore | bookmark_novel | `['novel', 'bookmarks', userId, restrict]` |

**被拒绝方案**：单查询 + queryFn 内部加载多数据源。原因：`getNextPageParam` 无法为多数据源提供独立的 cursor，分页逻辑不可控。

### D2: enabled 控制查询生命周期

每个查询的 `enabled` 选项根据 `currentTab()` + 子标签信号动态计算。查询仅在对应数据源被激活时才运行。切换 tab/子标签时，旧查询因 `enabled: false` 暂停，新查询因 `enabled: true` 启动。TQ 保留 `gcTime` 内的缓存数据，重新激活时若 `staleTime` 未过期则直接返回缓存。

### D3: ensureLoaded 路由预加载

`ensureLoaded` 是从 router.tsx 路由 loader 调用的异步函数，必须返回 Promise。使用 `queryClient.ensureInfiniteQueryData` 激活指定查询并等待数据就绪。

实现：
```ts
async function ensureLoaded(signal?: AbortSignal): Promise<void> {
  const tab = currentTab();
  for (const key of activeQueryKeys()) {
    await queryClient.ensureInfiniteQueryData(queryOptions(key));
  }
}
```

### D4: 滚动恢复保持独立

滚动位置恢复（`scrollRestoreGlobal`）与 TQ 数据获取完全解耦。所有 `saveTabScroll`、`getFeedScrollY`、`saveFeedScrollState`、`getFeedScrollState` 等函数保持不变——它们不涉及数据获取，只操作滚动位置缓存。

### D5: 缓存策略

| 参数 | 值 | 说明 |
|------|-----|------|
| `staleTime` | 30 秒 | 用户在同一标签页内切换子标签时，缓存直接可用 |
| `gcTime` | 5 分钟 | 切换到其他 tab 后返回时，缓存仍在（除非超过 5 分钟） |
| `retry` | 1 | 与全局 QueryClient 一致 |
| `refetchOnWindowFocus` | false | Capacitor 环境下不可靠 |
| `structuralSharing` | false | Solid 适配器强制要求 |

### D6: 接口向后兼容

所有现有导出符号保持签名不变。消费者文件（Feed.tsx、TabFeedPage.tsx、NovelFeedPage.tsx、NovelBookmarks.tsx、router.tsx、VirtualFeed.tsx、NovelVirtualFeed.tsx）无需修改导入内容。仅 VirtualFeed 和 NovelVirtualFeed 因 TQ 滚动状态类型可能需微调——但接口本身不变。

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 多查询实例增加内存开销 | 4 个 TQ 查询实例，每个 ~2KB，总计 < 10KB。可忽略 |
| enabled 切换导致查询闪烁 | TQ 在 enabled=false 时不取消已有 data 引用，`placeholderData: keepPreviousData` 保留旧数据 |
| ensureLoaded 与自动 enabled 竞态 | ensureInfiniteQueryData 在查询启用前 prefetch 数据，不依赖 enabled |
| 现有测试需重写 | 保留旧测试的同时新建 TQ mock 测试，逐步过渡 |

## 术语表

| 术语 | 定义 |
|------|------|
| 多查询组合 | 一个 Store 模块内维护多个 TQ InfiniteQuery 实例，各自对应一个数据源 |
| 数据源 | Pixiv 的一个独立 API 端点/参数组合（如 `follow/public`、`recommended/illust`） |
| 派生 getter | 从多个 TQ 查询的 `data` 字段计算最终 UI 数据的函数 |
| queryOptions | 可重用的 TQ 查询配置工厂函数，供 `createInfiniteQuery` 和 `ensureInfiniteQueryData` 共用 |
