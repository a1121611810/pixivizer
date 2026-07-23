// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));

vi.mock("@/utils/imageLoader", () => ({
  resolveImageUrl: (url: string) => url,
  loadImage: vi.fn(),
}));

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
  error: () => null,
  loadProfile: vi.fn(),
  loadFollowing: vi.fn(),
}));

vi.mock("@/stores/uiStore", () => {
  const fns: Record<string, unknown> = {};
  const keys = [
    "setCurrentTab",
    "currentTab",
    "useDnsOverride",
    "setUseDnsOverride",
    "theme",
    "setThemePersisted",
    "listQuality",
    "setListQuality",
    "detailQuality",
    "setDetailQuality",
    "showR18",
    "setShowR18",
    "showR18G",
    "setShowR18G",
    "ageConfirmed",
    "isAdult",
    "setAgeConfirmation",
    "autoCheckUpdate",
    "setAutoCheckUpdate",
    "hasUpdate",
    "setHasUpdate",
    "isCheckingUpdate",
    "setIsCheckingUpdate",
    "latestVersion",
    "setLatestVersion",
    "checkCompleted",
    "setCheckCompleted",
    "setLatestReleaseUrl",
    "resetUiStore",
    "imageCachePrefetch",
    "autoHideNavBar",
    "showBookmarkBadge",
    "resolvedTheme",
    "imageQuality",
    "setImageQuality",
  ];
  for (const k of keys) fns[k] = vi.fn();
  fns.currentTab = () => "me";
  fns.useDnsOverride = () => false;
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

vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => () => ({}),
  useRouter: () => ({ history: { back: vi.fn() } }),
  useLocation: () => () => ({ pathname: "/me" }),
  Outlet: () => null,
}));

describe("PersonalCenter module", () => {
  it("loads and exports a component", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    expect(PersonalCenter).toBeDefined();
    expect(typeof PersonalCenter).toBe("function");
  });
});
