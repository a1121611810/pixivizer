// @vitest-environment browser
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "solid-js";
import { createScrollDrivenVisibility } from "@/primitives/createScrollDrivenVisibility";

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("createScrollDrivenVisibility", () => {
  it("is initially visible and hides when scrolling down past the direction threshold", () =>
    createRoot(async (dispose) => {
      const { visible } = createScrollDrivenVisibility({ idleDelay: 60 });

      expect(visible()).toBe(true);

      await scrollToAndWait(300);
      expect(visible()).toBe(false);

      dispose();
    }));

  it("shows when scrolling up", () =>
    createRoot(async (dispose) => {
      const { visible } = createScrollDrivenVisibility({ idleDelay: 60 });

      await scrollToAndWait(300);
      expect(visible()).toBe(false);

      await scrollToAndWait(100);
      expect(visible()).toBe(true);

      dispose();
    }));

  it("reappears after scrolling stops for the idle delay", () =>
    createRoot(async (dispose) => {
      const { visible } = createScrollDrivenVisibility({ idleDelay: 60 });

      await scrollToAndWait(300);
      expect(visible()).toBe(false);

      await sleep(100);
      expect(visible()).toBe(true);

      dispose();
    }));

  it("stays visible within the top guard even when scrolling down", () =>
    createRoot(async (dispose) => {
      const { visible } = createScrollDrivenVisibility({ idleDelay: 60 });

      await scrollToAndWait(20);
      expect(visible()).toBe(true);

      dispose();
    }));

  it("does not switch visibility during the suppress window", () =>
    createRoot(async (dispose) => {
      const { visible, suppress } = createScrollDrivenVisibility({ idleDelay: 60 });

      suppress(200);
      await scrollToAndWait(300);
      expect(visible()).toBe(true);

      dispose();
    }));

  it("resumes direction detection after the suppress window expires", () =>
    createRoot(async (dispose) => {
      const { visible, suppress } = createScrollDrivenVisibility({ idleDelay: 60 });

      suppress(100);
      await scrollToAndWait(200);
      expect(visible()).toBe(true);

      await sleep(150);
      await scrollToAndWait(400);
      expect(visible()).toBe(false);

      dispose();
    }));

  it("suppress with default duration covers the scroll-restore fallback window (500ms)", () =>
    createRoot(async (dispose) => {
      const { visible, suppress } = createScrollDrivenVisibility({ idleDelay: 60 });

      suppress();
      await scrollToAndWait(300);

      // 恢复兜底最迟 500ms 触发的重试 scrollTo 仍应被抑制
      await sleep(500);
      await scrollToAndWait(600);
      expect(visible()).toBe(true);

      dispose();
    }));
});
