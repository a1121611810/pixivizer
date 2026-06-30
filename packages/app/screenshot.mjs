import { chromium } from "playwright";

const REFRESH_TOKEN = "LXa0TEPbcckouDoW5BJymPY01Q7guBjBW7_FB4apwGs";
const BASE_URL = "http://localhost:5173";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 size
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();

  // 1. Set auth token in localStorage before navigating
  await page.goto(BASE_URL);
  await page.evaluate((token) => {
    localStorage.setItem("pixiv_refresh_token", token);
    localStorage.setItem("auth_token", JSON.stringify({
      access_token: "placeholder",
      refresh_token: token,
      expires_in: 3600,
      token_type: "bearer",
    }));
  }, REFRESH_TOKEN);

  // 2. Reload with auth
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // 3. Navigate to recommended feed
  await page.goto(`${BASE_URL}/recommended`, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000); // wait for images

  // 4. Take screenshot of full page
  await page.screenshot({ path: "screenshot-full.png", fullPage: true });

  // 5. Take screenshot of viewport only (shows what user sees)
  await page.screenshot({ path: "screenshot-viewport.png", fullPage: false });

  // 6. Also take a closer screenshot of the feed area
  const feedEl = await page.$(".pb-16");
  if (feedEl) {
    await feedEl.screenshot({ path: "screenshot-feed.png" });
  }

  console.log("Screenshots saved!");

  await browser.close();
}

main().catch(console.error);
