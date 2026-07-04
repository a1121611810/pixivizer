# Novel 详情页底部工具栏滚动显隐

> 让 NovelDetail 底部的导航/设置工具栏像全局 TabBar 一样，向下滚动时隐藏，向上滚动时出现。

## 背景

NovelDetail 底部工具栏（上一章 / 目录 / 显示设置 / 下一章）当前使用 `sticky bottom-0` 固定在视口底部，始终可见。用户希望其行为与全局 NavBar（底部 TabBar）一致：跟随滚动方向自动显隐，仅在滚动到内容最底部时强制显示。

## 设计

### 定位变更

- **当前**: `<div class="sticky bottom-0 surface-appbar ...">`
- **改为**: `<div class="fixed bottom-0 left-0 right-0 surface-appbar border-t border-[var(--colorNeutralStroke2)] px-4 py-2" style="z-index:20">`
- 内容区底部增加 `pb-[64px]` 内边距，防止内容被固定栏遮挡

### 滚动逻辑

在 `NovelDetail.tsx` 的 `onMount` 中注册 `window` 的 `scroll` 事件监听器，模式与 NavBar 一致：

1. **累积位移法**: `accumulatedDelta` 累加每次滚动的 delta
2. **阈值**: ±30px（与 NavBar 相同）
3. **防抖**: `requestAnimationFrame` 节流
4. **跳转检测**: `Math.abs(delta) > 200` 时重置累计值（处理程序化滚动）
5. **底部区域**: 检测 `window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80`，在底部区域内强制显示

### 显隐动画

与 NavBar 相同的 transform 过渡：

```tsx
style={{
  transform: hidden()
    ? "translateY(calc(100% + 8px + env(safe-area-inset-bottom, 0px)))"
    : "translateY(0)",
  transition: "transform var(--durationNormal) var(--curveEasyEase)",
}}
```

- 使用 Fluent `var(--durationNormal)`（200ms）和 `var(--curveEasyEase)` 曲线
- `safe-area-inset-bottom` 适配刘海屏/手势条

### 交互规则

| 场景 | 行为 |
|------|------|
| 向下滚动 > 30px（累计） | 隐藏 |
| 向上滚动 > 30px（累计） | 显示 |
| 在内容最底部（距底部 < 80px） | 强制显示 |
| SettingsSheet / SeriesSheet 打开时 | 不干预（sheet 覆盖了底部栏） |
| 搜索模式打开时 | 底部栏照常跟随滚动隐藏 |

### 文件变更

| 文件 | 变更内容 |
|------|----------|
| `packages/app/src/routes/NovelDetail.tsx` | 底部栏定位改为 fixed；`onMount` 加 scroll 监听逻辑；内容容器加 `pb-[64px]` |
| (可选) `packages/app/uno.config.ts` | 如需快捷 class 可添加，但不必须 |

### 未纳入范围

- 不提取通用 `createScrollHide` primitive — 当前只有两处使用，过度设计
- 不改动 NavBar 的已有逻辑
- 不改动 ReaderSettingsSheet 的展现方式

## 测试

- 手动验证：在 NovelDetail 页面上下滚动，观察底部栏显隐行为
- 边界情况：内容很短（不到一屏）时始终显示；快速大手势滚动时不误触发；切换章节时重置状态
