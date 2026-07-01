# ImageViewer 原图加载进度指示器设计

## 问题

详情页点击查看原图时，`ImageViewer` 使用原生 `<img>` 标签直接加载 Pixiv 原始图片 URL（通过 `/pixiv-img/` 代理）。移动端网络下，原图（3-15MB）下载耗时数秒，用户看到黑屏无反馈。

## 根因

`ImageViewer` 完全绕过了现有的 LRU Blob URL 缓存系统（`imageLoader.ts`），且没有任何下载进度反馈。

## 方案总览

1. 新增 `loadImageWithProgress()` 函数，带下载进度回调
2. `ImageViewer` 接收 `previewUrls` prop，从 LRU 缓存同步取出预览图 Blob URL 作为模糊占位
3. 原图加载时显示百分比文字 + 旋转圆环微动画
4. 原图完成后淡入替换模糊占位图

## 架构变更

```
IllustDetail
  ├─ imageUrls()          → 当前质量设定（medium/large）的预览 URL（已在 LRU 缓存中）
  └─ originalImageUrls()  → 原图 URL

ImageViewer (改造后)
  ├─ props.previewUrls    → 从 LRU 缓存 checkImageCache() 同步取 Blob URL
  ├─ props.imageUrls      → 原图 URL，逐页懒加载
  └─ 内部: loadImageWithProgress() → onProgress 回调更新百分比
```

## 模块变更

### 1. `utils/imageLoader.ts` — 新增

```typescript
export interface LoadProgress {
  loaded: number;
  total: number | null;
  percent: number; // -1=未知, 0-100=已知
}

export function loadImageWithProgress(
  originalUrl: string,
  onProgress: (p: LoadProgress) => void,
): Promise<{
  url: string;         // Blob URL
  cleanup: () => void;
  durationMs: number;  // 下载耗时（ms）
}>;
```

**web 模式**：`fetch` → `ReadableStream.getReader()` → 逐 chunk 累加 → `onProgress`
**native 模式**：`XMLHttpRequest` → `onprogress` 回调 → `onProgress`（CapacitorHttp 不支持 streaming）

### 2. `components/ImageViewer.tsx` — 改造

**Props 变更**：新增可选 `previewUrls?: string[]`

**新增内部状态**：
- `progressMap: Signal<Record<number, number>>` — 每页进度 0-100
- `loadedUrls: Signal<Record<number, string>>` — 每页完成后的 Blob URL

**生命周期**：
- `createEffect` 监听 `currentPage()`，变化时触发 `startLoad(page)`
- `loadedUrls` / `progressMap` 双重去重

**渲染三层**：
1. 模糊预览图（从 LRU 缓存同步取 Blob URL，`blur(16px) brightness(0.6)`，原图加载后 opacity→0）
2. 原图（完成后 `fadeIn` 动画淡入）
3. 加载遮罩（旋转圆环 + 百分比文字）

### 3. `routes/IllustDetail.tsx` — 调用方变更

```tsx
<ImageViewer
  imageUrls={originalImageUrls()}
  previewUrls={imageUrls()}       // 新增 prop
  initialPage={viewerStartPage()}
  onClose={closeViewer}
/>
```

`imageUrls()` 的图片已在详情页通过 PixivImage → loadImage 加载，LRU 缓存中存在 Blob URL。

## 数据流

```
用户点击图片 → openViewer(i) → ImageViewer 渲染 page i
  ├─ 同步: checkImageCache(previewUrls[i]) → Blob URL → 模糊占位显示
  ├─ createEffect(currentPage): startLoad(i)
  │    └─ loadImageWithProgress(originalUrl, onProgress)
  │         ├─ Web: fetch → ReadableStream → onProgress({ loaded, total, percent })
  │         └─ Native: XHR → onprogress → onProgress({ loaded, total, percent })
  ├─ progressMap[i] 更新 → <span>{100}%</span> 实时渲染
  └─ 完成 → cacheSet(originalUrl, blob) → loadedUrls[i] = blobUrl
       └─ 模糊占位 opacity→0, 原图 fadeIn
```

## 边界条件

| 场景 | 行为 |
|------|------|
| 预览图 URL 未传入或 LRU 中不存在 | 不显示模糊占位，仅显示加载进度 |
| Content-Length 不可用 | `percent: -1`，显示「加载中...」文字 + 旋转圆环 |
| 下载失败 | 移除进度遮罩，浏览器原生 `<img>` 显示 broken image（保持现状） |
| 翻到已加载页 | loadedUrls 命中，直接显示原图，不触发加载 |
| 翻到正在加载页 | progressMap 标记存在，不重复 startLoad |
| 快速连翻多页 | createEffect 自动追踪最新 currentPage，只触发一次 startLoad |

## 性能

- 预览图同步读取 LRU 缓存，零异步等待
- `Blob(chunks)` 不复制内存
- 动画仅 `opacity` / `transform`，GPU 合成
- 翻页仅对未加载页发起请求，去重双重保护

## 安全性

- 不暴露 Pixiv CDN 原始 URL（始终走 `/pixiv-img/` 代理）
- XHR native 模式注入正确 Referer / User-Agent
- Blob URL 由 LRU 缓存生命周期管理
