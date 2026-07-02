// @vitest-environment browser
import { describe, it, expect } from "vitest";

describe("useContainerWidth", () => {
  it("exports useContainerWidth function", async () => {
    const mod = await import("@/primitives/useContainerWidth");
    expect(typeof mod.useContainerWidth).toBe("function");
  });

  it("returns object with width and ref", async () => {
    const { useContainerWidth } = await import("@/primitives/useContainerWidth");
    const result = useContainerWidth();
    expect(result).toHaveProperty("width");
    expect(result).toHaveProperty("ref");
    expect(typeof result.ref).toBe("function");
  });
});
