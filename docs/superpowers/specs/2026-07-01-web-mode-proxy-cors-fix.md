# Web 模式图床代理 CORS 修复

- **日期**: 2026-07-01
- **状态**: 已批准
- **涉及范围**: vite.config.ts, imageLoader.ts

## 问题

Web 开发模式下开启图床代理后，控制台刷满 CORS 错误：

```
Access to fetch at 'https://i.pixiv.re/c/...' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

图片最终能加载（`loadImage` 的 catch fallback 到 `/pixiv-img/`），但加载变慢且控制台刷屏。

## 根因

`fetchWeb()` 在 Web 模式下尝试直接 `fetch()` 第三方图床 URL（`i.pixiv.re`、`i.pixiv.nl`），这些服务器不返回 CORS 头。所有 race 候选项失败后 fallback 也失败（`i.pximg.net` 缺 Referer 403）。

第三方图床在 Native 模式（CapacitorHttp）下正常工作，无 CORS 限制。`fetchWeb` 仅在 `isNative === false` 时调用。

## 修复方案

三个改动：

### 1. `vite.config.ts` — 添加第三方图床 Vite proxy 入口

为两个内置第三方图床添加本地代理路径，Web 模式下请求先经过 Vite proxy 再转发到第三方服务器，避免 CORS：

- `/pixiv-re/*` → `https://i.pixiv.re/*`
- `/pixiv-nl/*` → `https://i.pixiv.nl/*`

均使用已有的 `proxyAgent`（系统代理）和 `changeOrigin`。

### 2. `imageLoader.ts` — 新增 `toWebProxyUrl()` 

将第三方 URL 转为 Web 可用的本地代理路径：

- `https://i.pixiv.re/...` → `/pixiv-re/...`
- `https://i.pixiv.nl/...` → `/pixiv-nl/...`
- 其他 URL（含 `i.pximg.net`）→ `/pixiv-img/...`（已有 `resolveImageUrl`）

### 3. `imageLoader.ts` — 修改 `fetchWeb()`

Web 模式下，race 候选项和 fallback URL 都通过 `toWebProxyUrl()` 转换为本地代理路径后请求，消除 CORS。

## Web 模式下各代理模式行为

| 模式 | 请求路径 | 效果 |
|------|---------|------|
| 并发请求 (race) | `/pixiv-re/...` + `/pixiv-nl/...` 竞速 | ✅ 最快响应 |
| 负载均衡 (weighted) | `/pixiv-re/...` 或 `/pixiv-nl/...` 随机 | ✅ 按权重 |
| 最快 IP (fastest-ip) | 固定一个 | ✅ 正常 |
| 自定义图床 | fallback `/pixiv-img/...` → `i.pximg.net` | ✅ 兜底 |

## 不涉及范围

- `fetchNative()` / `fetchSingleNative()` 不变 — Android 原生正常
- Android `MainActivity.java` 不变 — `shouldInterceptRequest` 无需处理第三方路径
- `imageHostStore.ts` / `imageHostService.ts` 不变
