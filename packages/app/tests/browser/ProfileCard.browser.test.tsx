// @vitest-environment browser
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import "@/styles/tokens.css";
import ProfileCard from "@/components/ProfileCard";

describe("ProfileCard", () => {
  it("renders the acrylic card container with surface-glass class", () => {
    const { container } = render(() => (
      <ProfileCard targetUserId={1} isSelf={true} />
    ));
    const cards = container.querySelectorAll(".surface-glass");
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("shows '编辑资料' button when isSelf is true", () => {
    render(() => <ProfileCard targetUserId={1} isSelf={true} />);
    // Use getAllByText and check at least one button contains it
    const buttons = screen.getAllByRole("button");
    const editBtn = buttons.find((b) => b.textContent?.includes("编辑资料"));
    expect(editBtn).not.toBeUndefined();
  });

  it("shows '关注' button when isSelf is false", () => {
    render(() => <ProfileCard targetUserId={2} isSelf={false} />);
    const buttons = screen.getAllByRole("button");
    const followBtn = buttons.find((b) => b.textContent?.trim() === "关注");
    expect(followBtn).not.toBeUndefined();
  });

  it("renders stat items for 作品, 关注, and 粉丝", () => {
    const { container } = render(() => (
      <ProfileCard targetUserId={1} isSelf={true} />
    ));
    // Find stat label spans specifically
    const allElements = container.querySelectorAll("span");
    const labels = Array.from(allElements).map((el) => el.textContent);
    expect(labels.some((t) => t === "作品")).toBe(true);
    expect(labels.some((t) => t === "关注")).toBe(true);
    expect(labels.some((t) => t === "粉丝")).toBe(true);
  });

  it("renders an avatar container (120px) with fallback SVG", () => {
    const { container } = render(() => (
      <ProfileCard targetUserId={1} isSelf={true} />
    ));
    const avatarContainer = container.querySelector(".w-\\[120px\\]");
    expect(avatarContainer).not.toBeNull();
    // SVG fallback should be present when no user data
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });
});
