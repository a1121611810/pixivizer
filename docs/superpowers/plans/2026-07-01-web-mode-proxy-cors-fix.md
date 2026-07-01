# Web 模式图床代理 CORS 修复 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Web 开发模式下，让第三方图床（i.pixiv.re、i.pixiv.nl）通过 Vite proxy 访问，消除 CORS 错误

**Architecture:** Vite proxy 添加第三方图床入口 → `imageLoader.ts` 新增 `toWebProxyUrl()` 转换 URL → `fetchWeb()` 使用本地代理路径

**Tech Stack:** Vite 8, TypeScript

## Global Constraints

- 只修改 `vite.config.ts` 和 `imageLoader.ts` 两个文件
- 遵循现有代码风格和 proxy 配置模式
- 不修改 `fetchNative`、`imageHostStore`、`imageHostService`

---

### Task 1: 添加 Vite proxy 第三方图床入口

**Files:**
- Modify: `packages/app/vite.config.ts`

**Interfaces:**
- Produces: Vite proxy 配置 `/pixiv-re` → `https://i.pixiv.re`，`/pixiv-nl` → `https://i.pixiv.nl`

- [ ] **Step 1: 在 server.proxy 中添加第三方图床入口**

找到 `vite.config.ts` 中的 `server.proxy` 配置（约第 80 行起），在 `/pixiv-img` 条目之后添加：

```ts
"/pixiv-re": {
  target: "https://i.pixiv.re",
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/pixiv-re/, ""),
  headers: {
    Referer: "https://app-api.pixiv.net/",
    "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
  },
  agent: proxyAgent,
},
"/pixiv-nl": {
  target: "https://i.pixiv.nl",
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/pixiv-nl/, ""),
  headers: {
    Referer: "https://app-api.pixiv.net/",
    "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
  },
  agent: proxyAgent,
},
```

注意遵循与 `/pixiv-img` 相同的样式（`changeOrigin`、`headers`、`agent`）。

- [ ] **Step 2: 提交变更**

```bash
git add packages/app/vite.config.ts
git commit -m "feat: add Vite proxy entries for third-party image hosts"
```

---

### Task 2: 修改 fetchWeb 使用本地代理路径

**Files:**
- Modify: `packages/app/src/utils/imageLoader.ts`

**Interfaces:**
- Consumes: `resolveImageUrl` (already in imageLoader.ts)
- Produces: `toWebProxyUrl(url)` 函数，修改后的 `fetchWeb`

- [ ] **Step 1: 添加 `toWebProxyUrl` 函数**

在 `resolveImageUrl` 函数之后（约第 124 行），添加：

```ts
/**
 * 将第三方图床 URL 转换为 Web 模式下可用的本地代理路径。
 *
 * - i.pixiv.re → /pixiv-re/
 * - i.pixiv.nl → /pixiv-nl/
 * - 其他（含 i.pximg.net）→ 默认 /pixiv-img/ 代理
 * - 已是代理路径的 URL 直接返回
 */
export function toWebProxyUrl(url: string): string {
  if (!url || url.startsWith("/")) return url;
  if (url.startsWith("https://i.pixiv.re/"))
    return url.replace("https://i.pixiv.re", "/pixiv-re");
  if (url.startsWith("https://i.pixiv.nl/"))
    return url.replace("https://i.pixiv.nl", "/pixiv-nl");
  return resolveImageUrl(url);
}
```

- [ ] **Step 2: 修改 `fetchWeb` 函数**

原函数（约第 187 行）：

```ts
async function fetchWeb(targetUrl: string, originalUrl: string): Promise<Blob> {
  const urls = getRaceCandidateUrls(targetUrl);

  if (urls.length > 1) {
    return raceFetch(urls, (url) => fetchSingleWeb(url), originalUrl);
  }

  const proxyUrl = targetUrl.startsWith("/pixiv-img/") ? targetUrl : resolveImageUrl(targetUrl);
  return fetchSingleWeb(proxyUrl);
}
```

改为：

```ts
async function fetchWeb(targetUrl: string, originalUrl: string): Promise<Blob> {
  const urls = getRaceCandidateUrls(targetUrl);

  if (urls.length > 1) {
    // Web 模式：所有 race 候选 URL 转为本地代理路径，避免 CORS
    const webUrls = urls.map(toWebProxyUrl);
    return raceFetch(webUrls, fetchSingleWeb, toWebProxyUrl(originalUrl));
  }

  return fetchSingleWeb(toWebProxyUrl(targetUrl));
}
```

- [ ] **Step 3: 验证 TypeScript 类型检查通过**

```bash
pnpm check
```

预期：无类型错误。

- [ ] **Step 4: 提交变更**

```bash
git add packages/app/src/utils/imageLoader.ts
git commit -m "fix: proxy third-party image host URLs through local Vite proxy in Web mode"
```
