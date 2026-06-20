# 图片质量分级实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 利用 Pixiv CDN `c/` 指令实现按需图片缩放，列表卡片/详情封面/全屏查看器三级质量分离。

**Architecture:** 在 `imageLoader.ts` 新增 `buildPixivImageUrl()` 构造 `c/` URL，扩展 `loadImage()` 支持 `maxWidth`/`quality` 参数并区分缓存 key。`PixivImage` 组件透传这两个 prop，`ImageCard` 和 `IllustDetail` 按场景传入对应值。

**Tech Stack:** TypeScript, SolidJS, Pixiv CDN `c/` 指令

## Global Constraints

- 改动集中在 `imageLoader.ts`、`PixivImage.tsx`、`ImageCard.tsx`、`IllustDetail.tsx`
- 不传新 prop 时行为完全不变（向后兼容）
- DPR 上限 3
- 不提交 commit，由用户自行审查

---

### Task 1: 新增 `buildPixivImageUrl()` 工具函数

**Files:**

- Modify: `src/utils/imageLoader.ts`（在 `resolveImageUrl` 之后插入）

**Interfaces:**

- Produces: `buildPixivImageUrl(originalUrl: string, maxWidth: number, quality: number): string`

- [ ] **Step 1: 在 `imageLoader.ts` 中添加 `buildPixivImageUrl` 函数**

在 `resolveImageUrl` 函数后面、`// ─── 带缓存的图片加载 ───` 注释之前插入：

```ts
// ─── c/ 指令 URL 构造 ───

/**
 * 将 Pixiv 图片原始 URL 转换为带 c/ 指令的按需缩放 URL。
 *
 * 例如：https://i.pximg.net/img-original/img/2024/.../123_p0.jpg
 *   →  https://i.pximg.net/c/600x6000_70/img-original/img/2024/.../123_p0.jpg
 *
 * @param originalUrl 原始图片 URL（可来自 image_urls.large 或 original_image_url）
 * @param maxWidth 最大宽度（px），CDN 会按此宽度等比缩放
 * @param quality JPEG 质量 1-100
 * @returns 带 c/ 指令的 CDN URL；解析失败时返回原 URL
 */
export function buildPixivImageUrl(originalUrl: string, maxWidth: number, quality: number): string {
  if (!originalUrl) return "";

  try {
    const u = new URL(originalUrl);
    // 提取路径，去掉开头的 /
    let path = u.pathname.replace(/^\//, "");

    // 如果已有 c/ 前缀，剥离它
    const cMatch = path.match(/^c\/\d+x\d+(_\d+)?\/(.+)$/);
    if (cMatch) {
      path = cMatch[2];
    }

    // 高度设为 maxWidth * 10，足够大使 CDN 仅按宽度约束、高度自适应比例
    const height = Math.round(maxWidth * 10);
    u.pathname = `/c/${Math.round(maxWidth)}x${height}_${Math.round(quality)}/${path}`;
    return u.toString();
  } catch {
    return originalUrl;
  }
}
```

- [ ] **Step 2: 验证函数行为**

在浏览器 console 或写一个临时调用来验证。预期的几个 case：

```ts
// 正常 URL
buildPixivImageUrl(
  "https://i.pximg.net/img-original/img/2024/01/01/00/00/00/12345678_p0.jpg",
  600,
  70,
);
// → 'https://i.pximg.net/c/600x6000_70/img-original/img/2024/01/01/00/00/00/12345678_p0.jpg'

// 已有 c/ 的 URL（large 格式）
buildPixivImageUrl(
  "https://i.pximg.net/c/600x1200_90/img-master/img/2024/01/01/00/00/00/12345678_p0_master1200.jpg",
  360,
  70,
);
// → 'https://i.pximg.net/c/360x3600_70/img-master/img/2024/01/01/00/00/00/12345678_p0_master1200.jpg'

// 空字符串
buildPixivImageUrl("", 600, 70);
// → ''
```

验证通过后继续下一步。不提交。

---

### Task 2: 扩展 `loadImage()` 支持 `maxWidth` / `quality`

**Files:**

- Modify: `src/utils/imageLoader.ts`（修改 `loadImage` 函数签名和实现）

**Interfaces:**

- Consumes: `buildPixivImageUrl` from Task 1
- Produces: `loadImage(originalUrl: string, opts?: { maxWidth?: number; quality?: number }): Promise<LoadedImage>`

- [ ] **Step 1: 修改 `loadImage` 签名和缓存 key 逻辑**

将现有的：

```ts
export async function loadImage(originalUrl: string): Promise<LoadedImage> {
  if (!originalUrl) {
    return { url: '', cleanup: () => {} };
  }

  // 1. 检查缓存
  const cached = cacheGet(originalUrl);
```

改为：

```ts
export interface LoadImageOptions {
  /** 最大宽度（px），传入则通过 c/ 指令请求 CDN 缩放图 */
  maxWidth?: number;
  /** JPEG 质量 1-100，仅 maxWidth 传入时生效 */
  quality?: number;
}

export async function loadImage(
  originalUrl: string,
  opts?: LoadImageOptions,
): Promise<LoadedImage> {
  if (!originalUrl) {
    return { url: '', cleanup: () => {} };
  }

  // 构造请求 URL（可能带 c/ 指令）和缓存 key
  const requestUrl =
    opts?.maxWidth != null && opts?.quality != null
      ? buildPixivImageUrl(originalUrl, opts.maxWidth, opts.quality)
      : originalUrl;

  // 缓存 key：不同尺寸独立缓存
  const cacheKey =
    opts?.maxWidth != null && opts?.quality != null
      ? `${originalUrl}::w${Math.round(opts.maxWidth)}q${Math.round(opts.quality)}`
      : originalUrl;

  // 1. 检查缓存
  const cached = cacheGet(cacheKey);
```

然后将后续所有 `originalUrl` 引用（除了缓存 key 和请求 URL 构造处）替换为 `requestUrl` 和 `cacheKey`。具体替换点：

```ts
// 2. 加载图片 — 使用 requestUrl
try {
  let blob: Blob;

  if (isNative) {
    blob = await fetchNative(requestUrl);
  } else {
    blob = await fetchWeb(requestUrl);
  }

  // 3. 存入缓存 — 使用 cacheKey
  cacheSet(cacheKey, blob);

  // 4. 创建 Blob URL
  const blobUrl = URL.createObjectURL(blob);
  return {
    url: blobUrl,
    cleanup: () => URL.revokeObjectURL(blobUrl),
  };
} catch (e) {
  console.warn(`[ImageCache] Load failed: ${requestUrl}`, e);
  // 失败时回退到代理 URL
  return {
    url: resolveImageUrl(requestUrl),
    cleanup: () => {},
  };
}
```

注意：现有 `loadImage` 调用方不传 opts，行为完全不变（`requestUrl === originalUrl`，`cacheKey === originalUrl`）。

- [ ] **Step 2: 验证向后兼容**

确保现有调用 `loadImage(src)` 不带第二个参数时编译通过且行为不变。可以在浏览器中打开应用，确认列表和详情页图片正常加载。

---

### Task 3: `PixivImage` 组件新增 `maxWidth` / `quality` props

**Files:**

- Modify: `src/components/PixivImage.tsx`

**Interfaces:**

- Consumes: `loadImage` 新签名 from Task 2
- Produces: `PixivImage` 新增可选 props `maxWidth?: number` 和 `quality?: number`

- [ ] **Step 1: 修改 `PixivImageProps` 接口和 `load()` 函数**

```tsx
// PixivImageProps 接口新增两个字段：
interface PixivImageProps {
  src: string;
  alt?: string;
  class?: string;
  style?: string | Record<string, string | number>;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  draggable?: boolean;
  maxWidth?: number; // 新增：传给 buildPixivImageUrl
  quality?: number; // 新增：传给 buildPixivImageUrl
  onClick?: (e: MouseEvent) => void;
}

// load() 函数改为：
async function load() {
  try {
    const result = await loadImage(props.src, {
      maxWidth: props.maxWidth,
      quality: props.quality,
    });
    cleanupFn = result.cleanup;
    setDisplayUrl(result.url);
  } catch (e) {
    console.error(`[PixivImage] Failed: ${props.src}`, e);
    setFailed(true);
  }
}
```

- [ ] **Step 2: 验证**

不改任何调用方，应用应该正常运行（不传新 prop 时行为不变）。确认图片加载正常。

---

### Task 4: `ImageCard` 传入 `maxWidth` 和 `quality=70`

**Files:**

- Modify: `src/components/ImageCard.tsx`

**Interfaces:**

- Consumes: `PixivImage` 新 props from Task 3

- [ ] **Step 1: 计算 maxWidth 并传给 PixivImage**

```tsx
import { createMemo } from 'solid-js';
import type { Component } from 'solid-js';
import type { PixivIllust } from '../api/types';
import PixivImage from './PixivImage';

// 工具函数：获取当前列宽（按 CSS 像素，再乘 DPR）
function getCardMaxWidth(): number {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  // 匹配 UnoCSS/Tailwind 响应式断点：< 640px 2 列，≥ 640px 3 列
  const columns = window.innerWidth >= 640 ? 3 : 2;
  const gap = 12; // gap-3 = 12px
  const padding = 12; // px-3 = 12px * 2 边
  const cardWidth = (window.innerWidth - padding * 2 - gap * (columns - 1)) / columns;
  return Math.round(cardWidth * dpr);
}

interface Props {
  illust: PixivIllust;
  onClick: (id: number) => void;
}

const ImageCard: Component<Props> = (props) => {
  const img = () => props.illust.image_urls.large;
  const w = () => props.illust.width;
  const h = () => props.illust.height;
  const isUgoira = () => props.illust.type === 'ugoira';

  // 计算该卡片显示时需要的图片宽度
  const maxWidth = createMemo(() => getCardMaxWidth());

  return (
    <div
      class="image-card break-inside-avoid mb-3"
      onClick={() => props.onClick(props.illust.id)}
    >
      <div class="relative">
        <PixivImage
          src={img()}
          alt={props.illust.title}
          width={w()}
          height={h()}
          loading="eager"
          maxWidth={maxWidth()}
          quality={70}
          class="w-full h-auto block"
        />
        {/* ugoira/page_count 标记保持不变 */}
        ...
```

- [ ] **Step 2: 浏览器中验证**

打开应用，检查 Network 面板中列表卡片图片请求 URL 是否带 `c/360x3600_70/` 或类似前缀。确认图片正常显示、无模糊或变形。

---

### Task 5: `IllustDetail` 封面传入 `maxWidth` 和 `quality=85`

**Files:**

- Modify: `src/routes/IllustDetail.tsx`

**Interfaces:**

- Consumes: `PixivImage` 新 props from Task 3

- [ ] **Step 1: 为封面 PixivImage 传入 maxWidth 和 quality**

在 `IllustDetail` 组件开头添加辅助函数：

```tsx
// 详情页封面最大宽度（CSS 像素 × DPR）
function getDetailMaxWidth(): number {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return Math.round(window.innerWidth * dpr);
}
```

修改封面 `PixivImage`：

```tsx
{
  /* Cover image (tap → viewer) */
}
<div
  class="flex justify-center bg-[var(--colorNeutralBackground2)] cursor-pointer border-b border-[var(--colorNeutralStroke2)]"
  onClick={() => openViewer()}
>
  <PixivImage
    src={imageUrls()[0]}
    alt={illust()!.title}
    width={illust()!.width}
    height={illust()!.height}
    loading="eager"
    maxWidth={getDetailMaxWidth()}
    quality={85}
    class="max-h-[60vh] object-contain cursor-pointer"
  />
</div>;
```

注意：**不修改** `imageUrls()` 函数——它仍返回原图 URL 给 `ImageViewer` 使用。只有封面 `PixivImage` 多传了 `maxWidth` 和 `quality`，`ImageViewer` 内部的 `PixivImage` 不传这两个 prop，所以仍加载原图。

- [ ] **Step 2: 浏览器中验证**

打开作品详情页，检查 Network 面板中封面图片请求 URL 是否带 `c/...x..._85/` 前缀。点击封面进入查看器，确认查看器加载的是原图（不带 `c/` 前缀）。

---

### Task 6: 完整性验证

- [ ] **Step 1: 全流程验证**

1. 打开应用首页 → 列表正常加载，图片 URL 带 `c/..._70`
2. 点击卡片进入详情 → 封面加载中等图，URL 带 `c/..._85`
3. 点击封面进入查看器 → 原图加载，URL 不带 `c/`
4. 头像、小图 → 不受影响，正常加载
5. 旋转屏幕 → 列表和详情封面应重新按新宽度请求（Vite dev server 热更新或刷新验证）

- [ ] **Step 2: 缓存隔离验证**

同一张图的列表卡片和详情封面应产生两次独立请求（不同 `c/` 参数），不应互相覆盖。可在 Network 面板确认。

---

### 完成

所有改动在以下文件中：

- `src/utils/imageLoader.ts`
- `src/components/PixivImage.tsx`
- `src/components/ImageCard.tsx`
- `src/routes/IllustDetail.tsx`

改动后不提交，由用户自行审查后决定是否 commit。
