// @vitest-environment browser
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@solidjs/testing-library";
import "@/styles/tokens.css";

const mockNavigate = vi.fn();

vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => mockNavigate,
}));

import SettingsDrawer from "@/components/SettingsDrawer";

describe("SettingsDrawer navigation hub", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    (globalThis as any).APP_VERSION = "test";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the drawer title", () => {
    render(() => <SettingsDrawer />);
    expect(screen.getByText("设置")).toBeDefined();
  });

  it("renders all four settings section headers", () => {
    render(() => <SettingsDrawer />);
    expect(screen.getByText("显示与交互")).toBeDefined();
    expect(screen.getByText("内容与过滤")).toBeDefined();
    expect(screen.getByText("图片与网络")).toBeDefined();
    expect(screen.getByText("账号与应用")).toBeDefined();
  });
});
