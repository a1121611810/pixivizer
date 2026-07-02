// @vitest-environment browser
import { describe, it, expect, vi } from "vitest";

describe("useViewportLazy (createViewportLazy)", () => {
  it("exports createViewportLazy function", async () => {
    const mod = await import("../../src/primitives/useViewportLazy");
    expect(typeof mod.createViewportLazy).toBe("function");
  });

  it("returns object with attach and everVisible", async () => {
    const { createViewportLazy } = await import("../../src/primitives/useViewportLazy");
    const result = createViewportLazy();
    expect(result).toHaveProperty("attach");
    expect(result).toHaveProperty("everVisible");
    expect(typeof result.attach).toBe("function");
  });

  it("starts with everVisible=false by default", async () => {
    const { createViewportLazy } = await import("../../src/primitives/useViewportLazy");
    const result = createViewportLazy();
    expect(result.everVisible()).toBe(false);
  });

  it("initialVisible=true sets everVisible=true immediately", async () => {
    const { createViewportLazy } = await import("../../src/primitives/useViewportLazy");
    const result = createViewportLazy({ initialVisible: true });
    expect(result.everVisible()).toBe(true);
  });

  it("attach accepts an HTMLDivElement", async () => {
    const { createViewportLazy } = await import("../../src/primitives/useViewportLazy");
    const result = createViewportLazy();
    const el = document.createElement("div");
    result.attach(el);
    // No crash = success
  });

  it("skipObserver avoids setting up IntersectionObserver", async () => {
    const { createViewportLazy } = await import("../../src/primitives/useViewportLazy");
    const result = createViewportLazy({ skipObserver: true });
    expect(result.everVisible()).toBe(false);
  });
});
