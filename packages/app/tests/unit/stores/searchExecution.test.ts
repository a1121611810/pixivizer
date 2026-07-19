import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRoot } from "solid-js";
import { createSearchStore } from "@/stores/searchStore";

const mockSearchIllust = vi.fn();
const mockSearchNovel = vi.fn();

vi.mock("@/api/search", () => ({
  searchIllust: (...args: unknown[]) => mockSearchIllust(...args),
  searchNovel: (...args: unknown[]) => mockSearchNovel(...args),
  searchIllustNext: vi.fn(),
  searchNovelNext: vi.fn(),
}));

describe("searchStore executeSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets error on API failure", async () => {
    mockSearchIllust.mockRejectedValue(new Error("网络错误"));
    await createRoot(async (dispose) => {
      const store = createSearchStore();
      store.setScope("illust");
      store.setKeyword("test");
      await store.executeSearch();

      expect(mockSearchIllust).toHaveBeenCalled();
      expect(store.error()).toBeTruthy();
      expect(store.loading()).toBe(false);

      dispose();
    });
  });

  it("calls searchIllust with scope=illust", async () => {
    mockSearchIllust.mockResolvedValue({ illusts: [], next_url: null });
    await createRoot(async (dispose) => {
      const store = createSearchStore();
      store.setScope("illust");
      store.setKeyword("test");
      await store.executeSearch();

      expect(mockSearchIllust).toHaveBeenCalled();
      expect(mockSearchNovel).not.toHaveBeenCalled();

      dispose();
    });
  });

  it("calls searchNovel with scope=novel", async () => {
    mockSearchNovel.mockResolvedValue({ novels: [], next_url: null });
    await createRoot(async (dispose) => {
      const store = createSearchStore();
      store.setScope("novel");
      store.setKeyword("test");
      await store.executeSearch();

      expect(mockSearchNovel).toHaveBeenCalled();
      expect(mockSearchIllust).not.toHaveBeenCalled();

      dispose();
    });
  });

  it("calls both APIs with scope=all", async () => {
    mockSearchIllust.mockResolvedValue({ illusts: [], next_url: null });
    mockSearchNovel.mockResolvedValue({ novels: [], next_url: null });
    await createRoot(async (dispose) => {
      const store = createSearchStore();
      store.setScope("all");
      store.setKeyword("test");
      await store.executeSearch();

      expect(mockSearchIllust).toHaveBeenCalled();
      expect(mockSearchNovel).toHaveBeenCalled();

      dispose();
    });
  });
});
