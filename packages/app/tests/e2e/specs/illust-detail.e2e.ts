import { test, expect } from "../fixtures";

test.describe("Illust Detail", () => {
  test("clicking an illust card opens the detail page", async ({ loggedInPage: page }) => {
    const card = page.locator(".image-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await expect(page).toHaveURL(/\/illust\/\d+/, { timeout: 10000 });
  });

  test("detail page shows illust metadata", async ({ loggedInPage: page }) => {
    const card = page.locator(".image-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await expect(page).toHaveURL(/\/illust\/\d+/, { timeout: 10000 });

    const image = page.locator("img").first();
    await expect(image).toBeVisible({ timeout: 5000 });

    const userAvatar = page.locator("img[alt]").first();
    await expect(userAvatar).toBeVisible({ timeout: 5000 });
  });

  test("bookmark toggle on detail page", async ({ loggedInPage: page }) => {
    const card = page.locator(".image-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await expect(page).toHaveURL(/\/illust\/\d+/, { timeout: 10000 });

    const bookmarkBtn = page
      .locator(
        'button[class*="bookmark"], [class*="fav"], [aria-label*="bookmark"i], [aria-label*="收藏"i]',
      )
      .first();
    if (await bookmarkBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bookmarkBtn.click();
    }
  });

  test("back navigation from detail returns to feed", async ({ loggedInPage: page }) => {
    const card = page.locator(".image-card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await expect(page).toHaveURL(/\/illust\/\d+/, { timeout: 10000 });

    await page.goBack();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/recommended");
  });
});
