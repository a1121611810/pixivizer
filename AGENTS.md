# Pixivizer

基于 SolidJS 的 Pixiv 第三方客户端，通过 Capacitor 打包为 Android 原生应用。

## 项目概览

- **技术栈**: SolidJS + TypeScript (strict) + Vite + UnoCSS + Capacitor
- **入口**: `src/main.tsx` → `src/App.tsx`（Solid Router，路由 `/recommended` `/following` `/illust/:id` `/bookmarks` `/login`）
- **设计系统**: **强制** Microsoft Fluent Design System 2 — 所有视觉和交互决策基于 Fluent 令牌和规范（详见「Fluent Design 规范」章节）
- **Pixiv API**: 自建 HTTP 客户端 (`src/api/client.ts`)，双模式（Web: fetch + Vite 代理 / Native: CapacitorHttp 直连），iOS OAuth 凭证策略（Android 已弃用）
- **CSS 架构**: 分层加载 `reset.css` → `tokens.css` → `base.css` → `virtual:uno.css`；PostCSS `postcss-pxtorem` 自动转换字号为 rem

## 代码智能规范（Code Intelligence）

本项目使用 [CodeGraph](https://github.com/colbymchenry/codegraph) 作为默认代码理解工具。它基于本地预索引的代码知识图谱，提供符号定位、调用链追踪、影响分析、框架路由识别等能力，不只是「代码搜索」。

### 默认原则

- **任何涉及“理解代码结构、定位符号、追踪调用链、分析影响范围”的任务，默认优先使用 `mcp__codegraph__*` 系列工具。**
- CodeGraph 是默认工具，不是搜索失败后的兜底工具。
- 项目已通过 `reasonix.toml` 配置 `--path`，调用 CodeGraph 工具时**不要**手动传 `projectPath`。

### 典型使用场景

| 场景 | 首选工具 | 说明/示例 |
|---|---|---|
| 接到功能或 Bug 任务，不确定入口 | `mcp__codegraph__codegraph_context` | “登录态自动恢复逻辑从哪里开始？” |
| 追踪函数/组件调用关系 | `mcp__codegraph__codegraph_trace` / `mcp__codegraph__codegraph_explore` | `handleLogin` 被谁调用、又调用了谁 |
| 路由到处理函数的映射 | `mcp__codegraph__codegraph_explore` | `/illust/:id` 路由对应哪个组件 |
| 按名称定位符号 | `mcp__codegraph__codegraph_search` | 搜索 `useAuthStore`、`ImageCard` |
| 读取特定符号的源码 | `mcp__codegraph__codegraph_node` | 获取某个函数/类的完整源码及行号 |
| 针对任务构建上下文 | `mcp__codegraph__codegraph_context` | 让 CodeGraph 判断与任务相关的代码区域 |

### 禁止的默认行为

- 未经 CodeGraph 尝试，直接用 `Grep` / `Glob` / `Bash find` 进行大规模代码探索。
- 用 `Grep` 手动拼凑调用链（应使用 `codegraph_trace`）。
- 用 `Read` 顺序打开多个文件来“摸索”架构（应先用 `codegraph_context` / `codegraph_explore`）。

### 允许的降级方案

以下情况允许优先使用普通工具：

1. **CodeGraph 不可用**：`.codegraph/` 索引未生成、返回空结果、或文件类型未被 CodeGraph 支持。
2. **已知路径的完整文件读取**：任务已明确需要读取 `src/api/client.ts` 等具体文件，直接用 `Read` 更高效。
3. **非代码文本搜索**：搜索日志、配置文件、依赖版本、文档等（如查 `package.json` 中的某个字段）。
4. **简单列举文件**：使用 `Glob` 列出符合明确模式的文件（如 `src/components/**/*.tsx`）。

## 命令

| 命令                    | 说明                                          |
| ----------------------- | --------------------------------------------- |
| `pnpm dev`              | 启动 Vite 开发服务器                          |
| `pnpm build`            | TypeScript 检查 + Vite 构建到 `dist/`         |
| `pnpm check`            | 仅 TypeScript 类型检查                        |
| `pnpm preview`          | 预览生产构建                                  |
| `pnpm build:android`    | 构建 Web + Capacitor 同步 + Gradle 编译 APK   |
| `pnpm cap:sync`         | 同步 Web 产物和 Capacitor 配置到 Android 项目 |
| `pnpm cap:open:android` | 在 Android Studio 中打开 `android/` 项目      |

## 架构

```
src/
├── api/            # Pixiv API 层
│   ├── auth.ts     # OAuth 认证（iOS 凭证、spark-md5 哈希、password/refresh_token）
│   ├── client.ts   # HTTP 客户端（PixivApiClient 接口、Web fetch / Native CapacitorHttp 双模式、URL 重写、401 自动刷新防死循环）
│   ├── illust.ts   # 作品 API：推荐、关注、下一页、详情、收藏、ugoira 元数据
│   └── types.ts    # 类型定义（PixivIllust、PixivUser、ApiError、PixivAuthResponse 等）
├── styles/         # CSS 分层（main.tsx 中按序导入）
│   ├── reset.css   # modern-css-reset 定制
│   ├── tokens.css  # Fluent Design System 2 设计令牌
│   └── base.css    # 根样式、滚动条、选中色、动画关键帧、reduced-motion
├── types/          # 环境类型声明
│   └── spark-md5.d.ts
├── stores/         # SolidJS 响应式状态（createSignal 导出）
│   ├── authStore.ts   # 登录状态（isLoggedIn、user、token、自动恢复、onUnauthorized 处理器）
│   ├── feedStore.ts   # Feed 数据（illusts、分页、按 Tab 缓存、滚动位置）
│   └── uiStore.ts     # UI 状态（当前 Tab、设置面板开关）
├── routes/         # 页面组件
│   ├── Login.tsx          # 登录页（refresh_token / 用户名密码）
│   ├── TabFeedPage.tsx    # Tab 容器（recommended / follow），委托 Feed 渲染
│   ├── Feed.tsx           # 瀑布流内容（虚拟滚动、下拉刷新、无限加载）
│   ├── IllustDetail.tsx   # 作品详情（大图查看、多页、动图播放）
│   ├── Bookmarks.tsx      # 收藏页
│   └── DebugImage.tsx     # 图片调试页
├── components/     # 可复用 UI 组件
│   ├── ImageCard.tsx       # Feed 卡片
│   ├── LazyImageCard.tsx   # 轻量虚拟化卡片包裹（进入视口才渲染 ImageCard）
│   ├── PixivImage.tsx      # 图片组件（CDN + 尺寸优化）
│   ├── ImageViewer.tsx     # 全屏图片查看器（缩放/拖拽/滑动翻页）
│   ├── UgoiraViewer.tsx    # 动图（Ugoira）播放器
│   ├── VirtualFeed.tsx     # 虚拟滚动 Feed
│   ├── NavBar.tsx          # 顶部导航栏
│   ├── SettingsSheet.tsx   # 设置面板
│   ├── SkeletonCard.tsx    # 骨架屏占位卡片
│   ├── PullIndicator.tsx   # 下拉刷新指示器
│   ├── LoadingSpinner.tsx  # 加载动画
│   └── PageTransition.tsx  # 页面过渡动画
├── services/       # 服务封装
│   └── pixiv.ts    # PixivClient 单例（@book000/pixivts，辅助用途）
└── utils/
    └── imageLoader.ts  # 图片加载与缓存工具
```

## Fluent Design 规范

本项目**强制**遵循 Microsoft Fluent Design System 2。以下规则无例外。

### 设计令牌

- 颜色、间距、圆角、阴影、字体大小**必须**使用 `src/styles/tokens.css` 中定义的 CSS 变量
- **禁止**硬编码具体值（`#xxx`、`rgb()`、`px`/`rem` 字面量）
- 确需新增令牌时，来源必须是 [Fluent 2 官方设计令牌](https://fluent2.microsoft.design/design-tokens)，在 `src/styles/tokens.css` 的 `:root` 中声明后使用
- UnoCSS shortcuts 统一在 `uno.config.ts` 中定义

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

- **TypeScript strict**：`strict: true`，启用 `noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch`、`verbatimModuleSyntax`
- **组件范式**：SolidJS 函数组件，用 `Component<Props>` 标注类型，默认导出
- **状态管理**：`createSignal` 直接在 store 模块顶层定义并导出，不额外封装
- **路径别名**：`@/` 映射到 `src/`（tsconfig paths + Vite alias）
- **样式与交互**：见「Fluent Design 规范」章节，不得例外
- **注释**：中文注释为主，API 层和类型定义处偏英文
- **文件命名**：组件 PascalCase、工具/API camelCase
- **Android**：`android/` 源码与关键配置纳入版本控制，`android/.gitignore` 负责忽略构建产物（`.gradle/`、`build/` 等）和 Capacitor 自动生成文件（`capacitor.config.json`、`capacitor.settings.gradle`、`app/capacitor.build.gradle`、复制的 `app/src/main/assets/public` 等）。构建 APK 仍需运行 `pnpm build && pnpm cap:sync && cd android && ./gradlew assembleDebug`（或 `pnpm build:android`）。
- **代码探索**：使用 CodeGraph 作为默认代码理解工具，普通搜索工具仅作 fallback

## 注意事项

- **代码智能规范**：涉及代码理解、调用链追踪、影响分析时，默认优先使用 CodeGraph，详见上方「代码智能规范」章节。
- **Web API / 浏览器兼容性查询优先用 MCP MDN**：需要查 HTML、CSS、JS 标准 API 语法或浏览器兼容性时，优先使用 `mcp__mdn__*` 系列工具（`get-doc` / `search` / `get-compat`），这是 MDN 官方提供的 MCP 接口。

## 任务完成前自检

- **代码理解优先性**：本次任务若涉及代码结构、调用链、影响范围分析，是否优先使用了 `mcp__codegraph__*` 工具？
- **Fallback 合理性**：若未使用 CodeGraph，是否属于已列出的允许例外（CodeGraph 不可用、已知路径文件读取、非代码文本搜索、简单文件列举）？
