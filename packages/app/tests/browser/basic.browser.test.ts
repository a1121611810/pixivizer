// @vitest-environment browser
import { describe, it, expect } from "vitest";

describe("Browser mode basic tests", () => {
  it("has a working DOM environment", () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
    expect(document.createElement("div")).toBeDefined();
  });

  it("can manipulate DOM elements", () => {
    const div = document.createElement("div");
    div.textContent = "Hello Browser";
    document.body.appendChild(div);

    expect(document.body.textContent).toContain("Hello Browser");
  });

  it("supports async operations", async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  it("has fetch available", () => {
    expect(typeof window.fetch).toBe("function");
  });

  it("can create and style elements", () => {
    const el = document.createElement("button");
    el.className = "test-btn";
    el.setAttribute("aria-label", "Test");
    document.body.appendChild(el);

    const found = document.querySelector(".test-btn");
    expect(found).not.toBeNull();
    expect(found?.getAttribute("aria-label")).toBe("Test");
  });
});
