import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PixivIllust, RestrictType } from "@/api/types";

// Completely mock solid-js createResource for test control
let mockResourceValue: { illusts: PixivIllust[]; nextUrl: string | null } = {
  illusts: [],
  nextUrl: null,
};
let mockResourceLoading = false;
let mockResourceError: Error | null = null;
const mockMutate = vi.fn();
const mockRefetch = vi.fn();

vi.mock("solid-js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    createResource: (...args: unknown[]) => {
      // Capture the fetcher for later use
      const resourceFn = () => ({
        illusts: mockResourceValue.illusts,
        nextUrl: mockResourceValue.nextUrl,
      });
      // SolidJS resource signals have .loading, .error, .state as properties
      resourceFn.loading = mockResourceLoading;
      resourceFn.error = mockResourceError;
      resourceFn.state = mockResourceError ? "errored" : "ready";
      return [
        resourceFn,
        {
          mutate: mockMutate.mockImplementation(
            (fn: ((prev: typeof mockResourceValue) => typeof mockResourceValue) | typeof mockResourceValue) => {
              if (typeof fn === "function") {
                mockResourceValue = fn(mockResourceValue);
              } else {
                mockResourceValue = fn;
              }
            },
          ),
          refetch: mockRefetch,
        },
      ];
    },
  };
});

// Mock api/illust
const mockLoadBookmarks = vi.fn();
const mockLoadNext = vi.fn();

vi.mock("@/api/illust", () => ({
  loadBookmarks: (...args: unknown[]) => mockLoadBookmarks(...args),
  loadNext: (...args: unknown[]) => mockLoadNext(...args),
}));

// Mock authStore
let mockUserId: string | null = "1";
vi.mock("@/stores/authStore", () => ({
  get user() {
    return () => (mockUserId ? { id: mockUserId, name: "Test", account: "test" } : null);
  },
}));

// Mock r18Filter
vi.mock("@/utils/r18Filter", () => ({
  filterFeedIllusts: (illusts: PixivIllust[]) => illusts,
  filterUserPreviews: (previews: unknown[]) => previews,
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
  return import("@/stores/bookmarkStore");
}

describe("bookmarkStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = "1";
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

  describe("fetchMore", () => {
    it("loads next page when nextUrl exists", async () => {
      mockResourceValue = {
        illusts: [makeIllust(1)],
        nextUrl: "page2",
      };

      const store = await loadStore();
      expect(store.nextUrl()).toBe("page2");

      mockLoadNext.mockResolvedValue({
        illusts: [makeIllust(2)],
        next_url: null,
      });

      await store.fetchMore();

      expect(mockLoadNext).toHaveBeenCalledWith("page2");
      // mutate should have been called
      expect(mockMutate).toHaveBeenCalled();
    });

    it("does nothing when nextUrl is null", async () => {
      const store = await loadStore();
      expect(store.nextUrl()).toBeNull();

      await store.fetchMore();
      expect(mockLoadNext).not.toHaveBeenCalled();
    });

    it("does nothing when loading", async () => {
      mockResourceValue = {
        illusts: [makeIllust(1)],
        nextUrl: "page2",
      };
      mockResourceLoading = true;

      const store = await loadStore();
      await store.fetchMore();
      expect(mockLoadNext).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("returns null when no error", async () => {
      const { error } = await loadStore();
      expect(error()).toBeNull();
    });

    it("maps 401 to user-friendly message", async () => {
      mockResourceError = new Error("401 Unauthorized");
      const { error } = await loadStore();
      expect(error()).toContain("登录已过期");
    });

    it("maps 429 to user-friendly message", async () => {
      mockResourceError = new Error("429 Too Many Requests");
      const { error } = await loadStore();
      expect(error()).toContain("请求太频繁");
    });

    it("maps network errors to user-friendly message", async () => {
      mockResourceError = new Error("NETWORK_ERROR");
      const { error } = await loadStore();
      expect(error()).toContain("网络连接失败");
    });

    it("returns raw message for unknown errors", async () => {
      mockResourceError = new Error("Something went wrong");
      const { error } = await loadStore();
      expect(error()).toContain("Something went wrong");
    });
  });

  describe("setRestrict", () => {
    it("switches restrict value", async () => {
      const { restrict, setRestrict } = await loadStore();
      expect(restrict()).toBe("public");
      setRestrict("private");
      expect(restrict()).toBe("private");
    });

    it("does nothing when same restrict", async () => {
      const { restrict, setRestrict } = await loadStore();
      setRestrict("public");
      expect(restrict()).toBe("public");
    });
  });

  describe("refresh", () => {
    it("calls refetch", async () => {
      const { refresh } = await loadStore();
      await refresh();
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("ensureLoaded", () => {
    it("calls refetch when errored", async () => {
      mockResourceError = new Error("err");
      const { ensureLoaded } = await loadStore();
      ensureLoaded();
      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
