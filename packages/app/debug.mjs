import { chromium } from "playwright";

const REFRESH_TOKEN = "LXa0TEPbcckouDoW5BJymPY01Q7guBjBW7_FB4apwGs";
const BASE_URL = "http://localhost:5173";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  // Inject localStorage BEFORE any page JS runs
  await context.addInitScript((token) => {
    const b64 = btoa(token);
    localStorage.setItem("cap_sec_refresh_token", b64);
    localStorage.setItem("CapacitorStorage.age_confirmed", "true");
    localStorage.setItem("CapacitorStorage.is_adult", "true");
  }, REFRESH_TOKEN);

  const page = await context.newPage();

  page.on("console", msg => {
    if (msg.type() === "error") console.log("PAGE ERR:", msg.text().substring(0, 200));
  });

  // Navigate directly to feed (use load instead of networkidle — API calls may timeout)
  await page.goto(`${BASE_URL}/recommended`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(10000);

  const state = await page.evaluate(() => ({
    url: window.location.href,
    cards: document.querySelectorAll('.image-card').length,
    absItems: document.querySelectorAll('div[style*="position: absolute"]').length,
  }));
  console.log("State:", JSON.stringify(state));

  if (state.cards > 0) {
    // Get gap info for items in same column
    const gaps = await page.evaluate(() => {
      const wrappers = Array.from(document.querySelectorAll('div[style*="position: absolute"]'));
      const data = wrappers.map(w => {
        const r = w.getBoundingClientRect();
        return { t: r.top, b: r.bottom, l: r.left, h: r.height };
      });
      // Group by column (rounded x)
      const cols = {};
      data.forEach((d, i) => {
        const x = Math.round(d.l);
        if (!cols[x]) cols[x] = [];
        cols[x].push({ i, ...d });
      });
      return Object.entries(cols).map(([x, items]) => {
        items.sort((a, b) => a.t - b.t);
        return {
          col: x,
          count: items.length,
          items: items.map((it, idx, arr) => ({
            i: it.i,
            top: it.t.toFixed(1),
            h: it.h.toFixed(0),
            gap: idx > 0 ? (it.t - arr[idx-1].b).toFixed(1) : "first",
          })),
        };
      });
    });
    console.log("\n==== GAPS BY COLUMN ====");
    gaps.forEach(g => {
      console.log(`Column x=${g.col} (${g.count} items):`);
      g.items.forEach(it => console.log(`  [${it.i}] top=${it.top} h=${it.h} gapFromPrev=${it.gap}`));
    });
    await page.screenshot({ path: "feed.png", fullPage: true });
    console.log("\nScreenshot: feed.png");
  } else {
    await page.screenshot({ path: "no-feed.png" });
    const html = await page.evaluate(() => ({
      url: window.location.href,
      text: document.getElementById('root')?.innerText?.substring(0, 500),
    }));
    console.log("Debug:", JSON.stringify(html));
  }

  await browser.close();
}

main().catch(console.error);
