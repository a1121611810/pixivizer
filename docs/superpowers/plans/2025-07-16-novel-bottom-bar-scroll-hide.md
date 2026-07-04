# Novel 底部工具栏滚动显隐 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 NovelDetail 底部的导航/设置工具栏像全局 TabBar 一样，向下滚动时隐藏，向上滚动时出现，仅在内容最底部时强制显示。

**Architecture:** 单一文件 NovelDetail.tsx 修改。底部栏从 `position: sticky` 改为 `position: fixed`，通过 `onMount` 注册 `window.scroll` 监听（rAF 节流），用 `accumulatedDelta` 累加滚动位移，超过 ±30px 时控制 `translateY` 显隐。底部 80px 范围内强制显示。动画使用 Fluent 标准 token（`var(--durationNormal)` + `var(--curveEasyEase)`）。

**Tech Stack:** SolidJS 1.9 + TypeScript 6.0 (strict) + UnoCSS 66.7

## Global Constraints

- 所有 CSS 变量来自 `src/styles/tokens.css`，禁止硬编码
- Fluent 动画 token：`var(--durationNormal)` 200ms、`var(--curveEasyEase)`
- TypeScript strict（`noUnusedLocals`、`noUnusedParameters`）
- 路径别名 `@/` 映射 `src/`

---

### Task 1: 实现底部工具栏滚动显隐

**Files:**
- Modify: `packages/app/src/routes/NovelDetail.tsx`
- Test: `packages/app/tests/browser/NovelDetail.browser.test.tsx`

**Interfaces:**
- Consumes: 无外部依赖（`window.scrollY`、`document.documentElement.scrollHeight`）
- Produces: `hidden` signal 驱动底部栏 `translateY` 动画

- [ ] **Step 1: 添加 `hidden` signal 和 `onMount` 滚动逻辑**

在 `NovelDetail.tsx` 中位于现有 `createSignal` 区域（约第 33-41 行）添加 `hidden` signal。在现有 `onMount`（约第 118 行）中追加 scroll 事件监听。

```tsx
// 在现有 signal 区域末尾添加（约第 41 行后）
const [footerHidden, setFooterHidden] = createSignal(false);
let lastScrollY = 0;
let accumulatedDelta = 0;
const HIDE_THRESHOLD = 30;
const BOTTOM_THRESHOLD = 80;
let scrollTicking = false;
```

在现有 `onMount` 中（`onMount(() => { const onCloseSettings = ...`）**之后**，追加 scroll 监听。注意不要创建第二个 `onMount`，而是在同一个块中添加：

```tsx
onMount(() => {
  // 现有的 closeSettings 监听
  const onCloseSettings = () => {
    setSettingsOpen(false);
    setSeriesOpen(false);
  };
  window.addEventListener("closeSettings", onCloseSettings);
  onCleanup(() => window.removeEventListener("closeSettings", onCloseSettings));

  // ── Scroll-driven bottom toolbar hide/show ──
  lastScrollY = window.scrollY;
  accumulatedDelta = 0;
  scrollTicking = false;

  function onScroll() {
    const currentY = window.scrollY;

    // 底部区域：距页面底部不足 BOTTOM_THRESHOLD 时强制显示
    const atBottom = window.innerHeight + currentY >= document.documentElement.scrollHeight - BOTTOM_THRESHOLD;
    if (atBottom) {
      setFooterHidden(false);
      accumulatedDelta = 0;
      lastScrollY = currentY;
      return;
    }

    const delta = currentY - lastScrollY;
    lastScrollY = currentY;

    // 程序化滚动（页面切换等），重置跟踪
    if (Math.abs(delta) > 200) {
      accumulatedDelta = 0;
      return;
    }

    accumulatedDelta += delta;

    if (accumulatedDelta > HIDE_THRESHOLD) {
      setFooterHidden(true);
      accumulatedDelta = 0;
    } else if (accumulatedDelta < -HIDE_THRESHOLD) {
      setFooterHidden(false);
      accumulatedDelta = 0;
    }
  }

  function onScrollRaf() {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(() => {
        onScroll();
        scrollTicking = false;
      });
    }
  }

  window.addEventListener("scroll", onScrollRaf, { passive: true });
  onCleanup(() => window.removeEventListener("scroll", onScrollRaf));
});
```

注意：由于 `NovelDetail.tsx` 中已有一个 `onMount`（行 118-125），这里需要 **合并**到一个 `onMount` 中，不能有两个。需要将现有的 `onMount` 扩展。

- [ ] **Step 2: 变更底部栏定位与动画**

将底部栏 div 从：

```tsx
<div class="sticky bottom-0 surface-appbar border-t border-[var(--colorNeutralStroke2)] px-4 py-2">
```

改为：

```tsx
<div
  class="fixed bottom-0 left-0 right-0 surface-appbar border-t border-[var(--colorNeutralStroke2)] px-4 py-2"
  style={{
    zIndex: 20,
    transform: footerHidden()
      ? "translateY(calc(100% + 8px + env(safe-area-inset-bottom, 0px)))"
      : "translateY(0)",
    transition: "transform var(--durationNormal) var(--curveEasyEase)",
  }}
>
```

- [ ] **Step 3: 为内容区域添加底部内边距**

找到内容区域的容器 div（行 293：`<div class="px-4 py-6 max-w-2xl mx-auto">`），追加 padding-bottom：

```tsx
<div class="px-4 py-6 max-w-2xl mx-auto pb-[64px]">
```

同时确认页面的外层容器 `<div class="min-h-screen bg-[var(--colorNeutralBackground2)]">` 的 `min-h-screen` 确保即使内容不足一屏也能占满视口。

- [ ] **Step 4: 更新边界——重置显隐状态**

每次切换小说（`currentNovelId` 变化）时，重置底部栏为可见状态。在现有的切换效果（约第 137-141 行）中追加：

```tsx
createEffect(() => {
  currentNovelId();
  closeSearch();
  window.scrollTo({ top: 0, behavior: "auto" });
  setFooterHidden(false);  // 新增：切换小说时确保底部栏可见
  accumulatedDelta = 0;    // 新增：重置滚动累计值
  lastScrollY = window.scrollY; // 新增：重置基准位置
});
```

- [ ] **Step 5: 验证构建通过**

```bash
cd /Users/lilianda/develop/pixivizer
pnpm check
```

Expected: TypeScript 检查通过，无类型错误。

- [ ] **Step 6: 手动验证**

在开发服务器中打开任意小说详情页，验证：
1. 页面加载时底部栏可见
2. 向下滚动超过约 30px → 底部栏平滑滑出隐藏
3. 向上滚动超过约 30px → 底部栏平滑滑入显示
4. 滚动到内容最底部 → 底部栏强制显示
5. 切换章节（点击下一章）→ 滚动到顶部，底部栏初始可见
6. 搜索模式打开时底部栏的显隐不受影响
7. 动画使用 Fluent 曲线，非 ease 或 ease-in-out

- [ ] **Step 7: 提交**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/src/routes/NovelDetail.tsx
git commit -m "feat: novel detail bottom bar scroll hide/show

底部导航/设置工具栏改为 fixed 定位，跟随滚动方向自动显隐
（向下隐藏/向上显示），滚动到内容最底部时强制显示。

- scroll 事件 rAF 节流 + accumulatedDelta 30px 阈值
- bottom threshold 80px 强制显示
- translateY 动画使用 Fluent durationNormal + curveEasyEase
- 切换章节时重置显隐状态"
```
