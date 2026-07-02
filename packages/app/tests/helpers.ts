import { vi, expect } from "vitest";
import type { PixivIllust } from "@/api/types";

/**
 * Validate that a value is a valid PixivIllust object.
 * Uses vi.defineHelper for proper stack traces (custom-assertions recipe).
 */
export const expectValidIllust = vi.defineHelper(
  (value: unknown) => {
    const illust = value as PixivIllust;
    expect(illust).toBeDefined();
    expect(typeof illust.id).toBe("number");
    expect(typeof illust.title).toBe("string");
    expect(illust.user).toBeDefined();
    expect(typeof illust.user.id).toBe("number");
    expect(typeof illust.user.name).toBe("string");
  },
);

/**
 * Create a minimal PixivIllust for testing.
 */
export function makeIllust(id: number, overrides: Partial<PixivIllust> = {}): PixivIllust {
  return {
    id,
    title: `work-${id}`,
    type: "illust" as const,
    user: { id: 1, name: "u", account: "u", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    width: 100,
    height: 100,
    page_count: 1,
    is_bookmarked: false,
    total_bookmarks: 0,
    tags: [],
    x_restrict: 0,
    create_date: "2026-01-01T00:00:00+00:00",
    meta_pages: [],
    meta_single_page: {},
    ...overrides,
  } as PixivIllust;
}

/**
 * Create a user preview for follow/follower list testing.
 */
export function createPreview(userId: number, followed = false) {
  return {
    user: {
      id: userId,
      name: `u${userId}`,
      account: `u${userId}`,
      is_followed: followed,
    },
    illusts: [],
  };
}
