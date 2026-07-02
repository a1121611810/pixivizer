import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/e2e/specs/**/*.e2e.ts"],
    environment: "node",
    globalSetup: "./test/e2e/globalSetup.ts",
    globalTeardown: "./test/e2e/globalTeardown.ts",
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
