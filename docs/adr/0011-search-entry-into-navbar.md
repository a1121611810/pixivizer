# ADR 0011: 搜索入口迁移到 NavBar 中心钮

日期: 2026-07-22

## 状态

已接受（修订 ADR 0009 的「搜索入口：FAB」部分）

## 上下文

ADR 0009 决定用一个全局可拖动的悬浮搜索按钮（SearchFAB）作为搜索入口，要求"任何页都能展示入口"。实际落地后评审发现两个问题：

1. FAB 方案带来额外的复杂度：拖动逻辑、位置偏好、以及一条只为 FAB 服务的 `contentLoading` 信号链（`isContentLoading` / `setContentLoadingState`），而收益（详情页/设置页也有搜索入口）很小。
2. NavBar 中心圆钮目前只是 logo 装饰 + 上滑回顶，天然适合做搜索主入口。

## 决策

删除 SearchFAB，把搜索入口迁移到 NavBar 中心圆钮。**本 ADR 修订 ADR 0009 的「1. 搜索入口：FAB」一节**；ADR 0009 的其余部分（搜索页路由、搜索模式、合流、自动补全等）不受影响。

### 1. 中心钮行为

- **单击**：导航到 `/search` 页
- **上滑**：回顶（保留现状手势，平滑滚动，600ms 动效）
- 不再有长按手势

> 注：上滑回顶的 600ms 动效为既有实现（`NavBar.tsx` 与 `uno.config.ts` 的 `scroll-top-anim`），不在本次改动范围内。它偏离 AGENTS.md Fluent 时长表（仅允许 100/150/200/300/500ms），此处显式记录为**有意保留的既有偏离**，后续可在独立改动中对齐到 500ms。

### 2. 砍掉手动收起/展开 toggle

导航胶囊的点击 toggle 被删除。`compact` 状态仅由滚动自动隐藏驱动，`autoHideNavBar` 设置项不变。中心钮不再承担胶囊收展职责。

### 3. 接受覆盖范围收缩

旧 FAB 在除 `/search`、`/login`、`/age-confirmation`、`/layout-settings` 外的所有页面可见（含详情页、设置页）；NavBar 只存在于 7 个列表类页面（推荐、关注、收藏、历史、个人中心、用户作品、关注/粉丝列表）。搜索入口因此从"几乎全局"收缩为"仅列表页"。**这是有意接受的取舍**，理由：

- **详情页有标签导航兜底**：用户在详情页产生搜索意图时，最直接的诉求是搜相关标签，而标签导航（点标签进搜索页）已覆盖该路径
- **设置页不需要搜索入口**：设置类页面没有作品浏览场景，搜索意图近乎为零
- 收缩换来的是删除 FAB 整套机制（拖动、位置、contentLoading 信号链），复杂度下降明显

### 4. 视觉

中心钮的 Pictelio logo 换成 Fluent search 图标，按钮尺寸、胶囊布局、上滑动效均不变。logo 仍保留在 LoadingSpinner 和 SettingsDrawer 中。

### 5. 代码清理

- 删除 `SearchFAB.tsx` 及 `__root.tsx` 中的渲染
- 删除 `uiStore` 的 `contentLoading` 信号链（`isContentLoading` / `setContentLoadingState`，它只为 FAB 服务）
- 删除 `NovelDetail.tsx` 中的 contentLoading 同步 effect

## 备选方案

### 备选 A：长按中心钮进搜索，单击保留其他职责

- 否决理由：主操作不该藏在长按后面。搜索是高频主路径，长按手势可发现性差、触发慢，违背"入口"的设计目的。

### 备选 B：保留手动收起/展开导航胶囊的点击 toggle

- 否决理由：滚动自动隐藏已覆盖"需要更多屏幕空间"的场景，手动 toggle 的使用率极低；砍掉后中心钮语义单一（搜索 + 回顶），手势模型更清晰，也消除了 toggle 与自动隐藏两套状态机互相打架的边界情况。

## 影响

- 搜索入口可见范围：全局（FAB）→ 仅 7 个列表类页面（NavBar）
- `CONTEXT.md`：删除「FAB」词条，修正「回顶」词条与实际实现对齐，新增「导航中心钮」词条
- 中心钮视觉：logo → Fluent search 图标；logo 保留在 LoadingSpinner / SettingsDrawer

## 参阅

- ADR 0009: Pixiv 标签搜索功能（本 ADR 修订其搜索入口设计部分）
- CONTEXT.md 中的「导航中心钮」「回顶」「标签导航」词条
