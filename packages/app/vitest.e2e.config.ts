import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/specs/**/*.e2e.ts"],
    environment: "node",
    globalSetup: "./tests/e2e/globalSetup.ts",
    globalTeardown: "./tests/e2e/globalTeardown.ts",
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
