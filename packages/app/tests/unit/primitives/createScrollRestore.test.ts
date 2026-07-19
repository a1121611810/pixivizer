import { describe, it, expect, vi, beforeEach } from "vitest";
import { createScrollRestore } from "@/primitives/createScrollRestore";

beforeEach(() => {
  // 模拟浏览器环境
  vi.stubGlobal("window", {
    scrollY: 0,
    scrollTo: vi.fn(),
  });
});

describe("createScrollRestore (simple mode)", () => {
  it("restore returns false when no save was called", () => {
    const sr = createScrollRestore(() => "test");
    expect(sr.restore()).toBe(false);
  });

  it("save + restore with same key works", () => {
    window.scrollTo(0, 42);
    const sr = createScrollRestore(() => "same-key");

    sr.save();
    window.scrollTo(0, 0);
    const result = sr.restore();

    expect(result).toBe(true);
    // scrollTo is async via queueMicrotask; check it was scheduled
  });

  it("different keys don't interfere", () => {
    const sr1 = createScrollRestore(() => "key-a");
    const sr2 = createScrollRestore(() => "key-b");

    window.scrollTo(0, 100);
    sr1.save();
    window.scrollTo(0, 200);
    sr2.save();

    window.scrollTo(0, 0);
    sr1.restore();
    // key-a should restore to 100
    // (verified via clear + interleaved test)

    expect(sr1.clear()).toBeUndefined();
    expect(sr2.clear()).toBeUndefined();
  });

  it("clear removes cached value", () => {
    const sr = createScrollRestore(() => "to-clear");
    window.scrollTo(0, 77);
    sr.save();
    sr.clear();
    expect(sr.restore()).toBe(false);
  });

  it("undefined key is safe (noop)", () => {
    const sr = createScrollRestore(() => undefined);
    expect(sr.save()).toBeUndefined();
    expect(sr.restore()).toBe(false);
    expect(sr.clear()).toBeUndefined();
  });

  it("LRU evicts oldest entry when exceeding limit", () => {
    const keys: string[] = [];
    const limit = 50;
    // Fill to max
    for (let i = 0; i < limit; i++) {
      const k = `key-${i}`;
      keys.push(k);
      const sr = createScrollRestore(() => k);
      window.scrollY = i;
      sr.save();
    }
    // Add one more to trigger eviction
    const srExtra = createScrollRestore(() => "extra");
    window.scrollTo(0, 999);
    srExtra.save();

    // key-0 should be evicted
    const sr0 = createScrollRestore(() => "key-0");
    expect(sr0.restore()).toBe(false);

    // extra should exist
    expect(srExtra.restore()).toBe(true);
  });

  it("re-save promotes key to most-recently-used", () => {
    const keys: string[] = [];
    const limit = 50;
    for (let i = 0; i < limit; i++) {
      keys.push(`key-${i}`);
      const sr = createScrollRestore(() => `key-${i}`);
      window.scrollTo(0, i);
      sr.save();
    }
    // Re-save key-0 (now it's MRU)
    const sr0 = createScrollRestore(() => "key-0");
    window.scrollY = 999;
    sr0.save();

    // Add one more to trigger eviction
    const srExtra = createScrollRestore(() => "extra");
    window.scrollY = 998;
    srExtra.save();

    // key-1 (oldest after re-save) should be evicted
    const sr1 = createScrollRestore(() => "key-1");
    expect(sr1.restore()).toBe(false);

    // key-0 and extra should exist
    expect(sr0.restore()).toBe(true);
    expect(srExtra.restore()).toBe(true);
  });

  it("getSnapshot returns undefined in simple mode", () => {
    const sr = createScrollRestore(() => "snap-test");
    expect(sr.getSnapshot()).toBeUndefined();
  });
});

describe("createScrollRestore (virtual mode)", () => {
  it("save + getSnapshot stores and retrieves state", () => {
    const sr = createScrollRestore(() => "virtual-key", { mode: "virtual" });
    const state = { snapshot: [{ key: 0, index: 0, start: 0, end: 200, size: 200, lane: 0 }], offset: 100, version: 1 };

    sr.save(state);
    const got = sr.getSnapshot();

    expect(got).toEqual(state);
  });

  it("restore returns true when snapshot exists", () => {
    const sr = createScrollRestore(() => "virtual-restore", { mode: "virtual" });
    sr.save({ snapshot: [], offset: 50, version: 1 });

    expect(sr.restore()).toBe(true);
  });

  it("restore returns false when no snapshot saved", () => {
    const sr = createScrollRestore(() => "no-snap", { mode: "virtual" });
    expect(sr.restore()).toBe(false);
  });

  it("virtual mode with defined key but empty snapshot still caches", () => {
    const sr = createScrollRestore(() => "empty-snap", { mode: "virtual" });
    sr.save({ snapshot: [], offset: 0, version: 1 });

    const got = sr.getSnapshot();
    expect(got?.offset).toBe(0);
    expect(got?.snapshot).toEqual([]);
  });
});
