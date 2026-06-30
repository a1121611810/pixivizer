import { chromium } from "playwright";

const REFRESH_TOKEN = "LXa0TEPbcckouDoW5BJymPY01Q7guBjBW7_FB4apwGs";
const BASE_URL = "http://localhost:5173";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(BASE_URL);
  await page.evaluate((token) => {
    localStorage.setItem("pixiv_refresh_token", token);
  }, REFRESH_TOKEN);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  // Navigate to recommended tab
  await page.goto(`${BASE_URL}/recommended`, { waitUntil: "networkidle" });
  await page.waitForTimeout(8000);

  // Log the feed structure and item positions
  const itemInfo = await page.evaluate(() => {
    const items = document.querySelectorAll('[style*="position: absolute"]');
    const results = [];
    items.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const style = el.getAttribute('style');
      results.push({
        index: i,
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        style: style?.substring(0, 150),
        childCount: el.children.length,
        className: el.className,
      });
    });
    return results;
  });

  console.log("==== ITEM POSITIONS ====");
  itemInfo.forEach((item, i) => {
    if (i > 0) {
      const gap = item.top - itemInfo[i-1].bottom;
      console.log(`Item ${i}: top=${item.top.toFixed(1)}, bottom=${item.bottom.toFixed(1)}, height=${item.height}, gap_from_prev=${gap.toFixed(1)}, class=${item.className.substring(0,60)}`);
    } else {
      console.log(`Item ${i}: top=${item.top.toFixed(1)}, bottom=${item.bottom.toFixed(1)}, height=${item.height}, class=${item.className.substring(0,60)}`);
    }
  });

  // Also check if there are items with visible bottom text
  const textInfo = await page.evaluate(() => {
    const cards = document.querySelectorAll('.image-card');
    const results = [];
    cards.forEach((card, i) => {
      const infoDiv = card.querySelector('.p-2\\.5');
      if (infoDiv) {
        const rect = infoDiv.getBoundingClientRect();
        results.push({
          index: i,
          infoVisible: rect.height > 0,
          infoTop: rect.top,
          infoBottom: rect.bottom,
          infoText: infoDiv.textContent?.substring(0, 50),
        });
      } else {
        results.push({ index: i, infoVisible: false });
      }
    });
    return results;
  });

  console.log("\n==== CARD INFO SECTIONS ====");
  textInfo.forEach(t => {
    if (t.infoVisible) {
      console.log(`Card ${t.index}: infoVisible=true, infoTop=${t.infoTop.toFixed(1)}, infoBottom=${t.infoBottom.toFixed(1)}, text="${t.infoText}"`);
    } else {
      console.log(`Card ${t.index}: infoVisible=false`);
    }
  });

  // Check the layout container total height
  const layoutInfo = await page.evaluate(() => {
    const layoutDiv = document.querySelector('[style*="position: relative"][style*="height:"][style*="width: 100%"]');
    if (!layoutDiv) return { found: false };
    return {
      found: true,
      height: layoutDiv.getBoundingClientRect().height,
      childCount: layoutDiv.children.length,
    };
  });
  console.log("\n==== LAYOUT CONTAINER ====", layoutInfo);

  await browser.close();
}

main().catch(console.error);
