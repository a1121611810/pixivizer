// @vitest-environment browser
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import "@/styles/tokens.css";
import ProfileBackground from "@/components/ProfileBackground";

describe("ProfileBackground", () => {
  it("renders a div with gradient background using Fluent tokens", () => {
    const { container } = render(() => <ProfileBackground />);
    const div = container.firstElementChild as HTMLElement;
    expect(div).not.toBeNull();

    // Check inline style (CSS vars are resolved in computed style)
    expect(div.style.background).toContain("linear-gradient");
    expect(div.style.background).toContain("var(--colorBrandBackground)");
  });

  it("accepts and applies additional class names", () => {
    const { container } = render(() => <ProfileBackground class="fixed" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.classList.contains("fixed")).toBe(true);
  });

  it("uses absolute positioning classes", () => {
    const { container } = render(() => <ProfileBackground />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.classList.contains("absolute")).toBe(true);
    expect(div.classList.contains("inset-0")).toBe(true);
  });
});
