# Pixiv 第三方 Android 客户端 — 设计文档

> 创建时间：2026-06-19
> 状态：已批准

---

## 1. 概述

基于 Solid.js + Capacitor 构建的 Pixiv 第三方 Android 客户端。面向 Web 前端开发者，以可维护性为首要目标，MVP 聚焦于登录、作品流浏览、图片查看三大核心功能。

---

## 2. 技术栈（已锁定全部最新版本）

| 层级           | 技术                   | 版本                      |
| -------------- | ---------------------- | ------------------------- |
| **前端框架**   | Solid.js               | 1.9.13                    |
| **统一工具链** | Vite+                  | 0.2.1（内置 Vite 8.0.16） |
| **语言**       | TypeScript             | 6.0.3                     |
| **路由**       | @solidjs/router        | 0.16.1                    |
| **原生壳**     | Capacitor              | 8.4.0                     |
| **原生 HTTP**  | @capacitor/http        | 0.0.2                     |
| **持久化存储** | @capacitor/preferences | 8.0.1                     |
| **CSS 方案**   | UnoCSS                 | 66.7.2                    |
| **测试框架**   | Vitest（Vite+ 内置）   | 4.1.9                     |
| **Linter**     | Oxlint（Vite+ 内置）   | 1.70.0                    |
| **格式化**     | Oxfmt（Vite+ 内置）    | —                         |
| **类型检查**   | tsgo（Vite+ 内置）     | —                         |
| **包管理**     | pnpm                   | 11.8.0                    |
| **Solid 集成** | vite-plugin-solid      | 2.11.12                   |

### 兼容性确认

- `vite-plugin-solid@2.11.12` 支持 Vite ^3.0.0 ~ ^8.0.0 ✅，支持 Solid.js ^1.7.2 ✅

---

## 3. 项目目录结构

```
pixivizer/
├── src/
│   ├── main.tsx                 # 入口
│   ├── App.tsx                  # 根组件（路由 + 布局）
│   ├── routes/
│   │   ├── Login.tsx            # 登录页
│   │   ├── Feed.tsx             # 作品流页
│   │   └── IllustDetail.tsx     # 图片详情页
│   ├── components/
│   │   ├── ImageCard.tsx        # 作品卡片
│   │   ├── ImageViewer.tsx      # 图片查看器（缩放+翻页）
│   │   ├── NavBar.tsx           # 底部导航栏
│   │   ├── VirtualFeed.tsx      # 虚拟滚动列表
│   │   └── LoadingSpinner.tsx   # 加载指示器
│   ├── api/
│   │   ├── client.ts            # HTTP 客户端封装
│   │   ├── auth.ts              # 认证 API
│   │   ├── illust.ts            # 作品 API
│   │   └── types.ts             # Pixiv API 类型定义
│   ├── stores/
│   │   ├── authStore.ts         # 认证状态 + token 持久化
│   │   ├── feedStore.ts         # 作品流状态
│   │   └── uiStore.ts           # UI 状态
│   └── utils/
│       ├── imageCache.ts        # 图片缓存
│       └── format.ts            # 格式化工具
├── android/                     # Android 原生项目（Capacitor 生成）
├── capacitor.config.ts
├── vite.config.ts               # Vite+ 配置
├── tsconfig.json
├── package.json
└── uno.config.ts
```

### 设计原则

- **单向数据流**：`api/` → `stores/` → `components/`，各层不跨层调用
- **类型驱动**：`api/types.ts` 集中定义 Pixiv API 全部接口类型，全应用共享
- **文件粒度**：每个文件 ≤ 200 行，超过即拆分
- **接口抽象**：`api/client.ts` 抽象 HTTP 层，支持从 Capacitor 切换为 Tauri 而无需改动上层

---

## 4. Pixiv 认证流程

### 4.1 OAuth 方案

采用 Pixiv Mobile API 的 OAuth 2.0 Password Grant 方式。

**固定凭证**（Pixiv 官方移动端 App 的 client_id/secret，公开已知）：

| 参数            | 值                                           |
| --------------- | -------------------------------------------- |
| `client_id`     | `KzEZED7aC0vNo8LzDAUFJ2NfyC1rDzVQdFYbRgDc`   |
| `client_secret` | `WJfLb1PAsLCbIUcNbK2zFkD4hC8rG6oX3mZ5sA7t9R` |
| `grant_type`    | `password`                                   |

### 4.2 Token 生命周期

```
启动 → 检查本地 refresh_token
  ├── 有 → 用 refresh_token 换 access_token → 进入 Feed
  └── 无 → 显示登录页 → 用户输入账号密码 → 获取 token 对 → 进入 Feed

运行时：
  access_token（1h 过期）→ 拦截 401 → 自动 refresh → 重试请求
  refresh_token（长期有效）→ 持久化到 @capacitor/preferences
```

### 4.3 API 客户端

```typescript
// 请求前检查 access_token 有效期 → 过期自动静默刷新
// 所有请求携带 Authorization: Bearer <token>
// 使用 @capacitor/http 原生请求（无 CORS 限制）
```

---

## 5. Pixiv API 接口（MVP）

| 端点                         | 用途       | 关键参数              |
| ---------------------------- | ---------- | --------------------- | -------------- |
| `GET /v1/illust/recommended` | 推荐作品流 | `content_type: illust | manga`         |
| `GET /v1/illust/follow`      | 关注作品流 | `restrict: public     | private`       |
| `GET /v1/illust/detail`      | 作品详情   | `illust_id: number`   |
| `POST /auth/token`           | 登录/刷新  | `grant_type: password | refresh_token` |

**分页方式**：API 返回 `next_url` 字段，直接请求该 URL 获取下一页。

**图片加载**：通过 `@capacitor/http` 原生请求 + 设置 `Referer: https://app-api.pixiv.net/` 绕过防盗链。

---

## 6. 状态管理（Solid.js Signals）

### authStore

- `accessToken` / `refreshToken` / `user` / `isLoggedIn` Signals
- 启动时从 Preferences 恢复 token
- `login()` / `logout()` / `refreshAccessToken()` 方法

### feedStore

- `illusts[]` / `nextUrl` / `loading` Signals
- `loadFeed(contentType)` / `loadMore()` — 加载/分页

### uiStore

- `currentTab` — 当前 Tab（recommended / follow）
- `theme` — 主题（默认深色）

---

## 7. MVP 页面设计

### 7.1 登录页

- 首次启动显示，登录成功后 token 持久化，再次启动自动跳过
- 加载中/错误状态完整覆盖

### 7.2 作品流页（Feed）

- 顶部 Tab：推荐 / 关注
- 两列瀑布流网格 + 虚拟滚动（基于 IntersectionObserver）
- 无限滚动自动加载更多
- 图片懒加载

### 7.3 图片详情页（IllustDetail）

- 顶部操作栏（返回 / 收藏 / 更多）
- ImageViewer：基于 Touch Events 的原生手势实现
  - 双指捏合缩放
  - 单指滑动切换多图页
  - 双击放大/缩小
- 底部信息区：标题、作者、收藏数、标签

---

## 8. 开发流程

```bash
# 初始化
pnpm create vite-plus .
pnpm add solid-js @solidjs/router
pnpm add -D vite-plugin-solid unocss
pnpm add @capacitor/core @capacitor/http @capacitor/preferences

# 添加 Android 平台
npx cap init pixivizer com.pixivizer.app
npx cap add android

# 开发
vp dev                    # 浏览器调试 UI

# 构建
vp build                  # 构建 → dist/
npx cap copy              # 复制到 Android 项目
npx cap open android       # 在 Android Studio 中运行
```

### 开发期间图片跨域处理

在 `vite.config.ts` 配置代理，使浏览器开发环境能加载 `i.pximg.net` 的图片：

```typescript
server: {
  proxy: {
    '/pixiv-img': {
      target: 'https://i.pximg.net',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/pixiv-img/, ''),
      headers: { 'Referer': 'https://app-api.pixiv.net/' }
    }
  }
}
```

---

## 9. 错误处理

| 错误场景     | 处理策略                   |
| ------------ | -------------------------- |
| 网络不可用   | 显示「网络已断开」横幅     |
| Token 过期   | 自动静默刷新后重试原始请求 |
| Refresh 失败 | 清除 token，跳回登录页     |
| API 429      | 指数退避重试（最多 3 次）  |
| API 403      | 提示重新登录               |
| 图片加载失败 | 显示占位图 + 重试按钮      |
| 空列表       | 显示「暂无新作品」空状态   |

### 统一错误分类

```typescript
enum ApiErrorType {
  NETWORK, // 网络不可用
  UNAUTHORIZED, // 401 → 尝试 refresh
  FORBIDDEN, // 403 → 重新登录
  RATE_LIMIT, // 429 → 退避重试
  SERVER, // 5xx
  UNKNOWN,
}
```

---

## 10. 未来演进

### 迁移路径（Capacitor → Tauri v2）

```
@capacitor/http        →  Tauri + reqwest (Rust)
@capacitor/preferences →  tauri-plugin-store
@capacitor/filesystem  →  tauri-plugin-fs
前端 (Solid.js)        →  不变
```

通过 `api/client.ts` 的接口抽象，迁移只需替换 HTTP 客户端实现。

### 功能路线图

```
Phase 1 (MVP)  ← 当前
├── 登录
├── 推荐/关注作品流
└── 图片查看器（缩放+翻页）

Phase 2
├── 搜索（标签/作者）
├── 收藏管理
├── 作者主页
├── 排行榜
└── 图片下载

Phase 3
├── 通知推送
├── 图片缓存管理
├── 主题（深色/浅色）
├── 多语言
└── 按需评估 Tauri 迁移
```

---

## 11. 架构图（概念）

```
┌─────────────────────────────────────────┐
│              Solid.js SPA                │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  │
│  │  Pages   │  │Components│  │ Stores │  │
│  └────┬────┘  └────┬─────┘  └───┬────┘  │
│       │            │            │        │
│  ┌────┴────────────┴────────────┴────┐   │
│  │          API Client                │   │
│  │  (auth interceptor + error handler)│   │
│  └────────────────┬──────────────────┘   │
├───────────────────┼─────────────────────┤
│   Capacitor 8     │  @capacitor/http    │
│   Native Shell    │  (原生 HTTP 请求)   │
└───────────────────┼─────────────────────┘
                    │
                    ▼
          ┌─────────────────┐
          │  Pixiv API       │
          │  app-api.pixiv.net│
          └─────────────────┘
```

---

## 12. 关键决策记录

| 决策     | 选项                            | 选择          | 理由                                  |
| -------- | ------------------------------- | ------------- | ------------------------------------- |
| 前端框架 | React / Vue / Solid.js / 原生   | **Solid.js**  | 非 React/Vue，编译型，高性能，TS 友好 |
| 原生壳   | Tauri / Capacitor / Flutter     | **Capacitor** | 纯前端，可维护性最高，按需迁移        |
| API 策略 | 直接集成 / 自建代理 / 混合      | **直接集成**  | 零后端，零运维，社区协议已知          |
| CSS 方案 | Tailwind / UnoCSS / CSS Modules | **UnoCSS**    | 按需生成，比 Tailwind 更轻            |
| 工具链   | 原生 Vite / Vite+               | **Vite+**     | 统一 CLI，内置 Rolldown/Oxc/Vitest    |
| 包管理   | pnpm / yarn / npm / bun         | **pnpm**      | 速度快，依赖隔离好                    |
