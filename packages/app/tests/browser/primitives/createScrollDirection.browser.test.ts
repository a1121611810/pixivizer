// @vitest-environment browser
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "solid-js";
import { createScrollDirection } from "@/primitives/createScrollDirection";

const PAGE_HEIGHT = 5000;

let spacer: HTMLDivElement;

beforeEach(() => {
  spacer = document.createElement("div");
  spacer.style.height = `${PAGE_HEIGHT}px`;
  document.body.appendChild(spacer);
  window.scrollTo(0, 0);
});

afterEach(() => {
  spacer.remove();
  window.scrollTo(0, 0);
});

async function scrollToAndWait(y: number) {
  const arrived = new Promise((resolve) =>
    window.addEventListener("scroll", resolve, { once: true }),
  );
  window.scrollTo(0, y);
  await arrived;
  await Promise.resolve();
}

describe("createScrollDirection", () => {
  it("is initially null and becomes down after scrolling down past the threshold", () =>
    createRoot(async (dispose) => {
      const { direction } = createScrollDirection({ threshold: 10 });

      expect(direction()).toBe(null);

      await scrollToAndWait(100);
      expect(direction()).toBe("down");

      dispose();
    }));

  it("becomes up after scrolling up past the threshold", () =>
    createRoot(async (dispose) => {
      const { direction } = createScrollDirection({ threshold: 10 });

      await scrollToAndWait(300);
      await scrollToAndWait(100);
      expect(direction()).toBe("up");

      dispose();
    }));

  it("keeps the previous direction for sub-threshold movement", () =>
    createRoot(async (dispose) => {
      const { direction } = createScrollDirection({ threshold: 10 });

      await scrollToAndWait(5);
      expect(direction()).toBe(null);

      await scrollToAndWait(100);
      expect(direction()).toBe("down");

      await scrollToAndWait(105);
      expect(direction()).toBe("down");

      dispose();
    }));

  it("ignores jumps larger than the jump threshold", () =>
    createRoot(async (dispose) => {
      const { direction } = createScrollDirection({ threshold: 10, jumpThreshold: 200 });

      await scrollToAndWait(1000);
      expect(direction()).toBe(null);

      await scrollToAndWait(1050);
      expect(direction()).toBe("down");

      dispose();
    }));

  it("accumulate mode requires sustained same-direction scrolling past the threshold", () =>
    createRoot(async (dispose) => {
      await scrollToAndWait(100);
      const { direction } = createScrollDirection({ threshold: 30, accumulate: true });

      // 交替 ±20px 相互抵消，不触发
      await scrollToAndWait(120);
      await scrollToAndWait(100);
      await scrollToAndWait(120);
      await scrollToAndWait(100);
      expect(direction()).toBe(null);

      // 持续同向累计超过 30px 触发
      await scrollToAndWait(120);
      await scrollToAndWait(140);
      expect(direction()).toBe("down");

      dispose();
    }));

  it("reset re-baselines the tracked position", () =>
    createRoot(async (dispose) => {
      const { direction, reset } = createScrollDirection({ threshold: 10 });

      await scrollToAndWait(100);
      expect(direction()).toBe("down");

      reset();
      // reset 后从当前位置重新起算：亚阈值位移不触发
      await scrollToAndWait(105);
      expect(direction()).toBe("down");

      await scrollToAndWait(80);
      expect(direction()).toBe("up");

      dispose();
    }));
});
