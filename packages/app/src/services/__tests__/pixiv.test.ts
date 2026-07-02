import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPixivClient = {
  getRecommendedIllusts: vi.fn(),
};

vi.mock("@book000/pixivts", () => ({
  PixivClient: {
    of: vi.fn(() => Promise.resolve(mockPixivClient)),
  },
}));

async function loadService() {
  vi.resetModules();
  return import("../pixiv");
}

describe("pixiv service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getClient returns null before init", async () => {
    const { getClient } = await loadService();
    expect(getClient()).toBeNull();
  });

  it("getRefreshToken returns null before init", async () => {
    const { getRefreshToken } = await loadService();
    expect(getRefreshToken()).toBeNull();
  });

  it("initClient creates and returns PixivClient instance", async () => {
    const { initClient, getClient, getRefreshToken } = await loadService();
    const client = await initClient("test-refresh-token");

    expect(client).toBe(mockPixivClient);
    expect(getClient()).toBe(mockPixivClient);
    expect(getRefreshToken()).toBe("test-refresh-token");
  });

  it("destroyClient clears state", async () => {
    const { initClient, destroyClient, getClient, getRefreshToken } = await loadService();
    await initClient("token");

    destroyClient();

    expect(getClient()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
