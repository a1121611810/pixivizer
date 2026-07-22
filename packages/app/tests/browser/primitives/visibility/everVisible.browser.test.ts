// @vitest-environment browser
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createSignal, createRoot } from "solid-js";
import { createEverVisible } from "@/primitives/visibility/everVisible";
import {
  setupIntersectionObserverMock,
  cleanupIntersectionObserverMock,
  triggerIntersection,
  flush,
} from "./intersectionObserverMock";

describe("createEverVisible", () => {
  beforeEach(setupIntersectionObserverMock);
  afterEach(cleanupIntersectionObserverMock);

  it("returns false before the element enters the viewport", () => {
    createRoot(() => {
      const [ref, _setRef] = createSignal<HTMLElement>();
      const everVisible = createEverVisible()(() => ref());
      expect(everVisible()).toBe(false);
    });
  });

  it("returns true after the element intersects the viewport", async () => {
    await createRoot(async (dispose) => {
      const [ref, setRef] = createSignal<HTMLElement>();
      const everVisible = createEverVisible()(() => ref());
      const el = document.createElement("div");
      setRef(el);
      await flush();
      triggerIntersection(el, true, 0.1);
      expect(everVisible()).toBe(true);
      dispose();
    });
  });

  it("keeps returning true after the element leaves the viewport", async () => {
    await createRoot(async (dispose) => {
      const [ref, setRef] = createSignal<HTMLElement>();
      const everVisible = createEverVisible()(() => ref());
      const el = document.createElement("div");
      setRef(el);
      await flush();
      triggerIntersection(el, true, 0.1);
      triggerIntersection(el, false, 0);
      expect(everVisible()).toBe(true);
      dispose();
    });
  });

  it("uses LAZY_LOAD_MARGIN by default", async () => {
    await createRoot(async (dispose) => {
      const [ref, setRef] = createSignal<HTMLElement>();
      createEverVisible()(() => ref());
      const el = document.createElement("div");
      setRef(el);
      await flush();
      expect(window.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ rootMargin: "100px" }),
      );
      dispose();
    });
  });

  it("uses the provided rootMargin", async () => {
    await createRoot(async (dispose) => {
      const [ref, setRef] = createSignal<HTMLElement>();
      createEverVisible({ rootMargin: "50px" })(() => ref());
      const el = document.createElement("div");
      setRef(el);
      await flush();
      expect(window.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ rootMargin: "50px" }),
      );
      dispose();
    });
  });

  it("skips observer creation when skipObserver is true", async () => {
    await createRoot(async (dispose) => {
      const [ref, setRef] = createSignal<HTMLElement>();
      const everVisible = createEverVisible({ skipObserver: true })(() => ref());
      const el = document.createElement("div");
      setRef(el);
      await flush();
      expect(window.IntersectionObserver).not.toHaveBeenCalled();
      expect(everVisible()).toBe(false);
      dispose();
    });
  });

  it("uses initialVisible when provided", async () => {
    await createRoot(async (dispose) => {
      const [ref, setRef] = createSignal<HTMLElement>();
      const everVisible = createEverVisible({ initialVisible: true })(() => ref());
      const el = document.createElement("div");
      setRef(el);
      await flush();
      expect(everVisible()).toBe(true);
      // 初始即可见，不应创建 observer
      expect(window.IntersectionObserver).not.toHaveBeenCalled();
      dispose();
    });
  });

  it("becomes true when externalVisible becomes true", async () => {
    await createRoot(async (dispose) => {
      const [ref, setRef] = createSignal<HTMLElement>();
      const [external, setExternal] = createSignal(false);
      const everVisible = createEverVisible({ externalVisible: () => external() })(() => ref());
      const el = document.createElement("div");
      setRef(el);
      await flush();
      expect(everVisible()).toBe(false);

      setExternal(true);
      await flush();
      expect(everVisible()).toBe(true);
      dispose();
    });
  });

  it("combines externalVisible with skipObserver", async () => {
    await createRoot(async (dispose) => {
      const [ref, setRef] = createSignal<HTMLElement>();
      const [external, setExternal] = createSignal(false);
      const everVisible = createEverVisible({
        skipObserver: true,
        externalVisible: () => external(),
      })(() => ref());
      const el = document.createElement("div");
      setRef(el);
      await flush();
      expect(window.IntersectionObserver).not.toHaveBeenCalled();
      expect(everVisible()).toBe(false);

      setExternal(true);
      await flush();
      expect(everVisible()).toBe(true);
      dispose();
    });
  });
});
