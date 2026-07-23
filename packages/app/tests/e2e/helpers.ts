import { type Page } from "@playwright/test";

/**
 * Click a bottom nav tab by label text.
 * Bottom nav uses class "floating-nav-item", distinct from card buttons.
 */
export async function clickNavTab(page: Page, label: string) {
  const btn = page.locator(".floating-nav-item").filter({ hasText: label });
  await btn.click();
}

/**
 * Open the settings drawer by clicking the header title/user avatar area.
 * The settings drawer opens from the top bar's tap target.
 */
export async function openSettings(page: Page) {
  const headerTitle = page.locator('[class*="surface-appbar"] h1').first();
  await headerTitle.click();
}

/**
 * Navigate to a route via client-side router (avoid full page reload).
 * Uses Solid Router's navigate function available on window.__router_navigate.
 * Falls back to history pushState + popstate.
 */
export async function clientNavigate(page: Page, path: string) {
  await page.evaluate((p: string) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}
