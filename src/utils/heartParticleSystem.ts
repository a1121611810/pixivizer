export interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
}

export interface ParticleInitOptions {
  count: number;
  centerX: number;
  centerY: number;
  minLife?: number;
  maxLife?: number;
  speedMin?: number;
  speedMax?: number;
  speedScale?: number;
}

export function cssHexToNumber(hex: string, fallback = 0xff0000): number {
  const cleaned = hex.trim().replace("#", "");
  const match = cleaned.match(/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return fallback;

  const digits = match[1];
  if (digits.length === 3) {
    const [r, g, b] = digits;
    return parseInt(`${r}${r}${g}${g}${b}${b}`, 16);
  }

  return parseInt(digits, 16);
}

export function createParticleStates(options: ParticleInitOptions): ParticleState[] {
  const {
    count,
    centerX,
    centerY,
    minLife = 500,
    maxLife = 700,
    speedMin = 60,
    speedMax = 120,
    speedScale = 1,
  } = options;

  const particles: ParticleState[] = [];
  const angleStep = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const angle = angleStep * i + Math.random() * angleStep * 0.5;
    const speed = (speedMin + Math.random() * (speedMax - speedMin)) * speedScale;
    const life = minLife + Math.random() * (maxLife - minLife);

    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      scale: 0.6 + Math.random() * 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 4,
      life,
      maxLife: life,
    });
  }

  return particles;
}
