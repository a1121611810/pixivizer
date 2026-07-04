# 标签展示功能设计

**日期**: 2026-07-04  
**状态**: 已确认，待实现  
**范围**: `packages/app`（Pictelio Android 客户端）

## 目标

在列表卡片和插画详情页中展示作品标签，首版仅做展示，不做点击跳转或搜索。

## 范围

- 展示已有的 `PixivIllustTag` 数据。
- 不新增标签搜索、标签点击筛选、标签收藏、标签屏蔽等交互。
- 标签文本优先使用 `translated_name`，不存在时回退到 `name`。

## 设计决策

### 列表卡片

- 在 `ImageCard` 的标题/作者信息下方展示该作品的全部标签。
- 标签容器宽度 100%，允许自动换行。
- 标签使用小尺寸 pill 样式。
- 标签区域高度需要纳入 Masonry 布局计算，避免列高度错位。

### 详情页

- 在 `IllustDetail` 的作品标题、作者、统计信息下方展示所有标签。
- 标签使用中等尺寸 pill 样式。
- 无点击交互，无截断，无展开/折叠。

### 不做的功能

- 标签点击跳转
- 标签搜索
- 标签收藏/屏蔽
- 标签展开/折叠
- 标签排序或分组

## 新增组件

### `packages/app/src/components/IllustTags.tsx`

Props 定义：

```ts
interface IllustTagsProps {
  tags: PixivIllustTag[];
  size?: "small" | "medium";
  class?: string;
}
```

行为：

- 渲染为 flex 换行容器，gap 使用 Fluent spacing token。
- 每个标签渲染为独立 pill，使用 Fluent borderRadius、colors、fontSize tokens。
- 标签文本为纯文本：`tag.translated_name ?? tag.name`。
- 不处理 HTML、不使用 `dangerouslySetInnerHTML`。

## 既有组件改动

### `ImageCard.tsx`

- 在底部信息区插入 `<IllustTags tags={props.illust.tags} size="small" />`。
- 确保标签区域不影响图片懒加载和现有交互（收藏、关注、长按、举报等）。

### `IllustDetail.tsx`

- 在作品信息区插入 `<IllustTags tags={illust().tags} size="medium" />`。
- 不改动现有状态管理和错误处理。

### `computeMasonryLayout.ts` / `masonryWorker.ts`

- 卡片高度估算需要包含标签区域。
- 估算方式：根据容器宽度、标签平均宽度和数量，计算标签行数，再乘以单行行高和行间距。
- 估算宁可偏大而不可偏小，避免 Masonry 布局错位。
- 现有真实图片高度仍然由 `resolveUrl` 后的尺寸决定，标签区域只作为额外增量。

## 性能策略

| 方面 | 做法 |
| --- | --- |
| 渲染 | 标签为轻量 DOM，无图片、无事件监听。 |
| 列表 | 虚拟滚动已存在，仅渲染视口内 + overscan 的卡片。 |
| 内存 | 不新增全局状态，标签数据来自已有 `illust.tags`。 |
| 布局 | 标签行数估算在 Web Worker 中进行，避免阻塞主线程。 |

## 安全策略

- 标签内容来自 Pixiv API，无需用户输入过滤。
- 标签文本以纯文本形式渲染，不解析 HTML。
- 不引入 `dangerouslySetInnerHTML` 或类似 API。
- R18/R18G 作品的标签展示遵循现有内容过滤状态（如卡片已模糊或遮罩，标签仍可显示，因为标签本身无图片内容）。

## 可维护性策略

- 新增独立 `IllustTags` 组件，供卡片和详情页复用。
- 不改动 API 类型定义（`PixivIllustTag` 已满足需求）。
- 不改动 API 请求逻辑。
- 不改动虚拟滚动核心，仅影响布局高度估算。
- 样式全部使用 Fluent Design tokens，不硬编码颜色、字号、圆角、阴影。

## 验收标准

- [ ] 列表卡片展示全部标签，自动换行，无横向滚动。
- [ ] 详情页展示全部标签，无截断。
- [ ] 标签优先显示翻译名，翻译名不存在时显示原名。
- [ ] Masonry 列表布局高度正确，无列错位或明显跳跃。
- [ ] 不破坏现有收藏、关注、举报、屏蔽、R18/R18G 过滤逻辑。
- [ ] 不引入 TypeScript 类型错误。
- [ ] 遵循 Fluent Design 设计令牌和动画规范。
- [ ] 不新增第三方依赖。

## 依赖

- 无新增依赖。
- 复用现有类型：`PixivIllustTag`（`packages/app/src/api/types.ts`）。
