// @vitest-environment browser
import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import "@/styles/tokens.css";
import CollapsedHeader from "@/components/CollapsedHeader";

const mockBack = vi.fn();
vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => () => ({ pathname: "/" }),
  useParams: () => () => ({}),
  useRouter: () => ({ history: { back: mockBack } }),
  getRouteApi: () => ({ useLoaderData: () => () => undefined }),
  useBeforeLeave: (fn: unknown) => fn as any,
}));

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
      header!.classList.contains("opacity-0") && header!.classList.contains("pointer-events-none"),
    ).toBe(true);
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    const { container } = render(() => <CollapsedHeader visible={true} onBack={onBack} />);
    const backButton = container.querySelector("fluent-button");
    expect(backButton).not.toBeNull();
    backButton!.click();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("calls router.history.back() when back button is clicked and no onBack prop", () => {
    mockBack.mockClear();
    const { container } = render(() => <CollapsedHeader visible={true} />);
    const backButton = container.querySelector("fluent-button");
    expect(backButton).not.toBeNull();
    backButton!.click();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('has aria-label="返回" on the fluent-button', () => {
    const { container } = render(() => <CollapsedHeader visible={true} />);
    const backButton = container.querySelector("fluent-button");
    expect(backButton).not.toBeNull();
    expect(backButton!.getAttribute("aria-label")).toBe("返回");
  });

  it("has -translate-y-full class when visible=false", () => {
    const { container } = render(() => <CollapsedHeader visible={false} />);
    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header!.classList.contains("-translate-y-full")).toBe(true);
  });
});
