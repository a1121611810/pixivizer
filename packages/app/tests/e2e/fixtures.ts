import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { getRefreshToken } from "./token-loader";

export type TestFixtures = {
  loggedInPage: Page;
};

/**
 * Complete the age confirmation flow.
 * Age confirmation uses <fluent-button> with "已满 18 岁" text.
 */
async function confirmAge(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });

  const adultBtn = page.getByText("已满 18 岁");
  if (await adultBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await adultBtn.click();
    await page.waitForLoadState("networkidle");
  }
}

/**
 * Log in using the refresh_token from env.
 * Login page uses <fluent-textarea> and <fluent-button>.
 */
async function loginWithRefreshToken(page: Page, token: string) {
  if (!page.url().includes("/login")) {
    await page.goto("/login", { waitUntil: "networkidle" });
  }

  // Type into fluent-textarea via value setter
  await page.evaluate((t: string) => {
    const ta = document.querySelector("fluent-textarea") as any;
    if (ta) {
      ta.value = t;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, token);

  // Click login button and wait for redirect
  await page.getByText("登录").click();

  // Should be redirected to recommended page
  await expect(page).toHaveURL(/\/recommended/u, { timeout: 15_000 });
}

export const test = base.extend<TestFixtures>({
  loggedInPage: async ({ page }, use) => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      test.skip("PIXIV_REFRESH_TOKEN not set, skipping authenticated tests");
      return;
    }

    await confirmAge(page);
    await loginWithRefreshToken(page, refreshToken);
    use(page);
  },
});

export { expect } from "@playwright/test";
