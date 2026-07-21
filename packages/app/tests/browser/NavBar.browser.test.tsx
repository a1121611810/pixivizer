// @vitest-environment browser
// 验证 NavBar 中心钮单击导航到搜索页。
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockNavigate = vi.fn();

vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => mockNavigate,
}));

import NavBar from "../../src/components/NavBar";

describe("NavBar 中心钮", () => {
  beforeEach(() => {
    cleanup();
    mockNavigate.mockClear();
  });

  it("单击中心钮导航到 /search", () => {
    const { getByRole } = render(() => <NavBar />);
    fireEvent.click(getByRole("button", { name: "搜索" }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/search" });
  });
});
