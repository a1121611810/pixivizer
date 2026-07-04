# 小说封面墙布局设计

## 概述

为小说列表新增「封面墙」排版模式，与现有的「列表」模式（左图右文）并存，用户在设置面板中独立切换。覆盖所有小说列表视图（推荐/关注 Tab、收藏页）。

## 视觉设计

### 卡片结构（NovelCoverCard）

```
┌─────────────────────┐
│  ┌─────────────────┐│
│  │                 ││
│  │    封面封面封面    ││  正方形封面，PixivImage 加载 square_medium
│  │    封面封面封面    ││  大小：卡片宽 - 2×padding
│  │                 ││
│  └─────────────────┘│
│                      │
│  标题标题标题标题标题  │  fontSizeBase300，2行截断（line-clamp）
│  📄 56p   ·  ⭐ 1,234 │  fontSizeBase200，次要色（--colorNeutralForeground3）
│  @作者名              │  fontSizeBase200，品牌色（--colorBrandForeground1）
│  #tag1  #tag2        │  fontSizeBase100，标签胶囊
│                      │  显示前2个 tag，超出显示「+N」
│  📖 系列名            │  fontSizeBase100，series 标签（仅系列作品显示）
│                  ♥   │  收藏按钮，右下角
└─────────────────────┘
```

### 布局参数

| 参数 | 值 |
|------|-----|
| 列数 | 2 列 |
| 卡片宽度 | (容器宽度 - gap) / 2 |
| 卡片高度 | 自适应内容（封面 + 文字区） |
| 列间距 | var(--spacingHorizontalS) → 12px |
| 行间距 | var(--spacingVerticalS) → 12px |
| 卡片内边距 | var(--spacingHorizontalM) + var(--spacingVerticalM) |
| 圆角 | var(--borderRadiusMedium) |

## 设置面板

在设置面板「布局模式（插画）」下方新增一行：

```
布局模式（插画）  [瀑布流] [单列] [网格]
布局模式（小说）  [列表]   [封面墙]
```

- 两个布局模式独立存储、独立切换
- 默认值：`"list"`（保持向后兼容）
- 持久化到 `Preferences`，键名 `novel_layout_mode`

## 组件 & 数据流

### 1. `src/stores/uiStore.ts`

```ts
type NovelLayoutMode = "list" | "coverWall"

// 新增 signal
const [novelLayoutMode, setNovelLayoutMode] = createSignal<NovelLayoutMode>("list")
```

- 持久化到 `Preferences`，键 `novel_layout_mode`
- 初始值从 Preferences 读取，无值时默认 `"list"`
- 导出 `setNovelLayoutMode` 和 `novelLayoutMode`

### 2. `src/components/NovelCard.tsx`

在同一文件中新增 `NovelCoverCard` 组件：

- Props: `novel: PixivNovel`, `onBookmark`, `onNavigate`
- 使用 `PixivImage` 加载 `novel.image_urls.square_medium`
- 封面正方形、自适应宽度
- 文字区：标题（2行截断）、页数 + 收藏数、作者名、标签（前2个 +「+N」溢出）、series 标签（如有）、收藏按钮
- 保留现有的心形动画效果（`HeartBurstEffect`）
- R18/R18G 模糊处理：复用 `PixivImage` 的现有逻辑，封面加载时自动应用模糊遮罩

### 3. `src/components/NovelVirtualFeed.tsx`

- 新增 prop: `layoutMode: NovelLayoutMode`
- `"list"` → 现有逻辑不变（180px 单列，`NovelCard`）
- `"coverWall"` → 2 列 Flex 布局，渲染 `NovelCoverCard`

虚拟滚动适配：
- 封面墙按行分批：每 2 个卡片为一行，高度取两者最大值
- 保持现有的下拉刷新、无限加载哨兵、骨架屏逻辑

### 4. `src/components/SettingsDrawer.tsx`

在插画布局模式 UI 下方新增一行：
- 标签：「布局模式（小说）」
- 两个按钮：「列表」「封面墙」
- 点击调用 `setNovelLayoutMode()`
- 当前选中态高亮显示

### 5. `src/routes/NovelFeedPage.tsx`

从 `uiStore` 读取 `novelLayoutMode`，传递给 `NovelVirtualFeed`。

### 6. `src/routes/NovelBookmarks.tsx`

同上，读取并传递 `novelLayoutMode`。

## 涉及文件清单

| 文件 | 改动类型 |
|------|----------|
| `src/stores/uiStore.ts` | 新增 `novelLayoutMode` signal、持久化、导出 |
| `src/components/NovelCard.tsx` | 新增 `NovelCoverCard` 组件 |
| `src/components/NovelVirtualFeed.tsx` | 新增 `layoutMode` prop，条件渲染两种布局 |
| `src/components/SettingsDrawer.tsx` | 新增「布局模式（小说）」切换行 |
| `src/routes/NovelFeedPage.tsx` | 传递 `novelLayoutMode` |
| `src/routes/NovelBookmarks.tsx` | 传递 `novelLayoutMode` |

## 不需要改动的文件

- `LayoutEngine.tsx` — 封面墙布局在 `NovelVirtualFeed` 内部处理，不进入 LayoutEngine
- `VirtualFeed.tsx` — 仅插画使用
- 小说 API 层 — 数据模型不变
- 路由定义 — URL 不变

## 测试要点

- `uiStore` 新增 signal 的默认值和持久化
- `NovelVirtualFeed` 在两种 layoutMode 下正确渲染
- `NovelCoverCard` 的封面加载、文字截断、收藏交互
- 设置面板中切换后 NovelVirtualFeed 重新渲染
- 切换回列表模式时恢复原样
