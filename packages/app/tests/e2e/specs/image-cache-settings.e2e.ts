import { test, expect } from "@playwright/test";

/**
 * ImageCacheSettings 页面的 e2e seam 测试。
 *
 * RED: /image-cache 路由尚未在 App.tsx 中注册 → 导航到该路径应返回 404 或 Login 页
 * GREEN: 路由注册后 → 页面渲染"图片缓存"标题 + A/B/C 三个开关
 */

test.describe("ImageCacheSettings 页面", () => {
  test("导航到 /image-cache 渲染图片缓存设置页", async ({ page }) => {
    await page.goto("/image-cache");

    // 期望: 页面标题包含"图片缓存"
    await expect(page.locator("h1, h2, h3").first()).toContainText("图片缓存");
  });

  test("设置页显示 A/B/C 三个开关", async ({ page }) => {
    await page.goto("/image-cache");

    // A: 磁盘缓存
    await expect(page.getByText("磁盘缓存")).toBeVisible();
    // B: 浏览器缓存
    await expect(page.getByText("浏览器缓存")).toBeVisible();
    // C: 后台预取
    await expect(page.getByText("后台预取")).toBeVisible();
  });

  test("SettingsDrawer 有入口导航到 /image-cache", async ({ page }) => {
    await page.goto("/me");

    // 展开设置面板 — 点击设置按钮
    const settingsButton = page.locator("button", { hasText: "图片缓存" });
    await settingsButton.click();

    // 期望: 导航到了 /image-cache
    await expect(page).toHaveURL(/\/image-cache/);
  });

  test("旧 slider「图片缓存限制」已移除", async ({ page }) => {
    await page.goto("/me");
    // 旧 slider 文字不应存在
    await expect(page.getByText("图片缓存限制")).not.toBeVisible();
  });
});
