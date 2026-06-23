// src/components/HeartBurstEffect.tsx
import { type Component, type Accessor, onCleanup, createEffect } from "solid-js";
import type { Application, Graphics, Particle, ParticleContainer, Texture } from "pixi.js";
import {
  createParticleStates,
  cssHexToNumber,
  type ParticleState,
} from "../utils/heartParticleSystem";

interface Props {
  trigger: Accessor<number>;
  size?: number;
  particleCount?: number;
}

interface ActiveParticleState extends ParticleState {
  particle: Particle;
}

const DEFAULT_SIZE = 200;
const DEFAULT_PARTICLE_COUNT = 10;

const HeartBurstEffect: Component<Props> = (props) => {
  const size = () => props.size ?? DEFAULT_SIZE;
  const particleCount = () => props.particleCount ?? DEFAULT_PARTICLE_COUNT;
  const speedScale = () => size() / DEFAULT_SIZE;

  // eslint-disable-next-line no-unassigned-vars
  let wrapperRef: HTMLDivElement | undefined;
  let app: Application | undefined;
  let texture: Texture | undefined;
  let particleContainer: ParticleContainer | undefined;
  let ParticleClass: typeof Particle | undefined;
  let activeParticles: ActiveParticleState[] = [];
  let initPromise: Promise<void> | undefined;
  let mounted = true;

  function readHeartColor(): number {
    const hex = getComputedStyle(document.documentElement).getPropertyValue(
      "--colorStatusDangerForeground1",
    );
    return cssHexToNumber(hex, 0xc42b1c);
  }

  function createHeartTexture(appInstance: Application, GraphicsClass: typeof Graphics): Texture {
    const g = new GraphicsClass();
    const s = 16;
    const color = readHeartColor();
    g.moveTo(0, s / 4)
      .bezierCurveTo(0, 0, -s / 2, 0, -s / 2, s / 4)
      .bezierCurveTo(-s / 2, s / 2, 0, s * 0.75, 0, s)
      .bezierCurveTo(0, s * 0.75, s / 2, s / 2, s / 2, s / 4)
      .bezierCurveTo(s / 2, 0, 0, 0, 0, s / 4)
      .fill({ color });
    return appInstance.renderer.generateTexture({ target: g });
  }

  async function initApp() {
    if (app) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const { Application, Graphics, Particle, ParticleContainer } = await import("pixi.js");
      let appInstance: Application | undefined;
      try {
        appInstance = new Application();
        await appInstance.init({
          width: size(),
          height: size(),
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (!mounted) {
          appInstance.destroy(true, { children: true, texture: true, textureSource: true });
          return;
        }

        if (wrapperRef) {
          wrapperRef.appendChild(appInstance.canvas as unknown as HTMLCanvasElement);
        }

        const newTexture = createHeartTexture(appInstance, Graphics);
        const newParticleContainer = new ParticleContainer({
          texture: newTexture,
          dynamicProperties: {
            position: true,
            rotation: true,
            vertex: true,
          },
        });
        appInstance.stage.addChild(newParticleContainer);

        const DAMPING = 0.98;
        appInstance.ticker.add((ticker) => {
          const dt = ticker.deltaMS / 1000;
          for (let i = activeParticles.length - 1; i >= 0; i--) {
            const p = activeParticles[i];
            p.life -= ticker.deltaMS;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rotation += p.rotationSpeed * dt;
            p.vx *= DAMPING;
            p.vy *= DAMPING;

            const progress = Math.max(0, p.life / p.maxLife);
            p.particle.x = p.x;
            p.particle.y = p.y;
            p.particle.rotation = p.rotation;
            p.particle.alpha = progress;
            p.particle.scaleX = p.scale * progress;
            p.particle.scaleY = p.scale * progress;

            if (p.life <= 0) {
              newParticleContainer.removeParticle(p.particle);
              activeParticles.splice(i, 1);
            }
          }
        });

        app = appInstance;
        texture = newTexture;
        particleContainer = newParticleContainer;
        ParticleClass = Particle;
      } catch (err) {
        console.error("HeartBurstEffect init failed:", err);
        appInstance?.destroy(true, { children: true, texture: true, textureSource: true });
        app = undefined;
        texture = undefined;
        particleContainer = undefined;
        ParticleClass = undefined;
        initPromise = undefined;
        throw err;
      }
    })();

    return initPromise;
  }

  function emit() {
    if (!app || !texture || !particleContainer || !ParticleClass) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const currentSize = size();
    const centerX = currentSize / 2;
    const centerY = currentSize / 2;
    const states = createParticleStates({
      count: particleCount(),
      centerX,
      centerY,
      speedScale: speedScale(),
    });

    for (const state of states) {
      const particle = new ParticleClass({ texture, spriteScale: state.scale });
      particle.x = state.x;
      particle.y = state.y;
      particle.rotation = state.rotation;
      particle.alpha = 1;
      particleContainer.addParticle(particle);
      activeParticles.push({ ...state, particle });
    }
  }

  createEffect(() => {
    const count = props.trigger();
    if (count === 0) return;
    initApp()
      .then(() => {
        emit();
      })
      .catch(() => {
        // Initialization errors are logged inside initApp; state is reset so the next trigger can retry.
      });
  });

  onCleanup(() => {
    mounted = false;
    for (const p of activeParticles) {
      particleContainer?.removeParticle(p.particle);
    }
    activeParticles = [];
    app?.destroy(true, { children: true, texture: true, textureSource: true });
    app = undefined;
    texture = undefined;
    particleContainer = undefined;
    ParticleClass = undefined;
    initPromise = undefined;
  });

  return (
    <div
      ref={wrapperRef}
      class="absolute pointer-events-none"
      style={{
        width: `${size()}px`,
        height: `${size()}px`,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
      aria-hidden="true"
    />
  );
};

export default HeartBurstEffect;
