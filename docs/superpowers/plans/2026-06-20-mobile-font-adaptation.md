# Mobile Font Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all font-size tokens from static `px` to `rem` at build time via `postcss-pxtorem`; add fluid `clamp()` scaling for hero-level sizes; refactor Login.tsx to eliminate inline hardcoded px/color values.

**Architecture:** Three-layer approach — (1) `postcss-pxtorem` transforms `font-size` px → rem in CSS files at build time, (2) tokens.css hero-level tokens use `clamp()` for viewport-based fluid scaling, (3) Android WebView natively applies system font-scale multiplier to `rem` values.

**Tech Stack:** Vite + PostCSS + postcss-pxtorem, SolidJS, UnoCSS

## Global Constraints

- All font-size values written as `px` in source, automatically converted to `rem` in build output
- Line-height tokens must be unitless ratios (not px, not rem)
- Spacing, border-radius, stroke-width, shadow tokens stay in `px`
- `html { font-size: 100% }` — no 62.5% trick
- `user-scalable=no` in index.html — NOT changed
- All color values must use `var(--colorXxx)` tokens, never bare `#xxx` or `rgb()`
- Components referencing `var(--fontSizeXxx)` require NO changes

---

### Task 1: Install postcss-pxtorem and configure Vite

**Files:**

- Modify: `package.json` — add devDependency
- Modify: `vite.config.ts` — add PostCSS plugin config

**Interfaces:**

- Produces: `postcss-pxtorem` plugin active with `rootValue: 16`, `propList: ['font-size']`, `minPixelValue: 2`

- [ ] **Step 1: Install postcss-pxtorem**

Run: `pnpm add -D postcss-pxtorem`
Expected: package.json updated with `"postcss-pxtorem": "^..."`
The plugin uses `postcss-pxtorem` (npm package name — note the spelling: `postcss-pxtorem`, NOT `postcss-px-to-rem`).

- [ ] **Step 2: Add PostCSS config to vite.config.ts**

Add a `css` block inside `defineConfig({...})`, after the existing `plugins` line but before `server`:

```ts
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import UnoCSS from "unocss/vite";
import { HttpsProxyAgent } from "https-proxy-agent";
import postcssPxToRem from "postcss-pxtorem"; // new import

const proxyUrl =
  process.env.https_proxy ||
  process.env.HTTPS_PROXY ||
  process.env.http_proxy ||
  process.env.HTTP_PROXY ||
  "http://127.0.0.1:10808";
console.log(`[vite] 🔧 使用代理: ${proxyUrl}`);
const proxyAgent = new HttpsProxyAgent(proxyUrl);

export default defineConfig({
  plugins: [solid(), UnoCSS()],
  css: {
    // new block
    postcss: {
      plugins: [
        postcssPxToRem({
          rootValue: 16,
          propList: ["font-size"],
          minPixelValue: 2,
        }),
      ],
    },
  },
  server: {
    // ... existing proxy config unchanged ...
  },
  build: { target: "esnext" },
});
```

- [ ] **Step 3: Verify build succeeds with pxtorem active**

Run: `pnpm build`
Expected: build completes without errors. The CSS output in `dist/` should contain `rem` values for font-size properties.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts
git commit -m "chore: add postcss-pxtorem for px-to-rem font-size conversion"
```

---

### Task 2: Update tokens.css — line-height ratios and Hero clamp()

**Files:**

- Modify: `src/styles/tokens.css:24-30` (line-height tokens)
- Modify: `src/styles/tokens.css:19-22` (Hero font-size tokens)

**Interfaces:**

- Consumes: postcss-pxtorem active (Task 1)
- Produces: line-height tokens as unitless ratios; Hero700-1000 use `clamp()` with px values (auto-converted to rem by pxtorem)

- [ ] **Step 1: Convert line-height tokens to unitless ratios**

In `src/styles/tokens.css`, replace lines 24-30:

```css
/* ── Line heights ── */
--lineHeightBase100: 14px;
--lineHeightBase200: 16px;
--lineHeightBase300: 20px;
--lineHeightBase400: 22px;
--lineHeightBase500: 28px;
--lineHeightBase600: 32px;
```

with:

```css
/* ── Line heights (unitless ratio = px / font-size) ── */
--lineHeightBase100: 1.4; /* 14/10 */
--lineHeightBase200: 1.333; /* 16/12 */
--lineHeightBase300: 1.4286; /* 20/14 */
--lineHeightBase400: 1.375; /* 22/16 */
--lineHeightBase500: 1.4; /* 28/20 */
--lineHeightBase600: 1.333; /* 32/24 */
```

- [ ] **Step 2: Add clamp() to Hero-level font-size tokens**

In `src/styles/tokens.css`, replace lines 19-22:

```css
--fontSizeHero700: 28px; /* Title 2 */
--fontSizeHero800: 32px; /* Title 1 */
--fontSizeHero900: 40px; /* Large Title */
--fontSizeHero1000: 68px; /* Display */
```

with:

```css
--fontSizeHero700: clamp(24px, 1.2vw + 20px, 28px); /* Title 2 */
--fontSizeHero800: clamp(28px, 1.5vw + 22px, 32px); /* Title 1 */
--fontSizeHero900: clamp(32px, 2vw + 24px, 40px); /* Large Title */
--fontSizeHero1000: clamp(50px, 4vw + 32px, 68px); /* Display */
```

The `px` values inside `clamp()` will be auto-converted to `rem` by pxtorem at build time.

- [ ] **Step 3: Verify tokens.css changes don't break build**

Run: `pnpm build`
Expected: build completes without errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css
git commit -m "refactor: convert line-height to unitless ratios, add fluid clamp() to Hero font tokens"
```

---

### Task 3: Update base.css — explicit html font-size

**Files:**

- Modify: `src/styles/base.css:13-19` (html rule)

**Interfaces:**

- Consumes: tokens.css updated (Task 2)
- Produces: `html { font-size: 100% }` explicitly set

- [ ] **Step 1: Add font-size: 100% to html rule**

In `src/styles/base.css`, replace the existing `html` block (lines 13-19):

```css
html {
  background-color: var(--colorNeutralBackground3);
  color: var(--colorNeutralForeground1);
  transition:
    background-color var(--durationNormal) var(--curveEasyEase),
    color var(--durationNormal) var(--curveEasyEase);
}
```

with:

```css
html {
  font-size: 100%; /* 16px browser default — explicit, no 62.5% trick */
  background-color: var(--colorNeutralBackground3);
  color: var(--colorNeutralForeground1);
  transition:
    background-color var(--durationNormal) var(--curveEasyEase),
    color var(--durationNormal) var(--curveEasyEase);
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/base.css
git commit -m "refactor: explicitly set html font-size to 100%"
```

---

### Task 4: Refactor Login.tsx — eliminate inline hardcoded values

**Files:**

- Modify: `src/routes/Login.tsx` — S object additions + JSX replacements

**Interfaces:**

- Consumes: tokens.css has `--fontSizeHero900`, `--spacingVerticalS/M/L`, `--colorNeutralForegroundOnBrand`
- Produces: Login.tsx with zero hardcoded `px` or `#xxx` in inline styles

**Important:** We need `--colorNeutralForegroundOnBrand` — check if it exists. If not, add it to tokens.css. Fluent Design defines this as the foreground color that goes on top of brand background. Let's check:

From tokens.css, we have `--colorBrandBackground`, but no `--colorNeutralForegroundOnBrand`. We need to add this. White (`#ffffff`) in light theme, and a suitable value in dark theme. Since brand buttons use white text in both themes in Fluent, we add `--colorNeutralForegroundOnBrand: #ffffff` to `:root` and keep it the same in dark.

- [ ] **Step 1: Add missing color token to tokens.css**

In `src/styles/tokens.css`, add after the `--colorBrandStroke2` line (after line 126 in original, or within the light theme block):

In the light theme `:root` block, after `--colorBrandStroke2: #c2e0f4;` (line 126), add:

```css
--colorNeutralForegroundOnBrand: #ffffff; /* text on brand bg */
```

In the dark theme `:root.dark` block, after `--colorBrandStroke2: #1a3a5c;` (line 208), add:

```css
--colorNeutralForegroundOnBrand: #ffffff; /* text on brand bg — white in both themes */
```

- [ ] **Step 2: Add new style object members to Login.tsx S object**

In `src/routes/Login.tsx`, after the existing `S.dividerText` line (line 34), add these new members before the closing `};` of S:

```ts
  // 新增：emoji + 表单间距
  emoji: "font-size:var(--fontSizeHero900);margin-bottom:var(--spacingVerticalS)",
  fieldGroup: "display:flex;flex-direction:column;gap:var(--spacingVerticalL)",
  fieldGroupSmall: "display:flex;flex-direction:column;gap:var(--spacingVerticalS)",
  fieldGroupTight: "display:flex;flex-direction:column;gap:var(--spacingVerticalM)",
  textareaToken: "width:100%;padding:6px 10px;border-radius:var(--borderRadiusMedium);background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);font-size:var(--fontSizeBase300);border:1px solid var(--colorNeutralStroke1);outline:none;resize:vertical;box-sizing:border-box;min-height:96px",
  textareaSmart: "width:100%;padding:6px 10px;border-radius:var(--borderRadiusMedium);background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);font-size:var(--fontSizeBase300);border:1px solid var(--colorNeutralStroke1);outline:none;resize:vertical;box-sizing:border-box;min-height:80px",
```

Note: `textareaToken` and `textareaSmart` duplicate the base `S.textarea` pattern plus a `min-height`. Since `S.textarea` is defined as a string, we can't use `S.textarea + ";min-height:96px"` without risking PostCSS/linter issues. These standalone definitions avoid raw style concatenation in JSX while keeping the values self-contained and reviewable.

- [ ] **Step 3: Fix btn color to use token instead of #fff**

In the S object, find the `btn` line (currently line 28):

```ts
  btn: "width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 16px;border-radius:var(--borderRadiusMedium);font-size:var(--fontSizeBase300);font-weight:600;background-color:var(--colorBrandBackground);color:#fff;border:none;cursor:pointer",
```

Replace `color:#fff` with `color:var(--colorNeutralForegroundOnBrand)`:

```ts
  btn: "width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 16px;border-radius:var(--borderRadiusMedium);font-size:var(--fontSizeBase300);font-weight:600;background-color:var(--colorBrandBackground);color:var(--colorNeutralForegroundOnBrand);border:none;cursor:pointer",
```

- [ ] **Step 4: Replace JSX inline styles**

Replace the following JSX sections:

**Line 88 (emoji):**

```tsx
<div style="font-size:36px;margin-bottom:8px">🎨</div>
```

→

```tsx
<div style={S.emoji}>🎨</div>
```

**Line 107 (token mode form group):**

```tsx
          <div style="display:flex;flex-direction:column;gap:16px">
```

→

```tsx
          <div style={S.fieldGroup}>
```

**Line 110 (token textarea):**

```tsx
              style={S.textarea + ";min-height:96px"}
```

→

```tsx
              style={S.textareaToken}
```

**Line 122 (password mode form group):**

```tsx
          <div style="display:flex;flex-direction:column;gap:16px">
```

→

```tsx
          <div style={S.fieldGroup}>
```

**Line 145 (smart outer group):**

```tsx
          <div style="display:flex;flex-direction:column;gap:16px">
```

→

```tsx
          <div style={S.fieldGroup}>
```

**Line 146 (smart inner/token group):**

```tsx
            <div style="display:flex;flex-direction:column;gap:8px">
```

→

```tsx
            <div style={S.fieldGroupSmall}>
```

**Line 149 (smart token textarea):**

```tsx
                style={S.textarea + ";min-height:80px"}
```

→

```tsx
                style={S.textareaSmart}
```

**Line 162 (smart password group):**

```tsx
            <div style="display:flex;flex-direction:column;gap:12px">
```

→

```tsx
            <div style={S.fieldGroupTight}>
```

- [ ] **Step 5: TypeScript check**

Run: `pnpm check`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/routes/Login.tsx
git commit -m "refactor: eliminate hardcoded px and color values from Login.tsx"
```

---

### Task 5: Verification — full build and visual smoke test

**Files:**

- None modified

**Interfaces:**

- Consumes: all previous tasks complete

- [ ] **Step 1: Clean build**

Run: `pnpm build`
Expected: build completes without errors or warnings.

- [ ] **Step 2: Inspect build output for rem conversion**

Run: `grep -r 'font-size' dist/assets/*.css | head -20`
Expected: font-size values appear in `rem` units, not `px`. For example `font-size:.875rem` not `font-size:14px`.

- [ ] **Step 3: Verify clamp() survived pxtorem correctly**

Run: `grep -r 'clamp' dist/assets/*.css`
Expected: clamp() functions present with `rem` values inside. For example: `clamp(1.5rem, 1.2vw + 1.25rem, 1.75rem)`.

- [ ] **Step 4: Verify no bare font-size px in output**

Run: `grep -rP 'font-size:\s*\d+px' dist/assets/*.css`
Expected: NO matches (or only in comments / non-style contexts).

- [ ] **Step 5: Start dev server and visually check Login page**

Run: `pnpm dev`
Open in browser at `http://localhost:5173/login`. Verify:

- Emoji 🎨 renders at correct size (was 36px, now via `--fontSizeHero900` = 40px on desktop, close enough)
- "Pixivizer" title uses Hero800
- Form fields look correct
- Button text is white
- No layout regressions

- [ ] **Step 6: Commit (if any fixes applied during verification)**

```bash
git commit -m "chore: verification — build output confirmed rem conversion"
```
