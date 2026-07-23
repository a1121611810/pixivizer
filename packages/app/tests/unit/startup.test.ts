import { describe, it, expect } from "vitest";

describe("startup", () => {
  it("initializeStartupPreferences resolves without error", async () => {
    const { initializeStartupPreferences } = await import("@/startup");
    await expect(initializeStartupPreferences()).resolves.toBeUndefined();
  });
});
