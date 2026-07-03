# Browser 组件测试基础设施设计文档

日期: 2025-07-03
状态: 已批准
标签: test, browser, component, vitest

## 1. 概述

为项目搭建 Browser 模式下的 SolidJS 组件测试基础设施，使得 NovelCard、NovelVirtualFeed 等组件可以在真实浏览器环境中被渲染和断言。重点覆盖之前被 E2E 和 Unit 测试遗漏的 DOM 渲染问题（如 Badge 重叠）。

## 2. 现状与问题

- **Unit 测试**（`vitest node`）只能测 Store/API 逻辑，无 DOM
- **Browser 测试**（`vitest browser`）只测 Primitives，不渲染组件树
- **E2E 测试**需要 `PIXIV_REFRESH_TOKEN`，CI 中不可用
- Badge 重叠 bug 在三层测试中均无覆盖

## 3. 架构

```
tests/browser/
├── setup.ts                           # ← 新增：全局 mock + FluentUI 注册
├── NovelCard.browser.test.tsx          # ← 新增：NovelCard 渲染测试
├── NovelVirtualFeed.browser.test.tsx   # ← 新增：NovelVirtualFeed 渲染测试
├── SeriesSheet.browser.test.ts         # 已有
└── ...其他已有文件

vitest.browser.config.ts               # ← 修改：新增 setupFiles
```

## 4. Setup 文件

### 4.1 职责

- 注册 `@fluentui/web-components` 自定义元素
- 全局 mock `@capacitor/core`、`@capacitor/preferences`、`@capacitor/app`、`@capacitor/device`
- 全局 mock `@solidjs/router` hooks

### 4.2 Mock 策略

| 模块 | Mock 内容 |
|---|---|
| `@capacitor/core` | `Capacitor.getPlatform() → "web"`, `isNativePlatform() → false`, `CapacitorHttp` 空函数 |
| `@capacitor/preferences` | `get/set/remove` 返回 Promise 的空函数 |
| `@capacitor/app` | `toggleBackButtonHandler`, `addListener`, `exitApp` 空函数 |
| `@capacitor/device` | `getInfo() → { androidSDKVersion: 30 }` |
| `@solidjs/router` | `useNavigate() → vi.fn()`, `useLocation() → { pathname: "/" }`, `useParams() → {}`, `useBeforeLeave() → vi.fn()` |

### 4.3 注意事项

- `vi.mock` 在 browser mode 下由 Vite 服务层拦截，需要放在文件顶层（setup 文件符合此要求）
- 如果组件使用了 setup 中未覆盖的 router exports（如 `<Route>`、`<Router>`），需要在测试中补充 mock
- Fluent UI 通过 top-level import 注册 `customElements.define()`，无需额外操作

## 5. NovelCard 测试

### 5.1 测试文件

`tests/browser/NovelCard.browser.test.tsx`

### 5.2 测试用例

| 测试 | 验证内容 |
|---|---|
| 标题和作者渲染 | `container.textContent` 包含小说标题和作者名 |
| R-18 Badge | `x_restrict: 1` 时卡片显示 "R-18" |
| R-18G Badge | `x_restrict: 2` 时卡片显示 "R-18G" |
| AI Badge | `novel_ai_type: 2` 时卡片显示 "AI" |
| AI辅助 Badge | `novel_ai_type: 3` 时卡片显示 "AI辅助" |
| 安全内容无 Badge | `x_restrict: 0` 且 `novel_ai_type: 0` 时无 Badge 文本 |
| 系列标签 | `series` 有值时显示 "📚 系列" |
| 收藏按钮 | 点击收藏按钮触发 API 调用 |

## 6. NovelVirtualFeed 测试

### 6.1 测试文件

`tests/browser/NovelVirtualFeed.browser.test.tsx`

### 6.2 测试用例

| 测试 | 验证内容 |
|---|---|
| 多卡片渲染 | 传入 3 本小说，3 个标题都渲染 |
| 空状态 | 空数组时显示 "暂无小说" |
| 错误状态 | `error="网络错误"` 时显示错误信息 |
| DOM 清理（Badge 重叠回归） | 数据变化后旧卡片 DOM 被移除（详见 6.3） |

### 6.3 DOM 清理测试策略

该测试验证的是 Badge 重叠 bug 的根因：数据变化后旧绝对定位卡片未清理。

两种实现方案：

**方案 A：SolidJS signal 驱动**
在 render 函数内部使用 `createSignal`，通过外部引用的 `setNovels` 触发数据变化。此方案最接近真实用户操作路径。

**方案 B：两次渲染 + DOM 快照**
分别渲染两次不同数据集，对比 `container.innerHTML` 是否有旧数据残留。此方案更简单但不够精确。

推荐方案 A，实现计划中会详细说明。

## 7. 配置文件变更

`vitest.browser.config.ts` 新增一行：

```typescript
test: {
  setupFiles: ['./tests/browser/setup.ts'],
  // ... 原有配置不变
}
```

## 8. 成功标准

- `pnpm test:browser` 运行通过
- NovelCard 测试覆盖所有 Badge 类型（R-18/R-18G/AI/AI辅助/无）
- NovelVirtualFeed 测试覆盖数据变化后的 DOM 清理
- 新测试在 headless Chromium 中稳定运行（timeout 30s）

## 9. 文件清单

| 文件 | 操作 | 行数 |
|---|---|---|
| `tests/browser/setup.ts` | 新增 | ~35 |
| `tests/browser/NovelCard.browser.test.tsx` | 新增 | ~80 |
| `tests/browser/NovelVirtualFeed.browser.test.tsx` | 新增 | ~100 |
| `vitest.browser.config.ts` | 修改 | +1 |
