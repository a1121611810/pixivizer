import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyColorThemeClass } from "@/utils/themeApplier";

let classes: string[];

function createMockClassList() {
  classes = [];
  return {
    add: vi.fn((token: string) => {
      if (!classes.includes(token)) classes.push(token);
    }),
    remove: vi.fn((...tokens: string[]) => {
      classes = classes.filter((c) => !tokens.includes(c));
    }),
    contains: vi.fn((token: string) => classes.includes(token)),
    [Symbol.iterator]: () => classes.values(),
  };
}

beforeEach(() => {
  vi.stubGlobal("document", {
    documentElement: {
      classList: createMockClassList(),
    },
  });
  classes = [];
  vi.clearAllMocks();
});

describe("applyColorThemeClass", () => {
  it("does nothing when document is undefined (SSR)", () => {
    vi.stubGlobal("document", undefined);
    expect(() => applyColorThemeClass("rose")).not.toThrow();
    expect(() => applyColorThemeClass("fluent", true)).not.toThrow();
  });

  it("adds theme-rose for a non-fluent theme", () => {
    applyColorThemeClass("rose");
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("theme-rose");
    expect(classes).toContain("theme-rose");
  });

  it("removes .dark for non-fluent themes", () => {
    classes = ["dark"];
    applyColorThemeClass("rose");
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith("dark");
    expect(classes).not.toContain("dark");
  });

  it("switches from one non-fluent theme to another", () => {
    applyColorThemeClass("rose");
    applyColorThemeClass("coast");
    expect(classes).toContain("theme-coast");
    expect(classes).not.toContain("theme-rose");
    expect(classes).not.toContain("dark");
  });

  it("removes all theme-* classes for fluent theme", () => {
    classes = ["theme-rose", "theme-coast", "dark"];
    applyColorThemeClass("fluent", false);
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      "theme-rose",
      "theme-coast",
    );
    expect(classes).not.toContain("theme-rose");
    expect(classes).not.toContain("theme-coast");
  });

  it("adds .dark for fluent theme when isDark is true", () => {
    applyColorThemeClass("fluent", true);
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("dark");
    expect(classes).toContain("dark");
  });

  it("removes .dark for fluent theme when isDark is false", () => {
    classes = ["dark"];
    applyColorThemeClass("fluent", false);
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith("dark");
    expect(classes).not.toContain("dark");
  });

  it("removes unknown theme-* classes by iterating classList", () => {
    classes = ["theme-rose", "theme-custom"];
    applyColorThemeClass("fluent", false);
    expect(classes).not.toContain("theme-rose");
    expect(classes).not.toContain("theme-custom");
  });
});
