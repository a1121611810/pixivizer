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
  it("does not touch the dark class for fluent theme", () => {
    applyColorThemeClass("fluent");
    expect(document.documentElement.classList.add).not.toHaveBeenCalledWith("dark");
    expect(document.documentElement.classList.remove).not.toHaveBeenCalledWith("dark");
  });

  it("removes all theme-* classes for fluent theme", () => {
    classes = ["theme-rose"];
    applyColorThemeClass("fluent");
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      "theme-rose",
      "theme-coast",
      "theme-sage",
      "theme-lavender",
      "theme-caramel",
    );
  });

  it("adds theme-rose for a non-fluent theme", () => {
    applyColorThemeClass("rose");
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("theme-rose");
  });

  it("does not touch the dark class for non-fluent themes", () => {
    classes = ["dark"];
    applyColorThemeClass("rose");
    expect(document.documentElement.classList.remove).not.toHaveBeenCalledWith("dark");
  });
});
