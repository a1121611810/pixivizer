# List Bookmark Heart Particle Effect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the existing `HeartBurstEffect` component for list-view bookmark buttons (`ImageCard`) with a smaller, scaled-down burst.

**Architecture:** Extend `HeartBurstEffect` to accept `size` and `particleCount` props, scaling particle speed proportionally. Wire a trigger signal into `ImageCard`'s existing bookmark toggle. No new components are created.

**Tech Stack:** SolidJS, TypeScript, PixiJS v8, Vite, Vitest

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/utils/heartParticleSystem.ts` | Pure particle state generation; add optional speed scaling support |
| `src/utils/heartParticleSystem.test.ts` | Tests for new scaling behavior |
| `src/components/HeartBurstEffect.tsx` | Render PixiJS burst; accept `size` and `particleCount` props |
| `src/components/ImageCard.tsx` | Trigger the effect when bookmark succeeds |

---

### Task 1: Add speed scaling support to particle utilities

**Files:**
- Modify: `src/utils/heartParticleSystem.ts`
- Modify: `src/utils/heartParticleSystem.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/utils/heartParticleSystem.test.ts
import { describe, it, expect } from "vitest";
import { createParticleStates } from "./heartParticleSystem";

describe("createParticleStates speed scaling", () => {
  it("scales speed down with speedScale", () => {
    const defaultParticles = createParticleStates({ count: 1, centerX: 0, centerY: 0 });
    const scaledParticles = createParticleStates({
      count: 1,
      centerX: 0,
      centerY: 0,
      speedScale: 0.4,
    });

    const defaultSpeed = Math.sqrt(
      defaultParticles[0].vx ** 2 + defaultParticles[0].vy ** 2,
    );
    const scaledSpeed = Math.sqrt(
      scaledParticles[0].vx ** 2 + scaledParticles[0].vy ** 2,
    );

    expect(scaledSpeed).toBeCloseTo(defaultSpeed * 0.4, 0);
  });

  it("defaults to speedScale 1 when not provided", () => {
    const particles = createParticleStates({ count: 1, centerX: 0, centerY: 0 });
    const speed = Math.sqrt(particles[0].vx ** 2 + particles[0].vy ** 2);
    expect(speed).toBeGreaterThanOrEqual(60);
    expect(speed).toBeLessThanOrEqual(120);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test src/utils/heartParticleSystem.test.ts
```

Expected: FAIL with `speedScale` not recognized.

- [ ] **Step 3: Implement speed scaling**

```ts
// src/utils/heartParticleSystem.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/utils/heartParticleSystem.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/heartParticleSystem.ts src/utils/heartParticleSystem.test.ts
pnpm test && git commit -m "feat(utils): add speedScale option to particle system"
```

---

### Task 2: Extend HeartBurstEffect with size and particleCount props

**Files:**
- Modify: `src/components/HeartBurstEffect.tsx`

- [ ] **Step 1: Update the Props interface**

```tsx
interface Props {
  trigger: Accessor<number>;
  size?: number;
  particleCount?: number;
}
```

- [ ] **Step 2: Replace module-level constants with defaults and reactive helpers**

```tsx
const DEFAULT_SIZE = 200;
const DEFAULT_PARTICLE_COUNT = 10;

const HeartBurstEffect: Component<Props> = (props) => {
  const size = () => props.size ?? DEFAULT_SIZE;
  const particleCount = () => props.particleCount ?? DEFAULT_PARTICLE_COUNT;
  const speedScale = () => size() / DEFAULT_SIZE;

  let wrapperRef: HTMLDivElement | undefined;
  let app: Application | undefined;
  let texture: Texture | undefined;
  let particleContainer: ParticleContainer | undefined;
  let ParticleClass: typeof Particle | undefined;
  let activeParticles: ActiveParticleState[] = [];
  let initPromise: Promise<void> | undefined;
  let mounted = true;
  // ...
};
```

- [ ] **Step 3: Update initApp to use reactive size**

Inside `initApp`, replace the hardcoded `CANVAS_SIZE` with `size()`:

```ts
await appInstance.init({
  width: size(),
  height: size(),
  backgroundAlpha: 0,
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});
```

- [ ] **Step 4: Update emit to use reactive size, count, and speedScale**

```ts
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
```

- [ ] **Step 5: Update CSS styles to use reactive size**

```tsx
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
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
pnpm check
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/HeartBurstEffect.tsx
pnpm check && git commit -m "feat(heart-burst): support size and particleCount props"
```

---

### Task 3: Integrate effect into ImageCard

**Files:**
- Modify: `src/components/ImageCard.tsx`

- [ ] **Step 1: Add import and trigger signal**

```tsx
import HeartBurstEffect from "./HeartBurstEffect";
```

Add near other signals:

```tsx
const [bookmarkBurstTrigger, setBookmarkBurstTrigger] = createSignal(0);
```

- [ ] **Step 2: Wrap the bookmark button**

Find the bookmark button (around line 87) and wrap it in a `relative` container:

```tsx
<div class="absolute bottom-1.5 right-1.5">
  <button
    class="w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-sm transition-all active:scale-90 select-none"
    classList={{
      "text-red-400": bookmarked(),
      "text-white/70 hover:text-red-300": !bookmarked(),
    }}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerLeave={() => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = 0 as any;
      }
    }}
    onClick={(e) => e.stopPropagation()}
    aria-label={bookmarked() ? "取消收藏" : "收藏"}
  >
    {bookmarked() ? "♥" : "♡"}
  </button>
  <HeartBurstEffect
    trigger={bookmarkBurstTrigger}
    size={80}
    particleCount={6}
  />
</div>
```

Note: the `absolute bottom-1.5 right-1.5` positioning moves from the `<button>` to the wrapping `<div>`, so the overlay is positioned relative to the same corner.

- [ ] **Step 3: Increment trigger on successful bookmark**

In `toggleBookmark`, after a new public or private bookmark succeeds, increment the trigger:

```ts
const toggleBookmark = async (e: MouseEvent, privateBookmark = false) => {
  e.stopPropagation();
  try {
    if (bookmarked()) {
      await deleteBookmark(props.illust.id);
      setBookmarked(false);
      setTotalBookmarks((t) => t - 1);
    } else {
      await addBookmark(props.illust.id, privateBookmark ? "private" : "public");
      setBookmarked(true);
      setTotalBookmarks((t) => t + 1);
      setBookmarkBurstTrigger((n) => n + 1);
      if (privateBookmark) showPrivateToast();
    }
  } catch {
    /* silently fail */
  }
};
```

- [ ] **Step 4: Verify TypeScript and lint**

```bash
pnpm check
```

Expected: 0 errors, existing warnings only.

- [ ] **Step 5: Commit**

```bash
git add src/components/ImageCard.tsx
pnpm check && git commit -m "feat(image-card): add heart burst effect to list bookmark"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Run the test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: Build for production**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 3: Start dev server and verify visual behavior**

```bash
pnpm dev
```

Open `http://localhost:5173`, navigate to Feed and Bookmarks, then:

- Click a card's bookmark heart — expect a small burst from the button.
- Click again to un-bookmark — expect no burst.
- Rapidly click the heart — expect no crash.
- Scroll the list — expect no obvious jank from the new PixiJS canvas instances.
- Verify the detail page bookmark button still uses the larger 200×200 burst.

## Self-Review

### Spec coverage

| Spec requirement | Implementing task |
|------------------|-------------------|
| Reuse `HeartBurstEffect` | Task 2 + Task 3 |
| Scale down for list | Task 2 (`size`, `particleCount`, `speedScale`) |
| Cover Feed and Bookmarks | Task 3 (`ImageCard` is used by both) |
| Trigger only on successful bookmark | Task 3 |
| Preserve existing interactions | Task 3 |

### Placeholder scan

No TBD/TODO placeholders. All steps include concrete code.

### Type consistency

- `ParticleInitOptions.speedScale` added in Task 1 and used in Task 2.
- `HeartBurstEffect` props `size` and `particleCount` defined in Task 2 and used in Task 3.

### Risks

- `ImageCard` is rendered many times in a virtual list. Each card creates its own `HeartBurstEffect` component, but PixiJS is lazy-loaded and initialized only on first trigger. The overlay canvas is small (80×80) and short-lived.
- If memory/performance becomes an issue, consider pooling or destroying the Pixi app after a longer idle period.
