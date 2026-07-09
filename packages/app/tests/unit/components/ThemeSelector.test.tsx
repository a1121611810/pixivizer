// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@solidjs/testing-library";

const mockSetColorTheme = vi.fn();
const mockColorTheme = vi.fn().mockReturnValue("fluent");

vi.mock("@/stores/themeStore", () => ({
  colorTheme: () => mockColorTheme(),
  setColorTheme: (id: string) => mockSetColorTheme(id),
  VALID_THEME_IDS: ["fluent", "coast", "rose", "sage", "lavender", "caramel"],
}));

import ThemeSelector from "@/components/ThemeSelector";

describe("ThemeSelector", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockColorTheme.mockReturnValue("fluent");
  });

  it("renders all 6 theme options with labels", () => {
    render(() => <ThemeSelector />);

    expect(screen.getByLabelText("Fluent 默认")).toBeDefined();
    expect(screen.getByLabelText("海岸")).toBeDefined();
    expect(screen.getByLabelText("玫瑰")).toBeDefined();
    expect(screen.getByLabelText("鼠尾草")).toBeDefined();
    expect(screen.getByLabelText("薰衣草")).toBeDefined();
    expect(screen.getByLabelText("焦糖")).toBeDefined();
  });

  it("highlights the currently selected theme", () => {
    mockColorTheme.mockReturnValue("rose");
    render(() => <ThemeSelector />);

    const roseButton = screen.getByLabelText("玫瑰");
    expect(roseButton.getAttribute("aria-pressed")).toBe("true");

    const fluentButton = screen.getByLabelText("Fluent 默认");
    expect(fluentButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls setColorTheme when a non-fluent theme is clicked", () => {
    render(() => <ThemeSelector />);

    const coastButton = screen.getByLabelText("海岸");
    fireEvent.click(coastButton);

    expect(mockSetColorTheme).toHaveBeenCalledTimes(1);
    expect(mockSetColorTheme).toHaveBeenCalledWith("coast");
  });

  it("calls setColorTheme when the fluent theme is clicked", () => {
    mockColorTheme.mockReturnValue("coast");
    render(() => <ThemeSelector />);

    const fluentButton = screen.getByLabelText("Fluent 默认");
    fireEvent.click(fluentButton);

    expect(mockSetColorTheme).toHaveBeenCalledTimes(1);
    expect(mockSetColorTheme).toHaveBeenCalledWith("fluent");
  });

  it("exposes each option as a button for accessibility", () => {
    render(() => <ThemeSelector />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
  });
});
