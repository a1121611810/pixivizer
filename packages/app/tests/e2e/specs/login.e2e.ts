import { test, expect } from "../fixtures";
import { getRefreshToken } from "../token-loader";

test.describe("Login flow", () => {
  test("age confirmation dialog appears on first visit", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Age confirmation uses <fluent-button> with text "已满 18 岁"
    await expect(page.getByText("已满 18 岁")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("未满 18 岁")).toBeVisible({ timeout: 5000 });
  });

  test("confirming age and no token → redirects to login", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Click "已满 18 岁"
    await page.getByText("已满 18 岁").click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // App tries auto-login (no token) → redirects to /login
    expect(page.url()).toMatch(/\/login/);
  });

  test("login page shows token input and login button", async ({ page }) => {
    // Step 1: Navigate to app → age confirmation
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Step 2: Confirm age
    await page.getByText("已满 18 岁").click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Step 3: Now on /login page - check label in light DOM
    await expect(page.getByText("粘贴你的 Pixiv refresh_token")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("登录")).toBeVisible({ timeout: 5000 });
  });

  test("login with valid refresh_token succeeds", async ({ page }) => {
    const token = getRefreshToken();
    test.skip(!token, "PIXIV_REFRESH_TOKEN not set");

    // Age confirmation first
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.getByText("已满 18 岁").click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Type into fluent-textarea via evaluate (shadow DOM)
    await page.evaluate((t: string) => {
      const ta = document.querySelector("fluent-textarea") as any;
      if (ta) {
        ta.value = t;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, token!);

    // Click login button
    await page.getByText("登录").click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    // Should redirect to recommended page
    expect(page.url()).toMatch(/\/recommended/);
  });

  test("login with invalid token shows error", async ({ page }) => {
    // Age confirmation first
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.getByText("已满 18 岁").click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Type invalid token
    await page.evaluate(() => {
      const ta = document.querySelector("fluent-textarea") as any;
      if (ta) {
        ta.value = "invalid-token-12345";
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    // Click login
    await page.getByText("登录").click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Should show error
    await expect(page.locator("text=/失败|错误|error|invalid/i")).toBeVisible({ timeout: 10000 });
  });
});
