# 小说文本列表布局（textList）设计文档

## 变更范围

为 Pictelio 的小说推荐 / 关注 / 收藏页新增第三种布局模式：`textList`（纯文本列表）。

现有模式：

- `list`：单列横向卡片，左侧 128×128 封面，右侧元数据，固定 180px 高。
- `coverWall`：2 列，封面在上文字在下，高度自适应。

新增：

- `textList`：单列纯文本，无封面，显示标题、作者、字数、收藏数、R18/AI 标签、系列标签。

## 设计目标

- **高可维护性**：复用现有 `NovelVirtualFeed` 虚拟滚动架构，新增一个独立 primitive 处理文本列表的测量与布局。
- **高性能**：无封面图，零图片请求；使用虚拟滚动 + 测量缓存，避免重复计算。
- **高安全性**：只展示纯文本元数据，无富文本注入风险。
- **低内存占用**：移除图片元素，减少 DOM 节点与内存占用。

## 用户确认要点

- 文本列表不显示小说封面。
- 每行显示：标题、作者名、字数、收藏数、R18/AI 标签、系列标签。
- 交互：整行点击进入详情；右侧独立 ♡/♥ 收藏按钮；作者名可点击跳转作者页；系列标签可点击跳转系列页。
- 标题行数自适应（最多 2 行，超出截断），行高使用测量池（off-screen measure）获取真实高度。
- 持久化复用 `novel_layout_mode`，设置面板扩展为 3 个按钮。

## 架构

### 类型扩展

```ts
export type NovelLayoutMode = "list" | "coverWall" | "textList";
```

### 新增组件 / 单元

| 路径 | 职责 |
| --- | --- |
| `src/primitives/createTextListLayout.ts` | 文本列表测量池：为每个小说项计算真实高度并缓存。 |
| `src/components/NovelTextListCard.tsx` | 文本列表行组件，无封面，纯文本 + 收藏按钮。 |
| `src/components/NovelVirtualFeed.tsx` | 增加 `textList` 分支，选择 `textListLayout` 或现有布局。 |
| `src/components/SettingsDrawer.tsx` | 布局模式按钮从 2 个扩展为 3 个。 |
| `src/stores/uiStore.ts` | 类型与加载校验扩展为 `textList`。 |

### 数据流

1. `NovelVirtualFeed` 接收 `novels` 和 `layoutMode`。
2. 当 `layoutMode === "textList"` 时，使用 `createTextListLayout` 生成 `MasonryLayout`。
3. `createTextListLayout` 维护一个隐藏的测量容器，在 `novels` 变化时把未测量的项放入容器测量高度，然后缓存 `id -> height`。
4. 基于缓存高度生成 `MasonryLayout`（单列，每个 item 的 y 为前面所有 item 高度 + gap 的累加）。
5. `createVirtualScroll` 消费 `MasonryLayout` 进行虚拟滚动渲染。
6. 可见项用 `NovelTextListCard` 渲染，每个行有固定结构但高度已预先测量。

### 关键性能点

- **测量缓存**：以 `novel.id` 为 key，一次测量，多次复用。列表切换时缓存清空。
- **无图片**：不创建 `<img>` 元素，不请求小说封面。
- **最小重算**：只有 `novels` 长度变化或容器宽度变化时才重新测量未缓存项；已有缓存项直接复用。
- **测量容器**：使用 `position: fixed; visibility: hidden; pointer-events: none;` 的单独容器，不触发回流到主布局。

### 安全点

- 文本行只展示 `title`、`user.name`、`text_length`、`total_bookmarks`、标签名等字段，全部按纯文本处理。
- 收藏按钮、作者名、系列标签使用 React/Solid 事件处理，不拼接 HTML。
- 不解析 `caption` 或小说正文。

## 测试策略

- `createTextListLayout.test.ts`：
  - 空数组返回空布局。
  - 测量后生成正确 `totalHeight` 和 item y 坐标。
  - 新增项只测量未缓存项，已有项复用缓存。
  - 容器宽度变化后重新布局（item 宽度改变，y 不变或按新宽度重测）。
- `NovelTextListCard.test.ts`：
  - 渲染标题、作者、字数、收藏数。
  - 点击整行触发 `onClick`。
  - 点击作者名触发 `onAuthorClick`。
  - 点击系列标签触发 `onSeriesClick`。
  - 点击收藏按钮触发 `onBookmarkToggle`（公开/私密）。
- `uiStore.test.ts`：
  - `setNovelLayoutMode("textList")` 正确持久化。
  - `loadNovelLayoutModePreference` 能加载 `textList`。
- 集成 / lint：
  - `pnpm lint` 无错误。
  - `pnpm check` TypeScript 通过。
  - `pnpm test` 新测试全部通过。

## 风险与回退

| 风险 | 缓解 |
| --- | --- |
| 测量池引入异步，首屏可能延迟 | 同步给出默认估算高度（如 80px），测量后异步修正，避免白屏。 |
| 容器宽度变化导致缓存高度失效 | 宽度变化时清空缓存，重新测量。 |
| 大量行同时测量造成短暂卡顿 | 分批测量（requestAnimationFrame），一次只测少量 DOM。 |
| 测量容器在 SSR/测试环境不存在 | 提供基于字符数的估算 fallback，测试环境可 mock。 |

## 验收标准

- [ ] 设置面板可切换到「文本列表」模式。
- [ ] 文本列表正确显示所有指定字段，无封面图。
- [ ] 交互（详情、作者、系列、收藏）正常工作。
- [ ] 虚拟滚动正确，快速滚动不白屏、不错位。
- [ ] 新增测试用例全部通过。
- [ ] `pnpm lint` 通过。
- [ ] `pnpm check` 通过。
- [ ] `pnpm test` 通过。
