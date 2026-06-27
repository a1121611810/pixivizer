# Fastlane Screenshots and Feature Graphic Implementation Plan

> **For agentic workers:** This is a small, focused task; inline execution is acceptable. Steps use checkbox syntax for tracking.

**Goal:** Generate F-Droid Fastlane feature graphic and four phone screenshots for Pictelio, copy them to both `en-US` and `zh-CN` locales, update the release checklist, verify, and commit.

**Architecture:** A single Node.js ES module (`scripts/generate-screenshots.mjs`) builds SVG strings and renders them to PNG using `@resvg/resvg-js`. It then mirrors the generated assets into the zh-CN Fastlane folder and removes `.gitkeep` placeholders.

**Tech Stack:** Node.js, `@resvg/resvg-js`, SVG, native `fs`/`path`.

---

### Task 1: Create `scripts/generate-screenshots.mjs`

**Files:**

- Create: `scripts/generate-screenshots.mjs`

- [ ] **Step 1: Write the script**

Generate the following files in `fastlane/metadata/android/en-US/images/`:

- `featureGraphic.png` — 1024×500, Pictelio logo, app name, tagline "第三方 Pixiv 客户端 · 为 Android 打造", Fluent teal/blue gradient.
- `phoneScreenshots/01_feed.png` — 1080×1920 feed mockup.
- `phoneScreenshots/02_detail.png` — 1080×1920 illustration detail mockup.
- `phoneScreenshots/03_settings.png` — 1080×1920 settings sheet mockup.
- `phoneScreenshots/04_login.png` — 1080×1920 login screen mockup.

Embed the logo from `assets/logo/pictelio-logo.svg`. Use Chinese text in screenshots since the app UI is Chinese. Ensure brand colors `#0d7377`, `#14a085`, `#0078d4` appear.

- [ ] **Step 2: Add a package.json script (optional)**

Consider adding `"generate:screenshots": "node scripts/generate-screenshots.mjs"` to `package.json`.

---

### Task 2: Generate and mirror assets

**Files:**

- Create: files under `fastlane/metadata/android/en-US/images/`
- Create: files under `fastlane/metadata/android/zh-CN/images/`
- Delete: `.gitkeep` placeholders in both image directories

- [ ] **Step 1: Run the script**

```bash
node scripts/generate-screenshots.mjs
```

- [ ] **Step 2: Verify files exist and dimensions are correct**

```bash
file fastlane/metadata/android/en-US/images/featureGraphic.png
file fastlane/metadata/android/en-US/images/phoneScreenshots/*.png
```

Expected: 1024×500 feature graphic; 1080×1920 screenshots.

---

### Task 3: Update `docs/release-checklist.md`

**Files:**

- Modify: `docs/release-checklist.md`

- [ ] **Step 1: Mark screenshot and feature graphic checklist items as done**

Change:

- `[ ] 向 fastlane/metadata/android/en-US/images/phoneScreenshots/ 添加真实截图` → `[x]`
- `[ ] 向 fastlane/metadata/android/en-US/images/featureGraphic.png 添加真实功能图` → `[x]`

---

### Task 4: Verify project health

**Files:**

- None (verification only)

- [ ] **Step 1: Type-check and build**

```bash
pnpm check
pnpm build
```

Expected: both commands exit 0.

- [ ] **Step 2: Verify PNG dimensions**

```bash
node -e "/* use sharp or identify if available, else rely on script logs */"
```

Prefer `file`/`sips`/`identify` to confirm pixel dimensions.

---

### Task 5: Commit

**Files:**

- All new/deleted/modified files above

- [ ] **Step 1: Stage and commit**

```bash
git add -A
git commit -m "assets(fastlane): add feature graphic and phone screenshots"
```

---

## Self-Review

1. **Spec coverage:** Every required asset and dimension is covered by Task 2; doc update covered by Task 3; verification by Task 4; commit by Task 5.
2. **Placeholder scan:** No TBD/TODO.
3. **Type consistency:** N/A — standalone script, no shared types.
