import { describe, it, expect, vi } from "vitest";
import { render, screen } from "solid-testing-library";

vi.mock("@/stores/themeStore", () => ({
  pageStyleTheme: () => "card",
  setPageStyleTheme: vi.fn(),
  PAGE_STYLE_THEME_IDS: ["fluent", "card"],
}));

vi.mock("@/stores/uiStore", () => ({
  theme: () => "system",
  setThemePersisted: vi.fn(),
}));

import ThemeSelector from "@/components/ThemeSelector";

describe("ThemeSelector card style selected", () => {
  it("marks card style as selected", async () => {
    render(() => <ThemeSelector />);
    const cardBtn = screen.getByLabelText("卡片风格");
    expect(cardBtn.getAttribute("aria-pressed")).toBe("true");
  });
});
