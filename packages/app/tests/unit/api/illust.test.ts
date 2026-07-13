import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock apiClient
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
  return import("@/api/illust");
}

describe("api/illust.ts", () => {
  it("loadRecommended calls apiClient.get with correct params", async () => {
    mockGet.mockResolvedValue({ illusts: [] });
    const { loadRecommended } = await loadApi();
    await loadRecommended("illust");

    expect(mockGet).toHaveBeenCalledWith(
      "/v1/illust/recommended",
      {
        content_type: "illust",
        filter: "for_ios",
      },
      undefined,
    );
  });

  it("loadRecommended defaults to illust", async () => {
    mockGet.mockResolvedValue({ illusts: [] });
    const { loadRecommended } = await loadApi();
    await loadRecommended();

    expect(mockGet).toHaveBeenCalledWith(
      "/v1/illust/recommended",
      {
        content_type: "illust",
        filter: "for_ios",
      },
      undefined,
    );
  });

  it("loadMangaRecommended delegates to loadRecommended with manga", async () => {
    mockGet.mockResolvedValue({ illusts: [] });
    const { loadMangaRecommended } = await loadApi();
    await loadMangaRecommended();

    expect(mockGet).toHaveBeenCalledWith(
      "/v1/illust/recommended",
      {
        content_type: "manga",
        filter: "for_ios",
      },
      undefined,
    );
  });

  it("loadFollow calls apiClient.get with restrict", async () => {
    mockGet.mockResolvedValue({ illusts: [] });
    const { loadFollow } = await loadApi();
    await loadFollow("private");

    expect(mockGet).toHaveBeenCalledWith(
      "/v2/illust/follow",
      {
        restrict: "private",
      },
      undefined,
    );
  });

  it("loadFollow defaults to public", async () => {
    mockGet.mockResolvedValue({ illusts: [] });
    const { loadFollow } = await loadApi();
    await loadFollow();

    expect(mockGet).toHaveBeenCalledWith(
      "/v2/illust/follow",
      {
        restrict: "public",
      },
      undefined,
    );
  });

  it("loadDetail calls apiClient.get with illust_id", async () => {
    mockGet.mockResolvedValue({ illust: {} });
    const { loadDetail } = await loadApi();
    await loadDetail(456);

    expect(mockGet).toHaveBeenCalledWith(
      "/v1/illust/detail",
      {
        illust_id: "456",
      },
      undefined,
    );
  });

  it("loadNext passes URL directly", async () => {
    mockGet.mockResolvedValue({ illusts: [] });
    const { loadNext } = await loadApi();
    await loadNext("https://app-api.pixiv.net/v1/illust/recommended?offset=30");

    expect(mockGet).toHaveBeenCalledWith(
      "https://app-api.pixiv.net/v1/illust/recommended?offset=30",
      undefined,
      undefined,
    );
  });

  it("loadBookmarks calls apiClient.get with userId and restrict", async () => {
    mockGet.mockResolvedValue({ illusts: [] });
    const { loadBookmarks } = await loadApi();
    await loadBookmarks(789, "public");

    expect(mockGet).toHaveBeenCalledWith(
      "/v1/user/bookmarks/illust",
      {
        user_id: "789",
        restrict: "public",
      },
      undefined,
    );
  });

  it("loadUgoiraMetadata returns ugoira_metadata", async () => {
    mockGet.mockResolvedValue({
      ugoira_metadata: { frames: [{ file: "1.jpg", delay: 100 }] },
    });
    const { loadUgoiraMetadata } = await loadApi();
    const result = await loadUgoiraMetadata(123);

    expect(result).toEqual({ frames: [{ file: "1.jpg", delay: 100 }] });
    expect(mockGet).toHaveBeenCalledWith(
      "/v1/ugoira/metadata",
      {
        illust_id: "123",
      },
      undefined,
    );
  });

  it("addBookmark calls apiClient.post with illust_id and restrict", async () => {
    mockPost.mockResolvedValue(undefined);
    const { addBookmark } = await loadApi();
    await addBookmark(111, "private");

    expect(mockPost).toHaveBeenCalledWith("/v2/illust/bookmark/add", {
      illust_id: "111",
      restrict: "private",
    });
  });

  it("deleteBookmark calls apiClient.post with illust_id", async () => {
    mockPost.mockResolvedValue(undefined);
    const { deleteBookmark } = await loadApi();
    await deleteBookmark(222);

    expect(mockPost).toHaveBeenCalledWith("/v1/illust/bookmark/delete", {
      illust_id: "222",
    });
  });

  it("followUser calls apiClient.post with user_id", async () => {
    mockPost.mockResolvedValue(undefined);
    const { followUser } = await loadApi();
    await followUser(333);

    expect(mockPost).toHaveBeenCalledWith("/v1/user/follow/add", {
      user_id: "333",
      restrict: "public",
    });
  });

  it("unfollowUser calls apiClient.post", async () => {
    mockPost.mockResolvedValue(undefined);
    const { unfollowUser } = await loadApi();
    await unfollowUser(444);

    expect(mockPost).toHaveBeenCalledWith("/v1/user/follow/delete", {
      user_id: "444",
    });
  });

  it("loadUserIllusts calls apiClient.get with userId and type", async () => {
    mockGet.mockResolvedValue({ illusts: [] });
    const { loadUserIllusts } = await loadApi();
    await loadUserIllusts(555, "manga");

    expect(mockGet).toHaveBeenCalledWith(
      "/v1/user/illusts",
      {
        user_id: "555",
        type: "manga",
      },
      undefined,
    );
  });

  it("loadUserIllusts defaults to illust type", async () => {
    mockGet.mockResolvedValue({ illusts: [] });
    const { loadUserIllusts } = await loadApi();
    await loadUserIllusts(555);

    expect(mockGet).toHaveBeenCalledWith(
      "/v1/user/illusts",
      {
        user_id: "555",
        type: "illust",
      },
      undefined,
    );
  });
});
