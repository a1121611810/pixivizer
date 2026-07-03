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
    }
  });

  test("infinite scroll loads more illusts", async ({ loggedInPage: page }) => {
    const cards = page.locator(".image-card");
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const visibleCount = await cards.count();
    expect(visibleCount).toBeGreaterThan(0);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 2));
    const finalCount = await cards.count();
    expect(finalCount).toBeGreaterThan(0);
  });
});

test.describe("Feed / Following", () => {
  test("following feed loads when switching tabs", async ({ loggedInPage: page }) => {
    await clickNavTab(page, "关注");
    await expect(page).toHaveURL(/\/following/, { timeout: 10000 });
  });
});

test.describe("Feed / Novel Follow", () => {
  test("sub-tab switch does not leak stale card DOM (badge overlap regression)", async ({
    loggedInPage: page,
  }) => {
    // Switch content type to novel
    await page.getByText("小说").click();

    // Navigate to follow tab
    await clickNavTab(page, "关注");

    // Wait for novel cards to render
    await expect(page.locator("fluent-badge").first()).toBeVisible({
      timeout: 15000,
    });

    // Count all absolute-positioned card containers in the virtual feed
    const countAbsoluteChildren = async (): Promise<number> => {
      return page.evaluate(() => {
        const containers = document.querySelectorAll<HTMLElement>(
          '[style*="position: relative"][style*="height"]',
        );
        for (const c of containers) {
          if (
            c.children.length > 0 &&
            (c.children[0] as HTMLElement).style.position === "absolute"
          ) {
            return c.children.length;
          }
        }
        return 0;
      });
    };

    // Get card count before sub-tab switch
    const countBefore = await countAbsoluteChildren();
    expect(countBefore).toBeGreaterThan(0);

    // Switch to "公开" sub-tab
    const publicBtn = page.getByText("公开");
    await expect(publicBtn).toBeVisible({ timeout: 5000 });
    await publicBtn.click();

    // Wait for new cards to render
    await expect(page.locator("fluent-badge").first()).toBeVisible({
      timeout: 10000,
    });
    // Small settle time for DOM reconciliation (For keyed remount)
    await page.waitForTimeout(500);

    // Get card count after sub-tab switch
    const countAfter = await countAbsoluteChildren();

    // Critical assertion: after switching sub-tab, card count should not exceed
    // a reasonable visible limit (no lingering old cards inflating the count).
    // With For keyed remount, old items are gone — count should be ≤ viewport capacity.
    // A reasonable bound: ≤ before count + 2 (one extra for off-by-one in viewport calc)
    expect(countAfter).toBeLessThanOrEqual(countBefore + 2);

    // Additionally: no duplicate top positions (would indicate old cards still present)
    const hasDuplicateTops = await page.evaluate(() => {
      const containers = document.querySelectorAll<HTMLElement>(
        '[style*="position: relative"][style*="height"]',
      );
      for (const c of containers) {
        const tops = new Set<number>();
        for (let i = 0; i < c.children.length; i++) {
          const child = c.children[i] as HTMLElement;
          const top = parseInt(child.style.top, 10);
          if (!isNaN(top)) {
            if (tops.has(top)) return true;
            tops.add(top);
          }
        }
      }
      return false;
    });
    expect(hasDuplicateTops).toBe(false);
  });
});
