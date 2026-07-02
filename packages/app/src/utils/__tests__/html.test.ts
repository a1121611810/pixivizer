// @vitest-environment happy-dom
/**
 * Happy-dom's DOMParser attempts to load iframe/src URLs when parsing HTML,
 * which produces unhandled network errors. Register the error handler at
 * module scope so it's active before any tests run.
 */
process.on("unhandledRejection", (reason: unknown) => {
  const msg = String(reason);
  if (
    msg.includes("ECONNREFUSED") ||
    msg.includes("NetworkError") ||
    msg.includes("localhost:3000") ||
    msg.includes("Failed to fetch")
  ) {
    return;
  }
});

import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../html";

describe("sanitizeHtml", () => {
  it("preserves plain text", () => {
    const input = "Hello, Pixiv!";
    expect(sanitizeHtml(input)).toBe("Hello, Pixiv!");
  });

  it("preserves allowed tags", () => {
    const input =
      "<p>Paragraph</p><div>Block</div><b>Bold</b><strong>Strong</strong><i>Italic</i><em>Em</em><span>Span</span><br>Line";
    expect(sanitizeHtml(input)).toBe(
      "<p>Paragraph</p><div>Block</div><b>Bold</b><strong>Strong</strong><i>Italic</i><em>Em</em><span>Span</span><br>Line",
    );
  });

  it("removes script tags", () => {
    const input = '<p>safe</p><script>alert("xss")</script><p>end</p>';
    expect(sanitizeHtml(input)).toBe("<p>safe</p><p>end</p>");
  });

  it("removes event handler attributes", () => {
    const input = '<p onclick="alert(1)" onmouseover="alert(2)">hover me</p>';
    expect(sanitizeHtml(input)).toBe("<p>hover me</p>");
  });

  it("removes unsafe href schemes", () => {
    const input = '<a href="javascript:alert(1)">click</a><a href="https://pixiv.net">safe</a>';
    expect(sanitizeHtml(input)).toBe('<a>click</a><a href="https://pixiv.net">safe</a>');
  });

  it("preserves pixiv:// links", () => {
    const input = '<a href="pixiv://users/12345">open user</a>';
    expect(sanitizeHtml(input)).toBe('<a href="pixiv://users/12345">open user</a>');
  });

  it("strips attributes from non-anchor allowed tags", () => {
    const input = '<span class="evil" style="color:red" data-x="y">text</span>';
    expect(sanitizeHtml(input)).toBe("<span>text</span>");
  });

  it("unwraps unknown tags while keeping children", () => {
    const input = "<unknown><b>keep</b></unknown>";
    expect(sanitizeHtml(input)).toBe("<b>keep</b>");
  });

  it("removes forbidden tags entirely including nested content", () => {
    const input = '<p>before</p><iframe src="about:blank"></iframe><p>after</p>';
    expect(sanitizeHtml(input)).toBe("<p>before</p><p>after</p>");
  });
});
