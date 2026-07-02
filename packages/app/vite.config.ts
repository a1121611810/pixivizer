import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";
import UnoCSS from "unocss/vite";
import { VitePWA } from "vite-plugin-pwa";
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
  plugins: [
    solid(),
    UnoCSS(),
    VitePWA({
      registerType: "autoUpdate",
      srcDir: "src",
      filename: "sw.ts",
      workbox: {
        globPatterns: [],
        runtimeCaching: [
          {
            // Pixiv images through dev proxy
            urlPattern: /^\/pixiv-img\//,
            handler: "CacheFirst",
            options: {
              cacheName: "pixiv-images",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            // Third-party image host: i.pixiv.re
            urlPattern: /^\/pixiv-re\//,
            handler: "CacheFirst",
            options: {
              cacheName: "pixiv-images-re",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            // Third-party image host: i.pixiv.nl
            urlPattern: /^\/pixiv-nl\//,
            handler: "CacheFirst",
            options: {
              cacheName: "pixiv-images-nl",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      manifest: {
        name: "Pictelio",
        short_name: "Pictelio",
        description: "A third-party Pixiv illustration browser",
        theme_color: "#141414",
        background_color: "#141414",
        display: "standalone",
        icons: [
          { src: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/logo-192x192.png", sizes: "192x192", type: "image/png" },
        ],
      },
    }),
  ],
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
    proxy: {
      "/pixiv-img": {
        target: "https://i.pximg.net",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pixiv-img/, ""),
        headers: {
          Referer: "https://app-api.pixiv.net/",
          "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
        },
        agent: proxyAgent,
      },
      "/pixiv-re": {
        target: "https://i.pixiv.re",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pixiv-re/, ""),
        headers: {
          Referer: "https://app-api.pixiv.net/",
          "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
        },
        agent: proxyAgent,
      },
      "/pixiv-nl": {
        target: "https://i.pixiv.nl",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pixiv-nl/, ""),
        headers: {
          Referer: "https://app-api.pixiv.net/",
          "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
        },
        agent: proxyAgent,
      },
      "/pixiv-api": {
        target: "https://app-api.pixiv.net",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/pixiv-api/, ""),
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
        rewrite: (path: string) => path.replace(/^\/pixiv-oauth/, ""),
        headers: {
          "User-Agent": "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
        },
        agent: proxyAgent,
      },
      // GitHub API — 不经过代理，直连（代理会拦截 GitHub 返回 403）
      "/github-api": {
        target: "https://api.github.com",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/github-api/, ""),
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
      // 允许全局状态标志上的双下划线命名（Capacitor 返回键处理）
      "no-underscore-dangle": ["error", { allow: ["__viewerOpen", "__settingsOpen"] }],
    },
    overrides: [
      {
        files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
        plugins: ["vitest"],
        env: { node: true },
        rules: {
          "no-console": "off",
          // 测试 mock 的类型参数对可读性增益有限，关闭以专注测试逻辑
          "require-mock-type-parameters": "off",
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
