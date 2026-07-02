import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    name: "browser",
    include: ["src/**/*.browser.test.{ts,tsx}"],
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
});
