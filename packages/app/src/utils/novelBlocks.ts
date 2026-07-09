import type { NovelImageUrls, NovelImagesMap } from "@/api/novel";

/** 文本段落块 */
export interface TextBlock {
  type: "text";
  /** 该文本段落在纯文本段落序列中的索引，用于搜索/进度映射 */
  index: number;
  text: string;
}

/** 内嵌图片块 */
export interface ImageBlock {
  type: "image";
  imageId: string;
  urls: NovelImageUrls;
}

/** 分页标记块 */
export interface PageBreakBlock {
  type: "pageBreak";
}

export type NovelBlock = TextBlock | ImageBlock | PageBreakBlock;

const IMAGE_PLACEHOLDER_RE = /^\[(uploadedimage|pixivimage):(\d+)\]$/;
const NEWPAGE_RE = /^\[newpage\]$/;

/**
 * 将小说原始正文解析为混合块序列。
 *
 * - `[uploadedimage:id]` / `[pixivimage:id]` → ImageBlock（仅当 id 存在于 images 映射时）
 * - `[newpage]` → PageBreakBlock
 * - 其他非空行 → TextBlock
 */
export function parseNovelBlocks(text: string, images: NovelImagesMap | null): NovelBlock[] {
  const imageMap = images ?? {};
  const blocks: NovelBlock[] = [];
  let textIndex = 0;

  for (const part of text.split(/\n+/)) {
    if (part.length === 0) continue;

    const imageMatch = part.match(IMAGE_PLACEHOLDER_RE);
    if (imageMatch) {
      const imageId = imageMatch[2];
      const item = imageMap[imageId];
      if (item) {
        blocks.push({ type: "image", imageId, urls: item.urls });
        continue;
      }
    }

    if (NEWPAGE_RE.test(part)) {
      blocks.push({ type: "pageBreak" });
      continue;
    }

    blocks.push({ type: "text", index: textIndex, text: part });
    textIndex++;
  }

  return blocks;
}

/**
 * 从块序列中重建纯文本，供搜索使用。
 * 段落之间用 `\n\n` 拼接，保证搜索返回的 paragraphIndex 与 TextBlock.index 对齐。
 */
export function buildSearchText(blocks: NovelBlock[]): string {
  return blocks
    .filter((block): block is TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");
}

/**
 * 根据容器宽度选择适合 inline 显示的图片 URL。
 * ≤480 CSS px 使用 480mw，否则使用 1200x1200。
 */
export function selectInlineImageUrl(urls: NovelImageUrls, containerWidth: number): string {
  return containerWidth > 480 ? urls["1200x1200"] : urls["480mw"];
}

/**
 * 收集所有图片块，用于构建全屏查看器的 URL 列表。
 */
export function getImageBlocks(blocks: NovelBlock[]): ImageBlock[] {
  return blocks.filter((block): block is ImageBlock => block.type === "image");
}
