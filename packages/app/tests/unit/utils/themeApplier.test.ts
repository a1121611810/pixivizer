import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { applyColorThemeClass } from "@/utils/themeApplier";

let originalDocument: unknown;
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
  };
}

beforeAll(() => {
  originalDocument = (globalThis as any).document;
  (globalThis as any).document = {
    documentElement: {
      classList: createMockClassList(),
    },
  };
});

afterAll(() => {
  (globalThis as any).document = originalDocument;
});

beforeEach(() => {
  classes = [];
  vi.clearAllMocks();
});

describe("applyColorThemeClass", () => {
  it("adds .dark for fluent theme when isDark is true", () => {
    applyColorThemeClass("fluent", true);
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("dark");
    expect(document.documentElement.classList.remove).not.toHaveBeenCalledWith("dark");
  });

  it("removes .dark for fluent theme when isDark is false", () => {
    classes = ["dark"];
    applyColorThemeClass("fluent", false);
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith("dark");
    expect(document.documentElement.classList.add).not.toHaveBeenCalledWith("dark");
  });

  it("adds theme-rose and removes .dark for a non-fluent theme", () => {
    classes = ["dark"];
    applyColorThemeClass("rose", false);
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("theme-rose");
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith("dark");
  });
});
