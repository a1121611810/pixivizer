# Web 模式图床代理 CORS 修复

- **日期**: 2026-07-01
- **状态**: 已批准
- **涉及范围**: imageLoader.ts

## 问题

Web 开发模式下开启图床代理后，控制台刷满 CORS 错误：

```
Access to fetch at 'https://i.pixiv.re/c/...' from origin 'http://localhost:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

图片最终能加载（通过 `loadImage` 的 catch fallback 到 `/pixiv-img/` 代理路径），但加载变慢（需等待所有 race 候选项超时失败）。

## 根因

`fetchWeb()` 在 Web 模式下尝试直接 `fetch()` 第三方图床 URL（`i.pixiv.re`、`i.pixiv.nl` 等），这些服务器不返回 CORS 头，浏览器拦截请求。所有 race 候选项失败后 fallback 到 `i.pximg.net` 直连也会 403（缺 Referer 头）。最终 `loadImage` 的 catch 才使用 `/pixiv-img/` 代理路径成功加载。

第三方图床只适合 Native 模式（CapacitorHttp 无 CORS 限制）。

## 修复方案

修改 `imageLoader.ts` 的 `fetchWeb()` 函数——Web 模式下始终使用本地 `/pixiv-img/` 代理路径，不尝试直接请求第三方图床。

```ts
// 改动前：尝试 race 多候选 → CORS 失败 → fallback 失败 → loadImage catch 兜底
async function fetchWeb(targetUrl: string, originalUrl: string): Promise<Blob> {
  const urls = getRaceCandidateUrls(targetUrl);
  if (urls.length > 1) {
    return raceFetch(urls, (url) => fetchSingleWeb(url), originalUrl);
  }
  const proxyUrl = targetUrl.startsWith("/pixiv-img/") ? targetUrl : resolveImageUrl(targetUrl);
  return fetchSingleWeb(proxyUrl);
}

// 改动后：直接走本地代理，消除 CORS 错误和延迟
async function fetchWeb(targetUrl: string, originalUrl: string): Promise<Blob> {
  const proxyUrl = resolveImageUrl(originalUrl);
  return fetchSingleWeb(proxyUrl);
}
```

## 效果

- Web 模式：无 CORS 错误，加载速度恢复正常
- Native 模式：`fetchNative()` 不变，图床代理正常生效

## 不涉及范围

- 不修改 `fetchNative()` / `fetchSingleNative()`
- 不修改 `imageHostStore.ts`、`imageHostService.ts`、Vite config
- 不修改任何 Native 端行为
