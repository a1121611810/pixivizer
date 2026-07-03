// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import {
  findMatches,
  clearHighlights,
  applyHighlights,
  type NovelSearchMatch,
} from "@/primitives/createNovelSearch";

describe("findMatches", () => {
  it("returns empty array for empty query", () => {
    expect(findMatches(["hello world"], "", false)).toEqual([]);
  });

  it("returns empty array when no match", () => {
    expect(findMatches(["hello world"], "foo", false)).toEqual([]);
  });

  it("finds a single match", () => {
    expect(findMatches(["hello world"], "world", false)).toEqual([
      { paragraphIndex: 0, start: 6, end: 11 },
    ]);
  });

  it("finds multiple matches in one paragraph", () => {
    expect(findMatches(["a b a c a"], "a", false)).toEqual([
      { paragraphIndex: 0, start: 0, end: 1 },
      { paragraphIndex: 0, start: 4, end: 5 },
      { paragraphIndex: 0, start: 8, end: 9 },
    ]);
  });

  it("finds matches across paragraphs", () => {
    expect(findMatches(["hello world", "world peace"], "world", false)).toEqual([
      { paragraphIndex: 0, start: 6, end: 11 },
      { paragraphIndex: 1, start: 0, end: 5 },
    ]);
  });

  it("is case-insensitive by default", () => {
    expect(findMatches(["Hello World"], "world", false)).toEqual([
      { paragraphIndex: 0, start: 6, end: 11 },
    ]);
  });

  it("supports case-sensitive search", () => {
    expect(findMatches(["Hello World"], "world", true)).toEqual([]);
    expect(findMatches(["Hello World"], "World", true)).toEqual([
      { paragraphIndex: 0, start: 6, end: 11 },
    ]);
  });

  it("handles Chinese and Japanese mixed text", () => {
    const paragraphs = ["这是一段小说正文。", "これは小説です。"];
    expect(findMatches(paragraphs, "小说", false)).toEqual([
      { paragraphIndex: 0, start: 4, end: 6 },
    ]);
    expect(findMatches(paragraphs, "小説", false)).toEqual([
      { paragraphIndex: 1, start: 3, end: 5 },
    ]);
  });

  it("skips empty paragraphs", () => {
    expect(findMatches(["hello", "", "world"], "world", false)).toEqual([
      { paragraphIndex: 2, start: 0, end: 5 },
    ]);
  });

  it("caps matches at maxMatches", () => {
    const paragraphs = ["a a a a a a a a a a"];
    expect(findMatches(paragraphs, "a", false, 5)).toHaveLength(5);
  });

  it("does not find overlapping matches", () => {
    // "aaa" with query "aa" should produce one match starting at 0.
    expect(findMatches(["aaa"], "aa", false)).toEqual([{ paragraphIndex: 0, start: 0, end: 2 }]);
  });
});

describe("clearHighlights", () => {
  it("unwraps all mark elements and restores text", () => {
    const container = document.createElement("div");
    container.innerHTML =
      '<p><mark class="novel-search-match">world</mark></p><p>foo<mark class="novel-search-match">bar</mark>baz</p>';

    clearHighlights(container);

    expect(container.querySelectorAll("mark.novel-search-match")).toHaveLength(0);
    expect(container.textContent).toBe("worldfoobarbaz");
    expect(container.querySelector("p")?.childNodes.length).toBe(1);
    expect(container.querySelector("p")?.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
  });
});

describe("applyHighlights", () => {
  it("wraps matching text with mark elements and marks active index", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>hello world</p><p>foo bar</p>";

    const paragraphs = ["hello world", "foo bar"];
    const matches: NovelSearchMatch[] = [
      { paragraphIndex: 0, start: 6, end: 11 },
      { paragraphIndex: 1, start: 0, end: 3 },
    ];

    applyHighlights(container, paragraphs, matches, 1);

    const marks = container.querySelectorAll("mark.novel-search-match");
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe("world");
    expect(marks[1].textContent).toBe("foo");
    expect(marks[1].dataset.matchIndex).toBe("1");
    expect(marks[1].classList.contains("novel-search-match-active")).toBe(true);
    expect(marks[0].classList.contains("novel-search-match-active")).toBe(false);
  });

  it("preserves non-matching text nodes", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>hello world</p>";

    const paragraphs = ["hello world"];
    const matches: NovelSearchMatch[] = [{ paragraphIndex: 0, start: 6, end: 11 }];

    applyHighlights(container, paragraphs, matches, 0);

    const p = container.querySelector("p")!;
    expect(p.childNodes.length).toBe(2);
    expect(p.childNodes[0].textContent).toBe("hello ");
    expect(p.childNodes[1].textContent).toBe("world");
  });

  it("clears previous highlights before applying new ones", () => {
    const container = document.createElement("div");
    container.innerHTML = '<p><mark class="novel-search-match">old</mark></p>';

    const paragraphs = ["new text"];
    const matches: NovelSearchMatch[] = [{ paragraphIndex: 0, start: 0, end: 3 }];

    applyHighlights(container, paragraphs, matches, 0);

    const marks = container.querySelectorAll("mark.novel-search-match");
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe("new");
  });
});
