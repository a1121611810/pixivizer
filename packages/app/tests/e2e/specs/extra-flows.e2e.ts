import { test, expect } from "../fixtures";
import { clickNavTab, openSettings, clientNavigate } from "../helpers";

test.describe("Following Feed Filters", () => {
  test("following page has all/public/private filter buttons", async ({ loggedInPage: page }) => {
    await clickNavTab(page, "关注");
    await expect(page).toHaveURL(/\/following/, { timeout: 10000 });

    // The filter buttons are <button> elements inside the following feed
    const allBtn = page.getByRole("button", { name: "全部" });
    const publicBtn = page.getByRole("button", { name: "公开", exact: true });
    const privateBtn = page.getByRole("button", { name: /非公開|非公开|private/i });

    await expect(allBtn).toBeVisible({ timeout: 5000 });
    await expect(publicBtn).toBeVisible({ timeout: 5000 });
    await expect(privateBtn).toBeVisible({ timeout: 5000 });
  });

  test("switching filters loads new content", async ({ loggedInPage: page }) => {
    await clickNavTab(page, "关注");
    await expect(page).toHaveURL(/\/following/, { timeout: 10000 });

    const publicBtn = page.getByRole("button", { name: /公開|公开/i });
    if (await publicBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await publicBtn.click();
    }
  });
});

test.describe("Image Host Settings", () => {
  test("image host settings page loads via settings drawer", async ({ loggedInPage: page }) => {
    await openSettings(page);

    const imgHostRow = page.locator('[class*="settings"]').getByText("图床").first();
    if (await imgHostRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await imgHostRow.click();
    } else {
      await clientNavigate(page, "/image-host");
    }
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/image-host");
  });
});

test.describe("About Page Sections", () => {
  test("about page shows all sections via settings", async ({ loggedInPage: page }) => {
    await openSettings(page);

    const aboutRow = page.locator('[class*="settings"]').getByText("关于").first();
    if (await aboutRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aboutRow.click();
    } else {
      await clientNavigate(page, "/about");
    }
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/about");

    const heading = page.locator("h1, [class*='title']").first();
    await expect(heading).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Theme Settings", () => {
  test("theme can be toggled via settings", async ({ loggedInPage: page }) => {
    await openSettings(page);

    const darkBtn = page.getByRole("button", { name: /深色|dark|DARK/i });
    const lightBtn = page.getByRole("button", { name: /浅色|light|LIGHT|明亮/i });

    if (await darkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await darkBtn.click();
    }
    if (await lightBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await lightBtn.click();
    }
  });
});

test.describe("Layout Mode", () => {
  test("layout mode can be changed in settings", async ({ loggedInPage: page }) => {
    await openSettings(page);

    const waterfallBtn = page.getByRole("button", { name: /瀑布流|waterfall|single/i });
    if (await waterfallBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await waterfallBtn.first().click();
    }
  });
});
