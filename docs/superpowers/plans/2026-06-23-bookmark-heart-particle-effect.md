# Bookmark Heart Particle Effect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PixiJS-powered heart particle burst effect to the bookmark button in `IllustDetail`, triggered when the user successfully bookmarks an illustration.

**Architecture:** A reusable `HeartBurstEffect` SolidJS component wraps the bookmark button and overlays a transparent PixiJS canvas. Particle state and rendering are split into a pure `heartParticleSystem.ts` utility. The existing bookmark logic in `IllustDetail` remains untouched except for incrementing a trigger counter on successful bookmark.

**Tech Stack:** SolidJS, TypeScript, PixiJS v8, Vite, UnoCSS, Fluent Design tokens

---

## File Structure

| File                                    | Responsibility                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/utils/heartParticleSystem.ts`      | Pure functions: color conversion, particle state initialization, heart texture generation       |
| `src/components/HeartBurstEffect.tsx`   | SolidJS component that owns the PixiJS `Application`, `ParticleContainer`, and ticker lifecycle |
| `src/routes/IllustDetail.tsx`           | Wrap the bookmark button with `HeartBurstEffect` and pass a trigger counter                     |
| `src/utils/heartParticleSystem.test.ts` | Unit tests for pure particle/color functions (Vitest)                                           |

---

### Task 1: Install PixiJS dependency

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add `pixi.js`**

```bash
pnpm add pixi.js@^8.19.0
```

- [ ] **Step 2: Verify installation**

```bash
ls node_modules/pixi.js/package.json
```

Expected: prints the path without error.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add pixi.js for particle effects"
```

---

### Task 2: Add minimal Vitest test harness

**Files:**

- Create: `vitest.config.ts`
- Modify: `package.json`

Because the project currently has no test framework, we add Vitest to support TDD for the pure particle math utilities.

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest
```

- [ ] **Step 2: Create Vitest config**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: true,
  },
});
```

> **Note:** Tests use explicit imports from `vitest` (e.g. `import { describe, it, expect } from "vitest"`) to avoid leaking test globals into production code.

- [ ] **Step 3: Add test script**

Modify `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "chore: add vitest for unit tests"
```

---

### Task 3: Write pure particle utilities with tests

**Files:**

- Create: `src/utils/heartParticleSystem.ts`
- Create: `src/utils/heartParticleSystem.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/utils/heartParticleSystem.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test src/utils/heartParticleSystem.test.ts
```

Expected: FAIL with "function not defined" or import errors.

- [ ] **Step 3: Implement utilities**

```ts
// src/utils/heartParticleSystem.ts

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
}

export function cssHexToNumber(hex: string, fallback = 0xff0000): number {
  const cleaned = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return fallback;
  return parseInt(cleaned, 16);
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
  } = options;

  const particles: ParticleState[] = [];
  const angleStep = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const angle = angleStep * i + Math.random() * angleStep * 0.5;
    const speed = speedMin + Math.random() * (speedMax - speedMin);
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/utils/heartParticleSystem.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/heartParticleSystem.ts src/utils/heartParticleSystem.test.ts
git commit -m "feat(utils): add heart particle system utilities with tests"
```

---

### Task 4: Create `HeartBurstEffect` component

**Files:**

- Create: `src/components/HeartBurstEffect.tsx`

- [ ] **Step 1: Write component skeleton**

```tsx
// src/components/HeartBurstEffect.tsx
import { type Component, type Accessor, onCleanup, createEffect } from "solid-js";
import { Application, Container, Graphics, ParticleContainer, Sprite, Texture } from "pixi.js";
import {
  createParticleStates,
  cssHexToNumber,
  type ParticleState,
} from "../utils/heartParticleSystem";

interface Props {
  trigger: Accessor<number>;
}

const PARTICLE_COUNT = 10;
const CANVAS_SIZE = 200;

const HeartBurstEffect: Component<Props> = (props) => {
  let wrapperRef: HTMLDivElement | undefined;
  let app: Application | undefined;
  let texture: Texture | undefined;
  let particleContainer: ParticleContainer | undefined;
  let activeParticles: ParticleState[] = [];

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
      wrapperRef.appendChild(appInstance.canvas);
    }

    app = appInstance;
    texture = createHeartTexture(appInstance);
    particleContainer = new ParticleContainer({});
    appInstance.stage.addChild(particleContainer as unknown as Container);

    appInstance.ticker.add((ticker) => {
      const dt = ticker.deltaMS / 1000;
      for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        p.life -= ticker.deltaMS;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;

        const progress = Math.max(0, p.life / p.maxLife);
        p.sprite.x = p.x;
        p.sprite.y = p.y;
        p.sprite.rotation = p.rotation;
        p.sprite.alpha = progress;
        p.sprite.scale.set(p.scale * progress);

        if (p.life <= 0) {
          particleContainer?.removeChild(p.sprite);
          p.sprite.destroy();
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
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = state.x;
      sprite.y = state.y;
      sprite.scale.set(state.scale);
      sprite.rotation = state.rotation;
      sprite.alpha = 1;
      particleContainer.addChild(sprite as unknown as Container);
      activeParticles.push({ ...state, sprite });
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
    app?.destroy(true, { children: true });
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
```

Note: `ParticleContainer.addChild` type may need coercion because PixiJS v8 types expect `Container` children. Verify against installed PixiJS types and adjust.

`ParticleContainer` auto-grows in PixiJS v8, so `maxSize` is not a valid constructor option. The total particle count is bounded by the `PARTICLE_COUNT` constant per burst and the particle lifetime; dead particles are removed each frame. The ticker applies velocity damping (`DAMPING = 0.98`) every frame to give a natural deceleration effect, approximating the Fluent deceleration curve.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: no errors in `HeartBurstEffect.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeartBurstEffect.tsx
git commit -m "feat(components): add HeartBurstEffect PixiJS component"
```

---

### Task 5: Integrate effect into `IllustDetail`

**Files:**

- Modify: `src/routes/IllustDetail.tsx`

- [ ] **Step 1: Add import and trigger signal**

Add near the top:

```tsx
import HeartBurstEffect from "../components/HeartBurstEffect";
```

Add trigger signal in the component body:

```tsx
const [bookmarkBurstTrigger, setBookmarkBurstTrigger] = createSignal(0);
```

- [ ] **Step 2: Wrap the bookmark button**

Find the bookmark button (around line 264) and wrap it in a `relative inline-flex` container:

```tsx
<div class="relative inline-flex">
  <button
    class={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--borderRadiusMedium)] text-[var(--fontSizeBase200)] font-medium transition-all active:scale-95 select-none ${
      illust()!.is_bookmarked
        ? "bg-[var(--colorStatusDangerBackground2)] text-[var(--colorStatusDangerForeground1)]"
        : "bg-[var(--colorBrandStroke2)] text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorBrandBackground)] hover:text-white"
    }`}
    onPointerDown={onBookmarkPointerDown}
    onPointerUp={onBookmarkPointerUp}
    onPointerLeave={() => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = 0 as any;
      }
    }}
    disabled={bookmarking()}
  >
    {illust()!.is_bookmarked ? "♥ 已收藏" : "♡ 收藏"}
  </button>
  <HeartBurstEffect trigger={bookmarkBurstTrigger} />
</div>
```

- [ ] **Step 3: Increment trigger on successful bookmark**

In `toggleBookmark`, after the state update succeeds:

```ts
setIllust({
  ...i,
  is_bookmarked: !i.is_bookmarked,
  total_bookmarks: i.is_bookmarked ? i.total_bookmarks - 1 : i.total_bookmarks + 1,
});

if (!i.is_bookmarked) {
  setBookmarkBurstTrigger((n) => n + 1);
}
```

- [ ] **Step 4: Verify TypeScript and lint**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/IllustDetail.tsx
pnpm check && git commit -m "feat(illust-detail): integrate heart burst effect on bookmark"
```

---

### Task 6: Manual verification

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Open browser to `http://localhost:5173`**

- [ ] **Step 3: Navigate to any illustration detail page**

- [ ] **Step 4: Click the bookmark button**

Expected: a burst of small hearts emits from the button center and fades out.

- [ ] **Step 5: Click again to un-bookmark**

Expected: no particle effect; button returns to un-bookmarked style.

- [ ] **Step 6: Rapidly click the bookmark button**

Expected: no crash, particles overlap naturally.

- [ ] **Step 7: Navigate away and back**

Expected: no memory leaks or lingering canvas elements.

- [ ] **Step 8: Test on Android build (optional)**

```bash
pnpm build:android
```

Install the debug APK and verify the effect runs on device.

---

## Self-Review

### Spec coverage

| Spec requirement                                 | Implementing task                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| Center burst effect from bookmark button         | Task 4 + Task 5                                                           |
| 8–12 particles                                   | Task 3 (`count` option, default 10)                                       |
| 500–700ms lifetime                               | Task 3 (`minLife`/`maxLife`)                                              |
| Fluent Design easing/duration                    | Task 3 (physics uses delta time; lifecycle matches `--durationUltraSlow`) |
| Trigger only on successful bookmark              | Task 5 (increment after state update, only when `!i.is_bookmarked`)       |
| `pointer-events: none` overlay                   | Task 4                                                                    |
| Preserve existing button style/interaction       | Task 5 (button unchanged except wrapper)                                  |
| Graceful degradation                             | Task 4 (lazy init, destroy on cleanup)                                    |
| Performance: ParticleContainer, max 12 particles | Task 4                                                                    |

### Placeholder scan

No TBD/TODO placeholders. All steps include concrete code or commands.

### Type consistency

- `ParticleState` is defined in Task 3 and used in Task 4.
- `cssHexToNumber` signature matches usage in Task 4.
- `createParticleStates` options interface is consistent.

### Risks

- PixiJS v8 API for `ParticleContainer.addChild` may require type coercion; adjust based on installed types.
- `renderer.generateTexture({ target: g })` API should be confirmed against installed PixiJS version.
- The overlay positioning uses negative margins to center the canvas over the button; verify visually.
