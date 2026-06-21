# 详情页多图内联展示 + 回顶 + 楼梯导航 设计

## 问题

当前 `IllustDetail` 对多图作品（`page_count > 1`）只展示封面图，用户必须点击进入全屏 `ImageViewer` 才能看到其余图片。这与 Pixiv 官网体验不一致。此外缺少多图场景下的快捷导航（回顶、跳页）。

## 目标

1. 多图作品在详情页内联展示全部图片，竖向排列，支持按需加载
2. 增加回顶 FAB 按钮
3. 增加楼梯竖条（右侧页码导航），毛玻璃风格
4. 点击任意一张进入全屏查看器对应页

## 业界参考

Pixiv 官网作品详情页：

- 所有图片垂直依次排列，按原始宽高比全宽展示
- 每张图左上角标注页码（`1 / 5`）
- 右侧固定竖条显示页码，当前可视页高亮，点击跳页
- 点击任意一张进入全屏查看器，定位到被点击页

## 设计

### 改动范围

| 文件                                 | 改动                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `src/routes/IllustDetail.tsx`        | 回顶 FAB + 楼梯竖条 UI；currentVisiblePage signal + IntersectionObserver；scrollToPage 函数 |
| `src/components/LazyDetailImage.tsx` | 容器 div 新增 `data-page-index` 属性                                                        |
| `uno.config.ts`                      | 新增 `surface-glass` shortcut                                                               |

### 整体布局

```
┌──────────────────────────┬──┐
│  sticky header           │  │
│  ← 作品标题              │  │
├──────────────────────────┤  │
│                          │  │
│  ┌────────────────────┐  │  │
│  │  1 / 5             │  │█│ ← 楼梯竖条 (fixed, 毛玻璃)
│  │  [图片1]            │  │2│
│  └────────────────────┘  │3│
│                          │4│
│  ┌────────────────────┐  │5│
│  │  2 / 5             │  │  │
│  │  [图片2]            │  │  │
│  └────────────────────┘  │  │
│                          │  │
│  ...                     │  │
│                          │  │
│                    [↑] ──┤  │ ← 回顶 FAB (fixed, 毛玻璃)
│                          │  │
└──────────────────────────┴──┘
│     NavBar (底部)            │
└──────────────────────────────┘
```

### 新增 UnoCSS shortcut

```typescript
"surface-glass":
  "bg-[var(--colorNeutralBackgroundAlpha)] backdrop-blur-[30px] backdrop-saturate-[125%] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)]",
```

### 回顶按钮

| 属性      | 规格                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------- |
| className | `surface-glass rounded-[var(--borderRadiusCircular)]`                                                 |
| 位置      | `fixed`，右下角，`bottom: calc(var(--spacingVerticalXXL) + 64px)`，`right: var(--spacingHorizontalL)` |
| 图标      | `↑`                                                                                                   |
| 尺寸      | `40×40px`（触控最小目标）                                                                             |
| 显示条件  | `page_count > 1` 且 `scrollY > 300px`                                                                 |
| 动画      | opacity 渐显/渐隐，`transition-opacity duration-[var(--durationFast)]`                                |
| 行为      | `window.scrollTo({ top: 0, behavior: 'smooth' })`                                                     |

### 楼梯竖条

| 属性           | 规格                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 容器 className | `surface-glass rounded-[var(--borderRadiusXLarge)]`                                                                        |
| 位置           | `fixed`，`top: 50%; right: var(--spacingHorizontalS); transform: translateY(-50%)`                                         |
| 布局           | `flex flex-col`，`gap: var(--spacingVerticalXXS)`                                                                          |
| 内边距         | `var(--spacingVerticalS) var(--spacingHorizontalXS)`                                                                       |
| 每页触控区     | 最小 `36×36px`，数字居中                                                                                                   |
| 当前页         | `bg-[var(--colorBrandBackground)]`，`text-[var(--colorNeutralForegroundOnBrand)]`，`rounded-[var(--borderRadiusCircular)]` |
| 其他页         | `text-[var(--colorNeutralForeground3)]`，hover `text-[var(--colorNeutralForeground2)]`                                     |
| 字号           | `var(--fontSizeBase200)`                                                                                                   |
| 显示条件       | `page_count > 1`                                                                                                           |
| 边缘情况       | 超过 20 页时 `max-height: 60vh; overflow-y: auto`                                                                          |
| 当前页检测     | IntersectionObserver 监控图片容器，取 intersectionRatio 最高者                                                             |

### 当前页检测机制

```
IllustDetail.onMount:
  new IntersectionObserver(containers, { threshold: [0, 0.25, 0.5, 0.75] })
    → 遍历 entries，找 ratio 最高且 > 0 的 entry
    → setCurrentVisiblePage(entry.target.dataset.pageIndex)
```

`LazyDetailImage` 容器 div 新增 `data-page-index={props.pageIndex}`。

### 滚动到指定页

```typescript
function scrollToPage(index: number) {
  const el = document.querySelector(`[data-page-index="${index}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}
```

### 图片区域（已实现）

| 改动点   | 现状              | 已改为                                               |
| -------- | ----------------- | ---------------------------------------------------- |
| 图片渲染 | 始终渲染 1 张封面 | `page_count > 1` 时 map 全部渲染；单图保持现状       |
| 懒加载   | 无                | IntersectionObserver + `everVisible`，预热距 `400px` |
| 占位容器 | 无                | `aspect-ratio` 占位                                  |
| 页码标签 | 无                | 左上角 badge `1 / N`                                 |
| 点击行为 | `openViewer()`    | `openViewer(pageIndex)`                              |
| 底栏提示 | 始终显示          | 仅单图显示                                           |

## 非目标

- 不实现真正虚拟滚动。已加载图片不卸载。
- 楼梯不显示缩略图（移动端空间有限）。
- 不改变 ImageViewer 内部逻辑。
- 单图作品不显示回顶和楼梯。
