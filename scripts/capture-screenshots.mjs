#!/usr/bin/env node
// @ts-check
/**
 * Capture Playwright screenshots for Fastlane Google Play assets.
 *
 * Assumes the Vite dev server is already running at http://localhost:5173.
 * Outputs 1080×1920 logical-pixel PNGs to
 * fastlane/metadata/android/en-US/images/phoneScreenshots/
 * and mirrors them to zh-CN.
 */

import { chromium } from "playwright";
import { join } from "node:path";
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const OUT_EN = join(
  process.cwd(),
  "fastlane",
  "metadata",
  "android",
  "en-US",
  "images",
  "phoneScreenshots",
);
const OUT_ZH = join(
  process.cwd(),
  "fastlane",
  "metadata",
  "android",
  "zh-CN",
  "images",
  "phoneScreenshots",
);

const VIEWPORT = {
  width: 540,
  height: 960,
};
const DEVICE_SCALE_FACTOR = 2;
const REFRESH_TOKEN = "fake-refresh-token-for-screenshots";

/** @param {string} message */
function warn(message) {
  console.warn(`[capture-screenshots] ${message}`);
}

/** @param {string} message */
function log(message) {
  console.log(`[capture-screenshots] ${message}`);
}

function ensureDirs() {
  for (const dir of [OUT_EN, OUT_ZH]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Save a screenshot to en-US and mirror it to zh-CN.
 * @param {Buffer} buffer
 * @param {string} filename
 */
function saveScreenshot(buffer, filename) {
  const enPath = join(OUT_EN, filename);
  const zhPath = join(OUT_ZH, filename);
  writeFileSync(enPath, buffer);
  copyFileSync(enPath, zhPath);
  log(`Saved ${filename} (${buffer.length} bytes)`);
}

/**
 * Intercept the Pixiv OAuth endpoint so the app thinks it is logged in
 * without needing a real refresh_token.
 * @param {import("playwright").Page} page
 */
async function interceptFakeAuth(page) {
  await page.route("**/pixiv-oauth/auth/token", async (route) => {
    log("Intercepted OAuth request; returning mock auth response");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        response: {
          access_token: "fake-access-token",
          refresh_token: REFRESH_TOKEN,
          user: {
            id: 123456,
            name: "Pictelio User",
            account: "pictelio_user",
            profile_image_urls: {},
          },
          expires_in: 3600,
          token_type: "Bearer",
        },
      }),
    });
  });
}

/**
 * Seed the secure-storage-backed refresh_token so the app attempts login.
 * @param {import("playwright").Page} page
 */
async function seedFakeToken(page) {
  // capacitor-secure-storage-plugin web implementation stores base64 values
  // under the "cap_sec_" prefix.
  await page.evaluate((token) => {
    localStorage.setItem("cap_sec_refresh_token", btoa(token));
  }, REFRESH_TOKEN);
}

/**
 * Client-side navigate using the app's router. A full page load would cause
 * RootLayout's onMount to redirect to /recommended after auth init, so we
 * trigger navigation from within the already-mounted app.
 * @param {import("playwright").Page} page
 * @param {string} path
 */
async function clientNavigate(page, path) {
  const targetUrl = `${BASE_URL}${path}`;
  log(`Client navigating to ${path}`);
  await page.evaluate((href) => {
    const a = document.createElement("a");
    a.href = href;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, path);
  try {
    await page.waitForURL(targetUrl, { timeout: 5000 });
  } catch {
    // Router may not update the URL exactly; continue with current state.
  }
  log(`Current URL after client navigation: ${page.url()}`);
}

/**
 * Dismiss the age-gate overlay if it is present.
 * @param {import("playwright").Page} page
 */
async function dismissAgeGate(page) {
  try {
    const adultButton = page.getByRole("button", { name: "已满 18 岁" });
    await adultButton.waitFor({ state: "visible", timeout: 3000 });
    await adultButton.click();
    log("Dismissed age gate (已满 18 岁)");
    // Allow the sheet to animate closed.
    await page.waitForTimeout(500);
  } catch {
    // Age gate not present; nothing to do.
  }
}

/**
 * Capture the current viewport, logging any warning but never throwing.
 * @param {import("playwright").Page} page
 * @param {string} filename
 * @param {string} contextLabel
 */
async function safeScreenshot(page, filename, contextLabel) {
  try {
    const url = page.url();
    log(`Capturing ${filename} at ${url}`);
    const buffer = await page.screenshot({ type: "png", fullPage: false });
    saveScreenshot(buffer, filename);
  } catch (err) {
    warn(`Failed to capture ${filename} (${contextLabel}): ${/** @type {Error} */ (err).message}`);
  }
}

/**
 * Perform a full page navigation. Used for the initial app load and for the
 * login page where a fresh auth state is required.
 * @param {import("playwright").Page} page
 * @param {string} url
 */
async function fullNavigate(page, url) {
  try {
    log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 10000 });
    log(`Navigation complete: ${page.url()}`);
  } catch (err) {
    warn(`Navigation to ${url} failed: ${err.message}; retrying with load`);
    try {
      await page.goto(url, { waitUntil: "load", timeout: 10000 });
      log(`Retry navigation complete: ${page.url()}`);
    } catch (err2) {
      warn(`Retry navigation to ${url} also failed: ${err2.message}; current url: ${page.url()}`);
    }
  }
}

/**
 * Wait briefly, dismiss age gate, run an optional pre-capture hook, and
 * capture the current viewport. Never throws.
 * @param {import("playwright").Page} page
 * @param {string} filename
 * @param {string} contextLabel
 * @param {(page: import("playwright").Page) => Promise<void>} [beforeCapture]
 */
async function captureCurrent(page, filename, contextLabel, beforeCapture) {
  await dismissAgeGate(page);

  if (beforeCapture) {
    try {
      await beforeCapture(page);
    } catch (err) {
      warn(`Pre-capture step failed for ${filename}: ${/** @type {Error} */ (err).message}`);
    }
  }

  await safeScreenshot(page, filename, contextLabel);
}

async function main() {
  ensureDirs();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  });
  const page = await context.newPage();

  log(`Using base URL: ${BASE_URL}`);

  await interceptFakeAuth(page);

  // Seed token and load the app once so RootLayout can complete auth init
  // before we capture authenticated routes.
  await fullNavigate(page, `${BASE_URL}/login`);
  await seedFakeToken(page);
  // Reload so the app reads the seeded token and completes initializeAuth.
  await page.reload({ waitUntil: "networkidle", timeout: 10000 });
  log(`App loaded at: ${page.url()}`);

  // 01 — Feed
  await captureCurrent(page, "01_feed.png", "/recommended", async (p) => {
    // Wait for either skeleton placeholders or actual feed cards to appear.
    const feedLocator = p.locator(
      '[role="feed"], .skeleton-card, .image-card, article, .virtual-feed',
    );
    try {
      await feedLocator.first().waitFor({ state: "visible", timeout: 7000 });
    } catch {
      // Fall back to a short settling delay.
      await p.waitForTimeout(3000);
    }
  });

  // 02 — Detail
  await clientNavigate(page, "/illust/12345678");
  await captureCurrent(page, "02_detail.png", "/illust/12345678", async (p) => {
    // Detail page is mostly static once its own data resolves.
    await p.waitForTimeout(2500);
  });

  // 03 — Settings sheet
  await clientNavigate(page, "/recommended");
  await captureCurrent(page, "03_settings.png", "/recommended", async (p) => {
    await dismissAgeGate(p);
    const settingsButton = p.locator('header button[aria-label="设置"]').first();
    await settingsButton.waitFor({ state: "visible", timeout: 5000 });
    await settingsButton.click();
    // Wait for the settings sheet header to render.
    await p.locator("text=设置").first().waitFor({ state: "visible", timeout: 5000 });
    await p.waitForTimeout(500);
  });

  // 04 — Login (capture from a clean, logged-out state)
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await fullNavigate(page, `${BASE_URL}/login`);
  await captureCurrent(page, "04_login.png", "/login", async (p) => {
    await p.locator("text=Pictelio").first().waitFor({ state: "visible", timeout: 5000 });
    await p.waitForTimeout(500);
  });

  await context.close();
  await browser.close();

  log("Screenshot capture complete.");
}

main().catch((err) => {
  console.error("[capture-screenshots] Fatal error:", err);
  process.exit(1);
});
