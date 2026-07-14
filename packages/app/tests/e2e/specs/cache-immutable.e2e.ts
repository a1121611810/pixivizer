import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DATA = readFileSync(resolve(__dirname, "../../../public/logo-192x192.png"));

function startServer(handler: (req: any, res: any) => void): Promise<number> {
  return new Promise((resolve) => {
    const srv = createServer(handler);
    srv.listen(0, () => resolve((srv.address() as any).port));
  });
}

test.describe("Cache-Control immutable 浏览器缓存测试", () => {
  test("immutable 头: 同 URL 第二次加载不走网络", async ({ page }) => {
    let requestCount = 0;

    const port = await startServer((req, res) => {
      if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html><html><body>
          <img id="img1" src="/test.png" />
          <script>
            setTimeout(() => {
              const img2 = new Image();
              img2.src = "/test.png";
              img2.onload = () => document.title = "ok";
              img2.onerror = () => document.title = "err";
            }, 100);
          </script>
        </body></html>`);
        return;
      }
      if (req.url === "/test.png") {
        requestCount++;
        if (req.headers["if-none-match"] || req.headers["if-modified-since"]) {
          res.writeHead(304, "Not Modified"); res.end(); return;
        }
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": IMG_DATA.length.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        res.end(IMG_DATA);
        return;
      }
      res.writeHead(404); res.end();
    });

    await page.goto(`http://localhost:${port}/`);
    await page.waitForFunction(() => document.title === "ok", { timeout: 10000 });
    await page.waitForTimeout(500);

    expect(requestCount).toBe(1);
    console.log(`[Immutable] 请求数: ${requestCount} (预期=1)`);
  });

  test("无缓存头: 同 URL 第二次加载走网络（对照）", async ({ page }) => {
    let requestCount = 0;

    const port = await startServer((req, res) => {
      if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html><html><body>
          <img id="img1" src="/test.png" />
          <script>
            setTimeout(() => {
              const img2 = new Image();
              img2.src = "/test.png";
              img2.onload = () => document.title = "ok";
              img2.onerror = () => document.title = "err";
            }, 100);
          </script>
        </body></html>`);
        return;
      }
      if (req.url === "/test.png") {
        requestCount++;
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": IMG_DATA.length.toString(),
        });
        res.end(IMG_DATA);
        return;
      }
      res.writeHead(404); res.end();
    });

    await page.goto(`http://localhost:${port}/`);
    await page.waitForFunction(() => document.title === "ok", { timeout: 10000 });
    await page.waitForTimeout(500);

    expect(requestCount).toBeGreaterThanOrEqual(2);
    console.log(`[NoCache] 请求数: ${requestCount} (预期>=2)`);
  });
});