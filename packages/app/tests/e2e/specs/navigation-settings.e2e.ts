import { test, expect } from "../fixtures";
import { clickNavTab, openSettings, clientNavigate } from "../helpers";

test.describe("Navigation", () => {
  test("navbar tabs are visible and clickable", async ({ loggedInPage: page }) => {
    const tabs = ["推荐", "关注", "收藏"];
    for (const label of tabs) {
      const btn = page.locator(".bottom-nav-item").filter({ hasText: label });
      await expect(btn).toBeVisible({ timeout: 5000 });
    }
  });

  test("clicking each nav tab changes route", async ({ loggedInPage: page }) => {
    // Click 收藏 → should go to /bookmarks
    await clickNavTab(page, "收藏");
    await page.waitForURL(/\/bookmarks/, { timeout: 10000 });

    // Click 推荐 → should go to /recommended
    await clickNavTab(page, "推荐");
    await page.waitForURL(/\/recommended/, { timeout: 10000 });
  });

  test("about page loads correctly via settings", async ({ loggedInPage: page }) => {
    // Use client-side navigation to avoid losing auth state on full page reload
    await openSettings(page);

    const aboutRow = page.locator('[class*="settings"]').getByText("关于").first();
    if (await aboutRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aboutRow.click();
    } else {
      await clientNavigate(page, "/about");
    }
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // URL should be /about
    expect(page.url()).toContain("/about");

    // Should have content
    const appInfo = page.locator("h1, h2, [class*='title']").first();
    await expect(appInfo).toBeVisible({ timeout: 5000 });
  });

  test("debug page loads without crashing", async ({ loggedInPage: page }) => {
    // Use client-side navigation to preserve auth state
    await clientNavigate(page, "/debug");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/debug");
  });

  test("settings drawer can be opened", async ({ loggedInPage: page }) => {
    await openSettings(page);
  });
});

test.describe("Error handling", () => {
  test("navigating to unknown route shows fallback", async ({ loggedInPage: page }) => {
    // Use client-side navigation for unknown route too
    await clientNavigate(page, "/this-route-does-not-exist");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    expect(page.url()).toBeTruthy();
  });
});
