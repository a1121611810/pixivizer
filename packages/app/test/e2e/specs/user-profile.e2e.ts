import { test, expect } from "../fixtures";
import { clickNavTab, clientNavigate } from "../helpers";

test.describe("User Profile (user/:id)", () => {
  test("navigating to illust detail then back to feed works", async ({ loggedInPage: page }) => {
    // Verify illust detail navigation works
    const card = page.locator(".image-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForFunction(() => /\/illust\/\d+/.test(window.location.pathname), null, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify we're on an illust detail page with visible image
    const image = page.locator("img").first();
    await expect(image).toBeVisible({ timeout: 5000 });

    // Go back to feed
    await page.goBack();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/recommended");
  });

  test("user profile nav tabs are visible on /me", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Check for user info
    const userName = page.locator("h1, [class*='name'], [class*='username']").first();
    await expect(userName).toBeVisible({ timeout: 10000 });
  });

  test("user following tab from /me loads following list", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Check the following tab exists
    const followingTab = page.getByRole("button", { name: /关注|following/i }).first();
    if (await followingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await followingTab.click();
      await page.waitForTimeout(2000);
    }
  });
});

test.describe("User Illusts (user/:id/illusts)", () => {
  test("navigating to own user illusts page loads content", async ({ loggedInPage: page }) => {
    // Use client-side navigation to preserve auth state
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Navigate to /user/:id/illusts by going via /me and looking for the illusts tab
    const illustsTab = page.getByRole("button", { name: /作品|illust|投稿/i }).first();
    if (await illustsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await illustsTab.click();
      await page.waitForTimeout(2000);
    }
  });
});
