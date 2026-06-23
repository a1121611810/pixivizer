import { describe, it, expect, vi } from "vitest";
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

  it("trims whitespace around the value", () => {
    expect(cssHexToNumber("  #c42b1c  ")).toBe(0xc42b1c);
  });

  it("converts shorthand hex", () => {
    expect(cssHexToNumber("#c42")).toBe(0xcc4422);
  });

  it("converts shorthand hex without hash", () => {
    expect(cssHexToNumber("c42")).toBe(0xcc4422);
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

describe("createParticleStates speed scaling", () => {
  it("scales speed down with speedScale", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const defaultParticles = createParticleStates({ count: 1, centerX: 0, centerY: 0 });
    const scaledParticles = createParticleStates({
      count: 1,
      centerX: 0,
      centerY: 0,
      speedScale: 0.4,
    });

    randomSpy.mockRestore();

    const defaultSpeed = Math.sqrt(defaultParticles[0].vx ** 2 + defaultParticles[0].vy ** 2);
    const scaledSpeed = Math.sqrt(scaledParticles[0].vx ** 2 + scaledParticles[0].vy ** 2);

    expect(scaledSpeed).toBeCloseTo(defaultSpeed * 0.4, 0);
  });

  it("defaults to speedScale 1 when not provided", () => {
    const particles = createParticleStates({ count: 1, centerX: 0, centerY: 0 });
    const speed = Math.sqrt(particles[0].vx ** 2 + particles[0].vy ** 2);
    expect(speed).toBeGreaterThanOrEqual(60);
    expect(speed).toBeLessThanOrEqual(120);
  });
});
