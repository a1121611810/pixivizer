// @vitest-environment browser
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("createSentinelPaginator", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("exports createSentinelPaginator function", async () => {
    const mod = await import("../../src/primitives/createSentinelPaginator");
    expect(typeof mod.createSentinelPaginator).toBe("function");
  });

  it("returns an object with attach method", async () => {
    const { createSentinelPaginator } = await import("../../src/primitives/createSentinelPaginator");
    const result = createSentinelPaginator({
      onTrigger: vi.fn(),
    });
    expect(result).toHaveProperty("attach");
    expect(typeof result.attach).toBe("function");
  });

  it("attach accepts an HTMLDivElement", async () => {
    const { createSentinelPaginator } = await import("../../src/primitives/createSentinelPaginator");
    const onTrigger = vi.fn();
    const result = createSentinelPaginator({ onTrigger });
    const el = document.createElement("div");
    result.attach(el);
    // No crash = success (observer behavior tested in unit tests)
  });

  it("accepts enabled option", async () => {
    const { createSentinelPaginator } = await import("../../src/primitives/createSentinelPaginator");
    const enabled = () => false;
    const onTrigger = vi.fn();
    const result = createSentinelPaginator({ enabled, onTrigger });
    expect(result).toBeDefined();
  });
});
