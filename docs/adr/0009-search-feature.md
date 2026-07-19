# ADR 0009: Pixiv 标签搜索功能

日期: 2026-07-20

## 状态

提议

## 上下文

Pictelio 缺少 Pixiv 搜索功能。用户无法通过标签/关键词搜索作品，只能通过推荐、关注和收藏列表浏览。具体需求：

- 支持按标签搜索插画/漫画/小说
- 在作品详情页点击标签可直接搜索
- 搜索过程中提供自动补全建议
- 全局可触达的搜索入口

## 决策

基于 Pixiv App API（`/v1/search/illust`、`/v1/search/novel`、`/v1/search/autocomplete`），实现一个完整的标签搜索子系统。架构要点：

### 1. 搜索入口：FAB

在全局实现一个可拖动的悬浮搜索按钮（FAB），默认位于右下角，在所有页面可见。位置偏好通过 `Preferences` 持久化。

### 2. 搜索页路由

新增 `/search` 路由，支持 URL 参数传递：
- `word` — 搜索关键词（支持从标签跳转带入）
- `scope` — 搜索范围（`all` / `illust` / `novel`，默认 `all`）

搜索页布局：搜索框 → 自动补全浮层 → 排序/范围控件 → 搜索结果瀑布流。

### 3. 搜索模式

**搜索范围（Scope）**：搜索前设置，作为请求参数的一部分。
- `all`：同时调 `search/illust` + `search/novel` 两个 API，客户端合流
- `illust`：仅调 `search/illust`
- `novel`：仅调 `search/novel`

**排序（Sort）**：提供排序选择器，支持 `date_desc`（默认）、`date_asc`、`popular_desc`。后续可扩展 `duration` 时间范围筛选。

### 4. 搜索合流

搜索范围为 `all` 时，同时发起 illust 和 novel 两个请求，将返回的 `PixivIllust[]` 和 `PixivNovel[]` 按 `create_date` 降序合流为单一时间线。使用 `next_url` 分别加载更多。

### 5. 结果筛选

混排结果展示后，通过 filter chip 筛选类型。筛选仅作用于客户端展示，不影响后续分页请求。

### 6. 自动补全

用户输入时（防抖 300ms），调 `/v1/search/autocomplete` 获取标签建议。建议列表以浮层形式展示在搜索框下方。选中建议后补全到搜索框并自动执行搜索。

### 7. 标签跳转

在 `IllustDetail` 和 `NovelDetail` 的标签区域，点击 tag 调用 `navigate({ to: "/search", search: { word: tagName } })`，跳转到搜索页。

### 8. 搜索历史

最近 50 条搜索关键词持久化到 `Preferences`（或 TanStack DB）。在搜索页以列表形式展示，支持点击复用和单条删除。

### 9. 数据流

搜索相关的 TanStack Query key 结构：
```
["search", "illust", word, sort, search_target]
["search", "novel", word, sort, search_target]
["search", "autocomplete", word]
```

当搜索范围/排序/关键词变化时，query 自动失效并重新请求。

### 10. 设计约束：Fluent Design System 2

所有搜索相关的新增 UI 组件和修改**必须**遵循项目的 Fluent Design 2 规范：

- **视觉令牌**：颜色、间距、圆角、阴影、字体大小**必须**使用 `src/styles/tokens.css` 中定义的 CSS 变量，禁止硬编码
- **交互状态**：每个可交互元素覆盖 hover / active (pressed: `scale(0.98)`) / focus-visible（`outline` + `outline-offset`）三种状态
- **动画**：缓动曲线只允许 Fluent 四种（exit/standard/enter/linear），时长只允许五种（100/150/200/300/500ms）
- **触控目标**：最小 40×40px
- **动效**：搜索面板过渡使用 `PageTransition.tsx`，FAB 使用 `durationNormal` + `curveEasyEase`；自动补全浮层使用 `durationFast` + `curveEasyEase`
- **FAB 样式**：参照 Fluent 2 FAB 规范（使用 `--elevation8` 阴影、`--borderRadiusCircular` 圆角、`--colorBrandBackground` 作为主色）
- **Fluent Web Components**：如存在对应的 Fluent 组件（如 `<fluent-text-field>`），优先使用而非自定义实现
- **UnoCSS**：新增的 shortcut 统一在 `uno.config.ts` 中定义，遵循现有命名模式
- 更多细节见 AGENTS.md 中的「Fluent Design 规范」章节

### 11. 不做的（MVP）

- 用户搜索（`/v1/search/user`）
- 趋势标签/热门搜索
- 高级过滤（尺寸、收藏数、AI 生成过滤）
- 时间范围筛选（`duration` 参数后端先支持，UI 后续加）

## 备选方案

### 备选 A：纯服务器搜索，不做客户端混排

只提供一个搜索范围（如只搜 illust），不处理混排。
- 优点：实现简单，无合流逻辑
- 缺点：不符合用户"综合搜索"的需求

### 备选 B：用 Tab 替代混排

搜索页用 Tab 切换不同类型（全部 / 插画 / 小说），切 Tab 时切换 API 端点。
- 优点：无需合流逻辑
- 缺点：用户体验不如混排流畅，用户明确要求混排

### 备选 C：不做 FAB，仅 NavBar 加搜索图标

搜索入口仅放在导航栏。
- 优点：无需处理拖动/位置持久化
- 缺点：NavBar 空间已满（推荐/关注/收藏/历史/个人中心），且用户要求"任何页都能展示入口"

## 影响

- 新增 `src/api/search.ts`（搜索 API 封装）
- 新增 `src/stores/searchStore.ts`（搜索状态管理）
- 新增 `src/routes/Search.tsx`（搜索页组件）
- 新增 `src/components/SearchFAB.tsx`（悬浮搜索按钮）
- 新增 `src/components/SearchAutocomplete.tsx`（自动补全浮层）
- 修改 `src/api/queryKeys.ts`（添加搜索相关 query key）
- 修改 `src/router.tsx`（添加 `/search` 路由）
- 修改 `src/routes/__root.tsx`（添加 FAB 全局组件）
- 修改 `src/components/IllustTags.tsx`（标签点击可导航）
- 修改 `src/utils/html.ts` 或相关 tag 渲染组件（标签点击跳转）

## 参阅

- CONTEXT.md 中的「搜索」术语表
- Pixiv API: `/v1/search/illust`, `/v1/search/novel`, `/v1/search/autocomplete`
- ADR 0006: TanStack Query 采纳
