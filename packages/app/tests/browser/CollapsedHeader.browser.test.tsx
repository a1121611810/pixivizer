// @vitest-environment browser
import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import "@/styles/tokens.css";
import CollapsedHeader from "@/components/CollapsedHeader";

describe("CollapsedHeader", () => {
  it("renders with surface-appbar class when visible", () => {
    const { container } = render(() => <CollapsedHeader visible={true} />);
    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header!.classList.contains("surface-appbar")).toBe(true);
  });

  it("shows opacity-0 and pointer-events-none when not visible", () => {
    const { container } = render(() => <CollapsedHeader visible={false} />);
    const header = container.querySelector("header");
    expect(header).not.toBeNull();

    // Should have the hidden classes
    expect(
      header!.classList.contains("opacity-0") &&
        header!.classList.contains("pointer-events-none")
    ).toBe(true);
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    const { container } = render(() => (
      <CollapsedHeader visible={true} onBack={onBack} />
    ));
    const backButton = container.querySelector("fluent-button");
    expect(backButton).not.toBeNull();
    backButton!.click();
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
