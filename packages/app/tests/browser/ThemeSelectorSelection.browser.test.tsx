// @vitest-environment browser
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import "@/styles/tokens.css";

vi.mock("@/stores/themeStore", () => ({
  colorTheme: () => "rose",
  setColorTheme: vi.fn(),
}));

import ThemeSelector from "@/components/ThemeSelector";

describe("ThemeSelector selection indicator", () => {
  it("shows a selected indicator on the active theme", () => {
    render(() => <ThemeSelector />);

    const selectedButton = screen.getByLabelText("玫瑰");
    expect(selectedButton.querySelector("[data-testid='selected-indicator']")).not.toBeNull();

    const unselectedButton = screen.getByLabelText("海岸");
    expect(unselectedButton.querySelector("[data-testid='selected-indicator']")).toBeNull();
  });
});
