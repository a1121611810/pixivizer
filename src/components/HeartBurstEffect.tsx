// src/components/HeartBurstEffect.tsx
import { type Component, type Accessor, onCleanup, createEffect } from "solid-js";
import { Application, Graphics, Particle, ParticleContainer, Texture } from "pixi.js";
import {
  createParticleStates,
  cssHexToNumber,
  type ParticleState,
} from "../utils/heartParticleSystem";

interface Props {
  trigger: Accessor<number>;
}

interface ActiveParticleState extends ParticleState {
  particle: Particle;
}

const PARTICLE_COUNT = 10;
const CANVAS_SIZE = 200;

const HeartBurstEffect: Component<Props> = (props) => {
  let wrapperRef: HTMLDivElement | undefined;
  let app: Application | undefined;
  let texture: Texture | undefined;
  let particleContainer: ParticleContainer | undefined;
  let activeParticles: ActiveParticleState[] = [];

  function readHeartColor(): number {
    const hex = getComputedStyle(document.documentElement).getPropertyValue(
      "--colorStatusDangerForeground1",
    );
    return cssHexToNumber(hex, 0xc42b1c);
  }

  function createHeartTexture(appInstance: Application): Texture {
    const g = new Graphics();
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
    const appInstance = new Application();
    await appInstance.init({
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (wrapperRef) {
      wrapperRef.appendChild(appInstance.canvas as unknown as HTMLCanvasElement);
    }

    app = appInstance;
    texture = createHeartTexture(appInstance);
    particleContainer = new ParticleContainer({
      texture,
      dynamicProperties: {
        position: true,
        rotation: true,
        vertex: true,
        color: true,
      },
    });
    appInstance.stage.addChild(particleContainer);

    appInstance.ticker.add((ticker) => {
      const dt = ticker.deltaMS / 1000;
      for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        p.life -= ticker.deltaMS;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;

        const progress = Math.max(0, p.life / p.maxLife);
        p.particle.x = p.x;
        p.particle.y = p.y;
        p.particle.rotation = p.rotation;
        p.particle.alpha = progress;
        p.particle.scaleX = p.scale * progress;
        p.particle.scaleY = p.scale * progress;

        if (p.life <= 0) {
          particleContainer?.removeParticle(p.particle);
          activeParticles.splice(i, 1);
        }
      }
    });
  }

  function emit() {
    if (!app || !texture || !particleContainer) return;
    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const states = createParticleStates({
      count: PARTICLE_COUNT,
      centerX,
      centerY,
    });

    for (const state of states) {
      const particle = new Particle({
        texture,
        anchorX: 0.5,
        anchorY: 0.5,
        x: state.x,
        y: state.y,
        scaleX: state.scale,
        scaleY: state.scale,
        rotation: state.rotation,
        alpha: 1,
      });
      particleContainer.addParticle(particle);
      activeParticles.push({ ...state, particle });
    }
  }

  createEffect(() => {
    const count = props.trigger();
    if (count === 0) return;
    void initApp().then(() => {
      emit();
    });
  });

  onCleanup(() => {
    activeParticles = [];
    texture?.destroy(true);
    app?.destroy(true);
    app = undefined;
    texture = undefined;
    particleContainer = undefined;
  });

  return (
    <div
      ref={wrapperRef}
      class="absolute pointer-events-none"
      style={{
        width: `${CANVAS_SIZE}px`,
        height: `${CANVAS_SIZE}px`,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
      aria-hidden="true"
    />
  );
};

export default HeartBurstEffect;
