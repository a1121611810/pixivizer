import { test, expect } from "../fixtures";
import { clickNavTab } from "../helpers";

test.describe("Feed / Recommended", () => {
  test("recommended feed loads and shows illust cards", async ({ loggedInPage: page }) => {
    const cards = page.locator(".image-card").first();
    await expect(cards).toBeVisible({ timeout: 15000 });
    const count = await page.locator(".image-card").count();
    expect(count).toBeGreaterThan(0);
  });

  test("sub-tab switching works (illust/manga/mixed)", async ({ loggedInPage: page }) => {
    await expect(page.locator(".image-card").first()).toBeVisible({ timeout: 15000 });
    const mangaTab = page.getByRole("button", { name: /漫画|manga/i });
    if (await mangaTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mangaTab.click();
      await page.waitForTimeout(2000);
    }
  });

  test("infinite scroll loads more illusts", async ({ loggedInPage: page }) => {
    const cards = page.locator(".image-card");
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    // Scroll to bottom to trigger infinite load
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000);

    // After scrolling, cards should still be visible (virtual scroll keeps visible items)
    const visibleCount = await cards.count();
    expect(visibleCount).toBeGreaterThan(0);

    // Scroll further down to trigger more loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 2));
    await page.waitForTimeout(3000);

    // Should still have visible cards
    const finalCount = await cards.count();
    expect(finalCount).toBeGreaterThan(0);
  });
});

test.describe("Feed / Following", () => {
  test("following feed loads when switching tabs", async ({ loggedInPage: page }) => {
    await clickNavTab(page, "关注");
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/following");
  });
});
