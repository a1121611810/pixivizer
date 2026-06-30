import { chromium } from "playwright";

const REFRESH_TOKEN = "LXa0TEPbcckouDoW5BJymPY01Q7guBjBW7_FB4apwGs";
const BASE_URL = "http://localhost:5173";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  await context.addInitScript((token) => {
    const b64 = btoa(token);
    localStorage.setItem("cap_sec_refresh_token", b64);
    localStorage.setItem("CapacitorStorage.age_confirmed", "true");
    localStorage.setItem("CapacitorStorage.is_adult", "true");
  }, REFRESH_TOKEN);

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/recommended`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(12000);

  // Check the rendered card structure
  const cardInfo = await page.evaluate(() => {
    const wrappers = Array.from(document.querySelectorAll('div[style*="position: absolute"]'));
    return wrappers.slice(0, 5).map((w, i) => {
      const style = w.getAttribute('style');
      const card = w.querySelector('.image-card');
      const infoDiv = card?.querySelector('.p-2\\.5');
      const img = card?.querySelector('img');
      return {
        index: i,
        wrapperStyle: style,
        hasCard: !!card,
        cardHeight: card?.getBoundingClientRect().height,
        wrapperHeight: w.getBoundingClientRect().height,
        hasInfoDiv: !!infoDiv,
        infoDivHeight: infoDiv?.getBoundingClientRect().height,
        infoText: infoDiv?.textContent?.substring(0, 40),
        imageLoaded: img?.complete && img?.naturalWidth > 0,
        imageNaturalHeight: img?.naturalHeight,
        imageDisplayHeight: img?.getBoundingClientRect().height,
      };
    });
  });

  console.log("==== CARD STRUCTURE ====");
  cardInfo.forEach(c => {
    console.log(`Card ${c.index}:`);
    console.log(`  wrapper h=${c.wrapperHeight?.toFixed(0)}, card h=${c.cardHeight?.toFixed(0)}`);
    console.log(`  infoDiv: ${c.hasInfoDiv} h=${c.infoDivHeight?.toFixed(0)} text="${c.infoText}"`);
    console.log(`  image: loaded=${c.imageLoaded} naturalH=${c.imageNaturalHeight} displayH=${c.imageDisplayHeight?.toFixed(0)}`);
    console.log(`  style: ${c.wrapperStyle?.substring(0, 120)}`);
    console.log('');
  });

  // Check visual: does the info section content overflow the wrapper?
  const overflow = await page.evaluate(() => {
    const wrappers = Array.from(document.querySelectorAll('div[style*="position: absolute"]'));
    const results = [];
    wrappers.forEach((w, i) => {
      const wr = w.getBoundingClientRect();
      const card = w.querySelector('.image-card');
      if (!card) return;
      const cr = card.getBoundingClientRect();
      // Check if card bottom exceeds wrapper bottom
      results.push({
        i,
        wrapperBottom: wr.bottom.toFixed(1),
        cardBottom: cr.bottom.toFixed(1),
        overflow: (cr.bottom - wr.bottom).toFixed(1),
        wrapperTop: wr.top.toFixed(1),
        cardTop: cr.top.toFixed(1),
      });
    });
    return results;
  });

  console.log("==== OVERFLOW CHECK ====");
  overflow.forEach(o => {
    const status = parseFloat(o.overflow) > 2 ? '⚠️ OVERFLOW' : 'OK';
    console.log(`Card ${o.i}: wrapperBottom=${o.wrapperBottom}, cardBottom=${o.cardBottom}, overflow=${o.overflow}px ${status}`);
  });

  await page.screenshot({ path: "feed-detail.png", fullPage: false });
  await browser.close();
}

main().catch(console.error);
