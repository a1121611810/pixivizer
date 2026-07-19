import { describe, it, expect } from "vitest";
import { mergeSearchResults } from "@/utils/searchMerger";
import type { PixivIllust, PixivNovel } from "@/api/types";

function makeIllust(id: number, date: string): PixivIllust {
  return {
    id,
    title: `illust-${id}`,
    type: "illust",
    user: { id: 1, name: "a", account: "a", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    width: 100,
    height: 100,
    page_count: 1,
    is_bookmarked: false,
    total_bookmarks: 0,
    tags: [],
    x_restrict: 0,
    create_date: date,
    meta_pages: [],
    meta_single_page: {},
  } as PixivIllust;
}

function makeNovel(id: number, date: string): PixivNovel {
  return {
    id,
    title: `novel-${id}`,
    user: { id: 1, name: "a", account: "a", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 100,
    is_bookmarked: false,
    total_bookmarks: 0,
    x_restrict: 0,
    create_date: date,
  } as PixivNovel;
}

describe("mergeSearchResults", () => {
  it("returns empty array for empty inputs", () => {
    expect(mergeSearchResults([], [])).toEqual([]);
  });

  it("merges illusts only when novels is empty", () => {
    const illusts = [makeIllust(1, "2026-01-03T00:00:00Z")];
    const result = mergeSearchResults(illusts, []);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("illust");
    expect(result[0].entity.id).toBe(1);
  });

  it("merges novels only when illusts is empty", () => {
    const novels = [makeNovel(1, "2026-01-03T00:00:00Z")];
    const result = mergeSearchResults([], novels);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("novel");
    expect(result[0].entity.id).toBe(1);
  });

  it("merges and sorts by create_date descending", () => {
    const illusts = [makeIllust(1, "2026-01-01T00:00:00Z"), makeIllust(3, "2026-01-03T00:00:00Z")];
    const novels = [makeNovel(2, "2026-01-02T00:00:00Z")];
    const result = mergeSearchResults(illusts, novels);
    expect(result).toHaveLength(3);
    expect(result[0].entity.id).toBe(3);
    expect(result[0].date).toBe("2026-01-03T00:00:00Z");
    expect(result[1].entity.id).toBe(2);
    expect(result[2].entity.id).toBe(1);
  });

  it("preserves type marker in merged items", () => {
    const illusts = [makeIllust(1, "2026-01-01T00:00:00Z")];
    const novels = [makeNovel(2, "2026-01-02T00:00:00Z")];
    const result = mergeSearchResults(illusts, novels);
    expect(result.find((r) => r.entity.id === 1)?.type).toBe("illust");
    expect(result.find((r) => r.entity.id === 2)?.type).toBe("novel");
  });

  it("handles identical dates — both items present", () => {
    const illusts = [makeIllust(1, "2026-01-01T00:00:00Z")];
    const novels = [makeNovel(2, "2026-01-01T00:00:00Z")];
    const result = mergeSearchResults(illusts, novels);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.entity.id).toSorted()).toEqual([1, 2]);
  });
});
