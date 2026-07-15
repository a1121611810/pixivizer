// @vitest-environment browser
// 验证 IllustDetail 顶部 header 双击回顶行为。
import { render, cleanup, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PixivIllust } from "../../src/api/types";

const mockNavigate = vi.fn();

const mockLoaderData = () => ({
  error: null,
  illust: makeMockIllust(),
});

vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => () => ({ pathname: `/illust/${currentIllustId}` }),
  useParams: () => () => ({ id: String(currentIllustId) }),
  useRouter: () => ({ history: { back: mockNavigate } }),
  getRouteApi: () => ({ useLoaderData: () => () => mockLoaderData() }),
  useBeforeLeave: (fn: unknown) => fn as any,
}));

vi.mock("../../src/api/illust", () => ({
  addBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  loadUgoiraMetadata: vi.fn(),
}));

let currentIllustId = 1;

function makeMockIllust(): PixivIllust {
  return {
    id: currentIllustId,
    title: "Double Click Top 测试",
    type: "illust",
    user: {
      id: 1,
      name: "测试作者",
      account: "test_author",
      profile_image_urls: { medium: "", px_16x16: "", px_50x50: "", px_170x170: "" },
      is_followed: false,
    },
    image_urls: { square_medium: "", medium: "", large: "" },
    width: 800,
    height: 600,
    page_count: 1,
    is_bookmarked: false,
    total_bookmarks: 0,
    tags: [],
    x_restrict: 0,
    create_date: "2026-01-01T00:00:00Z",
    caption: "",
    meta_pages: [],
    meta_single_page: { original_image_url: "" },
  };
}

import IllustDetail from "../../src/routes/IllustDetail";

describe("IllustDetail header double-click to top", () => {
  beforeEach(() => {
    cleanup();
    currentIllustId++;
    mockNavigate.mockClear();
    window.scrollTo(0, 0);
  });

  it("scrolls to top when the sticky header is double-clicked", async () => {
    const { container } = render(() => <IllustDetail />);

    await waitFor(() => {
      expect(container.textContent).toContain("Double Click Top 测试");
    });

    const originalHeight = document.body.style.height;
    document.body.style.height = "2000px";

    try {
      window.scrollTo(0, 500);
      expect(window.scrollY).toBe(500);

      const header = container.querySelector("header");
      expect(header).not.toBeNull();

      fireEvent.doubleClick(header!);

      await waitFor(() => {
        expect(window.scrollY).toBe(0);
      });
    } finally {
      document.body.style.height = originalHeight;
    }
  });
});
