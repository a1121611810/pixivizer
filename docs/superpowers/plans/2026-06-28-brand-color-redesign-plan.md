# Pictelio 品牌色重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Fluent Blue `#0078d4` brand color chain with logo-derived colors `#2b579a`/`#5a9fd4`/`#7ab8e8` and warm the neutral palette.

**Architecture:** Single-file CSS variable replacement in `tokens.css` drives the entire app; website has independent variable overrides that are also updated in-place.

**Tech Stack:** CSS custom properties (Fluent Design Tokens), UnoCSS (references CSS vars), vanilla HTML+CSS for website.

## Global Constraints

- All new brand colors must be exact values from spec: `#2b579a`, `#3a6fb5`, `#1e3d6e`, `#5a9fd4`, `#7ab8e8`, `#4285b4`, `#8fc9f0`, `#d2e3f5`, `#1a3052`
- All new neutral colors must be exact warm values from spec (e.g., `#fefcf8` not `#ffffff`, `#f7f4ee` not `#fafafa`)
- Website variables `--colorPictelioTeal*` must be renamed to `--colorPictelioDeep/Mid/Light`
- `revealHighlight` rgba values must be updated
- `pnpm check` and `pnpm build` must pass after changes
- No hardcoded `#0078d4` or `#106ebe` should remain after changes

---

## File Structure

| File                          | Responsibility                                                               | Change type                                 |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------- |
| `src/styles/tokens.css`       | All Fluent design tokens — brand colors + neutrals for light and dark themes | Value replacement (~60 lines)               |
| `website/index.html`          | Website CSS variables in `<style>` block                                     | Variable rename + value replacement         |
| `website/privacy-policy.html` | Same structure as index.html                                                 | Variable rename + value replacement         |
| `public/privacy-policy.html`  | Build artifact, sync with website/ source                                    | Same changes as website/privacy-policy.html |

### Task 1: Replace brand colors + neutrals in tokens.css

**Files:**

- Modify: `src/styles/tokens.css`

**Interfaces:**

- Consumes: Exact color map from the spec (all tables under "品牌蓝色链" and "中性色微暖调整")
- Produces: Updated CSS variables consumed by all components via `var()` references

- [ ] **Step 1: Replace light theme brand colors (lines 117-133)**

Replace the block from `--colorBrandBackground` through `--colorCompoundBrandStroke1` in `:root`:

```css
/* ── Colors: Light theme ── */
--colorNeutralBackground1: #fefcf8;
--colorNeutralBackground2: #f7f4ee;
--colorNeutralBackground3: #f0ece4;
--colorNeutralBackground1Hover: #f0ece4;
--colorNeutralBackground1Pressed: #e6e2d8;
--colorNeutralBackground1Selected: #e6e2d8;

--colorNeutralForeground1: #2c2822;
--colorNeutralForeground2: #4a453e;
--colorNeutralForeground3: #696358;
--colorNeutralForegroundDisabled: #bbb5aa;

--colorNeutralStroke1: #cdc8be;
--colorNeutralStroke2: #dcd7ce;
--colorNeutralStrokeAccessible: #696358;
--colorNeutralStrokeAccessibleHover: #5f5950;
--colorNeutralStrokeDisabled: #dcd7ce;

--colorBrandBackground: #2b579a;
--colorBrandBackgroundHover: #3a6fb5;
--colorBrandBackgroundPressed: #1e3d6e;
--colorBrandBackgroundSelected: #1e3d6e;
--colorBrandForeground1: #2b579a;
--colorBrandForegroundLink: #2b579a;
--colorBrandForegroundLinkHover: #5a9fd4;
--colorBrandForegroundLinkPressed: #1e3d6e;
--colorBrandStroke1: #2b579a;
--colorBrandStroke2: #d2e3f5;
--colorNeutralForegroundOnBrand: #ffffff;

--colorCompoundBrandBackground: #2b579a;
--colorCompoundBrandBackgroundHover: #3a6fb5;
--colorCompoundBrandBackgroundPressed: #1e3d6e;
--colorCompoundBrandForeground1: #2b579a;
--colorCompoundBrandStroke1: #2b579a;

--colorNeutralBackgroundAlpha: rgba(254, 252, 248, 0.8);
--colorNeutralBackgroundAlpha2: rgba(254, 252, 248, 0.6);
```

- [ ] **Step 2: Replace dark theme colors (lines 183-218)**

Replace the block inside `:root.dark`:

```css
--colorNeutralBackground1: #2a2622;
--colorNeutralBackground2: #211d19;
--colorNeutralBackground3: #181410;
--colorNeutralBackground1Hover: #34302a;
--colorNeutralBackground1Pressed: #3e3832;
--colorNeutralBackground1Selected: #3e3832;

--colorNeutralForeground1: #ffffff;
--colorNeutralForeground2: #d4cfc8;
--colorNeutralForeground3: #aba59c;
--colorNeutralForegroundDisabled: #5e5852;

--colorNeutralStroke1: #656058;
--colorNeutralStroke2: #4c473f;
--colorNeutralStrokeAccessible: #aba59c;
--colorNeutralStrokeAccessibleHover: #bbb5aa;
--colorNeutralStrokeDisabled: #34302a;

--colorBrandBackground: #5a9fd4;
--colorBrandBackgroundHover: #7ab8e8;
--colorBrandBackgroundPressed: #4285b4;
--colorBrandBackgroundSelected: #4285b4;
--colorBrandForeground1: #7ab8e8;
--colorBrandForegroundLink: #7ab8e8;
--colorBrandForegroundLinkHover: #8fc9f0;
--colorBrandForegroundLinkPressed: #5a9fd4;
--colorBrandStroke1: #5a9fd4;
--colorBrandStroke2: #1a3052;

--colorCompoundBrandBackground: #5a9fd4;
--colorCompoundBrandBackgroundHover: #7ab8e8;
--colorCompoundBrandBackgroundPressed: #4285b4;
--colorCompoundBrandForeground1: #7ab8e8;
--colorCompoundBrandStroke1: #5a9fd4;

--colorNeutralBackgroundAlpha: rgba(42, 38, 34, 0.8);
--colorNeutralBackgroundAlpha2: rgba(42, 38, 34, 0.6);
```

- [ ] **Step 3: Commit tokens.css changes**

```bash
git add src/styles/tokens.css
git commit -m "feat(theme): replace brand colors with logo #2b579a palette and warm neutrals"
```

### Task 2: Update website/index.html

**Files:**

- Modify: `website/index.html`

**Interfaces:**

- Consumes: Same new color values from the spec
- Produces: Website using `--colorPictelioDeep/Mid/Light` instead of `--colorPictelioTeal*`

- [ ] **Step 1: Replace brand variable names and values**

Find the block (lines 16-22):

```css
--colorPictelioTeal: #0078d4;
--colorPictelioTealDark: #106ebe;
--colorPictelioTealDarker: #005a9e;
--colorPictelioTealLight: #2899f5;
--colorPictelioTealLighter: #60aaff;
--colorPictelioTealBgSubtle: #e6f5ff;
```

Replace with:

```css
--colorPictelioDeep: #2b579a;
--colorPictelioMid: #5a9fd4;
--colorPictelioLight: #7ab8e8;
--colorPictelioBgSubtle: #ede6d8;
```

- [ ] **Step 2: Update color references in the light theme**

Find and update all usages of the old `--colorPictelioTeal*` variables:

```css
/* Line 120 */
--colorBrandBackground: var(--colorPictelioDeep);
/* Line 121 */
--colorBrandBackgroundHover: var(--colorPictelioMid);
/* Line 122 */
--colorBrandBackgroundPressed: var(--colorPictelioDeep);
/* Line 123 */
--colorBrandForeground1: var(--colorPictelioDeep);
/* Line 124 */
--colorBrandForegroundLink: var(--colorPictelioDeep);
/* Line 125 */
--colorBrandForegroundLinkHover: var(--colorPictelioMid);
```

Wait — in the spec, the light theme brand foreground link hover is `#5a9fd4` which maps to `--colorPictelioMid`. And pressed is `#1e3d6e` — that's not one of the three logo colors. So we need to either keep using hex or add a dark variable. Let me use hex values directly for colors not covered by the three logo colors:

```css
--colorBrandBackground: var(--colorPictelioDeep); /* #2b579a */
--colorBrandBackgroundHover: var(--colorPictelioMid); /* #5a9fd4 — actually spec says #3a6fb5 */
```

Hmm, actually `#3a6fb5` is NOT one of the three logo colors — it's an intermediate value between `#2b579a` and `#5a9fd4`. So the website can't just use `--colorPictelioMid` for hover. Let me think about this differently.

The website currently defines the `--colorPictelioTeal*` vars and then references them in `--colorBrand*`. The cleanest approach is:

1. Keep `--colorPictelioDeep/Mid/Light` for the three logo colors
2. For the intermediate hover/pressed values, use hex directly in the `--colorBrand*` lines (since there are only a few)

Or better: add `--colorPictelioHover: #3a6fb5` and `--colorPictelioPressed: #1e3d6e` to the custom properties block.

Let me revise:

- [ ] **Step 2: Update the light theme brand color references**

```css
/* Replace lines 120-126 */
--colorBrandBackground: var(--colorPictelioDeep);
--colorBrandBackgroundHover: #3a6fb5;
--colorBrandBackgroundPressed: #1e3d6e;
--colorBrandForeground1: var(--colorPictelioDeep);
--colorBrandForegroundLink: var(--colorPictelioDeep);
--colorBrandForegroundLinkHover: var(--colorPictelioMid);
--colorBrandForegroundLinkPressed: #1e3d6e;
```

- [ ] **Step 3: Update the dark theme brand color references (lines 166-171)**

```css
/* Replace lines 166-171 */
--colorBrandBackground: var(--colorPictelioMid);
--colorBrandBackgroundHover: var(--colorPictelioLight);
--colorBrandBackgroundPressed: #4285b4;
--colorBrandForeground1: var(--colorPictelioLight);
--colorBrandForegroundLink: var(--colorPictelioLight);
--colorBrandForegroundLinkHover: #8fc9f0;
```

- [ ] **Step 4: Update `--colorPictelioTealBgSubtle` reference (line 176)**

```css
/* Line 176: dark theme bg subtle */
--colorPictelioBgSubtle: #1a2438;
```

Wait, the spec says `--colorPictelioBgSubtle: #ede6d8` for light. For dark, I need to pick a dark equivalent. The old value was `#0f2e4f`. Let me use a warm dark instead. Looking at the current code, line 176 has `--colorPictelioTealBgSubtle: #0f2e4f;` in the dark theme. The new equivalent based on `#2b579a` would be something like `#1a2438`.

Actually, let me re-read the spec more carefully... The spec says:

```css
--colorPictelioBgSubtle: #ede6d8;
```

But this is just for the light theme. The dark theme had a separate value `#0f2e4f`. In the spec I wrote in the website section, I only provided one value. But looking at the website code more carefully:

Line 22 (light): `--colorPictelioTealBgSubtle: #e6f5ff;`
Line 176 (dark): `--colorPictelioTealBgSubtle: #0f2e4f;`

So there are two values. The spec only defined one. I should fix the spec or note it here. Let me use:

- Light: `#ede6d8` (warm, subtle)
- Dark: `#1a2438` (warm dark blue)

- [ ] **Step 5: Update revealHighlight light theme color (line 145)**

```css
/* Line 145 */
--revealHighlight: radial-gradient(
  circle at var(--mouseX, 50%) var(--mouseY, 50%),
  rgba(43, 87, 154, 0.08) 0%,
  transparent 60%
);
```

- [ ] **Step 6: Update revealHighlight dark theme color (line 183)**

```css
/* Line 183 */
--revealHighlight: radial-gradient(
  circle at var(--mouseX, 50%) var(--mouseY, 50%),
  rgba(90, 159, 212, 0.12) 0%,
  transparent 60%
);
```

- [ ] **Step 7: Update body background gradient (line 208)**

```css
/* Line 208 */
          radial-gradient(ellipse at 20% 100%, rgba(43,87,154,0.03) 0%, transparent 40%);
```

- [ ] **Step 8: Commit**

```bash
git add website/index.html
git commit -m "feat(website): update brand colors to logo #2b579a palette"
```

### Task 3: Update website/privacy-policy.html

**Files:**

- Modify: `website/privacy-policy.html`

**Interfaces:**

- Consumes: Same color changes as Task 2
- Produces: Privacy policy page in sync with main site

- [ ] **Step 1: Apply same CSS variable changes as Task 2**

Repeat Steps 1-7 from Task 2 on `website/privacy-policy.html`. The `<style>` block structure is identical.

- [ ] **Step 2: Commit**

```bash
git add website/privacy-policy.html
git commit -m "feat(website): sync privacy policy brand colors"
```

### Task 4: Verify build

**Files:**

- Test: no file changes

- [ ] **Step 1: Run type check and build**

```bash
pnpm check
pnpm build
```

Expected: both pass with zero errors.

- [ ] **Step 2: Verify no `#0078d4` or `#106ebe` or `#005a9e` remains in source**

```bash
# Should only find these in git history or node_modules, not in src/ or website/
grep -rn '#0078d4\|#106ebe\|#005a9e' src/ website/ --include="*.css" --include="*.html" --include="*.ts" --include="*.tsx"
```

Expected: zero matches (all old brand blue values replaced).

- [ ] **Step 3: Final commit if any build fixes needed**

```bash
git add -A
git commit -m "chore: fix build after brand color migration"
```
