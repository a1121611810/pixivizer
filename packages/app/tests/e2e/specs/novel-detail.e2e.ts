import { test, expect } from "../fixtures";
import { clickNavTab } from "../helpers";

test.describe("Novel Detail", () => {
  test("header shows scroll title on novel detail page", async ({ loggedInPage: page }) => {
    // 1. Switch to novel mode
    await page.getByRole("button", { name: "小说" }).click();
    await page.waitForTimeout(500);

    // 2. Navigate to following tab to see novel cards
    await clickNavTab(page, "关注");
    await page.waitForTimeout(2000);

    // 3. Check if any novel cards are visible (images with alt text)
    const novelCover = page.locator("img[alt]").first();
    if (!(await novelCover.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip("No novel cards available — check recommended tab");
    }

    // 4. Try recommended tab instead if follow has no novels
    const navRecommended = page.locator(".bottom-nav-item").filter({ hasText: "推荐" });
    await navRecommended.click();
    await page.waitForTimeout(2000);

    // Wait for a novel card cover image to appear
    const cover = page.locator("img[alt]").first();
    await expect(cover).toBeVisible({ timeout: 15000 });

    // Get the novel title from the alt text
    const novelTitle = await cover.getAttribute("alt");
    expect(novelTitle).toBeTruthy();

    // 5. Click the novel card to navigate to detail page
    // The card wrapper is the clickable parent of the cover image
    const card = cover.locator("..").locator("..").locator("..");
    await card.click();
    await expect(page).toHaveURL(/\/novel\/\d+/, { timeout: 10000 });

    // 6. Wait for the detail page to load
    await page.waitForTimeout(2000);

    // 7. Verify the header title span exists (initially invisible)
    // The header h1 contains "小说" + a span with the title in 《》
    const headerTitleSpan = page.locator("h1 span").filter({ hasText: /《.+》/ });
    await expect(headerTitleSpan).toBeAttached({ timeout: 5000 });

    // 8. Check initial state: the title span should have opacity-0 class
    // (it's part of classList, so we check the class attribute)
    const classAttr = await headerTitleSpan.getAttribute("class");
    expect(classAttr).toContain("opacity-0");

    // 9. Scroll down past the cover image area
    // The cover is aspect-[16/9] max-h-64 (max ~256px)
    // Scrolling 400px should hide the original title
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);

    // 10. After scrolling, the header title should now be visible (opacity-100)
    const classAfterScroll = await headerTitleSpan.getAttribute("class");
    expect(classAfterScroll).toContain("opacity-100");

    // 11. Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // 12. Title should be hidden again
    const classAfterTop = await headerTitleSpan.getAttribute("class");
    expect(classAfterTop).toContain("opacity-0");
  });
});
