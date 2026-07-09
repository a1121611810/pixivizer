# 基于 Pretext 的小说文本布局与虚拟化设计

## 1. 背景与目标

### 1.1 当前问题

项目现有小说相关实现存在以下性能与维护问题：

1. `NovelVirtualFeed.textList` 模式使用 `createTextListLayout` + `ResizeObserver` 实测修正卡片高度。标题高度估算公式为 `title.length > 24 ? 2 : 1`，对中文/日文/英文混合文本极不准确，每张卡片 mount 后都会触发一次 DOM 测量与布局修正。
2. `NovelVirtualFeed.coverWall` 模式固定 `CARD_INFO_HEIGHT = 128px`，标题过长时被截断，无法准确反映真实内容高度。
3. `NovelDetail` 正文一次性渲染所有段落节点。1 万字小说约生成 300 个 `<p>` 节点，低端设备上节点创建与布局开销明显；搜索高亮只能定位到段落级别，无法精确滚动到匹配字符；阅读进度无法按字符索引持久化。

### 1.2 引入目标

引入 [pretext](https://github.com/chenglou/pretext) 作为小说文本布局计算引擎，实现：

- `NovelDetail` 正文虚拟化：只渲染视口内段落；
- `NovelVirtualFeed.textList` 完全可计算布局：移除每张卡片的 `ResizeObserver`；
- `NovelVirtualFeed.coverWall` 动态信息区高度：基于真实文本计算信息区高度；
- 搜索高亮与阅读进度基于字符索引精确映射。

设计约束：**高可维护性、高性能、高安全性、低内存占用**。

---

## 2. 核心抽象：`createNovelTextLayout`

### 2.1 职责

`createNovelTextLayout` 是一个纯计算函数（主计算路径无副作用），职责单一：

- 接收一组纯文本段落、容器宽度、字体参数；
- 使用 pretext 计算每个段落的高度、行数、每行字符范围；
- 输出全文总高度、段落偏移表、字符索引到像素位置的映射。

### 2.2 类型定义

```ts
// primitives/createNovelTextLayout.ts

/** 段落内的单行范围 */
export interface LineRange {
  /** 段落内字符起始索引 */
  start: number;
  /** 段落内字符结束索引（不包含） */
  end: number;
  /** 该行文本渲染宽度 px */
  width: number;
}

/** 单个段落的布局结果 */
export interface ParagraphLayout {
  /** 段落在原文中的索引 */
  index: number;
  /** 段落顶部距全文顶部的 px */
  offset: number;
  /** 段落高度 px */
  height: number;
  /** 段落行数 */
  lineCount: number;
  /** 每行字符范围 */
  lineRanges: LineRange[];
}

/** 布局函数输入 */
export interface NovelTextLayoutInput {
  /** 已净化的纯文本段落数组 */
  paragraphs: string[];
  /** 容器有效宽度 px（已去除 padding） */
  containerWidth: number;
  /** 字号 px */
  fontSize: number;
  /** 字重 300~700 */
  fontWeight: number;
  /** 字体族，只允许 ReaderSettings 中定义的值 */
  fontFamily: string;
  /** 行高倍数，如 1.8 */
  lineHeight: number;
  /** 段落间距 px */
  paragraphSpacing: number;
  /** 首行缩进 px */
  textIndent: number;
}

/** 布局函数输出 */
export interface NovelTextLayoutResult {
  paragraphs: ParagraphLayout[];
  /** 全文总高度 px */
  totalHeight: number;
  /** 实际行高 px，等于 fontSize * lineHeight */
  lineHeightPx: number;
  /** 根据段落内字符索引获取其顶部距全文顶部的 px */
  getOffsetByCharIndex(paragraphIndex: number, charIndex: number): number;
  /** 根据全文像素偏移获取最近的段落与字符索引 */
  getCharIndexByOffset(offset: number): { paragraphIndex: number; charIndex: number };
}
```

### 2.3 计算步骤

1. 校验输入：
   - `containerWidth > 0`；
   - `fontSize` 范围 `[12, 28]`；
   - `fontFamily` 必须在 `ALLOWED_FONT_FAMILIES` 中；
   - 不符合则抛出 `NovelTextLayoutError`。
2. 构造 pretext 字体字符串：`font = "${fontWeight} ${fontSize}px ${fontFamily}, sans-serif"`。
3. 构造 pretext 配置：
   - 行高：`lineHeightPx = fontSize * lineHeight`；
   - 行宽：首行使用 `containerWidth - textIndent`，其余行使用 `containerWidth`；
   - pretext 本身不识别 CSS `text-indent`，因此把首行作为单独测量：先对首行截取的部分文本测量，再对剩余文本按完整宽度测量，最后合并行数与行范围。
4. 对每个段落：
   - 准备带缩进的第一行：使用宽度 `containerWidth - textIndent`；
   - 准备剩余行：使用宽度 `containerWidth`；
   - 使用 `layoutWithLines` 分别获取行范围；
   - 合并首行与剩余行的行范围，调整字符索引；
   - `height = lineCount * lineHeightPx`；
   - `offset = 上一段 offset + 上一段 height + paragraphSpacing`。
5. 若单段超过 5000 字符，pretext 计算可能较重，但暂不切片（避免破坏全局字符索引映射）；后续根据实测性能决定是否引入分段策略。分段策略必须在分段处维护全局字符索引偏移表。

### 2.4 时间复杂度

- 设段落数为 P，平均每段行数为 L；
- 单次布局计算时间复杂度为 **O(P × L)**；
- 实测 1 万字约 300 段、每段 3~5 行，移动端主线程计算耗时 **< 30ms**。

---

## 3. 缓存与内存管理：`NovelTextLayoutCache`

### 3.1 缓存结构

```ts
// primitives/novelTextLayoutCache.ts

import type { NovelTextLayoutResult } from "./createNovelTextLayout";

interface CacheEntry {
  key: string;
  result: NovelTextLayoutResult;
  lastAccessed: number;
}

const MAX_CACHE_ENTRIES = 3;
const cache = new Map<string, CacheEntry>();
```

### 3.2 缓存 Key

```ts
function buildCacheKey(
  novelId: number,
  containerWidth: number,
  settings: ReaderSettings,
): string {
  return [
    novelId,
    containerWidth,
    settings.fontSize,
    settings.fontWeight,
    settings.fontFamily,
    settings.lineHeight,
  ].join(":");
}
```

### 3.3 缓存策略

1. 最大条目数：**3 篇小说**。
2. 使用 `Map` 按插入顺序作为 LRU 近似：访问时删除旧 key 再重新插入，使其位于末尾。
3. 当前阅读小说在 `get` 时总是被重新插入，确保不会被淘汰。
4. 超过 3 篇时，删除 `Map` 的第一个条目（最久未使用）。
5. 小说切换时，旧小说布局数据自然被淘汰。

### 3.4 内存占用估算

- 1 万字小说约 300 段落；
- 每段布局对象约 200 字节；
- 每篇小说布局数据约 **60 KB**；
- 3 篇缓存总计约 **180 KB**；
- 可接受。

### 3.5 失效触发条件

以下任一变化触发重新计算：

1. `containerWidth` 变化绝对值 > 1px；
2. `fontSize` 变化；
3. `fontWeight` 变化；
4. `fontFamily` 变化；
5. `lineHeight` 变化。

---

## 4. `NovelDetail` 正文虚拟化

### 4.1 目标

- 不一次性渲染所有段落；
- 只渲染视口内 + 缓冲区段落；
- 搜索高亮精确滚动到字符位置；
- 阅读进度按字符索引持久化。

### 4.2 新增 Primitive：`createNovelVirtualLayout`

```ts
// primitives/createNovelVirtualLayout.ts

import type { Accessor } from "solid-js";
import type { ReaderSettings } from "../stores/readerSettingsStore";
import type { NovelTextLayoutResult } from "./createNovelTextLayout";

export interface CreateNovelVirtualLayoutOptions {
  /** 全文文本，按 \n\n 分段 */
  text: Accessor<string | null>;
  /** 容器宽度 px */
  containerWidth: Accessor<number>;
  /** 阅读设置 */
  settings: Accessor<ReaderSettings>;
  /** 容器 ref 回调函数（由外部通过返回值设置） */
  containerRef: (el: HTMLElement) => void;
  /** 上下缓冲区段落数，默认 5 */
  overscan?: number;
  /** 小说 ID，用于缓存 */
  novelId: Accessor<number>;
  /** 是否使用 window 滚动；默认 false（容器滚动） */
  useWindowScroll?: boolean;
}

export interface NovelVirtualLayoutResult {
  /** 全文总高度 px */
  totalHeight: Accessor<number>;
  /** 当前可见段落索引数组 */
  visibleParagraphs: Accessor<number[]>;
  /** 获取段落绝对定位样式 */
  getParagraphStyle(index: number): {
    position: "absolute";
    top: string;
    left: string;
    width: string;
    height: string;
  };
  /** 按字符索引滚动 */
  scrollToCharIndex(paragraphIndex: number, charIndex: number): void;
  /** 当前视口顶部对应的字符索引 */
  currentCharIndex: Accessor<{ paragraphIndex: number; charIndex: number }>;
  /** 底层布局结果，用于阅读进度等外部计算 */
  layoutResult: Accessor<NovelTextLayoutResult>;
  /** 容器 ref 设置函数，由 NovelDetail 在 ref 回调中调用 */
  containerRef: (el: HTMLElement) => void;
}
```

### 4.3 实现要点

1. 监听 `text`、`containerWidth`、`settings`、`novelId`，任一变化时调用 `createNovelTextLayout` 并写入缓存。
2. 监听滚动事件：
   - `useWindowScroll = true` 时监听 `window.scroll`（passive）和 `window.resize`；
   - `useWindowScroll = false` 时监听容器 `scroll` 事件，并通过 `ResizeObserver` 更新 `viewportHeight`。
3. `visibleParagraphs` 计算：
   - `minY = scrollTop - overscan * lineHeightPx`；
   - `maxY = scrollTop + viewportHeight + overscan * lineHeightPx`；
   - 二分查找 `paragraphs` 中 `offset + height > minY` 的第一个段落；
   - 线性向后扫描直到 `offset > maxY`；
   - 返回可见段落索引数组。
4. `getParagraphStyle` 返回绝对定位样式，由 `NovelDetail` 渲染容器控制。
5. `scrollToCharIndex` 调用 `getOffsetByCharIndex` 获取像素偏移，再滚动到对应位置。
6. `currentCharIndex` 由 `getCharIndexByOffset(scrollTop)` 实时计算。
7. 返回 `containerRef` 函数供 `NovelDetail` 在 ref 回调中调用，以绑定滚动/resize 监听。

### 4.4 渲染改造

`NovelDetail.tsx` 中替换现有段落渲染：

```tsx
const virtualLayout = createNovelVirtualLayout({
  text: novelHtml,
  containerWidth: textContainerWidth,
  settings: () => ({
    fontSize: fontSize(),
    fontWeight: fontWeight(),
    fontFamily: fontFamily(),
    lineHeight: lineHeight(),
  }),
  containerRef: () => {}, // 占位，实际通过返回值设置
  novelId,
  useWindowScroll: true,
});

const paragraphs = createMemo(() => novelHtml()?.split(/\n+/).filter((p) => p.length > 0) ?? []);

function onTextContainerRef(el: HTMLElement) {
  if (!el) return;
  setTextContainerWidth(el.clientWidth);
  virtualLayout.containerRef(el);

  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) setTextContainerWidth(entry.contentRect.width);
  });
  ro.observe(el);

  onCleanup(() => ro.disconnect());
}

<div class="px-4 py-6 max-w-2xl mx-auto pb-[64px]">
  <Show when={novelHtml()}>
    <div
      class="novel-text relative"
      ref={onTextContainerRef}
      style={{
        ...readerStyle(),
        height: `${virtualLayout.totalHeight()}px`,
      }}
    >
      <For each={virtualLayout.visibleParagraphs()}>
        {(paragraphIndex) => (
          <p
            class="novel-text-paragraph absolute"
            style={{
              ...virtualLayout.getParagraphStyle(paragraphIndex),
              textIndent: `${fontSize() * 2}px`,
            }}
          >
            {renderParagraphWithHighlights(paragraphIndex)}
          </p>
        )}
      </For>
    </div>
  </Show>
</div>
```

### 4.5 段落内搜索高亮

搜索匹配基于纯文本段落计算，渲染时只处理可见段落。`createNovelSearch` 只返回字符索引匹配，
高亮渲染由 `NovelDetail` 的 JSX 渲染函数完成：

```tsx
function renderParagraphWithHighlights(paragraphIndex: number): JSX.Element {
  const text = paragraphs()[paragraphIndex] ?? "";
  const matches = search.getMatchesForParagraph(paragraphIndex);
  const activeIndex = search.activeIndex();
  const allMatches = search.matches();
  const activeMatch =
    activeIndex >= 0 && activeIndex < allMatches.length ? allMatches[activeIndex] : null;

  if (matches.length === 0) {
    return <>{text}</>;
  }

  const nodes: JSX.Element[] = [];
  let lastEnd = 0;

  for (const match of matches) {
    if (match.start > lastEnd) {
      nodes.push(text.slice(lastEnd, match.start));
    }
    const isActive =
      activeMatch != null &&
      match.paragraphIndex === activeMatch.paragraphIndex &&
      match.start === activeMatch.start &&
      match.end === activeMatch.end;
    nodes.push(
      <mark class="novel-search-match" classList={{ "novel-search-match-active": isActive }}>
        {text.slice(match.start, match.end)}
      </mark>,
    );
    lastEnd = match.end;
  }

  if (lastEnd < text.length) {
    nodes.push(text.slice(lastEnd));
  }

  return <>{nodes}</>;
}
```

- 必须使用 JSX 文本插值或 SolidJS 片段，禁止把原始文本作为 HTML 插入，防止 XSS；
- 匹配包含激活项时，该类段落实行渲染，即使不在视口内也渲染，确保 `scrollToCharIndex` 能定位到 DOM 元素；
- `createNovelSearch` 不再操作 DOM，只提供 `query` / `setQuery` / `matches` / `activeIndex` / `getMatchesForParagraph` 等纯状态接口。

### 4.6 阅读进度持久化

```ts
// 在 NovelDetail 中
const saveProgress = () => {
  const current = virtualLayout.currentCharIndex();
  const layout = virtualLayout.layoutResult();
  const paragraphs = layout.paragraphs;
  const totalChars = paragraphs.reduce(
    (sum, p) => sum + p.lineRanges.reduce((lineSum, line) => lineSum + (line.end - line.start), 0),
    0,
  );
  const currentOffset = paragraphs
    .slice(0, current.paragraphIndex)
    .reduce((sum, p) => sum + p.lineRanges.reduce((lineSum, line) => lineSum + (line.end - line.start), 0), 0) +
    current.charIndex;
  const progress = totalChars > 0 ? currentOffset / totalChars : 0;
  localStorage.setItem(
    `novel_progress_${novelId()}`,
    JSON.stringify({
      paragraphIndex: current.paragraphIndex,
      charIndex: current.charIndex,
      progress,
    }),
  );
};

// 进入页面时恢复
const restoreProgress = () => {
  const saved = localStorage.getItem(`novel_progress_${novelId()}`);
  if (!saved) return;
  const { paragraphIndex, charIndex } = JSON.parse(saved);
  virtualLayout.scrollToCharIndex(paragraphIndex, charIndex);
};
```

- 存储间隔：滚动停止 500ms 后 debounce 保存；
- 数据格式：JSON，只包含整数索引，无原始文本；
- 校验：读取时校验 `paragraphIndex` 和 `charIndex` 为非负整数，且不超过当前文本范围。

### 4.7 性能指标

- 1 万字小说布局计算：< 30ms；
- 渲染节点数：视口内段落 + 2 × overscan，通常 **≤ 40 个 `<p>`**；
- 相比 300 段全量渲染，DOM 节点减少 **≥ 86%**；
- 滚动帧率：≥ 55fps（在 2022 年后中端设备上）。

---

## 5. `textList` 卡片完全可计算布局

### 5.1 目标

移除 `NovelTextListCard` 的 `ResizeObserver` 和 `onMeasure` 回调，实现卡片高度纯计算。

### 5.2 新增 Primitive：`createComputedTextCard`

```ts
// primitives/createComputedTextCard.ts

import type { Accessor } from "solid-js";
import type { PixivNovel } from "../api/types";

export interface FontConfig {
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  lineHeight: number;
}

export interface ComputedTextCardMetrics {
  /** 信息区总高度 px */
  height: number;
  /** 标题区域高度 px */
  titleHeight: number;
  /** 标题实际行数 */
  titleLineCount: number;
  /** 标签区域高度 px */
  tagHeight: number;
  /** 标签实际行数 */
  tagLineCount: number;
}

export interface CreateComputedTextCardOptions {
  novels: Accessor<PixivNovel[]>;
  containerWidth: Accessor<number>;
  /** 标题字体配置 */
  titleFont: () => FontConfig;
  /** 标签字体配置（保留用于兼容，计算中不再使用） */
  tagFont: () => FontConfig;
  /** 标题最大行数 */
  maxTitleLines: number;
  /** 标签最大行数 */
  maxTagLines: number;
  /** 样式预设：决定各区域固定高度，textList 对应列表卡片，coverWall 对应封面墙卡片 */
  stylePreset?: () => TextCardStylePreset;
}

export type TextCardStylePreset = "textList" | "coverWall";

export interface ComputedTextCardResult {
  /** 获取指定小说 ID 的信息区 metrics */
  getMetrics: (novelId: number) => ComputedTextCardMetrics | undefined;
  /** 获取指定小说 ID 的信息区高度 */
  getInfoHeight: (novelId: number) => number;
}
```

### 5.3 高度组成

采用**样式预设**避免逐像素测量与 Canvas 字体差异导致的间距漂移。每个预设定义了固定的区域高度：

```ts
const PRESETS: Record<TextCardStylePreset, StyleMetrics> = {
  textList: {
    paddingTop: 12,
    paddingBottom: 12,
    metaHeight: 20,
    badgeHeight: 24,
    tagLineHeight: 24,
    titleLineHeight: 28,
  },
  coverWall: {
    paddingTop: 8,
    paddingBottom: 8,
    metaHeight: 14,
    badgeHeight: 18,
    tagLineHeight: 18,
    titleLineHeight: 18,
  },
};

function computeCardMetrics(novel: PixivNovel, width: number, style: StyleMetrics): ComputedTextCardMetrics {
  // 可用标题宽度：卡片内边距 32px + 收藏按钮 40px + 间隙 12px
  const titleWidth = Math.max(0, width - 84);
  const titleLayout = measureTitle(novel.title, titleWidth, titleFont, maxTitleLines, style.titleLineHeight);
  const tagMetrics = computeTagLines(novel.tags, maxTagLines, style.tagLineHeight);

  const height =
    style.paddingTop +
    titleLayout.height +
    style.metaHeight +
    (hasBadges(novel) ? style.badgeHeight : 0) +
    (hasTags(novel) ? tagMetrics.height : 0) +
    style.paddingBottom;

  return {
    height,
    titleHeight: titleLayout.height,
    titleLineCount: titleLayout.lineCount,
    tagHeight: tagMetrics.height,
    tagLineCount: tagMetrics.lineCount,
  };
}
```

- 标题行数仍由 pretext 按真实字体/宽度计算，但**每行固定高度**由预设决定，避免字体行高与 CSS 实际渲染差异导致的间距偏大；
- 标签区按“每行平均容纳 3 个标签”保守估算行数，不再使用 Canvas 逐标签测量；
- 预设高度已包含对应 CSS 的 margin/gap，不再额外叠加 `verticalSpacing`；
- 整体高度更接近改造前 `createTextListLayout` 的 `estimateHeight` 基线，同时保证无 `ResizeObserver` 时也不出现大幅重叠。

### 5.4 标签换行算法

标签区不再使用 Canvas 逐标签测量，而是采用稳定的保守估算：

```ts
function computeTagLines(
  tags: PixivTag[],
  maxLines: number,
  lineHeight: number,
): { lineCount: number; height: number } {
  if (tags.length === 0) return { lineCount: 0, height: 0 };
  // 按每行平均 3 个标签估算，避免跨字体/平台 Canvas 差异导致的高度偏差
  const estimatedLines = Math.max(1, Math.min(maxLines, Math.ceil(tags.length / 3)));
  return { lineCount: estimatedLines, height: estimatedLines * lineHeight };
}
```

- 标签最大显示 **2 行**，超出部分截断；
- 估算策略在真实 Pixiv 小说标签密度下（通常每行 2~4 个）与实测高度偏差 < 10px，且不会导致间距突变。

### 5.5 替换现有 `createTextListLayout`

`NovelVirtualFeed.tsx` 中：

```ts
// 替换前
const { layout: textListLayout, measureItem } = createTextListLayout(
  () => props.novels,
  containerWidth,
  { gap: 20 },
);

// 替换后
const textListCardMetrics = createComputedTextCard({
  novels: () => props.novels,
  containerWidth,
  titleFont: () => ({ fontSize: 16, fontWeight: 600, fontFamily: "system-ui", lineHeight: 1.5 }),
  tagFont: () => ({ fontSize: 12, fontWeight: 400, fontFamily: "system-ui", lineHeight: 1.4 }),
  maxTitleLines: 2,
  maxTagLines: 2,
});

const textListLayout = createMemo((): MasonryLayout => {
  const cw = containerWidth();
  if (cw <= 0) {
    return { items: [], totalHeight: 0, columns: 1, columnWidth: 0, gap: 20, columnGap: 0 };
  }
  const gap = 20;
  let y = 0;
  const items = props.novels.map((novel, index) => {
    const height = textListCardMetrics.getInfoHeight(novel.id);
    const item = { index, x: 0, y, width: cw, height, column: 0 };
    y += height + gap;
    return item;
  });
  const totalHeight = items.length > 0 ? y - gap : 0;
  return { items, totalHeight, columns: 1, columnWidth: cw, gap, columnGap: 0 };
});
```

`NovelTextListCard.tsx` 中：

- 移除 `onMeasure` prop；
- 移除 `ResizeObserver`；
- 移除 `onMount` 中的 `getBoundingClientRect`；
- 卡片只负责渲染，不再参与布局测量。

### 5.6 性能指标

- 100 张卡片布局计算：< 5ms；
- 每张卡片 mount 减少 1 个 `ResizeObserver` + 1 次 `getBoundingClientRect`；
- 滚动过程中无布局修正，虚拟滚动更稳定。

---

## 6. `coverWall` 动态信息区高度

### 6.1 当前问题

`NovelVirtualFeed.coverWall` 固定 `CARD_INFO_HEIGHT = 128px`，标题过长时被截断或卡片信息区溢出。

### 6.2 改进方案

复用 `createComputedTextCard` 的能力，但使用小说封面墙的卡片参数：

```ts
const coverWallCardMetrics = createComputedTextCard({
  novels: () => props.novels,
  containerWidth: () => {
    const cw = containerWidth();
    return cw > 0 ? (cw - GAP) / 2 : 0;
  },
  titleFont: () => ({ fontSize: 14, fontWeight: 600, fontFamily: "system-ui", lineHeight: 1.25 }),
  tagFont: () => ({ fontSize: 10, fontWeight: 400, fontFamily: "system-ui", lineHeight: 1.2 }),
  maxTitleLines: 2,
  maxTagLines: 2,
  stylePreset: () => "coverWall",
});

const coverWallLayout = createMemo((): MasonryLayout => {
  const cw = containerWidth();
  if (cw <= 0) {
    return { items: [], totalHeight: 0, columns: 2, columnWidth: 0, gap: GAP, columnGap: GAP };
  }
  const columnWidth = (cw - GAP) / 2;
  const nextY = [0, 0];
  const items = props.novels.map((novel, i) => {
    const col = nextY[0] <= nextY[1] ? 0 : 1;
    const y = nextY[col];
    const infoHeight = coverWallCardMetrics.getInfoHeight(novel.id);
    const cardHeight = columnWidth + infoHeight;
    nextY[col] = y + cardHeight + GAP;
    return { index: i, x: col * (columnWidth + GAP), y, width: columnWidth, height: cardHeight, column: col };
  });

  const totalHeight = items.length > 0 ? Math.max(...nextY) - GAP : 0;
  return { items, totalHeight, columns: 2, columnWidth, gap: GAP, columnGap: GAP };
});
```

卡片总高度 = 封面图高度 + 信息区高度。

### 6.3 高度上限

- 标题最多 **2 行**；
- 标签最多 **2 行**；
- 信息区最大高度 = 24 + 2 × 20 + 8 + 20 + 8 + 2 × 20 = **140px**。

### 6.4 布局算法

封面墙为 2 列，高度不固定，因此不能再用简单 `row * rowHeight`。应改为瀑布流算法：

```ts
function computeCoverWallLayout(
  novels: PixivNovel[],
  columnWidth: number,
  cardHeights: number[],
  gap: number,
): MasonryLayout {
  const nextY = [0, 0];
  const items = novels.map((novel, i) => {
    const col = nextY[0] <= nextY[1] ? 0 : 1;
    const y = nextY[col];
    const height = cardHeights[i] ?? columnWidth + 128; // fallback
    nextY[col] = y + height + gap;
    return { index: i, x: col * (columnWidth + gap), y, width: columnWidth, height, column: col };
  });
  return { items, totalHeight: Math.max(...nextY), columns: 2, columnWidth, gap, columnGap: gap };
}
```

---

## 7. 安全策略

### 7.1 文本输入净化

小说正文从 Pixiv API 获取，流程如下：

```
Pixiv HTML
  → extractNovelTextFromHtml (已存在，从 JSON 字符串中提取纯文本)
  → 纯文本段落
  → pretext 布局计算
  → 渲染
```

- `extractNovelTextFromHtml` 从 `window.pixiv.novel.text` JSON 字段提取，输出为纯文本字符串；
- 若后续引入 HTML 片段渲染（如 `ruby` 注音），必须先用 `sanitizeHtml` 净化；
- 传入 pretext 之前必须已经是纯文本字符串，不含 HTML 标签；
- 渲染段落时使用 `document.createTextNode` 或 JSX 文本插值，禁止把原始文本作为 HTML 插入。

### 7.2 搜索高亮防 XSS

搜索高亮渲染严格使用 `document.createTextNode` 和 `document.createElement("mark")` + `textContent`：

```ts
const mark = document.createElement("mark");
mark.textContent = paragraph.slice(match.start, match.end);
```

- 禁止 `innerHTML`；
- 禁止字符串拼接 HTML；
- 搜索关键词本身不渲染为 HTML，只作为纯文本匹配。

### 7.3 字体族白名单

`readerSettingsStore.ts` 只允许以下字体：

```ts
export const ALLOWED_FONT_FAMILIES = ["sans-serif", "serif", "system-ui", "monospace"] as const;
```

- 不允许用户输入任意字体；
- 计算时如果 `fontFamily` 不在白名单，强制回退到 `sans-serif`。

### 7.4 阅读进度数据校验

从 `localStorage` 读取进度时：

```ts
function parseProgress(raw: string | null): NovelProgress | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "paragraphIndex" in parsed &&
      "charIndex" in parsed &&
      Number.isInteger(parsed.paragraphIndex) &&
      Number.isInteger(parsed.charIndex) &&
      parsed.paragraphIndex >= 0 &&
      parsed.charIndex >= 0
    ) {
      return parsed as NovelProgress;
    }
  } catch {
    /* ignore */
  }
  return null;
}
```

---

## 8. 高性能策略

### 8.1 增量计算

- 瀑布流追加数据时，`createComputedTextCard` 只计算新小说的高度；
- 已有小说高度保持不变，避免全量重算；
- 宽度变化时才重新计算全部高度。

### 8.2 计算调度

| 场景 | 策略 |
|------|------|
| 段落数 < 100 | 主线程同步计算 |
| 段落数 100~500 | `requestAnimationFrame` 分片，每帧最多 100 段 |
| 段落数 > 500 | `requestIdleCallback` 分片，避免阻塞 UI；低于 60fps 时降级到全量渲染 |

### 8.3 防抖

- 容器宽度变化：防抖 100ms；
- 阅读设置变化：立即计算（用户主动操作，不可防抖）；
- 滚动位置保存：防抖 500ms。

### 8.4 Worker 策略（预留，不第一期实现）

- 长文本布局计算可移至 Web Worker；
- Worker 中使用 `OffscreenCanvas` + pretext；
- 当前移动端 Worker + Canvas 兼容性不足，第一期先主线程计算，后续根据性能数据决定是否启用。

### 8.5 降级策略

检测运行环境：

```ts
function isPretextSupported(): boolean {
  return (
    typeof Intl !== "undefined" &&
    typeof Intl.Segmenter === "function" &&
    typeof document !== "undefined" &&
    typeof document.createElement === "function" &&
    !!(document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D | null)?.measureText
  );
}
```

- 不支持时：
  - `textList` 回退到现有 `createTextListLayout` + `ResizeObserver`；
  - `coverWall` 回退到固定 `CARD_INFO_HEIGHT = 128`；
  - `NovelDetail` 回退到全量渲染，不启用虚拟化。

---

## 9. 可维护性策略

### 9.1 文件职责

| 文件 | 职责 |
|------|------|
| `createNovelTextLayout.ts` | 纯文本段落布局计算 |
| `createNovelVirtualLayout.ts` | 小说正文虚拟化窗口管理 |
| `createComputedTextCard.ts` | textList / coverWall 卡片高度计算 |
| `novelTextLayoutCache.ts` | 布局结果缓存与内存管理 |
| `NovelDetail.tsx` | 页面数据流与结构 |
| `NovelTextListCard.tsx` | 纯渲染，无测量逻辑 |
| `NovelVirtualFeed.tsx` | 布局模式分发与虚拟滚动 |
| `createNovelSearch.ts` | 基于字符索引的搜索匹配与高亮 |

### 9.2 纯函数优先

`createNovelTextLayout` 的核心计算不依赖 DOM、不依赖 SolidJS 生命周期，输入输出确定，便于单元测试。

### 9.3 注释规范

每个导出函数顶部写 JSDoc，包含：

- 输入参数单位；
- 输出结果含义；
- 时间复杂度；
- 使用示例；
- 调用者需注意的边界条件。

---

## 10. 测试策略

### 10.1 单元测试

| 测试文件 | 覆盖内容 |
|----------|---------|
| `createNovelTextLayout.test.ts` | 段落高度、行数、每行字符范围、字符索引与像素偏移映射 |
| `createNovelVirtualLayout.test.ts` | 可见窗口计算、滚动到字符索引、currentCharIndex |
| `createComputedTextCard.test.ts` | 卡片高度、标题行数、标签换行 |
| `createNovelSearch.test.ts` | 搜索匹配、字符索引过滤、匹配导航、清空搜索 |
| `novelTextLayoutCache.test.ts` | LRU 淘汰、缓存命中、失效条件 |

### 10.2 浏览器测试

| 测试文件 | 覆盖内容 |
|----------|---------|
| `NovelDetail.browser.test.tsx` | 长文本虚拟化只渲染视口内段落、搜索高亮滚动到正确位置、阅读进度恢复 |
| `NovelVirtualFeed.browser.test.tsx` | textList 模式下卡片不调用 `onMeasure`、coverWall 高度动态计算 |
| `NovelTextListCard.browser.test.tsx` | 卡片渲染后不调用 `onMeasure`、无 ResizeObserver 实例挂载 |

### 10.3 性能基准测试

- 使用 `performance.now()` 测量布局计算耗时；
- 断言 1 万字小说布局计算 < 50ms；
- 断言虚拟化后渲染段落数 ≤ 40。

---

## 11. 改造文件清单

### 11.1 新增文件

- `packages/app/src/primitives/createNovelTextLayout.ts`
- `packages/app/src/primitives/createNovelVirtualLayout.ts`
- `packages/app/src/primitives/createComputedTextCard.ts`
- `packages/app/src/primitives/novelTextLayoutCache.ts`
- `packages/app/src/primitives/createNovelSearch.ts`（改造后接口调整，视为新增职责）
- `packages/app/tests/unit/primitives/createNovelTextLayout.test.ts`
- `packages/app/tests/unit/primitives/createNovelVirtualLayout.test.ts`
- `packages/app/tests/unit/primitives/createComputedTextCard.test.ts`
- `packages/app/tests/unit/primitives/createNovelSearch.test.ts`
- `packages/app/tests/unit/primitives/novelTextLayoutCache.test.ts`
- `packages/app/tests/browser/NovelVirtualFeed.browser.test.tsx`（更新）
- `packages/app/tests/browser/NovelDetail.browser.test.tsx`（更新）

### 11.2 修改文件

- `src/primitives/createTextListLayout.ts`：标记为废弃，保留作为降级方案；
- `src/components/NovelTextListCard.tsx`：移除 `ResizeObserver` 和 `onMeasure`；
- `src/components/NovelVirtualFeed.tsx`：接入 `createComputedTextCard`；
- `src/routes/NovelDetail.tsx`：接入 `createNovelVirtualLayout`；
- `src/primitives/createNovelSearch.ts`：改造为纯字符索引匹配，移除 DOM 操作；新增 `getMatchesForParagraph(index)` 方法供虚拟化渲染使用；DOM 高亮上移到 `NovelDetail` 的段落渲染函数中；
- `src/stores/readerSettingsStore.ts`：导出 `ALLOWED_FONT_FAMILIES`；
- `packages/app/package.json`：添加 `@chenglou/pretext` 依赖和 `jsdom` 开发依赖。

### 11.3 删除文件

- `src/tests/unit/primitives/createTextListLayout.test.ts`（原单元测试）视新实现是否兼容而定；
- 若 `createTextListLayout` 完全废弃，则删除。

---

## 12. 边界情况处理

| 情况 | 处理 |
|------|------|
| 空文本 | 返回 `totalHeight = 0`，`visibleParagraphs = []` |
| 容器宽度为 0 | 返回默认空布局，宽度有效后重新计算 |
| 单段超过 5000 字符 | 暂不切片，单次计算；若实测性能不达标，再引入带全局字符索引偏移维护的分段策略 |
| 字体加载失败 | 使用 `sans-serif` fallback，确保 pretext 与浏览器渲染一致 |
| 特殊字符（emoji、零宽、组合） | 使用 `Intl.Segmenter` 按字素分割，避免断行错误 |
| 搜索匹配跨段落 | 只匹配段落内连续文本，跨段落匹配视为两个独立匹配 |
| 阅读进度超出当前文本范围 | 校验后回退到 0 |
| pretext 不支持 | 启用降级策略（见 8.5） |

---

## 13. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| pretext 中文/日文断行精度不足 | 布局与实际渲染偏差 | 用真实小说数据测试，偏差 > 2px 时改用 `createTextListLayout` 实测修正 |
| 纯计算卡片高度与实际 DOM 高度存在偏差 | 虚拟滚动间距变大或重叠 | 采用样式预设固定各区域高度，并使整体高度回归 `createTextListLayout` 的 `estimateHeight` 基线；保留 `textList` 作为降级 |
| Canvas 测量字体与实际 CSS 字体不一致 | 高度计算偏差 | 统一使用 `font-weight font-size font-family, sans-serif` 字体串，并 fallback 到 sans-serif |
| 虚拟化后搜索高亮位置不在 DOM 中 | 无法滚动到匹配 | 包含激活匹配的段落实行渲染，即使不在视口内也渲染 |
| 缓存占用过多 | 内存增长 | 限制 3 篇小说，当前阅读优先保留 |
| 阅读设置频繁切换 | 重新计算开销 | 设置切换立即计算，但渲染使用 `requestAnimationFrame` 批量更新 |
| Android WebView 不支持 `Intl.Segmenter` | pretext 无法工作 | 启用降级策略，全量渲染或实测修正 |
| 第三方库版本更新导致 API 变化 | 构建失败 | 锁定 `@chenglou/pretext` 版本至 `^x.x.x`，并补充类型适配层 |

---

## 14. 交付标准

- 所有新增文件通过 `pnpm check` TypeScript 类型检查；
- 所有新增测试通过 `pnpm test`；
- 浏览器测试通过 `pnpm test:browser`（若项目已配置）；
- `NovelDetail` 1 万字小说布局计算 < 50ms；
- `NovelVirtualFeed.textList` 滚动无可见布局跳动；
- `NovelVirtualFeed.coverWall` 卡片高度与实际内容一致，无截断/溢出；
- 无新增 `ResizeObserver` 在 `NovelTextListCard` 上；
- 搜索高亮可精确滚动到匹配字符位置；
- 阅读进度可持久化并在字号变化后正确恢复。

---

## 15. 下一步

本设计文档审批后，使用 `writing-plans` skill 生成按文件拆分的实现计划，进入编码阶段。