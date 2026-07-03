import { describe, it, expect, beforeEach } from "vitest";
import * as novelCache from "@/stores/novelCache";
import type { PixivNovel } from "@/api/types";

function makeNovel(id: number): PixivNovel {
  return {
    id,
    title: `Novel ${id}`,
    user: { id: 1, name: "author", account: "a", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 1000,
    is_bookmarked: false,
    total_bookmarks: 0,
    total_view: 0,
    x_restrict: 0,
    create_date: "2026-01-01T00:00:00Z",
  } as PixivNovel;
}

describe("novelCache", () => {
  beforeEach(() => {
    novelCache.clearNovelCache();
    novelCache.setNovelCacheLimits(5);
  });

  it("getDetail returns undefined for uncached novel", () => {
    expect(novelCache.getDetail(1)).toBeUndefined();
  });

  it("setDetail and getDetail work", () => {
    const novel = makeNovel(1);
    novelCache.setDetail(1, novel);
    expect(novelCache.getDetail(1)).toEqual(novel);
  });

  it("getText returns undefined for uncached novel", () => {
    expect(novelCache.getText(1)).toBeUndefined();
  });

  it("setText and getText work", () => {
    novelCache.setText(1, "novel text");
    expect(novelCache.getText(1)).toBe("novel text");
  });

  it("LRU evicts oldest text entry when over limit", () => {
    novelCache.setNovelCacheLimits(2);
    novelCache.setText(1, "text 1");
    novelCache.setText(2, "text 2");
    novelCache.setText(3, "text 3");
    expect(novelCache.getText(1)).toBeUndefined(); // evicted
    expect(novelCache.getText(2)).toBe("text 2");
    expect(novelCache.getText(3)).toBe("text 3");
  });

  it("LRU evicts oldest detail entry when over limit", () => {
    novelCache.setNovelCacheLimits(1); // detail max = 10
    for (let i = 1; i <= 12; i++) {
      novelCache.setDetail(i, makeNovel(i));
    }
    // At most 10 entries should remain
    let count = 0;
    for (let i = 1; i <= 12; i++) {
      if (novelCache.getDetail(i)) count++;
    }
    expect(count).toBeLessThanOrEqual(10);
    expect(novelCache.getDetail(12)).toBeDefined(); // newest survives
  });

  it("clearNovelCache clears all data", () => {
    novelCache.setDetail(1, makeNovel(1));
    novelCache.setText(1, "text");
    novelCache.clearNovelCache();
    expect(novelCache.getDetail(1)).toBeUndefined();
    expect(novelCache.getText(1)).toBeUndefined();
  });

  it("setNovelCacheLimits can shrink cache", () => {
    for (let i = 1; i <= 30; i++) {
      novelCache.setDetail(i, makeNovel(i));
    }
    // All 30 fit within detailMax=50 from beforeEach
    expect(novelCache.getDetail(30)).toBeDefined();
    expect(novelCache.getDetail(1)).toBeDefined();

    // Shrink limit to 1 (detail max = 10), evicts oldest
    novelCache.setNovelCacheLimits(1);
    expect(novelCache.getDetail(30)).toBeDefined();
    // At most 10 entries should remain
    let count = 0;
    for (let i = 1; i <= 30; i++) {
      if (novelCache.getDetail(i)) count++;
    }
    expect(count).toBeLessThanOrEqual(10);
  });

  it("update exists updates time (not duplicate)", () => {
    novelCache.setText(1, "original");
    novelCache.setText(1, "updated");
    expect(novelCache.getText(1)).toBe("updated");
  });
});
