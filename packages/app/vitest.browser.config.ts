import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import UnoCSS from "unocss/vite";
import { playwright } from "@vitest/browser-playwright";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [solid(), UnoCSS()],
  optimizeDeps: {
    include: [
      "@fluentui/web-components/web-components.js",
      "@capacitor/core",
      "@capacitor/preferences",
      "@capacitor/app",
      "@capacitor/device",
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
