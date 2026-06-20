# 图片质量分级设计

日期: 2026-06-20

## 背景

当前 Pixivizer 所有场景直接使用 API 返回的固定尺寸 URL（`image_urls.large` 或 `original_image_url`），不做按需缩放。列表卡片加载 ~1200px 大图靠浏览器缩小，详情页直接加载原图，浪费带宽和内存。

其他 Pixiv 客户端（PixEz、PixShaft 等）利用 Pixiv CDN 的 `c/` 指令实现按需缩放，做到三级质量分离：列表缩略图 → 详情中等图 → 查看器原图。

## 目标

- 列表卡片：按实际显示宽度请求缩放图，质量 70
- 详情页封面：按视口宽度请求缩放图，质量 85
- 全屏查看器：加载原图，不做缩放
- 缓存层区分不同尺寸，避免互相覆盖
- 改动集中在 `imageLoader.ts` 和 `PixivImage.tsx`，调用方改动最小

## 设计

### 1. `c/` URL 构造 — `buildPixivImageUrl()`

位置：`src/utils/imageLoader.ts`

```ts
export function buildPixivImageUrl(originalUrl: string, maxWidth: number, quality: number): string;
```

- 解析原 URL 的 pathname，提取 `/img-original/...` 或 `/img-master/...` 部分
- 若 URL 已有 `c/` 前缀则先剥离
- 插入 `c/{maxWidth}x{maxWidth*10}_{quality}/`（高度设大值，CDN 按宽度约束、高度自适应原图比例）
- 解析失败返回原 URL

### 2. `loadImage()` 扩展

```ts
loadImage(
  originalUrl: string,
  opts?: { maxWidth?: number; quality?: number }
): Promise<LoadedImage>
```

- 有 `maxWidth` + `quality`：先用 `buildPixivImageUrl()` 构造 CDN URL，再走正常加载流程
- 缓存 key 后缀 `::w{maxWidth}q{quality}`，不同规格独立缓存
- 不传 opts 行为不变，向后兼容

### 3. `PixivImage` 组件

新增两个可选 prop：

| prop       | 类型     | 说明                      |
| ---------- | -------- | ------------------------- |
| `maxWidth` | `number` | 传给 `buildPixivImageUrl` |
| `quality`  | `number` | 传给 `buildPixivImageUrl` |

不传时行为完全不变。

### 4. 各场景配置

| 场景                    | maxWidth                          | quality | 计算方法                                        |
| ----------------------- | --------------------------------- | ------- | ----------------------------------------------- |
| ImageCard（瀑布流卡片） | `(viewportWidth / columns) * dpr` | 70      | `window.innerWidth` / 列数 × `devicePixelRatio` |
| IllustDetail 封面       | `viewportWidth * dpr`             | 85      | `window.innerWidth` × `devicePixelRatio`        |
| ImageViewer             | 不传                              | 不传    | 原图                                            |
| 头像/其他小图           | 不传                              | 不传    | 保持现状                                        |

## 改动范围

| 文件                            | 改动                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/utils/imageLoader.ts`      | 新增 `buildPixivImageUrl()`，扩展 `loadImage()` 签名，缓存 key 加后缀                    |
| `src/components/PixivImage.tsx` | Props 加 `maxWidth` 和 `quality`，透传给 `loadImage()`                                   |
| `src/components/ImageCard.tsx`  | 计算列宽，传 `maxWidth` + `quality=70`                                                   |
| `src/routes/IllustDetail.tsx`   | 封面 `PixivImage` 传 `maxWidth` + `quality=85`；`imageUrls()` 保持不变（查看器仍用原图） |

## 注意事项

- 列宽计算需要考虑响应式断点（`columns-2 sm:columns-3`），对应 2 列和 3 列
- DPR 取 `window.devicePixelRatio`，上限建议 3（高于 3 收益极小）
- 现有 LRU 缓存上限 200 条目，不同尺寸独立缓存后可能更快触达上限，但按 maxWidth 区分后重复请求少，实际影响不大
- 头像（`profile_image_urls.medium`）尺寸固定且小，无需 c/ 缩放
