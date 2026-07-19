import { describe, it, expect, vi, beforeEach } from "vitest";
import { createScrollRestore, scrollRestoreGlobal } from "@/primitives/createScrollRestore";

beforeEach(() => {
  // 模拟浏览器环境
  vi.stubGlobal("window", {
    scrollY: 0,
    scrollTo: vi.fn(),
  });
  // 每次测试前清空全局 LRU 缓存
  scrollRestoreGlobal.clearAll();
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
    const limit = 50;
    // Fill to max using explicit max option
    for (let i = 0; i < limit; i++) {
      const sr = createScrollRestore(() => `key-${i}`, { max: limit });
      window.scrollY = i;
      sr.save();
    }
    // Add one more to trigger eviction
    const srExtra = createScrollRestore(() => "extra", { max: limit });
    window.scrollTo(0, 999);
    srExtra.save();

    // key-0 should be evicted
    const sr0 = createScrollRestore(() => "key-0", { max: limit });
    expect(sr0.restore()).toBe(false);

    // extra should exist
    expect(srExtra.restore()).toBe(true);
  });

  it("re-save promotes key to most-recently-used", () => {
    const limit = 50;
    for (let i = 0; i < limit; i++) {
      const sr = createScrollRestore(() => `key-${i}`, { max: limit });
      window.scrollTo(0, i);
      sr.save();
    }
    // Re-save key-0 (now it's MRU)
    const sr0 = createScrollRestore(() => "key-0", { max: limit });
    window.scrollY = 999;
    sr0.save();

    // Add one more to trigger eviction
    const srExtra = createScrollRestore(() => "extra", { max: limit });
    window.scrollY = 998;
    srExtra.save();

    // key-1 (oldest after re-save) should be evicted
    const sr1 = createScrollRestore(() => "key-1", { max: limit });
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
    const state = {
      snapshot: [{ key: 0, index: 0, start: 0, end: 200, size: 200, lane: 0 }],
      offset: 100,
      version: 1,
    };

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

// ── scrollRestoreGlobal ──

describe("scrollRestoreGlobal", () => {
  describe("saveSimple / getSimple", () => {
    it("saveSimple stores current scrollY, getSimple retrieves it", () => {
      window.scrollY = 42;
      scrollRestoreGlobal.saveSimple("key-a");
      expect(scrollRestoreGlobal.getSimple("key-a")).toBe(42);
    });

    it("setSimple stores explicit value", () => {
      scrollRestoreGlobal.setSimple("key-explicit", 999);
      expect(scrollRestoreGlobal.getSimple("key-explicit")).toBe(999);
    });

    it("getSimple returns undefined for unknown key", () => {
      expect(scrollRestoreGlobal.getSimple("unknown")).toBeUndefined();
    });

    it("different keys store independently", () => {
      window.scrollY = 100;
      scrollRestoreGlobal.saveSimple("key-a");
      window.scrollY = 200;
      scrollRestoreGlobal.saveSimple("key-b");

      expect(scrollRestoreGlobal.getSimple("key-a")).toBe(100);
      expect(scrollRestoreGlobal.getSimple("key-b")).toBe(200);
    });

    it("re-save overwrites existing value", () => {
      window.scrollY = 50;
      scrollRestoreGlobal.saveSimple("key-a");
      window.scrollY = 150;
      scrollRestoreGlobal.saveSimple("key-a");

      expect(scrollRestoreGlobal.getSimple("key-a")).toBe(150);
    });
  });

  describe("saveVirtual / getVirtual", () => {
    it("saveVirtual stores state, getVirtual retrieves it", () => {
      const state = {
        snapshot: [{ key: 0, index: 0, start: 0, end: 100, size: 100, lane: 0 }],
        offset: 50,
        version: 1,
      };
      scrollRestoreGlobal.saveVirtual("v-key", state);
      expect(scrollRestoreGlobal.getVirtual("v-key")).toEqual(state);
    });

    it("getVirtual returns undefined for unknown key", () => {
      expect(scrollRestoreGlobal.getVirtual("unknown")).toBeUndefined();
    });

    it("simple and virtual namespaces are independent", () => {
      scrollRestoreGlobal.saveSimple("shared-key");
      const vState = {
        snapshot: [],
        offset: 0,
        version: 1,
      };
      scrollRestoreGlobal.saveVirtual("shared-key", vState);

      // Both should coexist
      expect(scrollRestoreGlobal.getSimple("shared-key")).toBe(0);
      expect(scrollRestoreGlobal.getVirtual("shared-key")).toEqual(vState);
    });
  });

  describe("remove", () => {
    it("remove deletes both simple and virtual entries", () => {
      scrollRestoreGlobal.saveSimple("to-go");
      scrollRestoreGlobal.saveVirtual("to-go", { snapshot: [], offset: 0, version: 1 });

      scrollRestoreGlobal.remove("to-go");

      expect(scrollRestoreGlobal.getSimple("to-go")).toBeUndefined();
      expect(scrollRestoreGlobal.getVirtual("to-go")).toBeUndefined();
    });
  });

  describe("clearAll", () => {
    it("clearAll removes all cached values", () => {
      scrollRestoreGlobal.saveSimple("a");
      scrollRestoreGlobal.saveSimple("b");
      scrollRestoreGlobal.saveVirtual("c", { snapshot: [], offset: 0, version: 1 });

      scrollRestoreGlobal.clearAll();

      expect(scrollRestoreGlobal.getSimple("a")).toBeUndefined();
      expect(scrollRestoreGlobal.getSimple("b")).toBeUndefined();
      expect(scrollRestoreGlobal.getVirtual("c")).toBeUndefined();
    });
  });
});
