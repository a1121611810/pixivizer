# ADR-0020: 将 uiStore 拆分为导航 store 和设置 store

## 状态

提议

## 背景

uiStore.ts（574 行）是项目中第二大的 store 文件，管理 9 个完全独立的领域：导航、主题、布局、内容过滤、年龄确认、图片质量、图片缓存、更新检测、DNS 覆盖。当前问题：

1. **订阅放大**：导航状态（`currentTab`）每秒都可能变化，但存储在同一个 `createStore` 中，导致所有订阅者被通知——包括只关心设置状态的组件
2. **resetUiStore 难以维护**：新增设置字段时必须记住在 `resetUiStore()` 中同步添加对应 `setState` 调用
3. **themeStore 交叉引用**：`themeStore.ts` 导入 `uiStore.resolvedTheme`，造成双向依赖（uiStore 本身也处理 theme）

## 决策

**将 uiStore 拆分为两个 store：**

| Store | 职责 | 字段数 | 预估行数 |
|-------|------|--------|---------|
| `uiStore.ts`（保留） | 导航状态（currentTab、contentType）+ 主题（theme、resolvedTheme） | ~4 | ~120 |
| `settingsStore.ts`（新建） | 所有可持久化的用户设置（布局、过滤、年龄、质量、缓存、更新、DNS） | ~23 | ~350 |

### 不选择 3+ 路拆分的理由

设置领域的 7 个分组共享：
- 同一持久化机制（`@capacitor/preferences`）
- 同一重置生命周期（`resetUiStore` 是一键清除所有设置）
- 同一变化频率（仅在用户手动操作设置时变化）

## 后果

### 正面

- 导航状态变更不再触发设置相关组件的重新渲染
- `resetUiStore` 只需调用 `resetSettingsStore()`，不再需要逐个 setState
- 测试文件可独立覆盖导航和设置

### 反面

- 需要更新所有引用 uiStore 设置字段的 import 路径
- 增加 1 个模块文件

## 与现有 ADR 的关系

配合 ADR-0018（Settings 子组件拆分）：每个 Settings 子组件已独立导入所需的 store signal，import 路径调整影响范围有限。
