import { describe, it, expect } from "vitest";
import { cssHexToNumber, createParticleStates } from "./heartParticleSystem";

describe("cssHexToNumber", () => {
  it("converts #c42b1c to 0xc42b1c", () => {
    expect(cssHexToNumber("#c42b1c")).toBe(0xc42b1c);
  });

  it("converts c42b1c without hash", () => {
    expect(cssHexToNumber("c42b1c")).toBe(0xc42b1c);
  });

  it("returns fallback for empty string", () => {
    expect(cssHexToNumber("", 0xff0000)).toBe(0xff0000);
  });
});

describe("createParticleStates", () => {
  it("creates the requested number of particles", () => {
    const particles = createParticleStates({ count: 10, centerX: 100, centerY: 100 });
    expect(particles).toHaveLength(10);
  });

  it("places particles at the center", () => {
    const particles = createParticleStates({ count: 1, centerX: 50, centerY: 60 });
    expect(particles[0].x).toBe(50);
    expect(particles[0].y).toBe(60);
  });

  it("assigns positive maxLife", () => {
    const particles = createParticleStates({ count: 1, centerX: 0, centerY: 0 });
    expect(particles[0].maxLife).toBeGreaterThan(0);
  });
});
