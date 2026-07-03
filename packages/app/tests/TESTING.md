# 测试约定

## 分层

| 层级           | 配置                       | 命令                | 用途                               | 速度 |
| -------------- | -------------------------- | ------------------- | ---------------------------------- | ---- |
| **单元测试**   | `vitest.config.ts`         | `pnpm test`         | 纯逻辑：store、utils、API 参数验证 | 快   |
| **浏览器测试** | `vitest.browser.config.ts` | `pnpm test:browser` | DOM 操作、组件加载验证             | 中   |
| **全量**       | —                          | `pnpm test:all`     | CLI + Browser 全部测试             | —    |

## 核心规则

### 组件测试文件必须渲染组件

`*.test.tsx` 文件中如果被测对象是组件，必须至少有一个测试用例实际渲染该组件（使用 `@solidjs/testing-library` 的 `render`）。

仅测试子函数/子模块的文件应按被测模块命名，**不使用组件名**。

> 反例：`SeriesSheet.test.tsx` 内容全是 `loadSeries` API 测试，和组件无关。
> 正例：API 测试放 `tests/unit/api/novel.test.ts`，组件渲染测试放 `tests/browser/SeriesSheet.browser.test.ts`。

### 文件命名

| 前缀                | 存放目录         | 说明                                            |
| ------------------- | ---------------- | ----------------------------------------------- |
| `*.test.ts`         | `tests/unit/`    | 纯逻辑测试，`vitest.config.ts` 匹配             |
| `*.browser.test.ts` | `tests/browser/` | 浏览器环境测试，`vitest.browser.config.ts` 匹配 |

### 何时需要浏览器测试

以下场景必须使用浏览器测试（`.browser.test.ts`）：

- 组件模块加载验证（export 是否正确）
- DOM API 调用（`document.body.style.overflow` 等）
- 浏览器特有 API（IntersectionObserver、ResizeObserver 等）
- 异步渲染结果验证（配合 `@solidjs/testing-library`）

### 渲染组件需要 @solidjs/testing-library

已安装。`vitest.browser.config.ts` 已配置 `vite-plugin-solid`，支持组件渲染。

在浏览器测试中写：

```typescript
import { render, screen } from "@solidjs/testing-library";
import { SeriesSheet } from "@/components/SeriesSheet";

// 需要 mock 依赖
vi.mock("@capacitor/core", () => ({ ... }));
vi.mock("@solidjs/router", () => ({ useNavigate: () => vi.fn() }));

it("renders when open", () => {
  render(() => <SeriesSheet isOpen={true} ... />);
  expect(screen.getByText("系列作品")).toBeTruthy();
});
```
