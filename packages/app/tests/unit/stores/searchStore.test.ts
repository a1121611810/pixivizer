import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { createSearchStore } from "@/stores/searchStore";

describe("searchStore", () => {
  it("starts with default values", () => {
    createRoot((dispose) => {
      const store = createSearchStore();
      expect(store.keyword()).toBe("");
      expect(store.scope()).toBe("all");
      expect(store.sort()).toBe("date_desc");
      expect(store.results()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
      expect(store.hasMore()).toBe(false);
      dispose();
    });
  });

  it("setKeyword updates keyword", () => {
    createRoot((dispose) => {
      const store = createSearchStore();
      store.setKeyword("星空");
      expect(store.keyword()).toBe("星空");
      dispose();
    });
  });

  it("setScope updates scope", () => {
    createRoot((dispose) => {
      const store = createSearchStore();
      store.setScope("illust");
      expect(store.scope()).toBe("illust");
      store.setScope("novel");
      expect(store.scope()).toBe("novel");
      store.setScope("all");
      expect(store.scope()).toBe("all");
      dispose();
    });
  });

  it("setSort updates sort", () => {
    createRoot((dispose) => {
      const store = createSearchStore();
      store.setSort("popular_desc");
      expect(store.sort()).toBe("popular_desc");
      store.setSort("date_asc");
      expect(store.sort()).toBe("date_asc");
      dispose();
    });
  });

  it("executeSearch does nothing with empty keyword", async () => {
    await createRoot(async (dispose) => {
      const store = createSearchStore();
      await store.executeSearch();
      expect(store.results()).toEqual([]);
      expect(store.loading()).toBe(false);
      dispose();
    });
  });

  it("loadMore does nothing when no more results", async () => {
    await createRoot(async (dispose) => {
      const store = createSearchStore();
      await store.loadMore();
      expect(store.loading()).toBe(false);
      expect(store.hasMore()).toBe(false);
      dispose();
    });
  });
});
