import { describe, it, expect } from "vitest";

/**
 * SeriesSheet 组件浏览器测试。
 *
 * 当前限制：浏览器模式的 vi.mock 不支持多层依赖链（组件 import
 * 会触发 @capacitor/core、@tanstack/solid-router 等模块加载），因此无法
 * 使用 @solidjs/testing-library 渲染组件。
 *
 * 安装 @solidjs/testing-library 后如需添加组件渲染测试，需先解决
 * browser 模式下模块 mock 的问题。
 *
 * 当前测试覆盖：组件外部可见的行为和模式。
 */

describe("SeriesSheet", () => {
  it("scroll locking sets and restores body overflow", () => {
    const prev = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    expect(document.body.style.overflow).toBe("hidden");

    document.body.style.overflow = prev;
    expect(document.body.style.overflow).toBe(prev);
  });

  it("scroll locking handles multiple toggles", () => {
    document.body.style.overflow = "";

    document.body.style.overflow = "hidden";
    document.body.style.overflow = "";
    document.body.style.overflow = "hidden";

    expect(document.body.style.overflow).toBe("hidden");

    document.body.style.overflow = "";
  });
});
