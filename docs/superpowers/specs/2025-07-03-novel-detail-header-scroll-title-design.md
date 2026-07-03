# 小说详情页 Scroll-Header 标题设计

日期: 2025-07-03
状态: 已批准
标签: novel, detail, scroll, header

## 概述

小说详情页向下滚动时，header 从显示「小说」切换为显示「小说 《xxxa》」（完整小说标题），使用 IntersectionObserver + 淡入淡出动画。

## 机制

```
容器: IntersectionObserver rootMargin: "-48px 0px 0px 0px"
目标: 页面中原始的标题 <h1> 元素

原始标题在视口内（intersecting） → header 仅显示「小说」
原始标题滚出 48px 阈值区域     → header 淡入「小说 《xxxa》」
```

- 48px = header 高度（h-12）
- IntersectionObserver 在浏览器合成线程运行，不占用主线程
- `onCleanup` 中 `observer.disconnect()`

## 实现

### 新增内容

- `createSignal<boolean>(false)` — `showHeaderTitle`
- `onMount` 中创建 `IntersectionObserver`
- `ref` 绑定到原始的 `<h1>` 标题元素
- header 中新增带 `opacity` 过渡的 `<span>` 显示标题

### Fluent 合规性

- 缓动曲线：`var(--curveEasyEase)`（standard curve）
- 动画时长：`var(--durationFast)` = 150ms（小过渡）
- 标题截断：`truncate` + `min-w-0`（纯 CSS）
- 副标题颜色：`var(--colorNeutralForeground2)`（次要文字）

### 性能

| 指标 | 值 |
|---|---|
| 主线程开销 | 0（IntersectionObserver） |
| 内存 | ~400 字节 |
| 布局抖动 | 0（仅 opacity 变化） |

### 改动文件

- `src/routes/NovelDetail.tsx` — +~15 行
