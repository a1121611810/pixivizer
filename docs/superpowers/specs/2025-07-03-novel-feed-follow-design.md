# 小说关注 Feed 设计文档

日期: 2025-07-03
状态: 已批准
标签: novel, feed, follow, store

## 1. 概述

为现有小说模式添加**关注作者的小说 Feed** 功能。用户切换到"小说"内容类型后，下方导航栏选择「关注」Tab 时，不再显示占位符，而是展示所关注作者的最新小说列表，包含公开/非公开/全部三层过滤。

## 2. 背景与现状

已有设施:
- `PixivNovel` 类型 + `PixivNovelListResponse`（含 `novels` + `next_url`）
- `api/novel.ts` — `loadRecommended()`, `loadBookmarks()`, `loadDetail()`, `loadSeries()`
- `stores/novelStore.ts` — 管理 novels 列表，含推荐/收藏的缓存和分页
- `routes/NovelFeedPage.tsx` — 小说 Feed 页面，当前 follow tab 显示占位符
- `components/NovelCard.tsx` — 小说卡片（封面+标题+字数+收藏+系列标签）
- `components/NovelVirtualFeed.tsx` — 单列虚拟滚动 Feed（下拉刷新+无限加载）
- `routes/NovelDetail.tsx` — 小说详情页
- `uiStore.ts` — `contentType` 切换（illust/novel）已实现

缺失:
- `novelStore.ts` 中 `ensureLoaded()` / `refresh()` / `fetchMore()` 无 follow 分支
- `NovelFeedPage.tsx` 中 follow tab 显示占位符
- 无 follow 过滤 UI（全部/公开/非公开）

## 3. API 层

### 端点信息

| 项目 | 值 |
|---|---|
| 端点 | `GET /v1/novel/follow` |
| 参数 | `restrict` = `"public"` \| `"private"` |
| 返回 | `PixivNovelListResponse` (`{ novels: PixivNovel[], next_url: string \| null }`) |
| 分页 | `next_url` 模式 |
| 来源 | pixivpy3 `novel_follow()` 方法验证 |

### 新增函数 (`api/novel.ts`)

```typescript
export function loadFollow(restrict: string = "public"): Promise<PixivNovelListResponse> {
  return apiClient.get<PixivNovelListResponse>("/v1/novel/follow", { restrict });
}
```

## 4. Store 层 (`stores/novelStore.ts`)

### 4.1 新增类型与状态

```typescript
export type NovelFollowTab = "all" | "public" | "private";
```

store state 新增 `followTab: "all" as NovelFollowTab`。

导出函数:
- `novelFollowTab()` — 读取当前过滤模式
- `setNovelFollowTab(t)` — 设置过滤模式（触发视图刷新 + 滚动恢复）

### 4.2 缓存键体系

```
recommended → "novel_recommended"
bookmarks   → "novel_bookmarks"
follow all  → "novel_follow"        （用于 tabLoaded 标记）
 → public   → "novel_follow_public"  （双缓存数据源）
 → private  → "novel_follow_private" （双缓存数据源）
```

`getSourceKey()` 新增 `subTab` 参数，follow 模式下返回 `novel_follow_${subTab}`。

### 4.3 computeFollowNovels()

```typescript
function computeFollowNovels(): PixivNovel[] {
  const st = state.followTab;
  if (st === "public") return tabNovels["novel_follow_public"] ?? [];
  if (st === "private") return tabNovels["novel_follow_private"] ?? [];
  // "all" — 归并
  const pub = tabNovels["novel_follow_public"] ?? [];
  const priv = tabNovels["novel_follow_private"] ?? [];
  // 与 feedStore 相同的 mergeAndSort（按 create_date 降序归并）
  return mergeAndSortByDate(pub, priv);
}
```

### 4.4 ensureLoaded() — Follow 分支

```
currentTab === "follow":
  pubCached = tabNovels["novel_follow_public"] !== undefined
  privCached = tabNovels["novel_follow_private"] !== undefined

  if pubCached || privCached → 显示缓存
  if !tabLoaded["novel_follow"]:
    → fetchFollow()
    tabLoaded["novel_follow"] = true
```

### 4.5 fetchFollow() — 双路并发

`Promise.allSettled` 同时加载 public + private:
- 各自缓存到独立键
- 双路失败才报 error；单路失败记 warning
- 完成后更新 `state.novels = computeFollowNovels()`

⚠️ 需要为 novelStore 添加 `pendingRefreshKeys: Set<string>` 锁机制（与 `feedStore.ts` 对称），防止 follow 双路请求中重复触发 refresh。

### 4.6 fetchMore() — 三模式分页

- `"public"` 模式 → 从 `tabNextUrl["novel_follow_public"]` 翻页
- `"private"` 模式 → 从 `tabNextUrl["novel_follow_private"]` 翻页
- `"all"` 模式 → 优先加载尾部时间更旧的那一路，若耗尽则换另一路

### 4.7 refresh()

移除 `if (tab === "follow") return` 守卫，清空双缓存后重新 `fetchFollow()`。

### 4.8 滚动位置

`saveTabScroll` / `getFeedScrollY` 对 follow tab 使用 `novel_follow_${novelFollowTab()}` 作为键。

### 4.9 响应式：followTab 变化时自动重新计算

```typescript
createRoot(() => {
  createEffect(() => {
    const tab = currentTab();
    if (tab === "follow") {
      // 跟踪 novelFollowTab() 变化 → 重新 compute 并恢复滚动
      novelFollowTab();
      batch(() => {
        setState("novels", computeFollowNovels());
        // 从对应缓存取 nextUrl
      });
      // 恢复滚动位置
      window.scrollTo(0, getFeedScrollY("follow"));
    }
  });
});
```

## 5. UI 层

### 5.1 NovelFeedPage.tsx 改动

1. **移除占位符** — 删除 `<Show when={props.tab === "follow"}>` 占位块
2. **添加过滤 UI** — sticky 定位，在 header 下方显示三层按钮：
   - 「全部」「公开」「非公开」
   - 视觉与 TabFeedPage 中的插画过滤 UI 一致（Fluent 风格按钮组）
   - 仅在 `props.tab === "follow"` 时显示
3. **子标签切换** — 点击过滤按钮时调用 `setNovelFollowTab()`，然后 `ensureLoaded()`
4. **NovelVirtualFeed** — 始终渲染（无论 follow/non-follow）

### 5.2 TabFeedPage.tsx

无需改动。现有逻辑:
- `contentType() === "illust"` → 渲染 `VirtualFeed` + 插画过滤 UI
- `contentType() === "novel"` → 渲染 `NovelFeedPage`
- NovelFeedPage 内部自包含 follow 过滤 UI

## 6. 性能指标

| 指标 | 预期值 |
|---|---|
| 首次加载 | 2 并发 HTTPS（public + private），~800ms-2s |
| 子标签切换 | 0ms（缓存命中），仅 DOM 重渲染 |
| 合并 "all" | O(n) 归并，n ≤ 60（每页约 30 条 × 2 路） |
| 翻页追加 | O(k)，k ≤ 30（单次 fetchMore 返回量） |
| 内存 | ~500KB（双缓存最多 1200 条 PixivNovel，每条约 400B） |
| 滚动恢复 | O(1) 查表 |

## 7. 安全性

- 复用 `apiClient` 的 401 自动刷新 + 防死循环机制
- 无用户输入注入点（`restrict` 参数为内部枚举值）
- 所有数据只读（仅 bookmark 操作可通过 NovelCard 触发，已有错误处理）

## 8. 边界情况

| 场景 | 行为 |
|---|---|
| 用户未关注任何作者 | 显示空状态「暂无小说」 |
| followTab 切换时正在加载 | `fetchMore()` 有 loading guard |
| 双路都失败 | 显示错误提示 |
| 单路失败（如 private 无数据） | 静默降级，使用另一路数据，console.warn |
| 快速切换 sub-tab | pendingRefreshKeys 锁防止重复请求 |
| 切换 contentType 回 illust | illust 侧的滚动位置独立保存，互不影响 |
| API 返回空 novels | 视为正常，显示空状态 |
| 用户 scroll 到顶后切换 sub-tab | 恢复上次 scrollY（可能为 0，正确回顶部） |

## 9. 文件改动清单

| 文件 | 改动 | 预估行数 |
|---|---|---|
| `api/novel.ts` | 新增 `loadFollow(restrict)` | +3 |
| `stores/novelStore.ts` | 新增状态/缓存键/计算/请求/分页/滚动/响应式 | +150 |
| `routes/NovelFeedPage.tsx` | 移除占位符，添加过滤 UI 和切换逻辑 | +50 |

总计约 **+203 行**，零删除，零重构。

## 10. 测试策略

- **Store 单元测试**（`stores/__tests__/novelStore.test.ts`）:
  - `computeFollowNovels()` public/private/all 三种模式
  - followTab 切换 → 正确的缓存键更新
  - 空缓存 fallback
  - 双路 partial failure 降级
- **API 层测试**: mock `loadFollow` 返回值，验证请求参数
- **手工测试**: UI 视觉、下拉刷新、无限加载、滚动恢复
