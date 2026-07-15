// @vitest-environment browser
import { render, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import VirtualFeed from "../../src/components/VirtualFeed";
import type { PixivIllust } from "../../src/api/types";

vi.mock("../../src/utils/imageLoader", () => ({
  loadImage: vi.fn(() => Promise.resolve({ url: "", cleanup: () => {} })),
  checkImageCache: vi.fn(() => undefined),
  resolveImageUrl: vi.fn(() => ""),
  parsePixivUrlDimensions: vi.fn(() => null),
}));

// ── Helper ──
function createIllusts(count: number): PixivIllust[] {
  return Array.from(
    { length: count },
    (_, i) =>
      ({
        id: i + 1,
        title: `作品标题 ${i + 1}`,
        type: "illust",
        user: {
          id: 1,
          name: `作者${i + 1}`,
          account: `author${i + 1}`,
          profile_image_urls: {},
        },
        image_urls: { square_medium: "", medium: "", large: "" },
        width: 400,
        height: 600,
        page_count: 1,
        is_bookmarked: false,
        total_bookmarks: 10,
        total_view: 50,
        tags: [],
        x_restrict: 0,
        create_date: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
        meta_pages: [],
        meta_single_page: {},
      }) as PixivIllust,
  );
}

describe("VirtualFeed", () => {
  it("restores scroll only after layout is tall enough to contain the offset", async () => {
    window.scrollTo(0, 0);
    const scrollToSpy = vi.spyOn(window, "scrollTo");
    const STYLE_ID = "virtual-feed-test-style";
    try {
      const illusts = createIllusts(20);
      const [width, setWidth] = createSignal(0);
      // Defer giving the feed container a real width until after the initial
      // restoration frame would have fired. With the buggy code the scroll is
      // applied while totalHeight is ~0 and is clamped to the top; the fix waits
      // until the layout is tall enough before scrolling.
      setTimeout(() => setWidth(800), 50);

      // VirtualFeed's root has horizontal padding, so its clientWidth would be
      // positive even when the parent width is 0. Strip that padding for this
      // test so the 0-width phase truly reports containerWidth === 0.
      const existingStyle = document.getElementById(STYLE_ID);
      if (existingStyle) existingStyle.remove();
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent =
        "#virtual-feed-test-root > div.px-3 { padding-left: 0 !important; padding-right: 0 !important; }";
      document.head.appendChild(style);

      render(() => (
        <div id="virtual-feed-test-root" style={{ width: `${width()}px` }}>
          <VirtualFeed
            illusts={illusts}
            loading={false}
            error={null}
            hasMore={false}
            onIllustClick={vi.fn()}
            onLoadMore={vi.fn()}
            onRefresh={vi.fn()}
            restoreScrollTop={500}
          />
        </div>
      ));

      // Give the buggy early restoration frame time to fire while width is still 0.
      await new Promise((resolve) => setTimeout(resolve, 40));
      const earlyScrollTo500 = scrollToSpy.mock.calls.some(
        (call) => call[0] === 0 && call[1] === 500,
      );
      expect(earlyScrollTo500).toBe(false);

      await waitFor(
        () => {
          expect(window.scrollY).toBe(500);
        },
        { timeout: 3000 },
      );
    } finally {
      scrollToSpy.mockRestore();
      window.scrollTo(0, 0);
      const styleEl = document.getElementById(STYLE_ID);
      if (styleEl) styleEl.remove();
    }
  });
});
