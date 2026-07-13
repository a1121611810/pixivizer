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
  return import("@/api/comment");
}

describe("api/comment.ts", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it("loadIllustRootComments calls apiClient.get with correct params", async () => {
    mockGet.mockResolvedValue({ comments: [], next_url: null });
    const { loadIllustRootComments } = await loadApi();
    await loadIllustRootComments(123);
    expect(mockGet).toHaveBeenCalledWith(
      "/v3/illust/comments",
      { illust_id: "123", include_total_comments: "true" },
      undefined,
    );
  });

  it("loadIllustRootCommentsNext calls apiClient.get with url", async () => {
    mockGet.mockResolvedValue({ comments: [], next_url: null });
    const { loadIllustRootCommentsNext } = await loadApi();
    await loadIllustRootCommentsNext("https://next.url");
    expect(mockGet).toHaveBeenCalledWith("https://next.url", undefined, undefined);
  });

  it("loadIllustReplies calls apiClient.get with correct params", async () => {
    mockGet.mockResolvedValue({ comments: [] });
    const { loadIllustReplies } = await loadApi();
    await loadIllustReplies(456);
    expect(mockGet).toHaveBeenCalledWith(
      "/v2/illust/comment/replies",
      { comment_id: "456" },
      undefined,
    );
  });

  it("postIllustComment calls apiClient.post with comment only", async () => {
    mockPost.mockResolvedValue(undefined);
    const { postIllustComment } = await loadApi();
    await postIllustComment(123, "好图！");
    expect(mockPost).toHaveBeenCalledWith("/v1/illust/comment/add", {
      illust_id: "123",
      comment: "好图！",
    });
  });

  it("postIllustComment includes parent_comment_id when replying", async () => {
    mockPost.mockResolvedValue(undefined);
    const { postIllustComment } = await loadApi();
    await postIllustComment(123, "回复", 456);
    expect(mockPost).toHaveBeenCalledWith("/v1/illust/comment/add", {
      illust_id: "123",
      comment: "回复",
      parent_comment_id: "456",
    });
  });

  it("deleteIllustComment calls apiClient.post with comment_id", async () => {
    mockPost.mockResolvedValue(undefined);
    const { deleteIllustComment } = await loadApi();
    await deleteIllustComment(789);
    expect(mockPost).toHaveBeenCalledWith("/v1/illust/comment/delete", {
      comment_id: "789",
    });
  });

  it("loadNovelRootComments calls apiClient.get with correct params", async () => {
    mockGet.mockResolvedValue({ comments: [], next_url: null });
    const { loadNovelRootComments } = await loadApi();
    await loadNovelRootComments(42);
    expect(mockGet).toHaveBeenCalledWith(
      "/v1/novel/comments",
      { novel_id: "42", include_total_comments: "true" },
      undefined,
    );
  });

  it("loadNovelRootCommentsNext calls apiClient.get with url", async () => {
    mockGet.mockResolvedValue({ comments: [], next_url: null });
    const { loadNovelRootCommentsNext } = await loadApi();
    await loadNovelRootCommentsNext("https://next.url/novel");
    expect(mockGet).toHaveBeenCalledWith("https://next.url/novel", undefined, undefined);
  });

  it("loadNovelReplies calls apiClient.get with correct params", async () => {
    mockGet.mockResolvedValue({ comments: [] });
    const { loadNovelReplies } = await loadApi();
    await loadNovelReplies(99);
    expect(mockGet).toHaveBeenCalledWith(
      "/v2/novel/comment/replies",
      { comment_id: "99" },
      undefined,
    );
  });

  it("postNovelComment calls apiClient.post with comment only", async () => {
    mockPost.mockResolvedValue(undefined);
    const { postNovelComment } = await loadApi();
    await postNovelComment(42, "好文！");
    expect(mockPost).toHaveBeenCalledWith("/v1/novel/comment/add", {
      novel_id: "42",
      comment: "好文！",
    });
  });

  it("postNovelComment includes parent_comment_id when replying", async () => {
    mockPost.mockResolvedValue(undefined);
    const { postNovelComment } = await loadApi();
    await postNovelComment(42, "回复", 99);
    expect(mockPost).toHaveBeenCalledWith("/v1/novel/comment/add", {
      novel_id: "42",
      comment: "回复",
      parent_comment_id: "99",
    });
  });

  it("deleteNovelComment calls apiClient.post with comment_id", async () => {
    mockPost.mockResolvedValue(undefined);
    const { deleteNovelComment } = await loadApi();
    await deleteNovelComment(789);
    expect(mockPost).toHaveBeenCalledWith("/v1/novel/comment/delete", {
      comment_id: "789",
    });
  });

  it("passes AbortSignal to apiClient.get", async () => {
    mockGet.mockResolvedValue({ comments: [], next_url: null });
    const { loadIllustRootComments } = await loadApi();
    const ac = new AbortController();
    await loadIllustRootComments(1, ac.signal);
    expect(mockGet).toHaveBeenCalledWith(
      "/v3/illust/comments",
      { illust_id: "1", include_total_comments: "true" },
      ac.signal,
    );
  });
});
