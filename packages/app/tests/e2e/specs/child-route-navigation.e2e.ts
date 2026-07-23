import { test, expect } from "../fixtures";
import { clientNavigate } from "../helpers";

test.describe("PersonalCenter child route navigation", () => {
  test("clicking 我的作品 navigates to /user/{id}/illusts and renders UserIllusts content", async ({
    loggedInPage: page,
  }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Click 我的作品
    const myWorks = page.getByText("我的作品").first();
    await expect(myWorks).toBeVisible({ timeout: 10_000 });
    await myWorks.click();
    await page.waitForLoadState("networkidle");

    // Verify URL changed
    expect(page.url()).toMatch(/\/user\/\d+\/illusts/u);

    // Verify the page content actually changed — UserIllusts has a header with user name + "的作品"
    // The UserIllusts page has "的作品" text in the header
    await expect(page.getByText("的作品")).toBeVisible({ timeout: 10_000 });

    // Verify PersonalCenter content is NOT visible (should be replaced by child route)
    const profileCard = page.getByText("我的作品");
    await expect(profileCard).not.toBeVisible();
  });

  test("clicking 我的关注 navigates to /user/{id}/following and renders FollowListPage", async ({
    loggedInPage: page,
  }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const myFollowing = page.getByText("我的关注").first();
    await expect(myFollowing).toBeVisible({ timeout: 10_000 });
    await myFollowing.click();
    await page.waitForLoadState("networkidle");

    // Verify URL changed
    expect(page.url()).toMatch(/\/user\/\d+\/following/u);

    // FollowListPage should render — look for a list or header content
    await expect(page.getByText("我的作品")).not.toBeVisible();
  });

  test("clicking 我的粉丝 navigates to /user/{id}/followers and renders FollowListPage", async ({
    loggedInPage: page,
  }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const myFollowers = page.getByText("我的粉丝").first();
    await expect(myFollowers).toBeVisible({ timeout: 10_000 });
    await myFollowers.click();
    await page.waitForLoadState("networkidle");

    // Verify URL changed
    expect(page.url()).toMatch(/\/user\/\d+\/followers/u);

    await expect(page.getByText("我的作品")).not.toBeVisible();
  });
});
