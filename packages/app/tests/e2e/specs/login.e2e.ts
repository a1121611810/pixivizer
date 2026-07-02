import { test, expect } from "../fixtures";
import { getRefreshToken } from "../token-loader";

test.describe("Login flow", () => {
  test("age confirmation dialog appears on first visit", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText("已满 18 岁")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("未满 18 岁")).toBeVisible({ timeout: 5000 });
  });

  test("confirming age and no token → redirects to login", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByText("已满 18 岁").click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/login/);
  });

  test("login page shows token input and login button", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByText("已满 18 岁").click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.getByText("粘贴你的 Pixiv refresh_token")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("登录")).toBeVisible({ timeout: 5000 });
  });

  test("login with valid refresh_token succeeds", async ({ page }) => {
    const token = getRefreshToken();
    test.skip(!token, "PIXIV_REFRESH_TOKEN not set");

    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByText("已满 18 岁").click();
    await page.waitForURL(/\/login/, { timeout: 10000 });

    await page.evaluate((t: string) => {
      const ta = document.querySelector("fluent-textarea") as any;
      if (ta) {
        ta.value = t;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, token!);

    await page.getByText("登录").click();
    await expect(page).toHaveURL(/\/recommended/, { timeout: 15000 });
  });

  test("login with invalid token shows error", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByText("已满 18 岁").click();
    await page.waitForURL(/\/login/, { timeout: 10000 });

    await page.evaluate(() => {
      const ta = document.querySelector("fluent-textarea") as any;
      if (ta) {
        ta.value = "invalid-token-12345";
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    await page.getByText("登录").click();
    await expect(page.locator("text=/失败|错误|error|invalid/i")).toBeVisible({ timeout: 10000 });
  });
});
