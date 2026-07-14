/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from "vitest";
import type { AnyRoute } from "@tanstack/solid-router";

const { router } = await import("@/router");

function collectRoutePaths(route: AnyRoute): { paths: string[]; fullPaths: string[] } {
  const paths: string[] = [];
  const fullPaths: string[] = [];

  if (route.path) {
    paths.push(route.path);
  }
  if (route.fullPath) {
    fullPaths.push(route.fullPath);
  }

  for (const child of route.children ?? []) {
    const childPaths = collectRoutePaths(child as AnyRoute);
    paths.push(...childPaths.paths);
    fullPaths.push(...childPaths.fullPaths);
  }

  return { paths, fullPaths };
}

describe("router", () => {
  it("can be imported without throwing", () => {
    expect(router).toBeDefined();
    expect(router.routeTree).toBeDefined();
  });

  it("contains expected routes", () => {
    const { fullPaths } = collectRoutePaths(router.routeTree);
    const pathsSet = new Set(fullPaths);

    const expected = [
      "/login",
      "/recommended",
      "/illust/$id",
      "/user/$id/illusts",
      "/age-confirmation",
    ];
    for (const path of expected) {
      expect(pathsSet).toContain(path);
    }
  });

  it("has a catch-all route", () => {
    const { fullPaths } = collectRoutePaths(router.routeTree);
    const pathsSet = new Set(fullPaths);
    expect(pathsSet).toContain("/$");
  });
});
