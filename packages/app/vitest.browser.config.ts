import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { resolve } from "node:path";

export default defineConfig({
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
