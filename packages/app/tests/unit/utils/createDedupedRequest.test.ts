import { describe, it, expect, vi } from "vitest";
import { createDedupedRequest } from "@/utils/createDedupedRequest";

describe("createDedupedRequest", () => {
  it("calls fetcher only once for concurrent requests with the same key", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("result");
    const { request } = createDedupedRequest<string, string>(fetcher);

    const [a, b] = await Promise.all([request("k"), request("k")]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("k");
    expect(a).toBe("result");
    expect(b).toBe("result");
  });

  it("calls fetcher again after the previous request has settled", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    const { request } = createDedupedRequest<string, string>(fetcher);

    expect(await request("k")).toBe("first");
    expect(await request("k")).toBe("second");

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("retries after a rejected request", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
    const { request } = createDedupedRequest<string, string>(fetcher);

    await expect(request("k")).rejects.toThrow("boom");
    expect(await request("k")).toBe("ok");

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not dedupe different keys", async () => {
    const fetcher = vi.fn().mockImplementation((key: string) => Promise.resolve(key));
    const { request } = createDedupedRequest<string, string>(fetcher);

    const [a, b] = await Promise.all([request("x"), request("y")]);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(a).toBe("x");
    expect(b).toBe("y");
  });
});
