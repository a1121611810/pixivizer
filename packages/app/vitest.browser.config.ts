import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import UnoCSS from "unocss/vite";
import { playwright } from "@vitest/browser-playwright";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [solid(), UnoCSS()],
  define: {
    __PUBLIC_CONFIG__: JSON.stringify({
      userAgent: "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
      appOs: "ios",
      appOsVersion: "18.5",
      authUrl: "https://oauth.secure.pixiv.net/auth/token",
      apiBaseUrl: "https://app-api.pixiv.net",
      loginUrl: "https://app-api.pixiv.net/web/v1/login",
      redirectUri: "https://app-api.pixiv.net/web/v1/users/auth/pixiv/callback",
      imageCdnUrl: "https://i.pximg.net",
      referer: "https://app-api.pixiv.net/",
      contentType: "application/x-www-form-urlencoded",
      timeout: {
        connect: 15000,
        read: 30000,
        overrides: {
          imageProxy: { connect: 10000, read: 15000 },
          dnsQuery: { connect: 5000, read: 5000 },
          oauthDialog: { read: 120000 },
        },
      },
      minWebviewVersion: 85,
      cacheDir: "pictelio-images",
      cacheMaxBytes: 314572800,
      dohUrl: "https://cloudflare-dns.com/dns-query?name=",
      allowedHosts: ["app-api.pixiv.net", "i.pximg.net"],
    }),
  },
  optimizeDeps: {
    include: [
      "@fluentui/web-components/web-components.js",
      "@capacitor/core",
      "@capacitor/preferences",
      "@capacitor/app",
      "@capacitor/device",
      "@solid-primitives/intersection-observer",
    ],
  },
  test: {
    name: "browser",
    include: ["tests/browser/**/*.browser.test.{ts,tsx}"],
    setupFiles: ["./tests/browser/setup.ts"],
    browser: {
      enabled: true,
      provider: playwright({}),
      instances: [{ browser: "chromium" }],
      headless: true,
      screenshotFailures: false,
    },
    passWithNoTests: true,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
