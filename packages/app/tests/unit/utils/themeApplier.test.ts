import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyPageStyleClass } from "@/utils/themeApplier";

let classes: string[];

function createMockClassList() {
  classes = [];
  return {
    add: vi.fn((token: string) => {
      if (!classes.includes(token)) {
        classes.push(token);
      }
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

describe("applyPageStyleClass", () => {
  it("does nothing when document is undefined (SSR)", () => {
    vi.stubGlobal("document", undefined);
    expect(() => applyPageStyleClass("card")).not.toThrow();
    expect(() => applyPageStyleClass("fluent")).not.toThrow();
  });

  it("adds page-card class for card style", () => {
    applyPageStyleClass("card");
    expect(document.documentElement.classList.add).toHaveBeenCalledWith("page-card");
    expect(classes).toContain("page-card");
  });

  it("removes page-card class for fluent style", () => {
    classes = ["page-card"];
    applyPageStyleClass("fluent");
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith("page-card");
    expect(classes).not.toContain("page-card");
  });

  it("removes all page-* classes before adding new one", () => {
    applyPageStyleClass("card");
    applyPageStyleClass("fluent");
    expect(classes).not.toContain("page-card");
  });

  it("handles switching between styles", () => {
    applyPageStyleClass("card");
    expect(classes).toContain("page-card");
    applyPageStyleClass("fluent");
    expect(classes).not.toContain("page-card");
  });
});
