// @vitest-environment browser
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import "@/styles/tokens.css";
import ProfileCard from "@/components/ProfileCard";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockOpenSettingsDrawer = vi.hoisted(() => vi.fn());

vi.mock("@/utils/r18Filter", () => ({
  filterUserPreviews: (items: any[]) => items,
  filterFeedIllusts: (items: any[]) => items,
  filterNovels: (items: any[]) => items,
}));

vi.mock("@/stores/uiStore", () => ({
  openSettingsDrawer: mockOpenSettingsDrawer,
  useDnsOverride: () => false,
  showSettingsDrawer: () => false,
  closeSettingsDrawer: vi.fn(),
  theme: () => "system",
  resolvedTheme: () => "light",
  setThemePersisted: vi.fn(),
  listQuality: () => "medium",
  setListQuality: vi.fn(),
  detailQuality: () => "large",
  setDetailQuality: vi.fn(),
  showR18: () => true,
  showR18G: () => true,
  setShowR18: vi.fn(),
  setShowR18G: vi.fn(),
  ageConfirmed: () => true,
  isAdult: () => true,
  setAgeConfirmation: vi.fn(),
  autoCheckUpdate: () => false,
  hasUpdate: () => false,
  isCheckingUpdate: () => false,
  latestVersion: () => "",
  checkCompleted: () => false,
  setAutoCheckUpdate: vi.fn(),
  setHasUpdate: vi.fn(),
  setIsCheckingUpdate: vi.fn(),
  setLatestReleaseUrl: vi.fn(),
  setLatestVersion: vi.fn(),
  setCheckCompleted: vi.fn(),
  resetUiStore: vi.fn(),
  imageCachePrefetch: () => false,
  autoHideNavBar: () => false,
  showBookmarkBadge: () => false,
  currentTab: () => "me",
  setCurrentTab: vi.fn(),
  layoutMode: () => "waterfall",
}));

vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => () => ({ pathname: "/" }),
  useParams: () => ({}),
  useRouter: () => ({ history: { back: vi.fn() } }),
  getRouteApi: () => ({ useLoaderData: () => () => undefined }),
  useBeforeLeave: () => {},
}));

describe("ProfileCard", () => {
  it("renders the acrylic card container with surface-glass class", () => {
    const { container } = render(() => <ProfileCard targetUserId={1} isSelf={true} />);
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
    const { container } = render(() => <ProfileCard targetUserId={1} isSelf={true} />);
    // Find stat label spans specifically
    const allElements = container.querySelectorAll("span");
    const labels = Array.from(allElements).map((el) => el.textContent);
    expect(labels.some((t) => t === "作品")).toBe(true);
    expect(labels.some((t) => t === "关注")).toBe(true);
    expect(labels.some((t) => t === "粉丝")).toBe(true);
  });

  it("renders an avatar container (120px) with fallback SVG", () => {
    const { container } = render(() => <ProfileCard targetUserId={1} isSelf={true} />);
    const avatarContainer = container.querySelector(".w-\\[120px\\]");
    expect(avatarContainer).not.toBeNull();
    // SVG fallback should be present when no user data
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("calls openSettingsDrawer when clicking 编辑资料 button", () => {
    render(() => <ProfileCard targetUserId={1} isSelf={true} />);
    const buttons = screen.getAllByRole("button");
    const editBtn = buttons.find((b) => b.textContent?.includes("编辑资料"));
    expect(editBtn).not.toBeUndefined();
    fireEvent.click(editBtn!);
    expect(mockOpenSettingsDrawer).toHaveBeenCalledTimes(1);
  });

  it("navigates to /user/{id}/illusts when clicking 作品 stat", () => {
    render(() => <ProfileCard targetUserId={1} isSelf={true} />);
    const buttons = screen.getAllByRole("button");
    const worksBtn = buttons.find((b) => b.getAttribute("aria-label") === "查看作品");
    expect(worksBtn).not.toBeUndefined();
    fireEvent.click(worksBtn!);
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/user/1/illusts" });
  });

  it("navigates to /user/{id}/following when clicking 关注 stat", () => {
    render(() => <ProfileCard targetUserId={1} isSelf={true} />);
    const buttons = screen.getAllByRole("button");
    const followingBtn = buttons.find((b) => b.getAttribute("aria-label") === "查看关注");
    expect(followingBtn).not.toBeUndefined();
    fireEvent.click(followingBtn!);
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/user/1/following" });
  });
});
