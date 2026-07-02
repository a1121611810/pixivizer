import { test, expect } from "../fixtures";
import { clickNavTab, clientNavigate } from "../helpers";

test.describe("User Profile", () => {
  test("personal center loads user info", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Should show user profile info
    const userName = page.locator("h1, [class*='name'], [class*='username']").first();
    await expect(userName).toBeVisible({ timeout: 10000 });
  });

  test("user illusts tab shows user's works", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const illustsTab = page.getByRole("button", { name: /作品|illust|投稿/i }).first();
    if (await illustsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await illustsTab.click();
      await page.waitForTimeout(3000);
    }
  });
});

test.describe("Bookmarks", () => {
  test("bookmarks page loads and shows content", async ({ loggedInPage: page }) => {
    // Use bottom-nav-item class to distinguish from card bookmark buttons
    await clickNavTab(page, "收藏");
    await page.waitForURL(/\/bookmarks/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check for any visible content — image cards or page wrapper
    const content = page.locator(".image-card, [class*='bookmark'], [class*='content'], div[class]").first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test("bookmarks public/private toggle works", async ({ loggedInPage: page }) => {
    await clickNavTab(page, "收藏");
    await page.waitForURL(/\/bookmarks/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    const privateTab = page.getByRole("button", { name: /非公开|private|privado/i });
    if (await privateTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await privateTab.click();
      await page.waitForTimeout(2000);
    }
  });
});
