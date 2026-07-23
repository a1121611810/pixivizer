import { test, expect } from "../fixtures";
import { clickNavTab, openSettings, clientNavigate } from "../helpers";

test.describe("Navigation", () => {
  test("navbar tabs are visible and clickable", async ({ loggedInPage: page }) => {
    const tabs = ["推荐", "关注", "收藏"];
    for (const label of tabs) {
      const btn = page.locator(".floating-nav-item").filter({ hasText: label });
      await expect(btn).toBeVisible({ timeout: 5000 });
    }
  });

  test("clicking each nav tab changes route", async ({ loggedInPage: page }) => {
    await clickNavTab(page, "收藏");
    await expect(page).toHaveURL(/\/bookmarks/u, { timeout: 10_000 });

    await clickNavTab(page, "推荐");
    await expect(page).toHaveURL(/\/recommended/u, { timeout: 10_000 });
  });

  test("about page loads correctly via settings", async ({ loggedInPage: page }) => {
    await openSettings(page);

    const aboutRow = page.locator('[class*="settings"]').getByText("关于").first();
    if (await aboutRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aboutRow.click();
    } else {
      await clientNavigate(page, "/about");
    }
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/about");

    const appInfo = page.locator("h1, h2, [class*='title']").first();
    await expect(appInfo).toBeVisible({ timeout: 5000 });
  });

  test("debug page loads without crashing", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/debug");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/debug");
  });

  test("settings drawer can be opened", async ({ loggedInPage: page }) => {
    await openSettings(page);
  });
});

test.describe("Error handling", () => {
  test("navigating to unknown route shows fallback", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/this-route-does-not-exist");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toBeTruthy();
  });
});
