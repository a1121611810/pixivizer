// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

// Only mock the modules that are causing import chain failures in node environment
vi.mock("@/components/SettingsDrawer", () => ({ default: () => null }));
vi.mock("@/components/NavBar", () => ({ default: () => null }));
vi.mock("@/components/PageTransition", () => ({
  default: (props: any) => props.children,
}));

vi.mock("@/stores/authStore", () => ({
  user: () => ({ id: 1, name: "TestUser", account: "test", profile_image_urls: {} }),
  isLoggedIn: () => true,
}));

vi.mock("@/stores/userStore", () => ({
  profile: () => ({ total_illusts: 100, total_manga: 50, total_novels: 30, total_follow_users: 200, total_mypixiv_users: 300 }),
  viewedUser: () => null,
  loadProfile: vi.fn(),
  loadFollowing: vi.fn(),
  error: () => null,
}));

vi.mock("@/stores/userIllustsStore", () => ({
  illusts: () => [], novels: () => [], nextUrl: () => null,
  loading: () => false, error: () => null, contentType: () => "illust",
  load: vi.fn(), loadMore: vi.fn(), saveScrollPosition: vi.fn(),
}));

vi.mock("@/stores/uiStore", () => {
  // All exports from uiStore that are used by dependent modules
  const fns: Record<string, unknown> = {};
  const keys = [
    "setCurrentTab", "currentTab", "layoutMode", "useDnsOverride", "setUseDnsOverride",
    "showSettingsDrawer", "closeSettingsDrawer", "theme", "setThemePersisted",
    "listQuality", "setListQuality", "detailQuality", "setDetailQuality",
    "showR18", "setShowR18", "showR18G", "setShowR18G",
    "ageConfirmed", "isAdult", "setAgeConfirmation",
    "autoCheckUpdate", "setAutoCheckUpdate",
    "hasUpdate", "setHasUpdate", "isCheckingUpdate", "setIsCheckingUpdate",
    "latestVersion", "setLatestVersion", "checkCompleted", "setCheckCompleted",
    "setLatestReleaseUrl", "resetUiStore", "openSettingsDrawer", "closeSettingsDrawer",
    "imageCachePrefetch", "autoHideNavBar", "showBookmarkBadge",
    "resolvedTheme", "imageQuality", "setImageQuality",
  ];
  for (const k of keys) fns[k] = vi.fn();
  // Signals that return specific values
  fns.currentTab = () => "me";
  fns.layoutMode = () => "waterfall";
  fns.useDnsOverride = () => false;
  fns.showSettingsDrawer = () => false;
  fns.theme = () => "system";
  fns.resolvedTheme = () => "light";
  fns.listQuality = () => "medium";
  fns.detailQuality = () => "large";
  fns.showR18 = () => true;
  fns.showR18G = () => true;
  fns.ageConfirmed = () => true;
  fns.isAdult = () => true;
  fns.autoCheckUpdate = () => false;
  fns.hasUpdate = () => false;
  fns.isCheckingUpdate = () => false;
  fns.latestVersion = () => "";
  fns.checkCompleted = () => false;
  fns.imageCachePrefetch = () => false;
  fns.autoHideNavBar = () => false;
  fns.showBookmarkBadge = () => false;
  return fns;
});

// Also mock the SolidJS primitives that need DOM
vi.mock("@solid-primitives/scroll", () => ({
  createScrollPosition: () => ({ y: 0 }),
}));

vi.mock("@/primitives/createScrollDrivenVisibility", () => ({
  createScrollDrivenVisibility: () => ({ visible: () => true, suppress: vi.fn() }),
}));

vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => () => ({}),
  useRouter: () => ({ history: { back: vi.fn() } }),
}));

describe("PersonalCenter module", () => {
  it("loads and exports a component", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    expect(PersonalCenter).toBeDefined();
    expect(typeof PersonalCenter).toBe("function");
  });
});
