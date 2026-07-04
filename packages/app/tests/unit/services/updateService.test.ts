import { describe, it, expect, vi, beforeEach } from "vitest";
import { isNewer } from "@/services/updateService";

describe("isNewer", () => {
  it("returns false when versions are equal", () => {
    expect(isNewer("1.0.0", "1.0.0")).toBe(false);
  });

  it("returns true when remote major is newer", () => {
    expect(isNewer("1.0.0", "2.0.0")).toBe(true);
  });

  it("returns true when remote minor is newer", () => {
    expect(isNewer("1.2.0", "1.3.0")).toBe(true);
  });

  it("returns true when remote patch is newer", () => {
    expect(isNewer("1.2.3", "1.2.4")).toBe(true);
  });

  it("returns false when local is newer", () => {
    expect(isNewer("2.0.0", "1.9.9")).toBe(false);
  });

  it("handles leading v prefix on remote", () => {
    expect(isNewer("1.0.0", "v1.1.0")).toBe(true);
  });

  it("handles leading v prefix on local", () => {
    expect(isNewer("v1.0.0", "1.1.0")).toBe(true);
  });

  it("handles leading v prefix on both sides", () => {
    expect(isNewer("v1.0.0", "v1.0.1")).toBe(true);
  });

  it("ignores build metadata after plus sign", () => {
    expect(isNewer("1.0.0+1", "1.1.0+99")).toBe(true);
  });

  it("ignores build metadata when core versions are equal", () => {
    expect(isNewer("1.0.0+1", "1.0.0+2")).toBe(false);
  });

  it("trims whitespace around version strings", () => {
    expect(isNewer(" 1.0.0 ", " 1.1.0 ")).toBe(true);
  });

  it("handles mixed depth (remote shorter)", () => {
    expect(isNewer("1.2.3", "1.3")).toBe(true);
  });

  it("handles mixed depth (local shorter) when equal", () => {
    expect(isNewer("1.2", "1.2.0")).toBe(false);
  });

  it("handles mixed depth when local is newer", () => {
    expect(isNewer("1.2", "1.1.9")).toBe(false);
  });
});
