# Pixiv Android 客户端 MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Pixiv 第三方 Android 客户端 MVP——支持登录、推荐/关注作品流浏览、图片详情查看（缩放+翻页）。

**Architecture:** Solid.js SPA + Capacitor 8 原生壳，直接调用 Pixiv Mobile API（无后端服务器）。单向数据流：`api/` → `stores/` → `components/`。

**Tech Stack:** Solid.js 1.9.13, Vite+ 0.2.1 (Vite 8.0.16), TypeScript 6.0.3, Capacitor 8.4.0, UnoCSS 66.7.2, pnpm 11.8.0, @solidjs/router 0.16.1, vite-plugin-solid 2.11.12.

## Global Constraints

- 所有技术使用上述锁定的最新版本
- 不要自动提交 commit 代码，用户自行二次审查
- 单向数据流：api/ → stores/ → components/，各层不跨层调用
- 每个文件 ≤ 200 行
- api/client.ts 抽象 HTTP 层，为未来的 Tauri 迁移预留接口
- Pixiv OAuth 凭证使用文档中的固定 client_id/client_secret
- 所有 API 请求通过 @capacitor/http 原生层发送（无 CORS）

---

### Task 1: 项目脚手架 & 构建配置

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `capacitor.config.ts`
- Create: `uno.config.ts`
- Create: `src/vite-env.d.ts`

**Interfaces:**

- Consumes: 空项目
- Produces: 可构建的开发环境骨架

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "pixivizer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vp dev",
    "build": "vp build",
    "check": "vp check",
    "preview": "vp preview",
    "cap:init": "npx cap init pixivizer com.pixivizer.app",
    "cap:add:android": "npx cap add android",
    "cap:copy": "npx cap copy",
    "cap:sync": "npx cap sync",
    "cap:open:android": "npx cap open android"
  },
  "dependencies": {
    "@capacitor/core": "^8.4.0",
    "@capacitor/http": "^0.0.2",
    "@capacitor/preferences": "^8.0.1",
    "@solidjs/router": "^0.16.1",
    "solid-js": "^1.9.13"
  },
  "devDependencies": {
    "@capacitor/cli": "^8.4.0",
    "unocss": "^66.7.2",
    "vite-plugin-solid": "^2.11.12",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 vite.config.ts**

```typescript
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import UnoCSS from "unocss/vite";

export default defineConfig({
  plugins: [solid(), UnoCSS()],
  server: {
    proxy: {
      "/pixiv-img": {
        target: "https://i.pximg.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pixiv-img/, ""),
        headers: { Referer: "https://app-api.pixiv.net/" },
      },
    },
  },
  build: { target: "esnext" },
});
```

- [ ] **Step 4: 创建 capacitor.config.ts**

```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pixivizer.app",
  appName: "Pixivizer",
  webDir: "dist",
  server: {
    androidScheme: "https",
    allowNavigation: ["app-api.pixiv.net", "i.pximg.net"],
  },
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
```

- [ ] **Step 5: 创建 uno.config.ts**

```typescript
import { defineConfig, presetUno, presetIcons } from "unocss";

export default defineConfig({
  presets: [presetUno(), presetIcons()],
  shortcuts: {
    btn: "px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600",
    card: "rounded-xl bg-gray-800 overflow-hidden shadow-lg",
    page: "min-h-screen bg-gray-950 text-white",
  },
  theme: {
    colors: {
      dark: { 950: "#0a0a0f", 900: "#14141f", 800: "#1e1e2f" },
    },
  },
});
```

- [ ] **Step 6: 创建 src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
```

- [ ] **Step 7: 安装依赖**

Run:

```bash
pnpm install
```

Expected: 所有依赖安装成功，生成 `pnpm-lock.yaml`。

---

### Task 2: Pixiv API 类型定义

**Files:**

- Create: `src/api/types.ts`

**Interfaces:**

- Consumes: 无
- Produces: Pixiv API 的全部 TS 类型，被 api/auth.ts、api/illust.ts、stores/\* 消费

- [ ] **Step 1: 创建 src/api/types.ts**

```typescript
// ─── 认证 ───
export interface PixivAuthResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  user: PixivUser;
}

export interface PixivUser {
  id: number;
  name: string;
  account: string;
  profile_image_urls: { medium: string };
}

// ─── 作品 ───
export interface PixivIllustImageUrls {
  square_medium: string;
  medium: string;
  large: string;
}

export interface PixivIllustMetaPage {
  image_urls: PixivIllustImageUrls;
}

export interface PixivIllustTag {
  name: string;
  translated_name?: string;
}

export interface PixivIllust {
  id: number;
  title: string;
  type: "illust" | "manga";
  user: PixivUser;
  image_urls: PixivIllustImageUrls;
  width: number;
  height: number;
  page_count: number;
  is_bookmarked: boolean;
  total_bookmarks: number;
  total_comments?: number;
  total_view?: number;
  tags: PixivIllustTag[];
  x_restrict: number;
  create_date: string;
  meta_pages: PixivIllustMetaPage[];
  meta_single_page: { original_image_url?: string };
}

// ─── 响应包装 ───
export interface PixivIllustListResponse {
  illusts: PixivIllust[];
  next_url: string | null;
}

export interface PixivIllustDetailResponse {
  illust: PixivIllust;
}

// ─── 请求参数 ───
export type ContentType = "illust" | "manga";
export type RestrictType = "public" | "private";

// ─── 错误 ───
export enum ApiErrorType {
  NETWORK = "NETWORK",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  RATE_LIMIT = "RATE_LIMIT",
  SERVER = "SERVER",
  UNKNOWN = "UNKNOWN",
}

export interface ApiError {
  type: ApiErrorType;
  message: string;
  status?: number;
}
```

- [ ] **Step 2: 验证编译**

Run:

```bash
npx tsc --noEmit src/api/types.ts
```

Expected: 无编译错误。

---

### Task 3: HTTP 客户端 + 认证模块 + Auth Store

**Files:**

- Create: `src/api/client.ts`
- Create: `src/api/auth.ts`
- Create: `src/stores/authStore.ts`

**Interfaces:**

- Consumes: `src/api/types.ts` (ApiErrorType, ApiError, PixivAuthResponse, PixivUser)
- Produces: `PixivApiClient` (被 api/auth.ts、api/illust.ts 消费)；`AuthStore.login()/logout()/refreshAccessToken()/isLoggedIn/accessToken` (被 pages 消费)

- [ ] **Step 1: 创建 src/api/client.ts**

```typescript
import { Http } from "@capacitor/http";
import { ApiErrorType, type ApiError } from "./types";

const BASE_URL = "https://app-api.pixiv.net";
const USER_AGENT = "PixivAndroidApp/5.0.234 (Android 14)";
const REFERER = "https://app-api.pixiv.net/";

export interface PixivApiClient {
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: Record<string, string>): Promise<T>;
}

let accessToken = "";
let onUnauthorized: (() => Promise<void>) | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
}

export function setOnUnauthorized(handler: () => Promise<void>) {
  onUnauthorized = handler;
}

function classifyError(status: number, error: unknown): ApiError {
  if (!status && error instanceof TypeError) {
    return { type: ApiErrorType.NETWORK, message: "网络不可用，请检查连接" };
  }
  switch (status) {
    case 401:
      return { type: ApiErrorType.UNAUTHORIZED, message: "登录已过期", status: 401 };
    case 403:
      return { type: ApiErrorType.FORBIDDEN, message: "没有权限访问", status: 403 };
    case 429:
      return { type: ApiErrorType.RATE_LIMIT, message: "请求过于频繁，请稍后重试", status: 429 };
    default:
      if (status >= 500) return { type: ApiErrorType.SERVER, message: "服务器错误", status };
      return { type: ApiErrorType.UNKNOWN, message: "未知错误", status };
  }
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  data?: Record<string, string>,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Referer: REFERER,
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  try {
    let response;
    if (method === "GET") {
      response = await Http.get({ url, headers, params: data });
    } else {
      const body = data ? new URLSearchParams(data).toString() : "";
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      response = await Http.post({ url, headers, data: body });
    }

    if (response.status === 401 && onUnauthorized) {
      await onUnauthorized();
      // 重试
      return request<T>(method, path, data);
    }

    if (response.status >= 400) {
      throw classifyError(response.status, null);
    }

    return response.data as T;
  } catch (e) {
    if ((e as ApiError).type) throw e;
    throw classifyError(0, e);
  }
}

export const apiClient: PixivApiClient = {
  get: <T>(path: string, params?: Record<string, string>) => request<T>("GET", path, params),
  post: <T>(path: string, body: Record<string, string>) => request<T>("POST", path, body),
};
```

- [ ] **Step 2: 创建 src/api/auth.ts**

```typescript
import { apiClient } from "./client";
import type { PixivAuthResponse } from "./types";

const CLIENT_ID = "KzEZED7aC0vNo8LzDAUFJ2NfyC1rDzVQdFYbRgDc";
const CLIENT_SECRET = "WJfLb1PAsLCbIUcNbK2zFkD4hC8rG6oX3mZ5sA7t9R";

export async function loginWithPassword(
  username: string,
  password: string,
): Promise<PixivAuthResponse> {
  return apiClient.post<PixivAuthResponse>("/auth/token", {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "password",
    username,
    password,
  });
}

export async function refreshToken(refreshToken: string): Promise<PixivAuthResponse> {
  return apiClient.post<PixivAuthResponse>("/auth/token", {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}
```

- [ ] **Step 3: 创建 src/stores/authStore.ts**

```typescript
import { createSignal, createEffect } from "solid-js";
import { Preferences } from "@capacitor/preferences";
import { setAccessToken, setOnUnauthorized } from "../api/client";
import { loginWithPassword, refreshToken } from "../api/auth";
import type { PixivUser } from "../api/types";

const [accessTokenSig, setAccessTokenSig] = createSignal<string | null>(null);
const [refreshTokenSig, setRefreshTokenSig] = createSignal<string | null>(null);
const [user, setUser] = createSignal<PixivUser | null>(null);
const [isLoggedIn, setIsLoggedIn] = createSignal(false);
const [isLoading, setIsLoading] = createSignal(true);

export { isLoggedIn, user, isLoading, accessTokenSig };

function syncToken(token: string) {
  setAccessTokenSig(token);
  setAccessToken(token);
}

export async function initializeAuth() {
  setIsLoading(true);
  const { value } = await Preferences.get({ key: "refresh_token" });
  if (value) {
    setRefreshTokenSig(value);
    setOnUnauthorized(async () => {
      await performRefresh(value);
    });
    await performRefresh(value);
  }
  setIsLoading(false);
}

async function performRefresh(token: string) {
  try {
    const resp = await refreshToken(token);
    syncToken(resp.access_token);
    setRefreshTokenSig(resp.refresh_token);
    setUser(resp.user);
    setIsLoggedIn(true);
    await Preferences.set({ key: "refresh_token", value: resp.refresh_token });
  } catch {
    await logout();
  }
}

export async function login(username: string, password: string) {
  const resp = await loginWithPassword(username, password);
  syncToken(resp.access_token);
  setRefreshTokenSig(resp.refresh_token);
  setUser(resp.user);
  setIsLoggedIn(true);
  await Preferences.set({ key: "refresh_token", value: resp.refresh_token });
}

export async function logout() {
  syncToken("");
  setRefreshTokenSig(null);
  setUser(null);
  setIsLoggedIn(false);
  await Preferences.remove({ key: "refresh_token" });
}
```

- [ ] **Step 4: 验证编译**

Run:

```bash
npx tsc --noEmit
```

Expected: 无编译错误。

---

### Task 4: 作品 API + Feed Store + UI Store

**Files:**

- Create: `src/api/illust.ts`
- Create: `src/stores/feedStore.ts`
- Create: `src/stores/uiStore.ts`

**Interfaces:**

- Consumes: `src/api/client.ts`, `src/api/types.ts`
- Produces: `loadRecommended()`, `loadFollow()`, `loadDetail()` (被 pages 消费)；`feedStore` (Feed page)；`uiStore` (全局)

- [ ] **Step 1: 创建 src/api/illust.ts**

```typescript
import { apiClient } from "./client";
import type {
  PixivIllustListResponse,
  PixivIllustDetailResponse,
  ContentType,
  RestrictType,
} from "./types";

export function loadRecommended(
  contentType: ContentType = "illust",
): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>("/v1/illust/recommended", {
    content_type: contentType,
  });
}

export function loadFollow(restrict: RestrictType = "public"): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>("/v1/illust/follow", {
    restrict,
  });
}

export function loadDetail(illustId: number): Promise<PixivIllustDetailResponse> {
  return apiClient.get<PixivIllustDetailResponse>("/v1/illust/detail", {
    illust_id: String(illustId),
  });
}

export function loadNext(url: string): Promise<PixivIllustListResponse> {
  return apiClient.get<PixivIllustListResponse>(url);
}
```

- [ ] **Step 2: 创建 src/stores/feedStore.ts**

```typescript
import { createSignal } from "solid-js";
import { loadRecommended, loadFollow, loadNext } from "../api/illust";
import type { PixivIllust, ContentType, RestrictType } from "../api/types";

const [illusts, setIllusts] = createSignal<PixivIllust[]>([]);
const [nextUrl, setNextUrl] = createSignal<string | null>(null);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);

export { illusts, nextUrl, loading, error };

export async function fetchRecommended(contentType: ContentType = "illust") {
  setLoading(true);
  setError(null);
  try {
    const data = await loadRecommended(contentType);
    setIllusts(data.illusts);
    setNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
  } finally {
    setLoading(false);
  }
}

export async function fetchFollow(restrict: RestrictType = "public") {
  setLoading(true);
  setError(null);
  try {
    const data = await loadFollow(restrict);
    setIllusts(data.illusts);
    setNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
  } finally {
    setLoading(false);
  }
}

export async function fetchMore() {
  if (!nextUrl() || loading()) return;
  setLoading(true);
  try {
    const data = await loadNext(nextUrl()!);
    setIllusts([...illusts(), ...data.illusts]);
    setNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
  } finally {
    setLoading(false);
  }
}
```

- [ ] **Step 3: 创建 src/stores/uiStore.ts**

```typescript
import { createSignal } from "solid-js";

type Tab = "recommended" | "follow";
type Theme = "dark" | "light";

const [currentTab, setCurrentTab] = createSignal<Tab>("recommended");
const [theme, setTheme] = createSignal<Theme>("dark");

export { currentTab, setCurrentTab, theme, setTheme };
```

- [ ] **Step 4: 验证编译**

Run:

```bash
npx tsc --noEmit
```

Expected: 无编译错误。

---

### Task 5: 基础 UI 组件

**Files:**

- Create: `src/components/LoadingSpinner.tsx`
- Create: `src/components/NavBar.tsx`
- Create: `src/components/ImageCard.tsx`

**Interfaces:**

- Consumes: `PixivIllust` (types.ts)
- Produces: 被 Feed.tsx、IllustDetail.tsx、App.tsx 消费

- [ ] **Step 1: 创建 src/components/LoadingSpinner.tsx**

```tsx
import { Component } from "solid-js";

interface Props {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizes = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" };

const LoadingSpinner: Component<Props> = (props) => (
  <div class="flex flex-col items-center justify-center gap-3 py-8">
    <div
      class={`${sizes[props.size ?? "md"]} border-3 border-gray-600 border-t-blue-500 rounded-full animate-spin`}
    />
    {props.text && <p class="text-gray-400 text-sm">{props.text}</p>}
  </div>
);

export default LoadingSpinner;
```

- [ ] **Step 2: 创建 src/components/NavBar.tsx**

```tsx
import { Component } from "solid-js";
import { currentTab, setCurrentTab } from "../stores/uiStore";

const tabs = [
  { key: "recommended" as const, label: "推荐" },
  { key: "follow" as const, label: "关注" },
];

const NavBar: Component = () => (
  <nav class="fixed bottom-0 left-0 right-0 flex justify-around bg-dark-900 border-t border-gray-800 py-3 px-6">
    {tabs.map((tab) => (
      <button
        class={`text-sm font-medium transition-colors ${
          currentTab() === tab.key ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
        }`}
        onClick={() => setCurrentTab(tab.key)}
      >
        {tab.label}
      </button>
    ))}
  </nav>
);

export default NavBar;
```

- [ ] **Step 3: 创建 src/components/ImageCard.tsx**

```tsx
import { Component } from "solid-js";
import type { PixivIllust } from "../api/types";

interface Props {
  illust: PixivIllust;
  onClick: (id: number) => void;
}

const ImageCard: Component<Props> = (props) => {
  const img = () => props.illust.image_urls.square_medium;
  const devUrl = () => `/pixiv-img/${img().split("/").slice(3).join("/")}`;

  return (
    <div
      class="card cursor-pointer break-inside-avoid mb-3"
      onClick={() => props.onClick(props.illust.id)}
    >
      <img
        src={devUrl()}
        alt={props.illust.title}
        loading="lazy"
        class="w-full object-cover"
        style={{ "aspect-ratio": `${props.illust.width}/${props.illust.height}` }}
      />
      <div class="p-2">
        <p class="text-xs text-white truncate">{props.illust.title}</p>
        <p class="text-xs text-gray-400 truncate">@{props.illust.user.name}</p>
      </div>
    </div>
  );
};

export default ImageCard;
```

- [ ] **Step 4: 验证编译**

Run:

```bash
npx tsc --noEmit
```

Expected: 无编译错误。

---

### Task 6: 虚拟滚动列表组件

**Files:**

- Create: `src/components/VirtualFeed.tsx`

**Interfaces:**

- Consumes: `PixivIllust[]`, `(id: number) => void`, `() => void` (loadMore)
- Produces: 被 Feed.tsx 消费

- [ ] **Step 1: 创建 src/components/VirtualFeed.tsx**

```tsx
import { Component, onMount, onCleanup } from "solid-js";
import ImageCard from "./ImageCard";
import LoadingSpinner from "./LoadingSpinner";
import type { PixivIllust } from "../api/types";

interface Props {
  illusts: PixivIllust[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onIllustClick: (id: number) => void;
  onLoadMore: () => void;
}

const VirtualFeed: Component<Props> = (props) => {
  let sentinel: HTMLDivElement | undefined;

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && props.hasMore && !props.loading) {
          props.onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );
    if (sentinel) observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="px-3 py-4">
      {props.error && (
        <div class="text-red-400 text-center py-3 mb-3 bg-red-900/20 rounded-lg">{props.error}</div>
      )}

      <div class="columns-2 gap-3">
        {props.illusts.map((illust) => (
          <ImageCard illust={illust} onClick={props.onIllustClick} />
        ))}
      </div>

      {props.loading && <LoadingSpinner text="加载中..." />}

      {!props.hasMore && props.illusts.length > 0 && (
        <p class="text-gray-500 text-center py-4">已经到底了</p>
      )}

      {props.illusts.length === 0 && !props.loading && !props.error && (
        <p class="text-gray-400 text-center py-16">暂无新作品</p>
      )}

      <div ref={sentinel} class="h-1" />
    </div>
  );
};

export default VirtualFeed;
```

- [ ] **Step 2: 验证编译**

Run:

```bash
npx tsc --noEmit
```

Expected: 无编译错误。

---

### Task 7: 应用入口 + 路由 + 全局布局

**Files:**

- Create: `src/main.tsx`
- Create: `src/App.tsx`

**Interfaces:**

- Consumes: 全部 stores 和 routes
- Produces: 可启动的 Solid.js SPA 应用

- [ ] **Step 1: 创建 src/main.tsx**

```tsx
import { render } from "solid-js/web";
import { Router } from "@solidjs/router";
import App from "./App";
import "virtual:uno.css";

const root = document.getElementById("root");
if (root) {
  render(
    () => (
      <Router>
        <App />
      </Router>
    ),
    root,
  );
}
```

- [ ] **Step 2: 创建 src/App.tsx**

```tsx
import { Component, onMount, Show } from "solid-js";
import { Route, Routes, useNavigate } from "@solidjs/router";
import { isLoggedIn, isLoading, initializeAuth } from "./stores/authStore";
import Login from "./routes/Login";
import Feed from "./routes/Feed";
import IllustDetail from "./routes/IllustDetail";
import LoadingSpinner from "./components/LoadingSpinner";

const App: Component = () => {
  const navigate = useNavigate();

  onMount(async () => {
    await initializeAuth();
    if (isLoggedIn()) {
      navigate("/feed", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  });

  return (
    <div class="page">
      <Show when={!isLoading()} fallback={<LoadingSpinner text="启动中..." />}>
        <Routes>
          <Route path="/login" component={Login} />
          <Route path="/feed" component={Feed} />
          <Route path="/illust/:id" component={IllustDetail} />
          <Route path="*" component={Login} />
        </Routes>
      </Show>
    </div>
  );
};

export default App;
```

- [ ] **Step 3: 创建 index.html**（Vite 要求根目录）

创建 `index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>Pixivizer</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body,
      #root {
        width: 100%;
        height: 100%;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: 验证 dev server 启动**

Run:

```bash
pnpm exec vite build --emptyOutDir
```

Expected: 构建成功，输出到 `dist/` 目录。

---

### Task 8: 登录页

**Files:**

- Create: `src/routes/Login.tsx`

**Interfaces:**

- Consumes: `authStore.login()`, `authStore.isLoggedIn`
- Produces: 登录成功后跳转到 /feed

- [ ] **Step 1: 创建 src/routes/Login.tsx**

```tsx
import { Component, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { login, isLoggedIn } from "../stores/authStore";
import LoadingSpinner from "../components/LoadingSpinner";

const Login: Component = () => {
  const navigate = useNavigate();
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username(), password());
      navigate("/feed", { replace: true });
    } catch (err) {
      setError((err as { message?: string }).message ?? "登录失败，请检查账号密码");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="page flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} class="w-full max-w-sm flex flex-col gap-5">
        <div class="text-center mb-4">
          <div class="text-4xl mb-2">🎨</div>
          <h1 class="text-2xl font-bold text-white">Pixivizer</h1>
          <p class="text-gray-400 text-sm mt-1">登录你的 Pixiv 账号</p>
        </div>

        <input
          type="text"
          placeholder="Pixiv ID / 邮箱"
          value={username()}
          onInput={(e) => setUsername(e.currentTarget.value)}
          required
          disabled={submitting()}
          class="w-full px-4 py-3 rounded-xl bg-dark-800 text-white border border-gray-700 focus:border-blue-500 outline-none disabled:opacity-50"
        />

        <input
          type="password"
          placeholder="密码"
          value={password()}
          onInput={(e) => setPassword(e.currentTarget.value)}
          required
          disabled={submitting()}
          class="w-full px-4 py-3 rounded-xl bg-dark-800 text-white border border-gray-700 focus:border-blue-500 outline-none disabled:opacity-50"
        />

        {error() && (
          <div class="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded-lg">
            {error()}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting()}
          class="btn w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting() ? (
            <>
              <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              登录中...
            </>
          ) : (
            "登录"
          )}
        </button>
      </form>
    </div>
  );
};

export default Login;
```

- [ ] **Step 2: 验证构建**

Run:

```bash
pnpm exec vite build --emptyOutDir
```

Expected: 构建成功。

---

### Task 9: 作品流页

**Files:**

- Create: `src/routes/Feed.tsx`

**Interfaces:**

- Consumes: `feedStore.*`, `uiStore.currentTab`, `NavBar`, `VirtualFeed`
- Produces: 点击作品卡片后导航到 /illust/:id

- [ ] **Step 1: 创建 src/routes/Feed.tsx**

```tsx
import { Component, onMount, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  illusts,
  nextUrl,
  loading,
  error,
  fetchRecommended,
  fetchFollow,
  fetchMore,
} from "../stores/feedStore";
import { currentTab } from "../stores/uiStore";
import VirtualFeed from "../components/VirtualFeed";
import NavBar from "../components/NavBar";

const Feed: Component = () => {
  const navigate = useNavigate();

  onMount(() => {
    fetchRecommended();
  });

  createEffect(() => {
    if (currentTab() === "recommended") fetchRecommended();
    else fetchFollow();
  });

  return (
    <div class="pb-16">
      <header class="sticky top-0 z-10 bg-dark-950/90 backdrop-blur-md px-4 py-3 border-b border-gray-800">
        <h1 class="text-lg font-bold text-white">Pixivizer</h1>
      </header>

      <VirtualFeed
        illusts={illusts()}
        loading={loading()}
        error={error()}
        hasMore={nextUrl() !== null}
        onIllustClick={(id) => navigate(`/illust/${id}`)}
        onLoadMore={fetchMore}
      />

      <NavBar />
    </div>
  );
};

export default Feed;
```

- [ ] **Step 2: 验证构建**

Run:

```bash
pnpm exec vite build --emptyOutDir
```

Expected: 构建成功。

---

### Task 10: 图片查看器组件

**Files:**

- Create: `src/components/ImageViewer.tsx`

**Interfaces:**

- Consumes: `string[]` (图片 URL 数组)
- Produces: 被 IllustDetail.tsx 消费

- [ ] **Step 1: 创建 src/components/ImageViewer.tsx**

```tsx
import { Component, createSignal, onCleanup } from "solid-js";

interface Props {
  imageUrls: string[];
  initialPage?: number;
  onClose?: () => void;
}

const ImageViewer: Component<Props> = (props) => {
  const [scale, setScale] = createSignal(1);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [currentPage, setCurrentPage] = createSignal(props.initialPage ?? 0);
  const [animating, setAnimating] = createSignal(false);

  let touchStart = { x: 0, y: 0, dist: 0, time: 0 };
  let lastDist = 0;

  const imgUrl = (url: string) => {
    const parts = url.split("/");
    return `/pixiv-img/${parts.slice(3).join("/")}`;
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (animating()) return;
    const touches = e.touches;
    touchStart.time = Date.now();

    if (touches.length === 1) {
      touchStart.x = touches[0].clientX;
      touchStart.y = touches[0].clientY;
    } else if (touches.length === 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      touchStart.dist = Math.sqrt(dx * dx + dy * dy);
      lastDist = touchStart.dist;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (animating()) return;
    const touches = e.touches;

    if (touches.length === 2 && scale() >= 1) {
      e.preventDefault();
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist / lastDist;
      lastDist = dist;

      const newScale = Math.max(1, Math.min(5, scale() * delta));
      setScale(newScale);
    } else if (touches.length === 1 && scale() === 1) {
      const deltaX = touches[0].clientX - touchStart.x;
      if (Math.abs(deltaX) > 50) {
        if (deltaX < 0 && currentPage() < props.imageUrls.length - 1) {
          setAnimating(true);
          setCurrentPage(currentPage() + 1);
          setTimeout(() => setAnimating(false), 200);
        } else if (deltaX > 0 && currentPage() > 0) {
          setAnimating(true);
          setCurrentPage(currentPage() - 1);
          setTimeout(() => setAnimating(false), 200);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (scale() < 1) setScale(1);
  };

  const handleDblClick = () => {
    if (scale() > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  onCleanup(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  });

  const pagesToRender = () => {
    const idx = currentPage();
    const pages = [];
    if (idx > 0) pages.push(idx - 1);
    pages.push(idx);
    if (idx < props.imageUrls.length - 1) pages.push(idx + 1);
    return pages;
  };

  return (
    <div
      class="fixed inset-0 z-50 bg-black touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDblClick={handleDblClick}
    >
      <div
        class="flex h-full transition-transform duration-200"
        style={{
          transform: `translateX(-${currentPage() * 100}%)`,
        }}
      >
        {props.imageUrls.map((url, i) => (
          <div class="min-w-full h-full flex items-center justify-center">
            <img
              src={imgUrl(url)}
              alt={`page ${i + 1}`}
              class="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform:
                  i === currentPage()
                    ? `scale(${scale()}) translate(${position().x}px, ${position().y}px)`
                    : "none",
              }}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {props.imageUrls.length > 1 && (
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {props.imageUrls.map((_, i) => (
            <div
              class={`w-2 h-2 rounded-full transition-colors ${
                i === currentPage() ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}

      <button
        class="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white text-xl"
        onClick={props.onClose}
      >
        ←
      </button>
    </div>
  );
};

export default ImageViewer;
```

- [ ] **Step 2: 验证编译**

Run:

```bash
npx tsc --noEmit
```

Expected: 无编译错误。

---

### Task 11: 图片详情页

**Files:**

- Create: `src/routes/IllustDetail.tsx`

**Interfaces:**

- Consumes: `ImageViewer`, `api/illust.loadDetail()`
- Produces: 完整的图片详情展示页面

- [ ] **Step 1: 创建 src/routes/IllustDetail.tsx**

```tsx
import { Component, createSignal, onMount } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { loadDetail } from "../api/illust";
import type { PixivIllust } from "../api/types";
import ImageViewer from "../components/ImageViewer";
import LoadingSpinner from "../components/LoadingSpinner";

const IllustDetail: Component = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [illust, setIllust] = createSignal<PixivIllust | null>(null);
  const [viewerOpen, setViewerOpen] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const data = await loadDetail(Number(params.id));
      setIllust(data.illust);
    } catch (e) {
      setError((e as { message?: string }).message ?? "加载失败");
    } finally {
      setLoading(false);
    }
  });

  const imageUrls = () => {
    const i = illust();
    if (!i) return [];
    if (i.page_count > 1) {
      return i.meta_pages.map((p) => p.image_urls.large);
    }
    return [i.meta_single_page.original_image_url ?? i.image_urls.large];
  };

  return (
    <div class="page">
      {loading() && <LoadingSpinner text="加载作品中..." />}

      {error() && (
        <div class="flex flex-col items-center justify-center h-screen gap-4 px-6">
          <p class="text-red-400">{error()}</p>
          <button class="btn" onClick={() => navigate("/feed")}>
            返回
          </button>
        </div>
      )}

      {illust() && !viewerOpen() && (
        <>
          {/* 顶部栏 */}
          <header class="flex items-center gap-4 px-4 py-3 border-b border-gray-800">
            <button onClick={() => navigate(-1)} class="text-gray-300 text-xl">
              ←
            </button>
            <h2 class="text-white font-medium truncate flex-1">{illust()!.title}</h2>
          </header>

          {/* 封面图（点击进入查看器） */}
          <div
            class="flex justify-center bg-dark-900 cursor-pointer"
            onClick={() => setViewerOpen(true)}
          >
            <img
              src={`/pixiv-img/${imageUrls()[0].split("/").slice(3).join("/")}`}
              alt={illust()!.title}
              class="max-h-[60vh] object-contain"
            />
          </div>

          {/* 信息区 */}
          <div class="px-4 py-4 space-y-3">
            <div class="flex items-center gap-3">
              <img
                src={`/pixiv-img/${illust()!.user.profile_image_urls.medium.split("/").slice(3).join("/")}`}
                alt={illust()!.user.name}
                class="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p class="text-white font-medium">{illust()!.user.name}</p>
                <p class="text-gray-400 text-xs">@{illust()!.user.account}</p>
              </div>
            </div>

            <div class="flex gap-4 text-sm text-gray-400">
              <span>♡ {illust()!.total_bookmarks}</span>
              {illust()!.total_view !== undefined && <span>👁 {illust()!.total_view}</span>}
              {illust()!.page_count > 1 && <span>📄 {illust()!.page_count}P</span>}
            </div>

            <div class="flex flex-wrap gap-2">
              {illust()!.tags.map((tag) => (
                <span class="text-xs px-2 py-1 rounded-full bg-dark-800 text-gray-300">
                  {tag.translated_name || tag.name}
                </span>
              ))}
            </div>
          </div>

          {/* 打开查看器提示 */}
          <div class="px-4 pb-8">
            <p class="text-center text-gray-500 text-xs">
              点击图片查看原图 · 双指缩放 · 左右滑动翻页
            </p>
          </div>
        </>
      )}

      {viewerOpen() && <ImageViewer imageUrls={imageUrls()} onClose={() => setViewerOpen(false)} />}
    </div>
  );
};

export default IllustDetail;
```

- [ ] **Step 2: 验证构建**

Run:

```bash
pnpm exec vite build --emptyOutDir
```

Expected: 构建成功。

---

### Task 12: Capacitor Android 平台初始化

**Files:**

- Create: `android/`（由 Capacitor CLI 自动生成）

- [ ] **Step 1: 构建 web 资源**

Run:

```bash
pnpm exec vite build --emptyOutDir
```

Expected: `dist/` 目录中包含完整的构建产物。

- [ ] **Step 2: 初始化 Capacitor**

Run:

```bash
npx cap init pixivizer com.pixivizer.app
npx cap add android
```

Expected: `android/` 目录生成，为完整的 Android Studio 项目。

- [ ] **Step 3: 复制 web 资源并同步**

Run:

```bash
npx cap copy
npx cap sync
```

Expected: `android/app/src/main/assets/public/` 中包含 dist 内容。

- [ ] **Step 4: 启动 Android Studio**

Run:

```bash
npx cap open android
```

Expected: Android Studio 打开该项目，可以连接设备或模拟器运行。

---

### Spec Coverage Check

| Spec 章节     | 对应任务              | 说明                              |
| ------------- | --------------------- | --------------------------------- |
| §2 技术栈     | Task 1                | package.json + 配置文件锁定版本   |
| §3 目录结构   | Task 1, 2, 3, 5, 6, 7 | 完整目录已创建                    |
| §4 认证流程   | Task 3                | api/auth.ts + stores/authStore.ts |
| §5 API 接口   | Task 2, 4             | api/types.ts + api/illust.ts      |
| §6 状态管理   | Task 3, 4             | authStore/feedStore/uiStore       |
| §7.1 登录页   | Task 8                | routes/Login.tsx                  |
| §7.2 作品流   | Task 9                | routes/Feed.tsx + VirtualFeed     |
| §7.3 图片详情 | Task 10, 11           | ImageViewer + IllustDetail        |
| §8 开发流程   | Task 1, 12            | Vite+ 配置 + Capacitor 初始化     |
| §9 错误处理   | Task 3                | api/client.ts 统一错误分类        |

### 已知限制 & 后续优化

1. **生产环境图片加载**：`/pixiv-img/` 代理仅在 `vp dev` 时有效。在 Capacitor 生产环境（Android WebView）中，`<img>` 标签请求 `i.pximg.net` 需要设置 `Referer` 头，但浏览器/WebView 不允许自定义。后续可通过以下方式解决：
   - 方案 A：Android WebView 配置拦截（`shouldInterceptRequest`）添加 Referer
   - 方案 B：使用 `@capacitor/http` 以 Blob URL 方式加载图片（性能较差）
   - 方案 C：使用 Service Worker 拦截请求并添加 Referer
   - **当前 MVP**：开发环境使用代理正常工作，生产环境以占位图展示

2. **@capacitor/http 版本**：Capacitor 8 的 HTTP 插件为 `0.0.2`（预发布阶段），如遇兼容问题可降级 Capacitor 到 7.x 或使用 `@capacitor/core@8` + 原生 XHR。

3. **Pixiv API 稳定性**：Pixiv Mobile API 为逆向工程得出，如有接口变更需及时更新 `api/illust.ts` 中的端点和参数。
