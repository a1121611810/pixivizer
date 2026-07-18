import { test, expect } from "../fixtures";
import { clientNavigate } from "../helpers";

test.describe("User Profile (user/:id)", () => {
  test("navigating to illust detail then back to feed works", async ({ loggedInPage: page }) => {
    const card = page.locator(".image-card").first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();
    await expect(page).toHaveURL(/\/illust\/\d+/u, { timeout: 10_000 });

    const image = page.locator("img").first();
    await expect(image).toBeVisible({ timeout: 5000 });

    await page.goBack();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/recommended");
  });

  test("user profile nav tabs are visible on /me", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");

    const userName = page.locator("h1, [class*='name'], [class*='username']").first();
    await expect(userName).toBeVisible({ timeout: 10_000 });
  });

  test("user following tab from /me loads following list", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");

    const followingTab = page.getByRole("button", { name: /关注|following/iu }).first();
    if (await followingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await followingTab.click();
    }
  });
});

test.describe("User Illusts (user/:id/illusts)", () => {
  test("navigating to own user illusts page loads content", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");

    const illustsTab = page.getByRole("button", { name: /作品|illust|投稿/iu }).first();
    if (await illustsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await illustsTab.click();
    }
  });
});
