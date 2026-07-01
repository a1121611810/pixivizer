# 性能优化综合修复

- **日期**: 2026-07-01
- **状态**: 已批准

## 发现问题

1. **getEffectiveImageUrlAsync 不必要 async** — `loadImage` 中多一层 `await` microtask 延迟
2. **SW 不缓存代理路径** — `/pixiv-re/` 和 `/pixiv-nl/` 走完整网络链路
3. **代理模式预加载浪费** — 预加载请求不被 SW 缓存，占用带宽
4. **Web Worker 死代码** — `masonryWorker.ts` 从未被导入

## 改动方案

### D: imageLoader.ts — 使用同步版 URL 解析
`getEffectiveImageUrlAsync` → `getEffectiveImageUrl`（已有同步版本）

### B: vite.config.ts — 添加 proxy 路径 SW 缓存
增加 `/pixiv-re/` 和 `/pixiv-nl/` 的 CacheFirst 规则

### C: VirtualFeed.tsx — 代理模式跳过预加载
在预加载 createEffect 中加 `isImageHostEnabled()` 判断

### A: LayoutEngine.tsx — 通过 Web Worker 异步计算布局
新建 Worker 实例，通过 Comlink 通信，布局计算不阻塞主线程

## 实施顺序
D → B → C → A（从简单到复杂）
