// @vitest-environment browser
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSignal, createRoot } from "solid-js";
import { createSentinel } from "@/primitives/visibility/sentinel";
import {
  setupIntersectionObserverMock,
  cleanupIntersectionObserverMock,
  triggerIntersection,
  observers,
  flush,
} from "./intersectionObserverMock";

describe("createSentinel", () => {
  beforeEach(setupIntersectionObserverMock);
  afterEach(cleanupIntersectionObserverMock);

  it("does not trigger before the element intersects", () => {
    createRoot((dispose) => {
      const onTrigger = vi.fn();
      const { attach } = createSentinel({ onTrigger });
      const el = document.createElement("div");
      attach(el);
      expect(onTrigger).not.toHaveBeenCalled();
      dispose();
    });
  });

  it("triggers onTrigger when the element intersects and enabled is true", async () => {
    await createRoot(async (dispose) => {
      const onTrigger = vi.fn();
      const { attach } = createSentinel({ enabled: () => true, onTrigger });
      const el = document.createElement("div");
      attach(el);
      await flush();
      triggerIntersection(el, true, 0.1);
      expect(onTrigger).toHaveBeenCalledOnce();
      dispose();
    });
  });

  it("does not trigger when enabled is false", async () => {
    await createRoot(async (dispose) => {
      const onTrigger = vi.fn();
      const { attach } = createSentinel({ enabled: () => false, onTrigger });
      const el = document.createElement("div");
      attach(el);
      await flush();
      triggerIntersection(el, true, 0.1);
      expect(onTrigger).not.toHaveBeenCalled();
      dispose();
    });
  });

  it("triggers repeatedly on each intersection while enabled", async () => {
    await createRoot(async (dispose) => {
      const onTrigger = vi.fn();
      const { attach } = createSentinel({ enabled: () => true, onTrigger });
      const el = document.createElement("div");
      attach(el);
      await flush();
      triggerIntersection(el, true, 0.1);
      triggerIntersection(el, false, 0);
      triggerIntersection(el, true, 0.1);
      expect(onTrigger).toHaveBeenCalledTimes(2);
      dispose();
    });
  });

  it("uses SENTINEL_MARGIN by default", () => {
    createRoot((dispose) => {
      const { attach } = createSentinel({ onTrigger: vi.fn() });
      const el = document.createElement("div");
      attach(el);
      expect(window.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ rootMargin: "200px" }),
      );
      dispose();
    });
  });

  it("uses the provided rootMargin", () => {
    createRoot((dispose) => {
      const { attach } = createSentinel({ rootMargin: "100px", onTrigger: vi.fn() });
      const el = document.createElement("div");
      attach(el);
      expect(window.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ rootMargin: "100px" }),
      );
      dispose();
    });
  });

  it("uses the provided root element", async () => {
    await createRoot(async (dispose) => {
      const root = document.createElement("div");
      const [rootSignal, _setRoot] = createSignal<HTMLElement | null>(root);
      const { attach } = createSentinel({ root: () => rootSignal(), onTrigger: vi.fn() });
      const el = document.createElement("div");
      attach(el);
      await flush();
      const lastObserver = observers[observers.length - 1];
      expect(lastObserver).toBeDefined();
      expect(window.IntersectionObserver).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ root }),
      );
      dispose();
    });
  });

  it("recreates observer when root changes from null", async () => {
    await createRoot(async (dispose) => {
      const [rootSignal, setRoot] = createSignal<HTMLElement | null>(null);
      const { attach } = createSentinel({ root: () => rootSignal(), onTrigger: vi.fn() });
      const el = document.createElement("div");
      attach(el);
      await flush();
      // Root is null: no observer should be observing the element
      expect(observers.some((o) => o.elements.includes(el))).toBe(false);

      const root = document.createElement("div");
      setRoot(root);
      await flush();
      // After root becomes non-null, an observer should be created with the root
      expect(window.IntersectionObserver).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ root }),
      );
      const lastObserver = observers[observers.length - 1];
      expect(lastObserver.elements).toContain(el);
      dispose();
    });
  });

  it("recreates observer when root changes from one element to another", async () => {
    await createRoot(async (dispose) => {
      const root1 = document.createElement("div");
      const [rootSignal, setRoot] = createSignal<HTMLElement | null>(root1);
      const { attach } = createSentinel({ root: () => rootSignal(), onTrigger: vi.fn() });
      const el = document.createElement("div");
      attach(el);
      await flush();

      const firstObserver = observers[observers.length - 1];
      expect(firstObserver.elements).toContain(el);

      const root2 = document.createElement("div");
      setRoot(root2);
      await flush();

      const lastObserver = observers[observers.length - 1];
      expect(lastObserver).not.toBe(firstObserver);
      expect(window.IntersectionObserver).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ root: root2 }),
      );
      expect(lastObserver.elements).toContain(el);
      // 旧 observer 已被 disconnect，不再观察该元素
      expect(firstObserver.elements).not.toContain(el);
      dispose();
    });
  });
});
