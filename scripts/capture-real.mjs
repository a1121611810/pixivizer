#!/usr/bin/env node
// @ts-check
/**
 * Capture real Pixiv screenshots using a valid refresh_token.
 * Assumes Vite dev server is running at http://localhost:5173.
 */

import { chromium } from "playwright";
import { join } from "node:path";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";

const BASE_URL = "http://localhost:5173";
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

const REFRESH_TOKEN = process.env.PIXIV_REFRESH_TOKEN || "YOUR_REFRESH_TOKEN_HERE";
if (!REFRESH_TOKEN || REFRESH_TOKEN === "YOUR_REFRESH_TOKEN_HERE") {
  console.error("PIXIV_REFRESH_TOKEN env var is required");
  process.exit(1);
}

const VIEWPORT = { width: 540, height: 960 };
const DEVICE_SCALE_FACTOR = 2;

/** @param {string} message */
function log(message) {
  console.log(`[capture] ${message}`);
}

function ensureDirs() {
  for (const dir of [OUT_EN, OUT_ZH]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

async function dismissAgeGate(page) {
  try {
    const btn = page.getByRole("button", { name: /已满|adult/i });
    await btn.waitFor({ state: "visible", timeout: 3000 });
    await btn.click();
    log("Age gate dismissed");
    await page.waitForTimeout(500);
  } catch {
    /* not shown */
  }
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

  // Log console errors for debugging
  page.on("pageerror", (err) => log(`PAGE ERROR: ${err.message}`));

  // ── 1. Navigate to login, seed real token, reload for auth init ──
  log("Navigating to login page...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 15000 });

  // Seed real refresh_token into Capacitor SecureStorage (web: localStorage cap_sec_ prefix)
  await page.evaluate((token) => {
    localStorage.setItem("cap_sec_refresh_token", btoa(token));
  }, REFRESH_TOKEN);

  log("Reloading to trigger auth with real token...");
  await page.reload({ waitUntil: "networkidle", timeout: 30000 });
  log(`After reload: ${page.url()}`);

  // If still on login, wait for redirect
  try {
    await page.waitForURL("**/recommended", { timeout: 15000 });
    log(`Redirected to recommended`);
  } catch {
    log(`Still on ${page.url()}, proceeding...`);
  }

  await dismissAgeGate(page);
  await page.waitForTimeout(2000); // Let feed data load

  // ── 01: Feed ──
  log("Capturing 01_feed...");
  await page.screenshot({ path: join(OUT_EN, "01_feed.png"), type: "png" });
  copyFileSync(join(OUT_EN, "01_feed.png"), join(OUT_ZH, "01_feed.png"));
  log("01_feed done");

  // ── 02: Illust Detail ──
  // Click the first image card to navigate to detail
  log("Navigating to illust detail...");
  try {
    const firstCard = page.locator(".image-card").first();
    await firstCard.waitFor({ state: "visible", timeout: 10000 });
    await firstCard.click();
    await page.waitForTimeout(3000);
  } catch {
    log("Could not click card; trying direct navigation");
    // Try to extract illust ID from page
    try {
      const hrefs = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/illust/"]');
        return Array.from(links)
          .map((a) => a.getAttribute("href"))
          .slice(0, 3);
      });
      log(`Found illust links: ${JSON.stringify(hrefs)}`);
      if (hrefs.length > 0) {
        await page.goto(`${BASE_URL}${hrefs[0]}`, { waitUntil: "networkidle", timeout: 15000 });
      }
    } catch {
      /* give up */
    }
  }
  await page.waitForTimeout(2000);
  log("Capturing 02_detail...");
  await page.screenshot({ path: join(OUT_EN, "02_detail.png"), type: "png" });
  copyFileSync(join(OUT_EN, "02_detail.png"), join(OUT_ZH, "02_detail.png"));
  log("02_detail done");

  // ── 03: Settings ──
  log("Navigating back to feed for settings screenshot...");
  await page.goto(`${BASE_URL}/recommended`, { waitUntil: "networkidle", timeout: 15000 });
  await dismissAgeGate(page);
  await page.waitForTimeout(2000);

  log("Opening settings sheet...");
  try {
    const settingsBtn = page.locator('header button[aria-label="设置"]').first();
    await settingsBtn.waitFor({ state: "visible", timeout: 7000 });
    await settingsBtn.click();
    await page.locator("text=设置").first().waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(500);
    // Scroll to account section
    const accountSection = page.locator("text=账号与数据").first();
    try {
      await accountSection.scrollIntoViewIfNeeded({ timeout: 3000 });
      await page.waitForTimeout(500);
    } catch {
      /* fine */
    }
  } catch (err) {
    log(`Settings button issue: ${err.message}`);
  }
  await page.waitForTimeout(500);
  log("Capturing 03_settings...");
  await page.screenshot({ path: join(OUT_EN, "03_settings.png"), type: "png" });
  copyFileSync(join(OUT_EN, "03_settings.png"), join(OUT_ZH, "03_settings.png"));
  log("03_settings done");

  // ── 04: Login (clean state) ──
  log("Clearing storage for login screenshot...");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(2000);
  log("Capturing 04_login...");
  await page.screenshot({ path: join(OUT_EN, "04_login.png"), type: "png" });
  copyFileSync(join(OUT_EN, "04_login.png"), join(OUT_ZH, "04_login.png"));
  log("04_login done");

  await context.close();
  await browser.close();
  log("All screenshots captured successfully.");
}

main().catch((err) => {
  console.error("[capture] Fatal:", err);
  process.exit(1);
});
