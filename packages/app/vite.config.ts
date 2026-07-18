import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";
import UnoCSS from "unocss/vite";
import { HttpsProxyAgent } from "https-proxy-agent";
import type { IncomingMessage, ServerResponse } from "node:http";
import postcssPxToRem from "postcss-pxtorem";
import pkg from "./package.json";
import { resolve } from "node:path";

// 系统代理（中国大陆需要代理访问 Pixiv）
const proxyUrl =
  process.env.https_proxy ||
  process.env.HTTPS_PROXY ||
  process.env.http_proxy ||
  process.env.HTTP_PROXY ||
  "http://127.0.0.1:10808";
console.log(`[vite] 🔧 使用代理: ${proxyUrl}`);
// HttpsProxyAgent 的泛型类型极深，与 Vite+ 扩展后的 UserConfig 比较时会触发 TS 堆栈深度超限，
// 因此将其断言为 unknown；运行时行为不变。
const proxyAgent = new HttpsProxyAgent(proxyUrl) as unknown;

// Vite+ 的 UserConfig 拼接了 Vite 全量类型 + Rolldown 类型 + lint/fmt/test 扩展，
// 类型比对时 TS 递归深度超限。整体断言为 any 规避，运行时仍由 Vite/Vite+ 校验配置。
export default defineConfig({
  // 部署到 GitHub Pages (/pixivizer/) 时需设置 BASE_PATH=/pixivizer/
  // 本地开发 / Android 打包使用默认 "/"
  base: process.env.BASE_PATH || "/",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [solid(), UnoCSS()],
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
  },

  css: {
    postcss: {
      plugins: [
        postcssPxToRem({
          rootValue: 16,
          propList: ["font-size", "--fontSize*"],
          minPixelValue: 2,
        }),
      ],
    },
  },

  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      // User-Agent 值保持与 src/api/userAgent.ts 的 PIXIV_USER_AGENT 一致
      "/pixiv-img": {
        target: "https://i.pximg.net",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pixiv-img/u, ""),
        headers: {
          Referer: "https://app-api.pixiv.net/",
          "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
        },
        agent: proxyAgent,
        configure: (proxy: any) => {
          proxy.on("error", (_err: Error, _req: IncomingMessage, res: ServerResponse) => {
            if (res && "headersSent" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "proxy_error",
                  message: "图片代理连接失败，请检查网络或代理状态",
                }),
              );
            }
          });
        },
      },
      "/pixiv-re": {
        target: "https://i.pixiv.re",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pixiv-re/u, ""),
        headers: {
          Referer: "https://app-api.pixiv.net/",
          "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
        },
        agent: proxyAgent,
        configure: (proxy: any) => {
          proxy.on("error", (_err: Error, _req: IncomingMessage, res: ServerResponse) => {
            if (res && "headersSent" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "proxy_error",
                  message: "图片代理连接失败，请检查网络或代理状态",
                }),
              );
            }
          });
        },
      },
      "/pixiv-nl": {
        target: "https://i.pixiv.nl",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pixiv-nl/u, ""),
        headers: {
          Referer: "https://app-api.pixiv.net/",
          "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
        },
        agent: proxyAgent,
        configure: (proxy: any) => {
          proxy.on("error", (_err: Error, _req: IncomingMessage, res: ServerResponse) => {
            if (res && "headersSent" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "proxy_error",
                  message: "图片代理连接失败，请检查网络或代理状态",
                }),
              );
            }
          });
        },
      },
      "/pixiv-api": {
        target: "https://app-api.pixiv.net",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pixiv-api/u, ""),
        headers: {
          "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
          Referer: "https://app-api.pixiv.net/",
        },
        agent: proxyAgent,
        configure: (proxy: any) => {
          proxy.on("error", (_err: Error, _req: IncomingMessage, res: ServerResponse) => {
            if (res && "headersSent" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "proxy_error",
                  message: "代理连接失败，请检查网络或代理状态",
                }),
              );
            }
          });
        },
      },
      "/pixiv-oauth": {
        target: "https://oauth.secure.pixiv.net",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pixiv-oauth/u, ""),
        headers: {
          "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
        },
        agent: proxyAgent,
        configure: (proxy: any) => {
          proxy.on("error", (_err: Error, _req: IncomingMessage, res: ServerResponse) => {
            if (res && "headersSent" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "proxy_error",
                  message: "OAuth 代理连接失败，请检查网络或代理状态",
                }),
              );
            }
          });
        },
      },
      // GitHub API — 不经过代理，直连（代理会拦截 GitHub 返回 403）
      "/github-api": {
        target: "https://api.github.com",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/github-api/u, ""),
      },
      // Pixiv Web Ajax API — 用于评论等 web 端接口
      "/pixiv-www": {
        target: "https://www.pixiv.net",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pixiv-www/u, ""),
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36",
          Referer: "https://www.pixiv.net/",
        },
        agent: proxyAgent,
        configure: (proxy: any) => {
          proxy.on("error", (_err: Error, _req: IncomingMessage, res: ServerResponse) => {
            if (res && "headersSent" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "proxy_error", message: "Pixiv Web 代理连接失败" }));
            }
          });
        },
      },
    },
  },

  build: { target: "esnext" },

  // ── Vite+ lint / fmt 统一配置 ──────────────────────────────
  lint: {
    ignorePatterns: [
      "dist/**",
      "android/**",
      "node_modules/**",
      ".codegraph/**",
      ".reasonix/**",
      ".playwright-cli/**",
      ".worktrees/**",
      "pnpm-lock.yaml",
      "*.d.ts",
    ],
    options: {
      typeAware: false,
      typeCheck: false,
      maxWarnings: 0,
    },
    categories: {
      correctness: "error",
      suspicious: "warn",
      pedantic: "off",
      perf: "warn",
      style: "off",
      restriction: "off",
      nursery: "off",
    },
    plugins: ["typescript", "unicorn", "oxc"],
    rules: {
      // SolidJS 的 <div ref={el}> 会在运行时赋值，oxlint 的 no-unassigned-vars 无法理解该模式
      "no-unassigned-vars": "off",
      // 允许 _ 前缀的未使用变量，保持解构/回调参数可读性
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
    overrides: [
      {
        files: [
          "tests/**/*.test.ts",
          "tests/**/*.test.tsx",
          "tests/**/*.browser.test.ts",
          "tests/**/*.e2e.ts",
          "tests/e2e/*.ts",
        ],
        // Override 设置 plugins 会替换（而非合并）基线列表，必须包含所有所需插件
        plugins: ["typescript", "unicorn", "oxc", "vitest"],
        env: { node: true },
        rules: {
          "no-console": "off",
          "require-mock-type-parameters": "off",
          "no-unused-vars": [
            "error",
            { argsIgnorePattern: "^_", varsIgnorePattern: "^_|^vi$|^beforeEach$|^afterEach$" },
          ],
          "no-underscore-dangle": "off",
          "consistent-function-scoping": "off",
          "no-await-in-loop": "off",
          "expect-expect": "off",
          "no-conditional-expect": "off",
          "require-to-throw-message": "off",
          "no-standalone-expect": "off",
        },
      },
      {
        files: ["scripts/**/*.mjs", "*.config.ts"],
        env: { node: true },
        rules: {
          "no-console": "off",
        },
      },
    ],
  },

  fmt: {
    ignorePatterns: [
      "dist/**",
      "android/**",
      "node_modules/**",
      ".codegraph/**",
      ".reasonix/**",
      ".playwright-cli/**",
      ".worktrees/**",
      "pnpm-lock.yaml",
    ],
  },
} as any);
