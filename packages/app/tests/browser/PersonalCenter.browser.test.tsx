// @vitest-environment browser
import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { useParams, useLocation } from "@tanstack/solid-router";
import "@/styles/tokens.css";

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
  loadProfile: vi.fn(),
}));
vi.mock("@/stores/uiStore", () => ({
  setCurrentTab: vi.fn(),
  currentTab: () => "me",
  useDnsOverride: () => false,
  theme: () => "system",
  ageConfirmed: () => true,
  isAdult: () => true,
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
  resolvedTheme: () => "light",
}));

const navigateFn = vi.fn();

// Outlet 组件：测试环境中渲染空占位
const OutletMock = () => null;

vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => navigateFn,
  useParams: () => () => ({}),
  useRouter: () => ({ history: { back: vi.fn() } }),
  useLocation: () => () => ({ pathname: "/me" }),
  Outlet: OutletMock,
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

  it("renders back button", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { container } = render(() => <PersonalCenter />);
    const backBtn = container.querySelector('[aria-label="返回"]');
    expect(backBtn).not.toBeNull();
  });

  it("renders search bar", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { findByText } = render(() => <PersonalCenter />);
    const searchText = await findByText("搜索");
    expect(searchText).not.toBeNull();
  });

  it("renders user info card with nickname", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { findByText } = render(() => <PersonalCenter />);
    const nick = await findByText("TestUser");
    expect(nick).not.toBeNull();
  });

  it("renders menu group: 我的作品, 我的收藏, 我的关注, 我的粉丝", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { findByText } = render(() => <PersonalCenter />);
    expect(await findByText("我的作品")).not.toBeNull();
    expect(await findByText("我的收藏")).not.toBeNull();
    expect(await findByText("我的关注")).not.toBeNull();
    expect(await findByText("我的粉丝")).not.toBeNull();
  });

  it("renders settings menu item", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { findByText } = render(() => <PersonalCenter />);
    expect(await findByText("设置")).not.toBeNull();
  });

  it("does NOT render content type tabs (插画/漫画/小说)", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { container } = render(() => <PersonalCenter />);
    const buttons = container.querySelectorAll("button");
    const tabLabels = ["插画", "漫画", "小说"];
    for (const btn of buttons) {
      for (const label of tabLabels) {
        expect(btn.textContent).not.toContain(label);
      }
    }
  });

  it("does NOT render old pill-style tab switch container", async () => {
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { container } = render(() => <PersonalCenter />);
    const buttons = container.querySelectorAll("button");
    const hasTabPills = Array.from(buttons).some(
      (btn) => btn.textContent?.includes("插画") && btn.textContent?.includes("漫画"),
    );
    expect(hasTabPills).toBe(false);
  });

  //── 导航诊断：点击菜单项应调用 navigate ──
  it("clicking '我的作品' calls navigate with /user/1/illusts", async () => {
    navigateFn.mockClear();
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { findByText } = render(() => <PersonalCenter />);
    const el = await findByText("我的作品");
    el.click();
    expect(navigateFn).toHaveBeenCalledWith({ to: "/user/1/illusts" });
  });

  it("clicking '我的关注' calls navigate with /following", async () => {
    navigateFn.mockClear();
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { findByText } = render(() => <PersonalCenter />);
    const el = await findByText("我的关注");
    el.click();
    expect(navigateFn).toHaveBeenCalledWith({ to: "/following" });
  });

  it("clicking '我的粉丝' calls navigate with /my/followers", async () => {
    navigateFn.mockClear();
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { findByText } = render(() => <PersonalCenter />);
    const el = await findByText("我的粉丝");
    el.click();
    expect(navigateFn).toHaveBeenCalledWith({ to: "/my/followers" });
  });

  it("clicking '我的收藏' calls navigate with /bookmarks", async () => {
    navigateFn.mockClear();
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { findByText } = render(() => <PersonalCenter />);
    const el = await findByText("我的收藏");
    el.click();
    expect(navigateFn).toHaveBeenCalledWith({ to: "/bookmarks" });
  });

  it("clicking '设置' calls navigate with /settings", async () => {
    navigateFn.mockClear();
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { findByText } = render(() => <PersonalCenter />);
    const el = await findByText("设置");
    el.click();
    expect(navigateFn).toHaveBeenCalledWith({ to: "/settings" });
  });

  it("renders 'TA 的关注' and hides '我的收藏' when viewing another user", async () => {
    // 模拟查看他人（/user/999），覆盖 useParams 和 useLocation mock
    const mockUseParams = vi.fn(() => ({ id: "999" }));
    const mockUseLocation = vi.fn(() => ({ pathname: "/user/999" }));
    vi.mocked(useParams).mockImplementation(() => mockUseParams);
    vi.mocked(useLocation).mockImplementation(() => mockUseLocation);
    const PersonalCenter = (await import("@/routes/PersonalCenter")).default;
    const { container, findByText, queryByText } = render(() => <PersonalCenter />);
    // 应显示 TA 的作品 / TA 的关注 / TA 的粉丝
    expect(await findByText("TA 的作品")).not.toBeNull();
    expect(await findByText("TA 的关注")).not.toBeNull();
    expect(await findByText("TA 的粉丝")).not.toBeNull();
    // 应隐藏收藏和设置
    expect(queryByText("我的收藏")).toBeNull();
    expect(queryByText("设置")).toBeNull();

    // 粉丝导航应指向 /user/$id/followers
    const followersBtn = await findByText("TA 的粉丝");
    followersBtn.click();
    expect(navigateFn).toHaveBeenCalledWith({ to: "/user/999/followers" });

    // 恢复 mock
    vi.mocked(useParams).mockRestore();
    vi.mocked(useLocation).mockRestore();
  });
});
