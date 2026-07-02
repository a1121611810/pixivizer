import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  testMatch: "*.e2e.ts",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",

  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    viewport: { width: 390, height: 844 },
    actionTimeout: 15000,
    trace: process.env.CI ? "on-first-retry" : "off",
    screenshot: process.env.CI ? "only-on-failure" : "off",
  },

  globalSetup: new URL("./globalSetup.ts", import.meta.url).pathname,
  globalTeardown: new URL("./globalTeardown.ts", import.meta.url).pathname,
});
