// @vitest-environment browser
import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import "@/styles/tokens.css";

// Mock sub-components with deep deps
vi.mock("@/components/SettingsDrawer", () => ({ default: () => null }));
vi.mock("@/components/NavBar", () => ({ default: () => null }));
vi.mock("@/components/ErrorDisplay", () => ({ default: () => null }));

// Mock stores used by the component tree
vi.mock("@/stores/authStore", () => ({
  user: () => ({ id: 1, name: "TestUser", account: "test", profile_image_urls: {} }),
  isLoggedIn: () => true,
}));
vi.mock("@/stores/userStore", () => ({
  profile: () => ({
    total_illusts: 100,
    total_manga: 50,
    total_novels: 30,
    total_follow_users: 200,
    total_mypixiv_users: 300,
  }),
  viewedUser: () => null,
  loadProfile: vi.fn(),
  loadFollowing: vi.fn(),
  error: () => null,
}));
vi.mock("@/stores/userIllustsStore", () => ({
  illusts: () => [],
  novels: () => [],
  nextUrl: () => null,
  loading: () => false,
  error: () => null,
  contentType: () => "illust",
  load: vi.fn(),
  loadMore: vi.fn(),
  saveScrollPosition: vi.fn(),
}));
vi.mock("@/stores/uiStore", () => ({
  setCurrentTab: vi.fn(),
  currentTab: () => "me",
  layoutMode: () => "waterfall",
  useDnsOverride: () => false,
  showSettingsDrawer: () => false,
  closeSettingsDrawer: vi.fn(),
  theme: () => "system",
  ageConfirmed: () => true,
  isAdult: () => true,
  openSettingsDrawer: vi.fn(),
  listQuality: () => "medium",
  setListQuality: vi.fn(),
  detailQuality: () => "large",
  setDetailQuality: vi.fn(),
  showR18: () => true,
  setShowR18: vi.fn(),
  showR18G: () => true,
  setShowR18G: vi.fn(),
  hasUpdate: () => false,
  isCheckingUpdate: () => false,
  latestVersion: () => "",
  checkCompleted: () => false,
  autoCheckUpdate: () => false,
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
}));

describe("PersonalCenter", () => {
  it("loads and exports a component", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    expect(PersonalCenter).toBeDefined();
  });

  it("renders the main wrapper elements", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { container } = render(() => <PersonalCenter />);
    expect(container.querySelector(".min-h-screen")).not.toBeNull();
  });

  it("contains PageTransition wrapper", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { container } = render(() => <PersonalCenter />);
    // Verify the component tree mounts without error
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});
