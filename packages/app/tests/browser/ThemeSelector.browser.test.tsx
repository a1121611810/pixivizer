// @vitest-environment browser
import { describe, it, expect } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import "@/styles/tokens.css";
import ThemeSelector from "@/components/ThemeSelector";

describe("ThemeSelector swatches", () => {
  it("renders visible color swatches for every theme option", () => {
    render(() => <ThemeSelector />);

    const labels = ["Fluent 默认", "海岸", "玫瑰", "鼠尾草", "薰衣草", "焦糖"];
    for (const label of labels) {
      const button = screen.getByLabelText(label);
      const swatch = button.querySelector("span");
      expect(swatch).not.toBeNull();

      const style = window.getComputedStyle(swatch!);
      const bg = style.backgroundColor;
      expect(bg).not.toBe("rgba(0, 0, 0, 0)");
      expect(bg).not.toBe("transparent");
    }
  });
});
