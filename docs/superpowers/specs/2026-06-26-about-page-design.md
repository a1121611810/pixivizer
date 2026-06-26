# 关于页 (About Page) 设计

**日期**: 2026-06-26
**状态**: 已批准

## 概述

为 Pixivizer 新增独立的"关于"页面（路由 `/about`），入口放在设置面板底部。采用 Fluent Design 列表式布局，数据驱动渲染，预留扩展结构供后续添加"开源许可"、"反馈渠道"等条目。

## 内容范围（A 型 — 精简型，可扩展）

当前版本（v1）展示内容：

- App 名称 + 图标（与启动屏相同 SVG logo）
- 应用版本号（从 `package.json` 读取，构建时注入）
- 构建目标（Android / Capacitor）

后续可扩展：

- 开源许可（OSS Licenses）
- GitHub 仓库链接
- 开发者信息
- 反馈渠道

## 架构

```
src/routes/About.tsx              ← 新增：关于页面组件
src/App.tsx                       ← 修改：添加 /about 路由 + import
src/components/SettingsSheet.tsx   ← 修改：底部版本号改为可点击列表行入口
```

### 路由

在 `App.tsx` 的路由表中新增：

```tsx
<Route path="/about" component={About} />
```

注意：`/about` 路由**不在** rootPaths 集合中，这样 Android 返回键会自动触发 `navigate(-1)` 返回上一页，符合子页面行为。

### 入口

`SettingsSheet.tsx` 底部当前显示：

```
Pixivizer v0.1.0
```

改为：

```tsx
{
  /* About 入口 */
}
<div
  class="flex items-center justify-between py-3 cursor-pointer"
  onClick={() => {
    close();
    navigate("/about");
  }}
>
  {/* 左侧：App 图标 + 名称 */}
  <div class="flex items-center gap-3">
    <AppIcon size={24} />
    <div>
      <p>Pixivizer</p>
      <p>v{APP_VERSION}</p>
    </div>
  </div>
  {/* 右侧：箭头 */}
  <ChevronRight />
</div>;
```

## 页面布局

```
┌─────────────────────────────────┐
│  ← 返回          关于           │  ← 导航栏（与 PersonalCenter 模式一致）
├─────────────────────────────────┤
│                                 │
│         [App 图标 64px]         │  ← 与启动屏相同 SVG
│          Pixivizer              │  ← App 名称
│       Pixiv 第三方客户端         │  ← 副标题
│                                 │
├─────────────────────────────────┤
│  📦 应用信息                    │  ← 分组标题
│  ├ 应用版本  ········· v0.1.0  │  ← 列表行
│  └ 构建目标  ········· Android │
├─────────────────────────────────┤
│  [未来：开源许可、反馈等]        │  ← 预留扩展
└─────────────────────────────────┘
```

## 组件设计

### About.tsx

数据驱动渲染：定义 `sections` 数组，每个 section 包含 `title`、`rows`（每行 `label`、`value`、`icon`），遍历渲染。扩展只需在数组中 push 新条目。

```tsx
interface AboutRow {
  label: string;
  value: string;
  icon: IconName;
}

interface AboutSection {
  title: string;
  rows: AboutRow[];
}

const sections: AboutSection[] = [
  {
    title: "应用信息",
    rows: [
      { label: "应用版本", value: APP_VERSION, icon: "info" },
      { label: "构建目标", value: "Android (Capacitor)", icon: "wrench" },
    ],
  },
];
```

### 版本号获取

在 Vite 配置中将 `package.json` 的 `version` 通过 `define` 注入为全局常量 `APP_VERSION`：

```ts
// vite.config.ts
import pkg from "./package.json";

define: {
  APP_VERSION: JSON.stringify(pkg.version),
},
```

TypeScript 类型声明：

```ts
// src/types/env.d.ts
declare const APP_VERSION: string;
```

## 交互

| 行为          | 实现                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| 进入页面      | Fluent 标准 enter 动画（`PageTransition`，`var(--curveDecelerateMid)`） |
| 离开页面      | 标准 exit 或 Android 预测返回手势                                       |
| 返回按钮      | 左上角 `←` 调用 `navigate(-1)`                                          |
| 列表行 hover  | `bg-[var(--colorNeutralBackground1Hover)]` 变化                         |
| 列表行 active | `scale(0.98)` 按压反馈                                                  |

## Fluent Design 令牌使用

- 所有颜色使用 `var(--colorXxx)` 令牌
- 字号使用 `var(--fontSizeBaseXxx)` 令牌
- 间距使用 `var(--spacingXxx)` 令牌
- 圆角使用 `var(--borderRadiusXxx)` 令牌
- 动画使用 `var(--durationNormal)` / `var(--curveDecelerateMid)` 等令牌
- 分组分隔线使用现有 `.divider` 样式类
- 导航栏复用现有模式（`sticky top-0 z-10 surface-appbar`）

## 文件清单

| 文件                               | 操作       | 说明                        |
| ---------------------------------- | ---------- | --------------------------- |
| `src/routes/About.tsx`             | 新增       | 关于页面组件                |
| `src/App.tsx`                      | 修改       | 添加 `/about` 路由 + import |
| `src/components/SettingsSheet.tsx` | 修改       | 底部版本号改为可点击入口    |
| `vite.config.ts`                   | 修改       | 添加 `APP_VERSION` define   |
| `src/types/env.d.ts`               | 新增或修改 | 声明 `APP_VERSION` 全局常量 |

## 不在范围内的内容

- 不展示开源许可详情（后续扩展）
- 不展示更新日志（后续扩展）
- 不展示开发者联系方式（后续扩展）
- 不添加底部 Tab 导航入口
- 不添加国际化（当前项目无 i18n 框架）
