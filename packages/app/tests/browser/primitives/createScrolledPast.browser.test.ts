// @vitest-environment browser
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "solid-js";
import { createScrolledPast } from "@/primitives/createScrolledPast";

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

describe("createScrolledPast", () => {
  it("is false at the top and true after scrolling past the threshold", () =>
    createRoot(async (dispose) => {
      const past = createScrolledPast(300);

      expect(past()).toBe(false);

      await scrollToAndWait(500);
      expect(past()).toBe(true);

      dispose();
    }));

  it("becomes false again when scrolling back above the threshold", () =>
    createRoot(async (dispose) => {
      const past = createScrolledPast(300);

      await scrollToAndWait(500);
      expect(past()).toBe(true);

      await scrollToAndWait(100);
      expect(past()).toBe(false);

      dispose();
    }));

  it("is correct immediately when created while already scrolled past", () =>
    createRoot(async (dispose) => {
      await scrollToAndWait(500);

      const past = createScrolledPast(300);
      expect(past()).toBe(true);

      dispose();
    }));
});
