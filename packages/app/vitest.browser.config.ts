import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import { playwright } from "@vitest/browser-playwright";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [solid()],
  test: {
    name: "browser",
    include: ["tests/browser/**/*.browser.test.{ts,tsx}"],
    browser: {
      enabled: true,
      provider: playwright({}),
      instances: [{ browser: "chromium" }],
      headless: true,
      screenshotFailures: false,
    },
    passWithNoTests: true,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
