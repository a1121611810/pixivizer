import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { useDetailData } from "@/primitives/useDetailData";

describe("useDetailData", () => {
  it("starts in loading state", () => {
    createRoot((dispose) => {
      const result = useDetailData(
        () => undefined,
        () => null,
      );
      expect(result.loading()).toBe(true);
      expect(result.data()).toBeNull();
      expect(result.error()).toBeNull();
      dispose();
    });
  });

  it("provides retry function", () => {
    createRoot((dispose) => {
      let data: { id: number } | null = null;
      const routeData = () => ({ data, error: null as Error | null });
      const result = useDetailData(routeData, (rd) => rd.data);
      expect(typeof result.retry).toBe("function");
      dispose();
    });
  });
});
