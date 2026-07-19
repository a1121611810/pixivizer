// @vitest-environment browser
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@solidjs/testing-library";
import "@/styles/tokens.css";

const mockColorTheme = vi.fn().mockReturnValue("fluent");

vi.mock("@/stores/themeStore", () => ({
  colorTheme: () => mockColorTheme(),
  setColorTheme: vi.fn(),
}));

import SettingsDrawer from "@/components/SettingsDrawer";

describe("SettingsDrawer light/dark theme visibility", () => {
  beforeEach(() => {
    mockColorTheme.mockReturnValue("fluent");
    (globalThis as any).APP_VERSION = "test";
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the light/dark/system selector when Fluent is active", () => {
    render(() => <SettingsDrawer />);

    expect(screen.getByLabelText("浅色")).toBeDefined();
    expect(screen.getByLabelText("深色")).toBeDefined();
    expect(screen.getByLabelText("跟随系统")).toBeDefined();
  });

  it("hides the light/dark/system selector when a non-Fluent color theme is active", () => {
    mockColorTheme.mockReturnValue("rose");
    render(() => <SettingsDrawer />);

    expect(screen.queryByLabelText("浅色")).toBeNull();
    expect(screen.queryByLabelText("深色")).toBeNull();
    expect(screen.queryByLabelText("跟随系统")).toBeNull();
  });
});
