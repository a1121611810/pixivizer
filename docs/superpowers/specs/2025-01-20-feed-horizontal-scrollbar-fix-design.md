# Fix: Feed 横向滚动条（min-width: auto 导致 flex 列溢出）

**日期**: 2025-01-20
**状态**: 已实施

## 问题

开发服务器冷启动后，推荐页出现横向滚动条。页面刷新后消失。

## 根因

`VirtualFeed.tsx` 中双列瀑布流布局使用 `flex-1` 作为列容器：

```html
<div class="flex-1 flex flex-col gap-3"></div>
```

CSS flexbox 默认 `min-width: auto`，flex 子项不会收缩到低于其内容的 min-content 宽度。`<img>` 标签的 HTML `width` 属性（如 1000px）提供固有尺寸，在 min-content 计算中传播到列容器，导致每列最小宽度远超视口分配宽度，内容溢出产生横向滚动条。

冷启动时 Vite 模块转换未缓存，CSS/JS 加载时序与刷新时不同，更容易触发此问题。

## 修复

在 VirtualFeed.tsx 第 207 行的列 div 上添加 `min-w-0`（覆盖 `min-width: auto`）：

```diff
- <div class="flex-1 flex flex-col gap-3">
+ <div class="flex-1 flex flex-col gap-3 min-w-0">
```

`min-w-0` 是 CSS flexbox 的标准做法，允许 flex 子项收缩到任意小。ImageCard 已有 `overflow-hidden` 处理内容裁剪，无需额外处理。

## 影响范围

- `src/components/VirtualFeed.tsx`：1 行改动
- 影响两列（`columns().map` 遍历生成）
