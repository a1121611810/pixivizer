// @vitest-environment browser
import { render, within } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import IllustTags from "../../src/components/IllustTags";

describe("IllustTags", () => {
  it("renders tags with translated name", () => {
    const { container } = render(() => (
      <IllustTags tags={[{ name: "猫", translated_name: "cat" }]} />
    ));
    expect(container.textContent).toContain("cat");
  });

  it("falls back to original name when translated name is missing", () => {
    const { container } = render(() => <IllustTags tags={[{ name: "犬" }]} />);
    expect(container.textContent).toContain("犬");
  });

  it("renders all tags", () => {
    const { container } = render(() => (
      <IllustTags tags={[{ name: "a" }, { name: "b" }, { name: "c" }]} />
    ));
    const root = container.querySelector("[role='list']");
    const items = within(root as HTMLElement).getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });

  it("applies small size by default", () => {
    const { container } = render(() => <IllustTags tags={[{ name: "x" }]} />);
    const span = container.querySelector("span[role='listitem']");
    expect(span).toBeTruthy();
    expect(span?.className).toContain("fontSizeBase100");
    expect(span?.className).not.toContain("fontSizeBase200");
  });

  it("renders medium size when requested", () => {
    const { container } = render(() => <IllustTags tags={[{ name: "y" }]} size="medium" />);
    const span = container.querySelector("span[role='listitem']");
    expect(span).toBeTruthy();
    expect(span?.className).toContain("fontSizeBase200");
    expect(span?.className).not.toContain("fontSizeBase100");
  });

  it("applies custom class", () => {
    const { container } = render(() => <IllustTags tags={[{ name: "z" }]} class="custom-class" />);
    const root = container.querySelector("[role='list']");
    expect(root?.classList.contains("custom-class")).toBe(true);
  });
});
