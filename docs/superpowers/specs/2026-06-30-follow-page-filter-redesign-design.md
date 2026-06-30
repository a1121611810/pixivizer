# 关注页过滤重构设计

## 概述

将关注页现有的双层过滤系统（第1层：公开/非公开；第2层：全部/R-18）重构为单一三段式过滤器，R-18 仅作为作品徽标展示，不作为独立过滤标签。

## 当前状态

**关注页当前过滤逻辑：**
- 第1层：[公开] [非公开] — 控制 Pixiv API `/v2/illust/follow?restrict=public|private` 参数
- 第2层：[全部] [R-18] — 客户端侧 `x_restrict` 过滤
- R-18 子标签在非成年人时隐藏
- 数据缓存：单键 `tabIllusts["follow"]` 存储原始 API 响应

**涉及文件：**
- `routes/TabFeedPage.tsx` — 双层过滤 UI + `followSubTab` 信号 + `filteredIllusts` 备忘录
- `stores/feedStore.ts` — `followRestrict` 信号 + 单源缓存
- `components/ImageCard.tsx` — R18/R18G 徽标（已有，无需改动）
- `utils/r18Filter.ts` — 全局 R18/R18G 过滤（已有，无需改动）

## 目标状态

### 用户视角

```
单一过滤器：[ 全部 ] [ 公开 ] [ 非公开 ]
```

- 「全部」：显示所有关注用户的作品（同时请求 public + private，合并按时间排序）
- 「公开」：仅显示公开关注用户的作品（API restrict=public）
- 「非公开」：仅显示私密关注用户的作品（API restrict=private）
- R18/R18G 内容仍然在卡片上以徽标展示，不作为单独过滤维度

### 架构变更

#### FeedStore 状态结构

```typescript
// 新增信号
followTab: "all" | "public" | "private"  // 当前选中的视图

// Tab 缓存改为双 key
tabIllusts: {
  "follow_public": PixivIllust[],     // public 源原始数据
  "follow_private": PixivIllust[],    // private 源原始数据
}
tabNextUrl: {
  "follow_public": string | null,
  "follow_private": string | null,
}

// 移除
followRestrict 信号 → 由 followTab 替代
getTabRawIllusts("follow") → 不再需要单源原始数据访问
```

#### 数据流

```
用户选择 ──→ followTab
                  │
                  ├─ "public"  ──→ 读 tabIllusts["follow_public"]
                  │                  (缓存未命中 → fetch public)
                  │
                  ├─ "private" ──→ 读 tabIllusts["follow_private"]
                  │                   (缓存未命中 → fetch private)
                  │
                  └─ "all"    ──→ mergeAndSort(
                                     tabIllusts["follow_public"],
                                     tabIllusts["follow_private"]
                                   )
```

#### 刷新逻辑

- 下拉刷新时**并行**请求 `loadFollow("public")` 和 `loadFollow("private")`
- 两路请求独立错误处理：一路失败不影响另一路
- 响应分别写入 `tabIllusts["follow_public"]` 和 `tabIllusts["follow_private"]`
- 当前视图由 `createMemo` 响应式驱动更新

#### 合并排序函数

```typescript
function mergeAndSort(
  publicIllusts: PixivIllust[],
  privateIllusts: PixivIllust[],
): PixivIllust[] {
  // API 返回已按 create_date 降序排列
  // 归并两个有序数组，保持时间降序
  const result: PixivIllust[] = [];
  let i = 0, j = 0;
  while (i < publicIllusts.length && j < privateIllusts.length) {
    if (publicIllusts[i].create_date >= privateIllusts[j].create_date) {
      result.push(publicIllusts[i++]);
    } else {
      result.push(privateIllusts[j++]);
    }
  }
  return result.concat(publicIllusts.slice(i), privateIllusts.slice(j));
}
```

#### 分页（加载更多）

- 公开/非公开模式：各自独立的 `next_url` 追踪
- 全部模式：比较两个源当前「最旧作品时间」，优先加载时间较旧的源的下一页（以维持时间线倒序正确性）

#### TabFeedPage UI 变更

**当前（双层）：**
```
┌─ 浏览范围 ──────────┐
│ [公开] [非公开]       │  ← 紧凑型次要操作
└──────────────────────┘
┌──────────────────────┐
│ [   全部   ] [ R-18 ] │  ← 突出型主要过滤
└──────────────────────┘
```

**改为（单层三段式）：**
```
┌───────────────────────────────┐
│ [   全部   ] [ 公开 ] [ 非公开 ]│  ← 统一 Segmented Control
└───────────────────────────────┘
```

- 使用当前第2层的 pill 样式（`flex-1`、`font-semibold`、shadow 高亮）
- 切换零额外 API 请求（缓存命中时直接显示）

### 不变的部分

| 组件/逻辑 | 状态 | 原因 |
|-----------|------|------|
| ImageCard R18/R18G 徽标 | ✅ 不变 | 已独立渲染，与过滤逻辑解耦 |
| r18Filter.ts | ✅ 不变 | 全局 R18/R18G 开关+屏蔽列表逻辑不变 |
| loadFollow API 接口 | ✅ 不变 | `api/illust.ts` 无需修改 |
| 非成年人逻辑 | ✅ 不变 | 仅在 UI 层隐藏 R-18 标签（现已移除），全局开关仍受年龄控制 |
| 全局 R18/R18G 事件监听 | ✅ 不变 | `r18Changed`/`r18gChanged` 仍触发刷新 |

### 边界情况处理

| 场景 | 行为 |
|------|------|
| public 成功，private 失败 | 全部模式显示 public 数据 + 错误提示；公开模式正常；非公开显示错误 |
| 双请求均失败 | 统一错误状态（与当前一致） |
| 切换视图再切回 | 零额外请求，从缓存直接显示 |
| 其中一源无数据 | 合并时正常处理，只显示有数据的源 |
| 全局 R18/R18G 切换 | 通过现有事件机制触发 `refresh()`，重新过滤所有数据 |

## 文件改动清单

| 文件 | 改动 |
|------|------|
| `stores/feedStore.ts` | 重构状态结构：移除 `followRestrict`，新增 `followTab`；双缓存 key；新增 `mergeAndSort()`；重构 `fetchFollow()` 为并行双请求；重构 `fetchMore()` 支持双源分页 |
| `routes/TabFeedPage.tsx` | 移除 `followSubTab` 信号；移除双层过滤 UI；替换为三段式 Segmented Control；简化 `filteredIllusts` 备忘录；移除 R-18 子标签相关代码 |
