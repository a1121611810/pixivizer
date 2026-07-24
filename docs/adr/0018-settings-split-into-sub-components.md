# ADR-0018: 将 Settings 页面拆分为领域子组件

## 状态

提议

## 背景

Settings.tsx 是项目中最大的单文件组件（873 行），涵盖 4 个完全独立的设置领域：显示与交互、内容与过滤、图片与网络、账户与数据。当前存在以下问题：

1. **修改耦合**：任何设置项的增减都需在 873 行中定位，修改一个领域可能意外影响另一个
2. **测试覆盖为 0**：巨大文件无人敢写测试
3. **import 膨胀**：顶部 import 44 个模块，其中大部分只被单个领域使用，但所有领域共享同一作用域
4. **信号膨胀**：`ageGateMessage`、`showBlocklist`、`actionToast`、`dialogState` 4 个 createSignal 混合在组件顶部，增加认知负载

## 决策

**将 Settings.tsx 拆分为 5 个领域子组件**，每个子组件位于 `src/components/settings/` 目录下：

| 组件 | 职责 | 预估行数 |
|------|------|---------|
| `SettingsAppearance` | 主题选择器 + 布局设置链接 | ~44 |
| `SettingsContent` | R18/R18G 开关 + 年龄确认 + 屏蔽列表 | ~90 |
| `SettingsImage` | 画质选择 + 缓存链接 + DNS 开关 | ~140 |
| `SettingsAccount` | 缓存清除 + 数据清除 + 更新检查 + 关于链接 | ~160 |
| `SettingsDialogs` | BlocklistSheet + 清除确认 + 删除账号确认 | ~80 |
| `Settings.tsx`（重组后） | 组合容器 + 公共 header/toast | ~60 |

**不是使用 TanStack 子路由**的原因是：当前设置页面是单滚动页，所有 section 同时可见。子路由（`/settings/appearance` 等）需要用户逐页查看，增加交互成本。组件提取即可实现领域隔离，无需改变路由结构。

## 约束

- 不改变用户交互流程（所有开关、链接、弹窗行为与当前完全一致）
- 不引入懒加载（所有子组件在同帧渲染）
- 每个子组件独立管理自己的 import，不依赖 Settings.tsx 传递 props
- 公共状态（toast、age gate 提示）保留在 Settings.tsx 中，通过 props 或 store 传递给子组件

## 后果

### 正面

- 单文件复杂度从 873 行降至 ~60 行
- 每个子组件可独立编写测试（mock store signal 即可）
- 新增设置项只需在对应子文件中追加，不改其他文件
- Git diff 更精确：修改 R18 只显示 SettingsContent.tsx 的 diff

### 反面

- 模块数量增加 5 个（但均在 `settings/` 目录下，易定位）
- 新增 ~400 bytes 模块级 Function 对象和 ~1KB 模块作用域

## 与现有 ADR 的关系

此 ADR 不违背任何现有决策。`docs/adr/0016-tanstack-query-phase2-feed-novel-store.md` 中提到的"减少 store 耦合"原则被本 ADR 继承——子组件各自从 store 导入 signal，但不修改 store 层。

## 实施建议

1. 先创建目录和空的子组件文件
2. 从"无外部依赖"最少的 SettingsAppearance 开始提取（仅 ThemeSelector 组件）
3. 逐步提取 SettingsContent → SettingsImage → SettingsAccount → SettingsDialogs
4. 每个步骤后运行 `pnpm test` 和 `pnpm check` 确认无回归
