import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryStore, type IDBStore } from "@/stores/db";

describe("MemoryStore", () => {
  let store: IDBStore;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it("get returns undefined for missing key", async () => {
    const result = await store.get("novels", 1);
    expect(result).toBeUndefined();
  });

  it("put then get returns the stored value", async () => {
    await store.put("novels", { id: 1, title: "Test" });
    const result = await store.get<{ id: number; title: string }>("novels", 1);
    expect(result?.title).toBe("Test");
  });

  it("delete removes the entry", async () => {
    await store.put("novels", { id: 1, title: "Test" });
    await store.delete("novels", 1);
    const result = await store.get("novels", 1);
    expect(result).toBeUndefined();
  });

  it("count returns correct size", async () => {
    await store.put("novels", { id: 1, title: "A" });
    await store.put("novels", { id: 2, title: "B" });
    expect(await store.count("novels")).toBe(2);
  });

  it("getAll returns all entries", async () => {
    await store.put("novels", { id: 1, title: "A" });
    await store.put("novels", { id: 2, title: "B" });
    const all = await store.getAll<{ id: number; title: string }>("novels");
    expect(all).toHaveLength(2);
    expect(all.map((x) => x.title).sort()).toEqual(["A", "B"]);
  });

  it("clear removes all entries in a store", async () => {
    await store.put("novels", { id: 1, title: "A" });
    await store.clear("novels");
    expect(await store.count("novels")).toBe(0);
  });

  it("multiple stores are independent", async () => {
    await store.put("novels", { id: 1, title: "Novel" });
    await store.put("series", { id: 2, title: "Series" });
    expect(await store.count("novels")).toBe(1);
    expect(await store.count("series")).toBe(1);
  });

  it("updating existing key overwrites value", async () => {
    await store.put("novels", { id: 1, title: "Original" });
    await store.put("novels", { id: 1, title: "Updated" });
    const result = await store.get<{ id: number; title: string }>("novels", 1);
    expect(result?.title).toBe("Updated");
  });
});
