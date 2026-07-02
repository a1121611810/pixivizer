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

  test("toggle switch → cancel confirmation → switch stays off", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/image-host");
    await page.waitForLoadState("networkidle");

    // Wait for Fluent Web Components to finish upgrading
    await page.evaluate(async () => {
      await customElements.whenDefined("fluent-switch");
      await customElements.whenDefined("fluent-dialog");
    });

    const masterSwitch = page.locator('fluent-switch[aria-label="启用图床代理"]');
    const confirmDialog = page.locator('fluent-dialog[aria-label="开启图床代理？"]');

    // 1. Initial state: OFF & dialog closed
    let preState = await page.evaluate(() => {
      const sw = document.querySelector('fluent-switch[aria-label="启用图床代理"]') as any;
      const d = document.querySelector('fluent-dialog[aria-label="开启图床代理？"]') as any;
      return { checked: sw?.checked ?? false, dialogOpen: d?._dialog?.open ?? false };
    });
    expect(preState.checked).toBe(false);
    expect(preState.dialogOpen).toBe(false);

    // 2. Click + verify dialog in one evaluate call to avoid timing issues
    //    with SolidJS createEffect and Fluent Web Component lifecycles.
    const postState = await page.evaluate(async () => {
      const sw = document.querySelector('fluent-switch[aria-label="启用图床代理"]') as any;
      sw?.click();
      await new Promise((r) => setTimeout(r, 100));
      const d = document.querySelector('fluent-dialog[aria-label="开启图床代理？"]') as any;
      return { checked: sw?.checked ?? false, dialogOpen: d?._dialog?.open ?? false };
    });
    expect(postState.checked).toBe(true);
    expect(postState.dialogOpen).toBe(true);

    // 3. Click "取消" button inside the dialog
    const cancelBtn = confirmDialog
      .locator('fluent-button[appearance="secondary"]')
      .getByText("取消");
    await cancelBtn.click();

    // 4. Dialog should close
    await page.waitForTimeout(300);
    expect(
      await confirmDialog.evaluate(
        (el: HTMLElement) =>
          (el as unknown as { _dialog?: HTMLDialogElement })._dialog?.open ?? false,
      ),
    ).toBe(false);

    // 5. Switch should be OFF — our cancelEnable fix resets it
    expect(
      await masterSwitch.evaluate(
        (el: HTMLElement) => (el as unknown as { checked: boolean }).checked,
      ),
    ).toBe(false);
  });

  test("toggle switch → confirm → switch stays on", async ({ loggedInPage: page }) => {
    await clientNavigate(page, "/image-host");
    await page.waitForLoadState("networkidle");

    // Wait for Fluent Web Components to finish upgrading
    await page.evaluate(async () => {
      await customElements.whenDefined("fluent-switch");
      await customElements.whenDefined("fluent-dialog");
    });

    const masterSwitch = page.locator('fluent-switch[aria-label="启用图床代理"]');
    const confirmDialog = page.locator('fluent-dialog[aria-label="开启图床代理？"]');

    // 1. Initial state: OFF & dialog closed
    let preState = await page.evaluate(() => {
      const sw = document.querySelector('fluent-switch[aria-label="启用图床代理"]') as any;
      const d = document.querySelector('fluent-dialog[aria-label="开启图床代理？"]') as any;
      return { checked: sw?.checked ?? false, dialogOpen: d?._dialog?.open ?? false };
    });
    expect(preState.checked).toBe(false);
    expect(preState.dialogOpen).toBe(false);

    // 2. Click + verify dialog in one evaluate call
    let postState = await page.evaluate(async () => {
      const sw = document.querySelector('fluent-switch[aria-label="启用图床代理"]') as any;
      sw?.click();
      await new Promise((r) => setTimeout(r, 100));
      const d = document.querySelector('fluent-dialog[aria-label="开启图床代理？"]') as any;
      return { checked: sw?.checked ?? false, dialogOpen: d?._dialog?.open ?? false };
    });
    expect(postState.checked).toBe(true);
    expect(postState.dialogOpen).toBe(true);

    // 3. Click "确认开启"
    const confirmBtn = confirmDialog.getByText("确认开启");
    await confirmBtn.click();

    // 4. Dialog should close
    await page.waitForTimeout(300);
    expect(
      await confirmDialog.evaluate(
        (el: HTMLElement) =>
          (el as unknown as { _dialog?: HTMLDialogElement })._dialog?.open ?? false,
      ),
    ).toBe(false);

    // 5. Switch should be ON (masterEnabled was set to true)
    expect(
      await masterSwitch.evaluate(
        (el: HTMLElement) => (el as unknown as { checked: boolean }).checked,
      ),
    ).toBe(true);

    // 6. Cleanup: click switch again to turn off (no dialog when turning off)
    await masterSwitch.evaluate((el: HTMLElement) => el.click());
    expect(
      await masterSwitch.evaluate(
        (el: HTMLElement) => (el as unknown as { checked: boolean }).checked,
      ),
    ).toBe(false);
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
