import { describe, it, expect } from "vitest";
import { PIXIV_USER_AGENT } from "@/api/userAgent";

/**
 * PIXIV_USER_AGENT 格式契约。
 * 所有 Pixiv 请求使用的 User-Agent 必须保持此格式。
 * 此常量与 Java 侧 MainActivity.java、构建侧 vite.config.ts 的值同步。
 */
describe("PIXIV_USER_AGENT", () => {
  it("包含预期格式: PixivIOSApp/版本号 (iOS 版本; 设备型号)", () => {
    expect(PIXIV_USER_AGENT).toMatch(
      /^PixivIOSApp\/\d+\.\d+\.\d+ \(iOS \d+\.\d+(\.\d+)?; [A-Za-z0-9,]+\)$/,
    );
  });

  it("版本号为 7.18.3", () => {
    expect(PIXIV_USER_AGENT).toBe("PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)");
  });
});
