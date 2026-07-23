// @vitest-environment browser
import { describe, it, expect } from "vitest";
import { render, screen } from "solid-testing-library";
import ThemeSelector from "@/components/ThemeSelector";

describe("ThemeSelector page style", () => {
  it("renders page style buttons", async () => {
    render(() => <ThemeSelector />);
    expect(screen.getByText("Fluent 默认")).toBeTruthy();
    expect(screen.getByText("卡片风格")).toBeTruthy();
  });

  it("does not render color theme swatches", async () => {
    render(() => <ThemeSelector />);
    expect(() => screen.getByText("海岸")).toThrow();
    expect(() => screen.getByText("玫瑰")).toThrow();
  });
});
