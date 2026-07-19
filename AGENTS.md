# Pictelio

基于 SolidJS 的 Pixiv 第三方客户端，通过 Capacitor 打包为 Android 原生应用。项目名为 **Pictelio**（目录名为 pixivizer）。

## 项目概览

- **技术栈**: SolidJS 1.9 + TypeScript 6.0 (strict) + Vite 8.0 + UnoCSS 66.7 + Capacitor 8.4；小说正文布局使用 `@chenglou/pretext`
- **Monorepo**: pnpm workspace，含两个子包：`pictelio-app`（SPA 主体）和 `pictelio-website`（VitePress 落地页）
- **入口**: `packages/app/src/main.tsx` → `packages/app/src/startup.ts` → `packages/app/src/App.tsx` → `packages/app/src/router.tsx`（TanStack Router，路由定义与 App 分离）
- **路由**: `/login` `/recommended` `/following` `/illust/$id` `/novel/$id` `/bookmarks` `/me` `/user/$id` `/user/$id/illusts` `/user/$id/following` `/user/$id/followers` `/history` `/about` `/image-host` `/image-cache` `/age-confirmation` `/debug`
- **设计系统**: **强制** Microsoft Fluent Design System 2 — 所有视觉和交互决策基于 Fluent 令牌和规范（详见「Fluent Design 规范」章节）
- **Pixiv API**: 自建 HTTP 客户端 (`src/api/client.ts` + `src/api/queryClient.ts`)，双模式（Web: fetch + Vite 代理 / Native: CapacitorHttp 直连 + `src/native/PictelioHttp.ts`），iOS OAuth 凭证策略（Android 已弃用），401 自动刷新 + 防死循环
- **CSS 架构**: 分层加载 `reset.css` → `tokens.css` → `base.css` → `virtual:uno.css`；PostCSS `postcss-pxtorem` 自动转换字号为 rem；Fluent Web Components 主题同步
- **构建工具**: 使用 `vite-plus`（内部封装 Vite + oxlint + oxfmt + vitest），通过 `vp` CLI 统一执行 dev/build/check/test/lint/fmt

## 代码智能规范（Code Intelligence）

本项目使用 [CodeGraph](https://github.com/colbymchenry/codegraph) 作为默认代码理解工具。它基于本地预索引的代码知识图谱，提供符号定位、调用链追踪、影响分析、框架路由识别等能力，不只是「代码搜索」。

> 如果 `.codegraph/` 索引尚未生成，在项目根目录运行以下命令初始化：
> ```bash
> pnpm dlx codegraph init
> ```

### 默认原则

- **任何涉及"理解代码结构、定位符号、追踪调用链、分析影响范围"的任务，默认优先使用 CodeGraph 系列工具（`codegraph_*`，通过 `mcp__codegraph__` MCP 前缀访问）。**
- CodeGraph 是默认工具，不是搜索失败后的兜底工具。
- 项目已通过 `reasonix.toml` 配置 `--path`，调用 CodeGraph 工具时**不要**手动传 `projectPath`。

### 工具列表与典型使用场景

| 场景 | 首选工具 | 说明 |
|------|----------|------|
| 接到功能或 Bug 任务，不确定入口 | `codegraph_context` | 任何"how does X work"/架构/bug 问题首选，返回相关上下文与源码 |
| 按名称快速定位符号 | `codegraph_search` | 搜索函数、组件、变量、路由等 |
| 两个符号之间的调用路径 | `codegraph_trace` | 追踪 A 到 B 的调用链，返回每跳的代码体 |
| 一次性获取多个相关符号的源码 | `codegraph_explore` | 探索组件/函数依赖的 store、service、子组件等 |
| 单个符号详情，含调用链 | `codegraph_node` | 读取某个方法/组件/类型的完整源码及行号 |
| 重构前影响分析 | `codegraph_impact` | 分析修改某符号会影响哪些文件/页面 |
| 查找调用者 | `codegraph_callers` | 查找谁调用了指定符号 |
| 查找被调用者 | `codegraph_callees` | 查找指定符号内部调用了谁 |
| 文件级代码浏览 | `codegraph_files` | 查看索引文件树或按模式定位文件 |
| 索引健康检查 | `codegraph_status` | 检查索引是否就绪、文件/节点/边数量 |

### 工具调用示例

所有示例均通过 MCP 工具调用执行，工具名前缀为 `mcp__codegraph__`（如 `mcp__codegraph__codegraph_context`）。因本项目已通过 `reasonix.toml` 配置 `--path`，示例中**省略 `projectPath`**。

#### `codegraph_context`（PRIMARY TOOL）

参数：`task`（必填）、`maxNodes`（默认 20）、`includeCode`（默认 true）。

```json
{
  "task": "登录态自动恢复逻辑从哪里开始？涉及哪些 store 和 API 调用？",
  "maxNodes": 20,
  "includeCode": true
}
```

#### `codegraph_search`

参数：`query`（必填）、`kind`（可选：function/method/class/interface/type/variable/route/component）、`limit`（默认 10）。

```json
{
  "query": "handleLogin",
  "kind": "function",
  "limit": 10
}
```

#### `codegraph_trace`

参数：`from`（必填）、`to`（必填）。

```json
{
  "from": "handleLogin",
  "to": "PixivApiClient.request"
}
```

#### `codegraph_explore`

参数：`query`（必填）、`maxFiles`（默认 12）。

```json
{
  "query": "ImageCard dependencies store",
  "maxFiles": 12
}
```

#### `codegraph_node`

参数：`symbol`（必填）、`includeCode`（默认 false）。

```json
{
  "symbol": "PixivApiClient.request",
  "includeCode": true
}
```

#### `codegraph_impact`

参数：`symbol`（必填）、`depth`（默认 2）。

```json
{
  "symbol": "authStore",
  "depth": 2
}
```

#### `codegraph_callers` / `codegraph_callees`

参数：`symbol`（必填）、`limit`（默认 20）。

```json
{
  "symbol": "PixivApiClient.request",
  "limit": 20
}
```

#### `codegraph_files`

参数：`path`（可选）、`pattern`（可选）、`format`（tree/flat/grouped，默认 tree）、`includeMetadata`（默认 true）、`maxDepth`（可选）。

```json
{
  "path": "src/api",
  "format": "tree",
  "includeMetadata": true
}
```

#### `codegraph_status`

参数：无（本项目通过 `reasonix.toml` 已配置路径）。

```json
{}
```

### 索引维护

- **初始化**：若 `.codegraph/` 索引不存在或损坏，在项目根目录执行：
  ```bash
  pnpm dlx codegraph init
  ```
- **更新**：文件大幅改动、新增/删除大量模块、或发现 CodeGraph 返回结果缺失/过期时，重新运行 `pnpm dlx codegraph init` 重建索引。
- **验证**：调用 `codegraph_status` 检查索引是否就绪，关注 `Files indexed`、`Total nodes`、`Total edges` 等关键指标。

### 结果解读速查

- **`Files indexed`**：被索引的文件数量。数量异常下降通常意味着索引范围配置变更或文件被排除。
- **`Total nodes`**：图中符号节点总数，包括函数、组件、变量、路由、类等。
- **`Total edges`**：符号间关系（调用、引用、导入、继承等）总数。
- **`Nodes by Kind`**：按 `component`、`function`、`route`、`import`、`variable` 等类型统计的节点数量，帮助快速判断索引覆盖度。
- **返回中的 `node`**：通常表示一个符号（函数、组件、类等），包含名称、路径、行号、源码片段等信息。
- **返回中的 `edge`**：表示两个符号之间的关系，例如 `calls`（调用）、`imports`（导入）、`references`（引用）等。

### projectPath 说明

本项目已通过 `reasonix.toml` 配置 `--path`，因此：
- 调用 CodeGraph 工具时**始终不传** `projectPath`。
- 如果 `reasonix.toml` 未配置或需要查询其他项目，则通过向上查找 `.codegraph/` 目录确定项目根目录后显式传入。

### 禁止的默认行为

- 未经 CodeGraph 尝试，直接用 `Grep` / `Glob` / `Bash find` 进行大规模代码探索。
- 用 `Grep` 手动拼凑调用链（应使用 `codegraph_trace`）。
- 用 `Read` 顺序打开多个文件来"摸索"架构（应先用 `codegraph_context` / `codegraph_explore`）。

### 允许的降级方案

以下情况允许优先使用普通工具：

1. **CodeGraph 不可用**：`.codegraph/` 索引未生成、返回空结果、或文件类型未被 CodeGraph 支持。
2. **已知路径的完整文件读取**：任务已明确需要读取 `src/api/client.ts` 等具体文件，直接用 `Read` 更高效。
3. **非代码文本搜索**：搜索日志、配置文件、依赖版本、文档等（如查 `package.json` 中的某个字段）。
4. **简单列举文件**：使用 `Glob` 列出符合明确模式的文件（如 `src/components/**/*.tsx`）。
5. **小范围精准定位**：已知符号名且在单个文件中，用 `Grep` 比 CodeGraph 更快（如查某个工具函数在哪定义）。
6. **中文语义搜索**：当任务描述是中文业务术语（如"登录页面"、"收藏按钮"），而 CodeGraph 返回空或不相关结果时，改用任何可用的低成本定位手段（文本搜索、文件名模式匹配等）找到入口文件或符号名，然后再切回 CodeGraph 做调用链、影响面、依赖分析。不要反复用不同中文词组尝试 CodeGraph。

## 命令

所有命令在项目根目录执行，通过 pnpm workspace 委托给 `pictelio-app`。

| 命令                          | 说明                                                              |
| ----------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                    | 启动 Vite 开发服务器（端口 5173）                                 |
| `pnpm build`                  | TypeScript 检查 + Vite 构建到 `dist/`                             |
| `pnpm check`                  | 仅 TypeScript 类型检查                                            |
| `pnpm preview`                | 预览生产构建                                                      |
| `pnpm test`                   | 运行 Vitest 测试                                                  |
| `pnpm test:watch`             | Vitest watch 模式                                                 |
| `pnpm lint`                   | oxlint 代码检查                                                   |
| `pnpm fmt`                    | oxfmt 代码格式化                                                  |
| `pnpm fmt:check`              | oxfmt 格式检查（不修改）                                          |
| `pnpm build:android`          | 构建 Web + Capacitor 同步 + Gradle 编译 Debug APK                 |
| `pnpm build:android:release`  | 构建签名 Release APK（需环境变量 `PICTELIO_KEYSTORE_PASSWORD` 和 `PICTELIO_KEY_PASSWORD`） |
| `pnpm release:github`         | 构建 Release APK 并发布到 GitHub Releases（详见 `docs/github-release.md`） |
| `pnpm release` / `release:dry`| 发布流程 / 演练（详见 `docs/release-checklist.md`）               |
| `pnpm dev:android`            | 一键 Android 开发热重载流程                                       |
| `pnpm cap:sync`               | 同步 Web 产物和 Capacitor 配置到 Android 项目                     |
| `pnpm cap:copy`               | 仅复制 Web 产物到 Android（不更新 Capacitor 配置）                |
| `pnpm cap:open:android`       | 在 Android Studio 中打开 `android/` 项目                          |
| `pnpm deploy` / `deploy:dry`  | 本地预览部署 / 干跑（复制 landing 页面到 `_site/`）              |

## Monorepo 结构

```
pixivizer/
├── packages/
│   ├── app/                     # pictelio-app — SolidJS SPA 主体
│   │   ├── src/                 # 源码（见下方架构详图）
│   │   ├── android/             # Capacitor Android 原生项目（源码纳入版本控制）
│   │   ├── scripts/             # 构建/发布/android-dev/截图脚本
│   │   ├── assets/              # 静态资源（logo、favicon 等）
│   │   ├── vite.config.ts       # Vite+ 配置（含 UnoCSS、PWA、代理、lint、fmt）
│   │   ├── uno.config.ts        # UnoCSS shortcuts（Fluent 风格）
│   │   ├── tsconfig.json        # TypeScript strict 配置
│   │   ├── vitest.config.ts     # Vitest 配置
│   │   └── capacitor.config.ts  # Capacitor 配置（appId: io.pictelio.app）
│   └── website/                 # pictelio-website — VitePress 落地页
│       ├── docs/                # Markdown 文档
│       │   └── .vitepress/      # VitePress 配置
│       ├── version.json         # 版本信息
│       └── package.json
├── scripts/
│   └── deploy.mjs               # GitHub Pages 本地预览脚本
├── docs/                        # 项目文档
│   ├── github-release.md
│   ├── release-checklist.md
│   ├── release-signing.md
│   └── privacy-policy.md
├── dist/                        # Vite 构建输出
├── .github/workflows/
│   └── deploy.yml               # GitHub Pages 自动部署
├── pnpm-workspace.yaml          # pnpm workspace 配置
├── reasonix.toml                # Reasonix/CodeGraph 插件配置
└── package.json                 # 根 package.json（workspace 委托层）
```

## 架构

```
packages/app/src/
├── api/                # Pixiv API 层
│   ├── auth.ts         # OAuth 认证（iOS 凭证、spark-md5 哈希、password/refresh_token）
│   ├── client.ts       # HTTP 客户端（PixivApiClient 接口、Web fetch / Native CapacitorHttp 双模式、URL 重写、401 自动刷新防死循环）
│   ├── comment.ts      # 作品评论 API：获取、发送、删除
│   ├── illust.ts       # 作品 API：推荐、关注、下一页、详情、收藏、ugoira 元数据、关注/取消关注用户
│   ├── normalizeQueryError.ts # TanStack Query 错误归一化
│   ├── novel.ts        # 小说 API：详情、系列、搜索
│   ├── queryClient.ts  # TanStack Query client 单例 & 默认配置
│   ├── queryKeys.ts    # TanStack Query 查询键工厂
│   ├── types.ts        # 类型定义（PixivIllust、PixivUser、ApiError、PixivAuthResponse 等）
│   ├── user.ts         # 用户 API：详情、关注列表、粉丝列表
│   └── userAgent.ts    # User-Agent 管理
├── styles/             # CSS 分层（main.tsx 中按序导入）
│   ├── reset.css       # modern-css-reset 定制
│   ├── tokens.css      # Fluent Design System 2 设计令牌（颜色、间距、圆角、阴影、字体、动画曲线/时长）
│   └── base.css        # 根样式、滚动条、选中色、动画关键帧、reduced-motion
├── types/              # 环境类型声明（spark-md5、postcss-pxtorem、env）
├── stores/             # SolidJS 响应式状态（createSignal + createStore 导出）
│   ├── authStore.ts    # 登录状态（isLoggedIn、user、token、自动恢复、onUnauthorized 处理器）
│   ├── backGestureStore.ts # Android 返回手势状态管理
│   ├── blockStore.ts   # 已屏蔽用户 ID 持久化
│   ├── bookmarkStore.ts# 收藏状态管理
│   ├── db.ts           # TanStack DB 本地数据库配置（浏览历史持久化）
│   ├── feedStore.ts    # Feed 数据（illusts、分页、按 Tab 缓存、滚动位置）
│   ├── followListStore.ts # 关注/粉丝列表状态
│   ├── historyStore.ts # 浏览历史状态（TanStack DB 查询封装）
│   ├── imageHostStore.ts # 自定义图片托管配置状态
│   ├── novelCache.ts   # 小说正文缓存（LRU）
│   ├── novelStore.ts   # 小说 Feed 状态
│   ├── readerSettingsStore.ts # 小说阅读设置（字号、字重、字体、行高、颜色）
│   ├── reportStore.ts  # 已举报作品 ID 持久化
│   ├── themeStore.ts   # 主题管理（亮/暗/跟随系统）
│   ├── uiStore.ts      # UI 状态（当前 Tab、布局模式、R18 开关、设置面板、自动检查更新等）
│   ├── userIllustsStore.ts # 用户作品列表状态
│   └── userStore.ts    # 用户状态
├── routes/             # 页面组件（lazy loaded，路由定义在独立的 src/router.tsx）
│   ├── __root.tsx              # 路由根布局（NavBar、页面过渡、全局监听）
│   ├── Login.tsx               # 登录页（refresh_token / 用户名密码）
│   ├── AgeConfirmation.tsx     # 年龄确认页
│   ├── TabFeedPage.tsx         # Tab 容器（recommended / follow），委托 Feed 渲染
│   ├── Feed.tsx                # 瀑布流内容（虚拟滚动、下拉刷新、无限加载、哨兵分页）
│   ├── IllustDetail.tsx        # 作品详情（大图查看、多页、动图播放、楼梯式浏览）
│   ├── NovelDetail.tsx         # 小说详情（正文虚拟化、搜索高亮、阅读进度）
│   ├── NovelFeedPage.tsx       # 小说 Feed 页
│   ├── NovelBookmarks.tsx      # 小说收藏页
│   ├── IllustBookmarks.tsx     # 插画收藏页
│   ├── Bookmarks.tsx           # 收藏总览页
│   ├── HistoryPage.tsx         # 浏览历史页
│   ├── FollowListPage.tsx      # 关注/粉丝列表页
│   ├── PersonalCenter.tsx      # 个人中心 / 用户主页（根据路由参数区分）
│   ├── UserIllusts.tsx         # 用户作品列表页
│   ├── ImageHostSettings.tsx   # 图片托管设置页
│   ├── ImageCacheSettings.tsx  # 图片缓存设置页
│   ├── About.tsx               # 关于页
│   └── DebugImage.tsx          # 图片调试页
├── components/         # 可复用 UI 组件
│   ├── AgeGate.tsx              # 年龄门槛组件
│   ├── BlocklistSheet.tsx       # 屏蔽列表面板
│   ├── CommentOverlay.tsx       # 评论浮层组件
│   ├── ErrorDisplay.tsx         # 统一错误展示组件（按 ApiErrorType 渲染操作指引）
│   ├── FluentIcon.tsx           # Fluent 图标封装（components/ui/）
│   ├── GridCard.tsx             # 网格模式卡片
│   ├── HeartBurstEffect.tsx     # 收藏爱心爆发效果
│   ├── IllustTags.tsx           # 作品标签显示组件
│   ├── ImageCard.tsx            # Feed 卡片（含收藏/关注操作、R18 模糊、R18G 遮罩）
│   ├── ImageViewer.tsx          # 全屏图片查看器（缩放/拖拽/滑动翻页）
│   ├── LazyDetailImage.tsx      # 详情页懒加载图片包装
│   ├── LazyImageCard.tsx        # 轻量虚拟化卡片包裹（进入视口才渲染 ImageCard）
│   ├── LoadingSpinner.tsx       # 加载动画
│   ├── NavBar.tsx               # 顶部导航栏（自动隐藏）
│   ├── NovelCard.tsx            # 小说卡片
│   ├── NovelSearchBar.tsx       # 小说搜索栏
│   ├── NovelTextListCard.tsx    # 小说文本列表卡片（纯渲染，无测量）
│   ├── NovelVirtualFeed.tsx     # 小说虚拟滚动 Feed（textList / coverWall）
│   ├── PageTransition.tsx       # 页面过渡动画
│   ├── PixivImage.tsx           # 图片组件（CDN 代理 + 尺寸优化 + 渐进加载）
│   ├── PullIndicator.tsx        # 下拉刷新指示器
│   ├── ReaderSettingsSheet.tsx  # 阅读设置面板
│   ├── ReportSheet.tsx          # 举报面板
│   ├── SeriesSheet.tsx          # 作品系列面板
│   ├── SeriesSheetItem.tsx      # 系列面板条目组件
│   ├── SettingsDrawer.tsx       # 设置抽屉面板
│   ├── SkeletonCard.tsx         # 骨架屏占位卡片
│   ├── StartupUpdateDialog.tsx  # 启动时更新检查弹窗
│   ├── ThemeSelector.tsx        # 主题选择器组件
│   ├── UgoiraViewer.tsx         # 动图（Ugoira）播放器（JSZip 解压帧）
│   ├── UserAvatar.tsx           # 用户头像组件
│   ├── UserWorksFeed.tsx        # 用户作品瀑布流
│   └── VirtualFeed.tsx          # 虚拟滚动 Feed 容器
├── primitives/         # 底层抽象（无 UI 的逻辑单元）
│   ├── createComputedTextCard.ts # textList / coverWall 卡片信息区高度纯计算
│   ├── createImageSizeWorker.ts  # 图片尺寸 Web Worker 通信封装
│   ├── createManualFetch.ts      # 手动 fetch 封装（AbortController 管理）
│   ├── createNovelLoader.ts      # 小说内容加载器
│   ├── createNovelSearch.ts      # 小说正文搜索匹配（字符索引）
│   ├── createNovelTextLayout.ts  # 小说正文纯文本布局（pretext）
│   ├── createNovelVirtualLayout.ts # 小说正文虚拟化窗口管理
│   ├── createSentinelPaginator.ts # 哨兵元素无限加载分页器
│   ├── imageSize.worker.ts       # Web Worker 图片尺寸计算（替代旧的 masonryWorker）
│   ├── isPretextSupported.ts     # pretext 运行环境检测
│   ├── measureText.ts            # 文本测量工具
│   ├── novelTextLayoutCache.ts   # 小说布局结果 LRU 缓存
│   ├── types.ts                 # 布局类型定义
│   ├── useContainerWidth.ts      # 容器宽度响应式 Hook
│   └── useViewportLazy.ts        # 视口可见性 Hook
├── services/           # 服务封装
│   ├── backGestureService.ts # Android 返回手势动画服务
│   ├── imageHostService.ts # 自定义图片托管服务
│   └── updateService.ts   # 应用更新检查服务
└── utils/              # 工具函数
    ├── createDedupedRequest.ts # 去重请求工具
    ├── html.ts               # HTML 处理工具
    ├── imageLoader.ts        # 图片加载与缓存（LRU、预加载、CDN URL 构建）
    ├── novelBlocks.ts        # 小说段落解析工具
    ├── novelImageDimensions.ts # 小说内嵌图片尺寸提取
    ├── r18Filter.ts          # R18/R18G 内容过滤
    ├── scrollToTop.ts        # 回顶工具函数
    ├── secureStorage.ts      # refresh_token 安全存储（capacitor-secure-storage-plugin）
    └── themeApplier.ts       # 主题应用工具（同步 Fluent tokens）
```

## 关键设计决策

### API 客户端双模式

- **Web 模式** (`fetch`): 通过 Vite dev server 代理路径 `/pixiv-api/`、`/pixiv-img/`、`/pixiv-oauth/` 访问 Pixiv，避开 CORS。生产环境默认不走代理（直接使用 CapacitorHttp）。
- **Native 模式** (`CapacitorHttp`): 直接 HTTPS 访问 `app-api.pixiv.net`，Android WebView 中通过 `MainActivity.java` 拦截 `/pixiv-img/` 请求并注入 Referer 头。
- **401 防死循环**: `isRetryingAfter401` 标志防止 refresh 失败 → logout 清空 token → 重试 → 再次 401 的无限循环。

### Android 原生增强

- **返回键处理**: Android 返回键通过 `@capacitor/app` 的 `CapApp.addListener("backButton", ...)` 统一处理：关闭查看器/设置、非根路径执行 `navigate(-1)`、根路径双击退出应用。
- **图片代理**: `MainActivity.java` 中 `shouldInterceptRequest` 拦截所有 `/pixiv-img/` 请求，代理到 `i.pximg.net` 并注入正确的 Referer 和 User-Agent 头。
- **原生桥接**: `src/native/` 目录包含 Android 原生通信模块：`AuthPlugin.ts`（原生认证插件）、`ImageCache.ts`（原生图片缓存）、`PictelioHttp.ts`（原生 HTTP 客户端封装）。
- **插件注册**: 自定义插件在 `MainActivity.java` 的 `onCreate` 中通过 `registerPlugin()` 注册，**必须在 `super.onCreate(savedInstanceState)` 之前**。

### 安全存储

- 使用 `capacitor-secure-storage-plugin` 存储 `refresh_token`（Android Keystore 加密）。
- 首次启动时自动从旧的 `@capacitor/preferences` 迁移 token（一次性）。
- 登录凭证不存储在 Web Storage 或内存中可被轻易读取的位置。

### 虚拟滚动与布局

- **Masonry 瀑布流**: 通过 `createImageSizeWorker.ts` + `imageSize.worker.ts`（Web Worker）异步计算图片尺寸，驱动瀑布流布局，避免阻塞主线程。
- **虚拟滚动**: `createManualFetch.ts` + 虚拟滚动计算可见窗口（startIndex/endIndex），仅渲染视口内 + overscan 范围的卡片。
- **三种布局模式**: 瀑布流（2 列）、单列（1 列）、网格（3 列），可切换并持久化。

### 年龄限制与内容过滤

- 首次启动显示年龄确认页（`/age-confirmation`），未确认前不进入登录流程。
- R18/R18G 内容通过 `r18Filter.ts` 过滤，开关存储在 `Preferences` 中。
- R18 内容在卡片上显示模糊遮罩；R18G 内容显示额外的显式内容警告遮罩。
- `reportStore` 和 `blockStore` 管理用户举报和屏蔽列表，持久化到 `Preferences`。

### 响铃检查

- `updateService.ts` 通过 GitHub API 检查最新 release 版本。
- 通过 `/github-api` 代理直连 GitHub（不经过 Pixiv 代理，避免被拦截）。
- 开发者可通过设置面板开关控制自动检查。

## Fluent Design 规范

本项目**强制**遵循 Microsoft Fluent Design System 2。以下规则无例外。

### 设计令牌

- 颜色、间距、圆角、阴影、字体大小**必须**使用 `src/styles/tokens.css` 中定义的 CSS 变量
- **禁止**硬编码具体值（`#xxx`、`rgb()`、`px`/`rem` 字面量）
- 确需新增令牌时，来源必须是 [Fluent 2 官方设计令牌](https://fluent2.microsoft.design/design-tokens)，在 `src/styles/tokens.css` 的 `:root` 中声明后使用
- UnoCSS shortcuts 统一在 `uno.config.ts` 中定义
- `@fluentui/web-components` 的 `setTheme()` 在 `main.tsx` 中根据 `<html>` 的 `dark` class 实时同步亮/暗主题

### 动画与动效

**缓动曲线（只允许以下 4 种）：**

| 曲线                          | 用途                 |
| ----------------------------- | -------------------- |
| `cubic-bezier(0,0,0,1)`       | exit / decelerate    |
| `cubic-bezier(0.33,0,0.67,1)` | standard             |
| `cubic-bezier(0.33,0,0,1)`    | enter / accelerate   |
| `linear`                      | 仅限 loading spinner |

- **禁止** `ease`、`ease-in`、`ease-out`、`ease-in-out`

**动画时长（只允许以下 5 种）：**

| 时长  | 名称   | 场景                          |
| ----- | ------ | ----------------------------- |
| 100ms | micro  | 微交互（ripple、checkbox）    |
| 150ms | fast   | 小过渡（tooltip、hover 反馈） |
| 200ms | normal | 常规过渡（页面元素进出）      |
| 300ms | gentle | 柔缓过渡（弹窗、面板）        |
| 500ms | slow   | 大幅过渡（页面切换、展开）    |

- 页面过渡统一使用 `PageTransition.tsx`
- 组件内动效优先使用 Fluent motion tokens（`--durationNormal`、`--curveEasyEase` 等，定义在 `src/styles/tokens.css`）

### 交互状态

- 每个可交互元素必须覆盖以下三种状态：
  - **hover**：视觉反馈（颜色变化或轻微提升）
  - **active**（pressed）：`scale(0.98)` 或 Fluent pressed 颜色加深
  - **focus-visible**：`outline` + `outline-offset`，**禁止**裸 `:focus` 样式
- 触控目标最小 **40×40px**（移动端优先）

### 禁止清单

| 禁止                                      | 必须使用                                             |
| ----------------------------------------- | ---------------------------------------------------- |
| 硬编码颜色值（`#xxx`、`rgb()`）           | `var(--colorXxx)`                                    |
| 硬编码圆角值（`8px`、`0.5rem`）           | `var(--borderRadiusXxx)`                             |
| 硬编码阴影值                              | `var(--elevationN)`                                  |
| 非 Fluent 缓动曲线                        | Fluent 标准曲线（见上表）                            |
| 非标准动画时长                            | Fluent duration（见上表）                            |
| 自定义字体大小（`15px`、`1.2rem`）        | `var(--fontSizeBaseXxx)` 或 `var(--fontSizeHeroXxx)` |
| 裸 `:focus` 伪类                          | `:focus-visible`                                     |
| `[color:var(--colorXxx)]` 形式            | `text-[var(--colorXxx)]`                             |
| `[background-color:var(--colorXxx)]` 形式 | `bg-[var(--colorXxx)]`                               |
| `duration-200` / `duration-300` 等        | `duration-[var(--durationNormal)]` 等                |
| `bg-black` / `text-white` 硬编码          | 使用 overlay token（`--colorOverlay*`）              |

## 约定

- **TypeScript strict**：`strict: true`，启用 `noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch`、`verbatimModuleSyntax`。target: ESNext, moduleResolution: bundler
- **组件范式**：SolidJS 函数组件，用 `Component<Props>` 标注类型，默认导出
- **状态管理**：`createSignal` / `createStore` 直接在 store 模块顶层定义并导出，不额外封装
- **路径别名**：`@/` 映射到 `src/`（tsconfig paths + Vite alias）
- **样式与交互**：见「Fluent Design 规范」章节，不得例外
- **注释**：中文注释为主，API 层和类型定义处偏英文
- **文件命名**：组件 PascalCase、工具/API/primitives camelCase
- **Lint**: 使用 `vite-plus` 内置 oxlint，配置在 `vite.config.ts` 的 `lint` 字段
  - 插件: `typescript`, `unicorn`, `oxc`
  - categories: correctness=error, suspicious=warn, perf=warn, pedantic/style/restriction/nursery=off
  - 忽略: `dist/`, `android/`, `node_modules/`, `.codegraph/`, 声明文件
  - 测试文件额外启用 vitest 插件，禁用 `no-console` 和 `require-mock-type-parameters`
- **格式化**: 使用 `vite-plus` 内置 oxfmt，配置在 `vite.config.ts` 的 `fmt` 字段
- **Android**：
  - **平台要求**：`minSdkVersion = 30`（Android 11.0），WebView ≥ **85**（2020-08 Chrome/WebView）。详见 `docs/platform-compatibility.md`。
  - `minSdkVersion = 30` 在 `variables.gradle` 中定义；低于 Android 11 的设备安装时由系统直接拒绝。
  - 启动时 `MainActivity` 通过 `WebView.getCurrentWebViewPackage()` 检测 WebView 主版本号，低于 85 则加载 `res/raw/upgrade.html` 提示用户升级 WebView，不初始化 Capacitor / JS 环境。
  - 项目位于 `packages/app/android/`，源码与关键配置纳入版本控制
  - `android/.gitignore` 负责忽略构建产物（`.gradle/`、`build/` 等）和 Capacitor 自动生成文件（`capacitor.config.json`、`capacitor.settings.gradle`、`app/capacitor.build.gradle`、复制的 `app/src/main/assets/public` 等）
  - 自定义 Capacitor 插件在 `MainActivity.java` 中通过 `registerPlugin()` 注册（**必须在 `super.onCreate()` 之前**）
  - 构建 APK: `pnpm build:android`（Debug）或 `pnpm build:android:release`（Release）
  - `app/build.gradle` 中 versionCode 和 versionName 通过 `scripts/sync-android-version.mjs` 从 `package.json` 同步
  - AGP 9.2.1 + Gradle 9.6.1 + JDK 21 版本锁定决策：Gradle 9.6.1 官方测试覆盖 AGP 9.0~9.3.0-alpha06，AGP 9.2.1 在此范围内。JDK 21 完整支持。详见 `android/build.gradle` 顶部注释。
- **Android 发布签名**：Release 构建使用 `android/app/pictelio-release.keystore`，密码通过环境变量 `PICTELIO_KEYSTORE_PASSWORD` 与 `PICTELIO_KEY_PASSWORD` 注入。Keystore 禁止提交到 git。详细步骤见 `docs/release-signing.md`。
- **Gradle 任务图校验**: `build.gradle` 通过 `gradle.taskGraph.whenReady` 仅在 Release 任务触发时检查签名凭据，Debug 构建不需要环境变量。
- **代码探索**：使用 CodeGraph 作为默认代码理解工具，普通搜索工具仅作 fallback
- **代理配置**：开发时自动读取 `https_proxy` / `HTTPS_PROXY` / `http_proxy` / `HTTP_PROXY` 环境变量，回退到 `http://127.0.0.1:10808`
- **PWA**: 通过 `vite-plugin-pwa` 生成 Service Worker，缓存策略: Pixiv 图片 CacheFirst（30 天/500 条），其余默认 Precaching
- **Node 版本**: 20.19+，包管理器 pnpm 11.9.0（`devEngines` 强制校验）

## 测试

- **框架**: Vitest 4.1，通过 `vite-plus` 的 `vp test` 运行
- **环境**: `node`、`browser`（Playwright provider，配置在 `vitest.config.ts`）
- **测试文件位置**:
  - `tests/unit/**/*.test.{ts,tsx}` — 单元测试，按源目录结构组织
  - `tests/browser/**/*.browser.test.{ts,tsx}` — 浏览器环境组件测试
  - `tests/e2e/specs/` — 端到端测试
  - `src/**/*.test.ts` — 辅助函数/内部模块的就近测试
- **单元测试覆盖**:
  - `api/` — 10 测试文件（auth、client、client401Retry、client429Retry、comment、illust、novel、ssrfWhitelistContract、user、userAgent）
  - `components/` — ThemeSelector
  - `primitives/` — 5 文件（createComputedTextCard、createManualFetch、createNovelSearch、createNovelTextLayout、novelTextLayoutCache）
  - `routes/` — NovelDetail
  - `services/` — 3 文件（backGestureService、imageHostService、updateService）
  - `stores/` — 16 文件（覆盖所有 store，含 imageCacheSettings）
  - `utils/` — 8 文件（含 `.native.test.ts`）
  - 根测试 — router.test.ts、startup.test.ts
- **浏览器测试**: 22 个文件覆盖 IllustDetail、NovelCard、NovelDetail、SeriesSheet、VirtualFeed 等组件
- **E2E 测试**: 10 个 spec 覆盖 Feed、Login、Illust Detail、Novel Detail、Bookmarks、Cache 等关键路径
- `passWithNoTests: true` — 允许空测试文件不报错

## 部署

- **Website**: GitHub Actions 自动部署 VitePress 站点到 GitHub Pages（`.github/workflows/deploy.yml`）
  - 触发: push 到 `main` 分支且改动 `packages/website/**` 或 workflow 文件
  - 构建: `pnpm --filter pictelio-website build`
  - 复制 `version.json` 到构建产物
- **Android APK**: 本地构建，可选通过 `pnpm release:github` 发布到 GitHub Releases
- **本地预览**: `pnpm deploy` 从 `packages/website/` 复制 landing 页面到 `_site/`
- **Release 流程**: 详见 `docs/release-checklist.md`，包含版本号更新、构建、签名、发布到 GitHub Releases 等步骤

## 注意事项

- **代码智能规范**：涉及代码理解、调用链追踪、影响分析时，默认优先使用 CodeGraph，详见上方「代码智能规范」章节。
- **Web API / 浏览器兼容性查询优先用 MCP MDN**：需要查 HTML、CSS、JS 标准 API 语法或浏览器兼容性时，优先使用 `mcp__mdn__*` 系列工具（`get-doc` / `search` / `get-compat`），这是 MDN 官方提供的 MCP 接口。
- **路由数据规则**：路由级异步数据统一通过 `@tanstack/solid-router` 的 `loader` 获取；组件内局部异步仍使用 `createSignal` + `createEffect` + 手动 fetch（带 AbortController）。`createResource` 不用于路由组件。

## 任务完成前自检

- **代码理解优先性**：本次任务若涉及代码结构、调用链、影响范围分析，是否优先使用了 CodeGraph 工具？
- **Fallback 合理性**：若未使用 CodeGraph，是否属于已列出的允许例外之一（CodeGraph 不可用、已知路径文件读取、非代码文本搜索、简单文件列举、小范围精准定位、中文语义搜索）？
- **索引健康**：如果 CodeGraph 返回结果异常（缺失符号、调用链断裂），是否检查了索引状态（`codegraph_status`）并考虑重建索引？

## Notes

- 项目必须符合 Microsoft Fluent Design 风格
- 目录名为 `pixivizer`，但项目名/包名为 Pictelio
- 代码中图片 CDN 通过 `/pixiv-img/` 代理路径访问 `i.pximg.net`，非直连
- 不要在 HTML/CSS/JS 中硬编码 Pixiv CDN URL（`i.pximg.net`、`app-api.pixiv.net`），应使用代理路径
- 路由定义在 `src/router.tsx` 中独立管理，与 `App.tsx` 分离
- `src/startup.ts` 编排启动流程（年龄确认、主题初始化、auth 恢复），在 React 树渲染前执行
- `src/native/` 目录下的原生桥接文件仅 Android 构建时生效，在 Web 开发环境中不加载
