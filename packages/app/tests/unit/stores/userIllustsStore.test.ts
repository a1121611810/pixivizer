import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PixivIllust } from "@/api/types";

// Mock solid-js createResource - return controllable mock values
let mockResourceValue: { illusts: PixivIllust[]; nextUrl: string | null } = {
  illusts: [],
  nextUrl: null,
};
let mockResourceLoading = false;
let mockResourceError: Error | null = null;
const mockMutate = vi.fn();

vi.mock("solid-js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    createResource: () => {
      const resourceFn = () => ({
        illusts: mockResourceValue.illusts,
        nextUrl: mockResourceValue.nextUrl,
      });
      resourceFn.loading = mockResourceLoading;
      resourceFn.error = mockResourceError;
      resourceFn.state = mockResourceError ? "errored" : "ready";
      return [
        resourceFn,
        {
          mutate: mockMutate.mockImplementation(
            (
              fn:
                | ((prev: typeof mockResourceValue) => typeof mockResourceValue)
                | typeof mockResourceValue,
            ) => {
              if (typeof fn === "function") {
                mockResourceValue = fn(mockResourceValue);
              } else {
                mockResourceValue = fn;
              }
            },
          ),
        },
      ];
    },
  };
});

const mockLoadUserIllusts = vi.fn();
const mockLoadNext = vi.fn();

vi.mock("@/api/illust", () => ({
  loadUserIllusts: (...args: unknown[]) => mockLoadUserIllusts(...args),
  loadNext: (...args: unknown[]) => mockLoadNext(...args),
}));

vi.mock("@/utils/r18Filter", () => ({
  filterFeedIllusts: (illusts: PixivIllust[]) => illusts,
}));

function makeIllust(id: number): PixivIllust {
  return {
    id,
    title: `w-${id}`,
    type: "illust",
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
  } as PixivIllust;
}

async function loadStore() {
  vi.resetModules();
  return import("@/stores/userIllustsStore");
}

describe("userIllustsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResourceValue = { illusts: [], nextUrl: null };
    mockResourceLoading = false;
    mockResourceError = null;
  });

  describe("initial state", () => {
    it("starts with empty illusts and no error", async () => {
      const { illusts, loading, error, nextUrl } = await loadStore();
      expect(illusts()).toEqual([]);
      expect(loading()).toBe(false);
      expect(error()).toBeNull();
      expect(nextUrl()).toBeNull();
    });
  });

  describe("loadMore", () => {
    it("does nothing when nextUrl is null", async () => {
      const store = await loadStore();
      await store.loadMore();
      expect(mockLoadNext).not.toHaveBeenCalled();
    });

    it("loads next page when nextUrl exists", async () => {
      mockResourceValue = { illusts: [makeIllust(1)], nextUrl: "page2" };

      const store = await loadStore();
      expect(store.nextUrl()).toBe("page2");

      mockLoadNext.mockResolvedValue({
        illusts: [makeIllust(2)],
        next_url: null,
      });

      await store.loadMore();
      expect(mockLoadNext).toHaveBeenCalledWith("page2");
      expect(mockMutate).toHaveBeenCalled();
    });

    it("does nothing when loading", async () => {
      mockResourceValue = { illusts: [makeIllust(1)], nextUrl: "page2" };
      mockResourceLoading = true;

      const store = await loadStore();
      await store.loadMore();
      expect(mockLoadNext).not.toHaveBeenCalled();
    });
  });

  describe("switchType", () => {
    it("changes content type without triggering fetch", async () => {
      const store = await loadStore();
      expect(store.contentType()).toBe("illust");

      store.switchType("manga");
      expect(store.contentType()).toBe("manga");
      expect(mockLoadUserIllusts).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("returns null when no error", async () => {
      const { error } = await loadStore();
      expect(error()).toBeNull();
    });

    it("maps error message", async () => {
      mockResourceError = new Error("Network failure");
      const { error } = await loadStore();
      expect(error()).toContain("Network failure");
    });
  });

  describe("load", () => {
    it("sets contentType from parameter", async () => {
      const store = await loadStore();
      expect(store.contentType()).toBe("illust");
      store.load(42, "manga");
      expect(store.contentType()).toBe("manga");
    });
  });
});
