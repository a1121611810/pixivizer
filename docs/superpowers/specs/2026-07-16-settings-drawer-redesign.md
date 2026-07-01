# 设置页抽屉重构设计

## 概述

将当前底部弹出 Sheet（`SettingsSheet.tsx`）重构为左侧滑出 Navigation Drawer，基于 `@fluentui/web-components` 内置 `<fluent-drawer>` 组件实现，同时将 20 余项扁平设置重新归类为 4 个逻辑分组。

## 动机

- 当前设置项已达 20+，底部 Sheet 仅 50vh 高度，用户需要频繁滑动才能找到目标设置
- 设置项平铺无序，缺乏逻辑分类，影响查找效率
- 现有 `<fluent-drawer>` 组件零成本可用，无需额外依赖

## 架构设计

### 交互入口

| 项目 | 决策 |
|------|------|
| **触发方式** | 全局 Header（`TabFeedPage` 顶栏）左侧区域，纯手势触发 |
| **手势检测** | `touchstart.clientX < 30px` 且 `deltaX > 50px` 的横向右滑 |
| **关闭方式** | ① 点击遮罩层 ② Drawer 内右边缘左滑 ③ Android 返回键 |

### 组件选择

- 使用 `@fluentui/web-components` 内置 `<fluent-drawer>` 组件
- **type**: `modal`（带遮罩 Overlay）
- **position**: `start`（左侧滑出）
- **width**: `--drawer-width: 320px`
- **动画**: 由 Fluent Web Components 原生处理，符合 Fluent 2 motion 规范

### 定位

- Overlay 浮层模式，z-index 50+，覆盖页面内容
- 不改变页面布局，不触发 reflow

## 分组设计

### 1️⃣ 显示与交互

| 设置项 | 控件类型 | 备注 |
|--------|----------|------|
| 主题 | 三段选择器 | light / system / dark |
| 布局模式 | 三段选择器 | 瀑布流 / 单列 / 网格 |
| 详情页楼梯导航 | Switch | Beta 标签 |
| 自动隐藏导航栏 | Switch | |
| 预测返回手势 | Switch | 仅 Android 16+ 可用，不可用时 disabled |

### 2️⃣ 内容与过滤

| 设置项 | 控件类型 | 备注 |
|--------|----------|------|
| 显示 R18 内容 | Switch | 需成年确认 |
| 显示 R-18G 内容 | Switch | 需成年确认 |
| 重新确认年龄 | Button | 仅在已确认年龄时显示 |
| 管理屏蔽列表 | Clickable → BlocklistSheet | 打开子 Sheet |

### 3️⃣ 图片与网络

| 设置项 | 控件类型 | 备注 |
|--------|----------|------|
| 列表画质 | 二段选择器 | 默认 / 高清 |
| 详情画质 | 三段选择器 | 默认 / 高清 / 原图 |
| 图片缓存数 | Slider | 100~1000 |
| 图床代理 | Switch + → /image-host | 行内开关 + 跳转子页面 |
| DNS over HTTPS | Switch | 实验性，仅 Android |

### 4️⃣ 账号与应用

| 设置项 | 控件类型 | 备注 |
|--------|----------|------|
| 退出登录 | Clickable | 仅登录状态显示 |
| 清除所有本地数据 | Clickable | 危险操作，红色标记 |
| 删除 Pixiv 账号 | Clickable → 外部链接 | |
| 启动时检查更新 | Switch | |
| 检查更新 | Clickable + 版本状态 | 显示当前/最新版本 |
| 关于 Pictelio | Clickable → /about | |

## 代码变更

### 新增文件

- **`src/components/SettingsDrawer.tsx`** — 新抽屉组件，替代 SettingsSheet.tsx
  - 内容从 SettingsSheet.tsx 迁移，复用所有 store 引用和交互逻辑
  - 使用 `<fluent-drawer type="modal" position="start">` 包裹
  - 四组内容用 `<fluent-divider>` + 组标题分隔
  - BlocklistSheet 对话框保持独立

### 修改文件

- **`src/stores/uiStore.ts`**
  - 新增 `settingsDrawerOpen` signal（与现有 `showSettingsSheet` 平级）
  - 新增 `openSettingsDrawer()` / `closeSettingsDrawer()` 函数
  - `showSettingsSheet` 在迁移完成后移除

- **`src/components/NavBar.tsx`** — 无变更（手势在 TabFeedPage 的 header 区域处理）

- **`src/routes/TabFeedPage.tsx`**
  - 替换 `<SettingsSheet />` 为 `<SettingsDrawer />`
  - 在 header 区域添加手势检测逻辑（touchstart/touchmove/touchend）
  - 保留右侧齿轮图标作为备用入口（点击同时触发 Drawer 打开）

- **`src/App.tsx`**
  - `<SettingsDrawer />` 放置在 Router 根布局中
  - `window.__settingsOpen` 改为 `window.__drawerOpen`

### 删除文件

- **`src/components/SettingsSheet.tsx`** — 全部替换为 SettingsDrawer.tsx

## 性能与内存

- `<fluent-drawer>` 使用原生 `<dialog>` 元素，不维护额外虚拟 DOM 树
- Drawer 内容仅在打开时渲染（条件渲染），关闭时 DOM 移除
- 手势检测仅在 header 区域绑定事件，不全局监聽
- 使用 `createSignal` 而非 `createStore` 管理 Drawer 开关状态，避免不必要的细粒度更新

## 安全

- R18/R18G 开关仍受年龄确认守卫保护，逻辑不变
- 清除数据、退出登录等危险操作仍保留确认对话框
- 手势触发的 Drawer 不引入新的安全风险

## 向后兼容

- 所有设置项的持久化键值（`Preferences` key）不变
- 所有 store getter/setter 签名不变
- 外部对 `setShowSettingsSheet` 的引用（如 TabFeedPage）统一替换为新 API

## 不在此范围

- 图床代理页面（`/image-host`）保持独立路由，Drawer 内仅保留入口行
- 关于页面（`/about`）保持独立路由
- 不新增任何设置项，仅重新分类和编排位置
- 不修改设置项的功能逻辑

## 测试

- 手势检测逻辑需要手动测试（touch 事件模拟复杂，不建议自动化）
- Drawer 打开/关闭状态通过 `uiStore` 的 signal 可单元测试
- 各组渲染条件（如年龄确认后的 R18 开关可用性）保持现有测试覆盖
