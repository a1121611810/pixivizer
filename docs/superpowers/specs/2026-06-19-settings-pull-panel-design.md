# Pull-to-Reveal Settings Panel — Design Spec

**Date:** 2026-06-19  
**Status:** Draft  
**Scope:** Settings access mechanism via pull gesture on Feed page

## Overview

Add a hidden settings panel that reveals via a **pull-down gesture** on the main Feed page, with a dual-threshold mechanism that coexists with the existing pull-to-refresh. The first version contains a single toggle: **dark/light theme**.

## Motivation

- The app currently has no settings UI at all — the `theme` signal in `uiStore` exists without any way to toggle it.
- A zero-footprint gesture-based approach avoids cluttering the already-clean Feed page with icons or tabs.
- The "discoverable hidden feature" feel of a pull-to-reveal panel adds delight compared to a conventional settings page or tab.

## Interaction Design

### Gesture Zones (vertical pull distance from top when already scrolled to top)

| Zone     | Distance | Visual Cue                 | Release Action       |
| -------- | -------- | -------------------------- | -------------------- |
| Idle     | 0–79px   | Faint spring tension       | Snap back, nothing   |
| Refresh  | 80–159px | Refresh icon + "下拉刷新"  | Trigger feed refresh |
| Settings | ≥160px   | Gear icon + "松手打开设置" | Open settings panel  |

### Panel Dismissal

- Tap the dimmed scrim behind the panel
- Swipe the panel back up (drag the handle)
- Android back button (already handled by Capacitor listeners in `App.tsx`)

### Spring Animation

Use the existing spring-based easing patterns already defined in the project (`--motion-spring-bounce`, `scale-enter` etc.). The panel enters with a damped spring from the top, settles at ~45% screen height.

## Panel Layout

```
┌──────────────────────────────────┐
│  Feed content (dimmed + blurred)  │
│                                   │
├───────────────────────────────────┤─────────┐
│                          ════════          │  ← drag handle (pill)
│  Settings                          ✕       │  ← close button
│  ──────────────────────────────────        │
│                                            │
│  🌙 深色模式              [Toggle]          │
│                                            │
│  ──────────────────────────────────        │
│  Pixivizer v0.1.0                         │  ← version (muted)
│                                            │
└────────────────────────────────────────────┘
```

- **Background:** Acrylic (backdrop-blur + semi-transparent surface) matching Fluent Design 2 tokens
- **Corner radius:** `rounded-t-2xl` to match the bottom nav pill style
- **Handle:** A short rounded pill at top-center, visually inviting drag
- **Toggle:** Uses the existing Fluent toggle style (if defined) or a custom toggle consistent with the design system

## Component Tree

```
Feed.tsx (modified)
├── PullIndicator.tsx (new)
│   └── Shows zone-aware icon + label based on pull distance
├── (existing VirtualFeed, ImageCard, etc.)
├── SettingsSheet.tsx (new, conditionally rendered)
│   ├── Scrim (pressable backdrop, fade-in)
│   ├── Sheet container (spring slide-down)
│   │   ├── Drag handle
│   │   ├── Close button
│   │   ├── Theme toggle row
│   │   └── Version footer
│   └── (future: more settings rows)
└── (existing NavBar)
```

## Data Flow

```
uiStore.ts
  theme: 'dark' | 'light'       (existing signal)
  showSettingsSheet: boolean     (new signal)

Feed.tsx
  touchmove handler             (modified: read distance, update indicator state)
  touchend handler              (modified: decide refresh vs. settings vs. snap-back)
  render <SettingsSheet> when showSettingsSheet is true

SettingsSheet.tsx
  reads theme() from uiStore
  toggleTheme() calls uiStore.setTheme()
  emit close → setShowSettingsSheet(false)
```

## Technical Notes

- The existing pull-to-refresh in `Feed.tsx` uses `ontouchstart`/`ontouchmove`/`ontouchend`. The dual-threshold logic extends this by checking `deltaY` against the two breakpoints.
- On Android, the native overscroll effect must be suppressed during the gesture to avoid interference. Capacitor's `StatusBar` or `Keyboard` config may need a `style` update — TBD during implementation.
- The panel uses `position: fixed` with `top` animated via JS spring (requestAnimationFrame loop or Solid.js `createSpring` equivalent) for 60fps performance.
- The toggle should immediately apply the theme change (no save button) — Solid's reactivity makes this trivial.

## Files Changed

| File                               | Change                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| `src/components/SettingsSheet.tsx` | **Add** — The half-sheet settings panel component                |
| `src/components/PullIndicator.tsx` | **Add** — Zone-aware pull indicator with icon/color transitions  |
| `src/routes/Feed.tsx`              | **Modify** — Add dual-threshold pull logic, render SettingsSheet |
| `src/stores/uiStore.ts`            | **Modify** — Add `showSettingsSheet` signal + toggle methods     |
| `index.html`                       | **Maybe** — Additional animation tokens if needed                |

## Non-Goals (for v1)

- No multi-section settings navigation
- No localStorage persistence beyond the existing Capacitor Preferences
- No settings icon or entry point in the app bar or nav bar (pure gesture access)
- No accessibility settings or complex preferences

## Future Expansion

The `SettingsSheet.tsx` component should be structured with a `SettingsRow` pattern so additional rows (default tab, image quality, account management, about) can be added by inserting new rows in the sheet without restructuring.
