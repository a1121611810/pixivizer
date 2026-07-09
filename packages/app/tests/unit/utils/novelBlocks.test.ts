import { describe, it, expect } from "vitest";
import { parseNovelBlocks, buildSearchText, selectInlineImageUrl } from "@/utils/novelBlocks";
import type { NovelImagesMap } from "@/api/novel";

const SAMPLE_IMAGES: NovelImagesMap = {
  "123": {
    novelImageId: "123",
    sl: "2",
    urls: {
      "240mw": "https://i.pximg.net/c/240x480_80/..._240mw.jpg",
      "480mw": "https://i.pximg.net/c/480x960/..._480mw.jpg",
      "1200x1200": "https://i.pximg.net/c/1200x1200/..._1200.jpg",
      "128x128": "https://i.pximg.net/c/128x128/..._128.jpg",
      original: "https://i.pximg.net/..._original.png",
    },
  },
};

describe("parseNovelBlocks", () => {
  it("parses plain text into TextBlock with increasing indices", () => {
    const blocks = parseNovelBlocks("A\n\nB\n\nC", null);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({ type: "text", index: 0, text: "A" });
    expect(blocks[1]).toEqual({ type: "text", index: 1, text: "B" });
    expect(blocks[2]).toEqual({ type: "text", index: 2, text: "C" });
  });

  it("recognizes [uploadedimage:id] as ImageBlock when image exists", () => {
    const blocks = parseNovelBlocks("Text\n[uploadedimage:123]", SAMPLE_IMAGES);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: "text", index: 0, text: "Text" });
    expect(blocks[1]).toEqual({ type: "image", imageId: "123", urls: SAMPLE_IMAGES["123"].urls });
  });

  it("recognizes [pixivimage:id] as ImageBlock when image exists", () => {
    const blocks = parseNovelBlocks("[pixivimage:123]", SAMPLE_IMAGES);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "image", imageId: "123", urls: SAMPLE_IMAGES["123"].urls });
  });

  it("falls back to TextBlock when image id is unknown", () => {
    const blocks = parseNovelBlocks("[uploadedimage:999]", SAMPLE_IMAGES);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "text", index: 0, text: "[uploadedimage:999]" });
  });

  it("recognizes [newpage] as PageBreakBlock", () => {
    const blocks = parseNovelBlocks("A\n[newpage]\nB", null);
    expect(blocks).toHaveLength(3);
    expect(blocks[1]).toEqual({ type: "pageBreak" });
  });

  it("ignores empty segments", () => {
    const blocks = parseNovelBlocks("A\n\n\nB", null);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: "text", index: 0, text: "A" });
    expect(blocks[1]).toEqual({ type: "text", index: 1, text: "B" });
  });
});

describe("buildSearchText", () => {
  it("only includes TextBlock contents joined by double newlines", () => {
    const blocks = parseNovelBlocks("A\n[uploadedimage:123]\nB", SAMPLE_IMAGES);
    expect(buildSearchText(blocks)).toBe("A\n\nB");
  });

  it("returns empty string when there are no text blocks", () => {
    const blocks = parseNovelBlocks("[uploadedimage:123]", SAMPLE_IMAGES);
    expect(buildSearchText(blocks)).toBe("");
  });
});

describe("selectInlineImageUrl", () => {
  it("selects 480mw for narrow containers", () => {
    expect(selectInlineImageUrl(SAMPLE_IMAGES["123"].urls, 480)).toBe(
      SAMPLE_IMAGES["123"].urls["480mw"],
    );
    expect(selectInlineImageUrl(SAMPLE_IMAGES["123"].urls, 320)).toBe(
      SAMPLE_IMAGES["123"].urls["480mw"],
    );
  });

  it("selects 1200x1200 for wide containers", () => {
    expect(selectInlineImageUrl(SAMPLE_IMAGES["123"].urls, 481)).toBe(
      SAMPLE_IMAGES["123"].urls["1200x1200"],
    );
    expect(selectInlineImageUrl(SAMPLE_IMAGES["123"].urls, 800)).toBe(
      SAMPLE_IMAGES["123"].urls["1200x1200"],
    );
  });
});
