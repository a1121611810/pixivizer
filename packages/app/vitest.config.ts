import { defineConfig } from "vite-plus/test/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    passWithNoTests: true,
  },
});
