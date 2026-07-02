import { defineConfig } from "vite-plus/test/config";

export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,tsconfig}.config.*",
      "**/*.browser.test.{ts,tsx}",
    ],
  },
});
