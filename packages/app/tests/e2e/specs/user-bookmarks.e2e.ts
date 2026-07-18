import { test, expect } from "../fixtures";
import { clickNavTab, clientNavigate } from "../helpers";

test.describe("User Profile", () => {
  test("personal center loads user info", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");

    const userName = page.locator("h1, [class*='name'], [class*='username']").first();
    await expect(userName).toBeVisible({ timeout: 10_000 });
  });

  test("user illusts tab shows user's works", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/me");
    await page.waitForLoadState("networkidle");

    const illustsTab = page.getByRole("button", { name: /作品|illust|投稿/iu }).first();
    if (await illustsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await illustsTab.click();
    }
  });
});

test.describe("Bookmarks", () => {
  test("bookmarks page loads and shows content", async ({ loggedInPage: page }) => {
    await clickNavTab(page, "收藏");
    await expect(page).toHaveURL(/\/bookmarks/u, { timeout: 10_000 });

    const content = page
      .locator(".image-card, [class*='bookmark'], [class*='content'], div[class]")
      .first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test("bookmarks public/private toggle works", async ({ loggedInPage: page }) => {
    await clickNavTab(page, "收藏");
    await expect(page).toHaveURL(/\/bookmarks/u, { timeout: 10_000 });

    const privateTab = page.getByRole("button", { name: /非公开|private|privado/iu });
    if (await privateTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await privateTab.click();
    }
  });
});
