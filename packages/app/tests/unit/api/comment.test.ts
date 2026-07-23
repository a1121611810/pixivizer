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

describe("api/comment.ts — parameterized API", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  // ── loadRootComments ──

  it("loadRootComments(illust, 123) → GET /v3/illust/comments with illust_id=123", async () => {
    mockGet.mockResolvedValue({ comments: [], next_url: null });
    const { loadRootComments } = await loadApi();
    await loadRootComments("illust", 123);
    expect(mockGet).toHaveBeenCalledWith(
      "/v3/illust/comments",
      { illust_id: "123", include_total_comments: "true" },
      undefined,
    );
  });

  it("loadRootComments(novel, 42) → GET /v1/novel/comments with novel_id=42", async () => {
    mockGet.mockResolvedValue({ comments: [], next_url: null });
    const { loadRootComments } = await loadApi();
    await loadRootComments("novel", 42);
    expect(mockGet).toHaveBeenCalledWith(
      "/v1/novel/comments",
      { novel_id: "42", include_total_comments: "true" },
      undefined,
    );
  });

  // ── loadRootCommentsNext (type-agnostic) ──

  it("loadRootCommentsNext passes url straight to apiClient.get", async () => {
    mockGet.mockResolvedValue({ comments: [], next_url: null });
    const { loadRootCommentsNext } = await loadApi();
    await loadRootCommentsNext("https://next.url");
    expect(mockGet).toHaveBeenCalledWith("https://next.url", undefined, undefined);
  });

  // ── loadReplies ──

  it("loadReplies(illust, 456) → GET /v2/illust/comment/replies", async () => {
    mockGet.mockResolvedValue({ comments: [] });
    const { loadReplies } = await loadApi();
    await loadReplies("illust", 456);
    expect(mockGet).toHaveBeenCalledWith(
      "/v2/illust/comment/replies",
      { comment_id: "456" },
      undefined,
    );
  });

  it("loadReplies(novel, 99) → GET /v2/novel/comment/replies", async () => {
    mockGet.mockResolvedValue({ comments: [] });
    const { loadReplies } = await loadApi();
    await loadReplies("novel", 99);
    expect(mockGet).toHaveBeenCalledWith(
      "/v2/novel/comment/replies",
      { comment_id: "99" },
      undefined,
    );
  });

  // ── postComment ──

  it("postComment(illust, 123, ...) → POST /v1/illust/comment/add with illust_id", async () => {
    mockPost.mockResolvedValue(undefined);
    const { postComment } = await loadApi();
    await postComment("illust", 123, "好图！");
    expect(mockPost).toHaveBeenCalledWith("/v1/illust/comment/add", {
      illust_id: "123",
      comment: "好图！",
    });
  });

  it("postComment(novel, 42, ...) → POST /v1/novel/comment/add with novel_id", async () => {
    mockPost.mockResolvedValue(undefined);
    const { postComment } = await loadApi();
    await postComment("novel", 42, "好文！");
    expect(mockPost).toHaveBeenCalledWith("/v1/novel/comment/add", {
      novel_id: "42",
      comment: "好文！",
    });
  });

  it("postComment includes parent_comment_id when replying", async () => {
    mockPost.mockResolvedValue(undefined);
    const { postComment } = await loadApi();
    await postComment("illust", 123, "回复", 456);
    expect(mockPost).toHaveBeenCalledWith("/v1/illust/comment/add", {
      illust_id: "123",
      comment: "回复",
      parent_comment_id: "456",
    });
  });

  // ── deleteComment ──

  it("deleteComment(illust, 789) → POST /v1/illust/comment/delete", async () => {
    mockPost.mockResolvedValue(undefined);
    const { deleteComment } = await loadApi();
    await deleteComment("illust", 789);
    expect(mockPost).toHaveBeenCalledWith("/v1/illust/comment/delete", {
      comment_id: "789",
    });
  });

  it("deleteComment(novel, 789) → POST /v1/novel/comment/delete", async () => {
    mockPost.mockResolvedValue(undefined);
    const { deleteComment } = await loadApi();
    await deleteComment("novel", 789);
    expect(mockPost).toHaveBeenCalledWith("/v1/novel/comment/delete", {
      comment_id: "789",
    });
  });

  // ── AbortSignal ──

  it("passes AbortSignal to apiClient.get", async () => {
    mockGet.mockResolvedValue({ comments: [], next_url: null });
    const { loadRootComments } = await loadApi();
    const ac = new AbortController();
    await loadRootComments("illust", 1, ac.signal);
    expect(mockGet).toHaveBeenCalledWith(
      "/v3/illust/comments",
      { illust_id: "1", include_total_comments: "true" },
      ac.signal,
    );
  });

  // ── Input validation ──

  it("postComment throws for comment exceeding MAX_COMMENT_LENGTH", async () => {
    mockPost.mockResolvedValue(undefined);
    const { postComment, MAX_COMMENT_LENGTH } = await loadApi();
    const longText = "x".repeat(MAX_COMMENT_LENGTH + 1);
    await expect(postComment("illust", 123, longText)).rejects.toThrow(/exceeds maximum length/i);
    expect(mockPost).not.toHaveBeenCalled();
  });
});
