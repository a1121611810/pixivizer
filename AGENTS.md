# Pictelio

基于 SolidJS 的 Pixiv 第三方客户端，通过 Capacitor 打包为 Android 原生应用。项目名为 **Pictelio**（目录名为 pixivizer）。

## 项目概览

- **技术栈**: SolidJS 1.9 + TypeScript 6.0 (strict) + Vite 8.0 + UnoCSS 66.7 + Capacitor 8.4；小说正文布局使用 `@chenglou/pretext`
- **Monorepo**: pnpm workspace，含两个子包：`pictelio-app`（SPA 主体）和 `pictelio-website`（VitePress 落地页）
- **入口**: `packages/app/src/main.tsx` → `packages/app/src/App.tsx`（Solid Router）
- **路由**: `/recommended` `/following` `/illust/:id` `/novel/:id` `/novel/bookmarks` `/bookmarks` `/me` `/user/:id` `/user/:id/illusts` `/login` `/age-confirmation` `/about` `/debug`
- **设计系统**: **强制** Microsoft Fluent Design System 2 — 所有视觉和交互决策基于 Fluent 令牌和规范（详见「Fluent Design 规范」章节）
- **Pixiv API**: 自建 HTTP 客户端 (`src/api/client.ts`)，双模式（Web: fetch + Vite 代理 / Native: CapacitorHttp 直连），iOS OAuth 凭证策略（Android 已弃用），401 自动刷新 + 防死循环
- **CSS 架构**: 分层加载 `reset.css` → `tokens.css` → `base.css` → `virtual:uno.css`；PostCSS `postcss-pxtorem` 自动转换字号为 rem；Fluent Web Components 主题同步
- **构建工具**: 使用 `vite-plus`（内部封装 Vite + oxlint + oxfmt + vitest），通过 `vp` CLI 统一执行 dev/build/check/test/lint/fmt

## 代码智能规范（Code Intelligence）

本项目使用 [CodeGraph](https://github.com/colbymchenry/codegraph) 作为默认代码理解工具。它基于本地预索引的代码知识图谱，提供符号定位、调用链追踪、影响分析、框架路由识别等能力，不只是「代码搜索」。

### 默认原则

- **任何涉及"理解代码结构、定位符号、追踪调用链、分析影响范围"的任务，默认优先使用 `mcp__codegraph__*` 系列工具。**
- CodeGraph 是默认工具，不是搜索失败后的兜底工具。
- 项目已通过 `reasonix.toml` 配置 `--path`，调用 CodeGraph 工具时**不要**手动传 `projectPath`。

### 典型使用场景

| 场景                            | 首选工具                                                                | 说明/示例                             |
| ------------------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| 接到功能或 Bug 任务，不确定入口 | `mcp__codegraph__codegraph_context`                                     | "登录态自动恢复逻辑从哪里开始？"      |
| 追踪函数/组件调用关系           | `mcp__codegraph__codegraph_trace` / `mcp__codegraph__codegraph_explore` | `handleLogin` 被谁调用、又调用了谁    |
| 路由到处理函数的映射            | `mcp__codegraph__codegraph_explore`                                     | `/illust/:id` 路由对应哪个组件        |
| 按名称定位符号                  | `mcp__codegraph__codegraph_search`                                      | 搜索 `useAuthStore`、`ImageCard`      |
| 读取特定符号的源码              | `mcp__codegraph__codegraph_node`                                        | 获取某个函数/类的完整源码及行号       |
| 针对任务构建上下文              | `mcp__codegraph__codegraph_context`                                     | 让 CodeGraph 判断与任务相关的代码区域 |

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
│   ├── illust.ts       # 作品 API：推荐、关注、下一页、详情、收藏、ugoira 元数据、关注/取消关注用户
│   ├── user.ts         # 用户 API：详情、关注列表、粉丝列表
│   └── types.ts        # 类型定义（PixivIllust、PixivUser、ApiError、PixivAuthResponse 等）
├── styles/             # CSS 分层（main.tsx 中按序导入）
│   ├── reset.css       # modern-css-reset 定制
│   ├── tokens.css      # Fluent Design System 2 设计令牌（颜色、间距、圆角、阴影、字体、动画曲线/时长）
│   └── base.css        # 根样式、滚动条、选中色、动画关键帧、reduced-motion
├── types/              # 环境类型声明（spark-md5、postcss-pxtorem、env）
├── stores/             # SolidJS 响应式状态（createSignal + createStore 导出）
│   ├── authStore.ts    # 登录状态（isLoggedIn、user、token、自动恢复、onUnauthorized 处理器）
│   ├── feedStore.ts    # Feed 数据（illusts、分页、按 Tab 缓存、滚动位置）
│   ├── uiStore.ts      # UI 状态（当前 Tab、主题、布局模式、R18 开关、设置面板、自动检查更新等）
│   ├── bookmarkStore.ts# 收藏状态管理
│   ├── userStore.ts    # 用户状态
│   ├── userIllustsStore.ts # 用户作品列表状态
│   ├── reportStore.ts  # 已举报作品 ID 持久化
│   ├── blockStore.ts   # 已屏蔽用户 ID 持久化
│   ├── readerSettingsStore.ts # 小说阅读设置（字号、字重、字体、行高、颜色）
│   └── __tests__/      # Store 单元测试（uiStore、feedStore、reportStore、blockStore）
├── routes/             # 页面组件（lazy loaded）
│   ├── Login.tsx              # 登录页（refresh_token / 用户名密码）
│   ├── AgeConfirmation.tsx    # 年龄确认页
│   ├── TabFeedPage.tsx        # Tab 容器（recommended / follow），委托 Feed 渲染
│   ├── Feed.tsx               # 瀑布流内容（虚拟滚动、下拉刷新、无限加载、哨兵分页）
│   ├── IllustDetail.tsx       # 作品详情（大图查看、多页、动图播放、楼梯式浏览）
│   ├── NovelDetail.tsx        # 小说详情（正文虚拟化、搜索高亮、阅读进度）
│   ├── NovelFeedPage.tsx      # 小说 Feed 页
│   ├── NovelBookmarks.tsx     # 小说收藏页
│   ├── Bookmarks.tsx          # 收藏页
│   ├── PersonalCenter.tsx     # 个人中心 / 用户主页（根据路由参数区分）
│   ├── UserIllusts.tsx        # 用户作品列表页
│   ├── About.tsx              # 关于页
│   └── DebugImage.tsx         # 图片调试页
├── components/         # 可复用 UI 组件
│   ├── ImageCard.tsx            # Feed 卡片（含收藏/关注操作、R18 模糊、R18G 遮罩）
│   ├── LazyImageCard.tsx        # 轻量虚拟化卡片包裹（进入视口才渲染 ImageCard）
│   ├── LazyDetailImage.tsx      # 详情页懒加载图片包装
│   ├── PixivImage.tsx           # 图片组件（CDN 代理 + 尺寸优化 + 渐进加载）
│   ├── ImageViewer.tsx          # 全屏图片查看器（缩放/拖拽/滑动翻页）
│   ├── UgoiraViewer.tsx         # 动图（Ugoira）播放器（JSZip 解压帧）
│   ├── VirtualFeed.tsx          # 虚拟滚动 Feed 容器
│   ├── LayoutEngine.tsx         # 布局引擎（瀑布流/单列/网格切换、Masonry 计算）
│   ├── NavBar.tsx               # 顶部导航栏（自动隐藏）
│   ├── SettingsSheet.tsx        # 设置面板
│   ├── ReportSheet.tsx          # 举报面板
│   ├── BlocklistSheet.tsx       # 屏蔽列表面板
│   ├── AgeGate.tsx              # 年龄门槛组件
│   ├── SkeletonCard.tsx         # 骨架屏占位卡片
│   ├── PullIndicator.tsx        # 下拉刷新指示器
│   ├── LoadingSpinner.tsx       # 加载动画
│   ├── PageTransition.tsx       # 页面过渡动画
│   ├── HeartBurstEffect.tsx     # 收藏爱心爆发效果
│   ├── UserAvatar.tsx           # 用户头像组件
│   ├── NovelVirtualFeed.tsx     # 小说虚拟滚动 Feed（textList / coverWall）
│   ├── NovelTextListCard.tsx    # 小说文本列表卡片（纯渲染，无测量）
│   ├── NovelCard.tsx            # 小说卡片
│   ├── NovelSearchBar.tsx       # 小说搜索栏
│   ├── ReaderSettingsSheet.tsx  # 阅读设置面板
│   └── ui/FluentIcon.tsx        # Fluent 图标封装
├── primitives/         # 底层抽象（无 UI 的逻辑单元）
│   ├── createVirtualScroll.ts   # 虚拟滚动核心（基于 MasonryLayout 计算可见窗口）
│   ├── createSentinelPaginator.ts # 哨兵元素无限加载分页器
│   ├── computeMasonryLayout.ts  # 瀑布流布局计算
│   ├── masonryWorker.ts         # Web Worker 布局计算（通过 Comlink 通信）
│   ├── createNovelTextLayout.ts # 小说正文纯文本布局（pretext）
│   ├── createNovelVirtualLayout.ts # 小说正文虚拟化窗口管理
│   ├── createComputedTextCard.ts # textList / coverWall 卡片信息区高度纯计算
│   ├── novelTextLayoutCache.ts  # 小说布局结果 LRU 缓存
│   ├── createNovelSearch.ts     # 小说正文搜索匹配（字符索引）
│   ├── isPretextSupported.ts    # pretext 运行环境检测
│   ├── useContainerWidth.ts     # 容器宽度响应式 Hook
│   ├── useViewportLazy.ts       # 视口可见性 Hook
│   └── types.ts                 # 布局类型定义
├── services/           # 服务封装
│   ├── pixiv.ts            # PixivClient 单例（@book000/pixivts，辅助用途）
│   └── updateService.ts   # 应用更新检查服务
└── utils/              # 工具函数
    ├── imageLoader.ts        # 图片加载与缓存（LRU、预加载、CDN URL 构建）
    ├── imageLoader.native.test.ts # 图片加载器原生测试
    ├── secureStorage.ts      # refresh_token 安全存储（capacitor-secure-storage-plugin）
    ├── r18Filter.ts          # R18/R18G 内容过滤
    ├── html.ts               # HTML 处理工具
    └── __tests__/html.test.ts# HTML 工具测试
```

## 关键设计决策

### API 客户端双模式

- **Web 模式** (`fetch`): 通过 Vite dev server 代理路径 `/pixiv-api/`、`/pixiv-img/`、`/pixiv-oauth/` 访问 Pixiv，避开 CORS。生产环境默认不走代理（直接使用 CapacitorHttp）。
- **Native 模式** (`CapacitorHttp`): 直接 HTTPS 访问 `app-api.pixiv.net`，Android WebView 中通过 `MainActivity.java` 拦截 `/pixiv-img/` 请求并注入 Referer 头。
- **401 防死循环**: `isRetryingAfter401` 标志防止 refresh 失败 → logout 清空 token → 重试 → 再次 401 的无限循环。

### Android 原生增强

- **返回键处理**: Android 返回键通过 `@capacitor/app` 的 `CapApp.addListener("backButton", ...)` 统一处理：关闭查看器/设置、非根路径执行 `navigate(-1)`、根路径双击退出应用。
- **图片代理**: `MainActivity.java` 中 `shouldInterceptRequest` 拦截所有 `/pixiv-img/` 请求，代理到 `i.pximg.net` 并注入正确的 Referer 和 User-Agent 头。
- **插件注册**: 自定义插件在 `MainActivity.java` 的 `onCreate` 中通过 `registerPlugin()` 注册，**必须在 `super.onCreate(savedInstanceState)` 之前**。

### 安全存储

- 使用 `capacitor-secure-storage-plugin` 存储 `refresh_token`（Android Keystore 加密）。
- 首次启动时自动从旧的 `@capacitor/preferences` 迁移 token（一次性）。
- 登录凭证不存储在 Web Storage 或内存中可被轻易读取的位置。

### 虚拟滚动与布局

- **Masonry 瀑布流**: `computeMasonryLayout.ts` 计算布局，支持通过 Web Worker（`masonryWorker.ts` + Comlink）异步计算，避免阻塞主线程。
- **虚拟滚动**: `createVirtualScroll.ts` 根据 MasonryLayout 和滚动位置计算可见窗口（startIndex/endIndex），仅渲染视口内 + overscan 范围的卡片。
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
- **环境**: `node`（配置在 `vitest.config.ts`）
- **测试文件位置**: `tests/unit/**/*.test.{ts,tsx}`（配置在 `vitest.config.ts`），辅助函数/内部模块的就近测试可放在 `src/**/*.test.ts`
- **现有测试**:
  - `uiStore.test.ts` — UI 状态管理测试
  - `feedStore.test.ts` — Feed 数据状态测试
  - `reportStore.test.ts` — 举报状态测试
  - `blockStore.test.ts` — 屏蔽状态测试
  - `html.test.ts` — HTML 处理工具测试
  - `imageLoader.native.test.ts` — 图片加载器原生环境测试
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
- **SolidJS Suspense 规则**：路由组件（位于 `<Suspense>` 嵌套树内的组件）**禁止**使用 `createResource`。改用 `createSignal` + `createEffect` + 手动 fetch（带 AbortController）。`createResource` 仅限叶子组件或独立子树中使用。App.tsx 的 `<Suspense>` 包裹了整个路由树，任何路由级组件使用 `createResource` 都会触发整页切换为 fallback。

## 任务完成前自检

- **代码理解优先性**：本次任务若涉及代码结构、调用链、影响范围分析，是否优先使用了 `mcp__codegraph__*` 工具？
- **Fallback 合理性**：若未使用 CodeGraph，是否属于已列出的允许例外（CodeGraph 不可用、已知路径文件读取、非代码文本搜索、简单文件列举）？

## Notes

- 项目必须符合 Microsoft Fluent Design 风格
- 目录名为 `pixivizer`，但项目名/包名为 Pictelio
- 代码中图片 CDN 通过 `/pixiv-img/` 代理路径访问 `i.pximg.net`，非直连
- 不要在 HTML/CSS/JS 中硬编码 Pixiv CDN URL（`i.pximg.net`、`app-api.pixiv.net`），应使用代理路径
