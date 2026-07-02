import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/api/client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

async function loadApi() {
  vi.resetModules();
  return import("@/api/user");
}

describe("api/user.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getUserDetail calls apiClient.get with user_id and filter", async () => {
    mockGet.mockResolvedValue({ user: {}, profile: {} });
    const { getUserDetail } = await loadApi();
    await getUserDetail(12345);

    expect(mockGet).toHaveBeenCalledWith("/v1/user/detail", {
      user_id: "12345",
      filter: "for_ios",
    });
  });

  it("getUserFollowing calls apiClient.get with user_id and restrict default", async () => {
    mockGet.mockResolvedValue({ user_previews: [], next_url: null });
    const { getUserFollowing } = await loadApi();
    await getUserFollowing(67890);

    expect(mockGet).toHaveBeenCalledWith("/v1/user/following", {
      user_id: "67890",
      restrict: "public",
    });
  });

  it("getUserFollowing includes offset when provided", async () => {
    mockGet.mockResolvedValue({ user_previews: [], next_url: null });
    const { getUserFollowing } = await loadApi();
    await getUserFollowing(67890, "private", 30);

    expect(mockGet).toHaveBeenCalledWith("/v1/user/following", {
      user_id: "67890",
      restrict: "private",
      offset: "30",
    });
  });

  it("getUserFollowers calls apiClient.get with user_id", async () => {
    mockGet.mockResolvedValue({ user_previews: [], next_url: null });
    const { getUserFollowers } = await loadApi();
    await getUserFollowers(11111);

    expect(mockGet).toHaveBeenCalledWith("/v1/user/follower", {
      user_id: "11111",
    });
  });

  it("getUserFollowers includes offset when provided", async () => {
    mockGet.mockResolvedValue({ user_previews: [], next_url: null });
    const { getUserFollowers } = await loadApi();
    await getUserFollowers(11111, 20);

    expect(mockGet).toHaveBeenCalledWith("/v1/user/follower", {
      user_id: "11111",
      offset: "20",
    });
  });

  it("passes through API response faithfully", async () => {
    const mockResponse = {
      user: { id: 1, name: "Test" },
      profile: { bio: "Hello" },
    };
    mockGet.mockResolvedValue(mockResponse);
    const { getUserDetail } = await loadApi();
    const result = await getUserDetail(1);

    expect(result).toEqual(mockResponse);
  });
});
