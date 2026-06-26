# Pixivizer Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 根据设计规范 `docs/superpowers/specs/2026-06-26-pixivizer-logo-design.md`，生成 Pixivizer 的完整图标资产并集成到 Web、Android 启动器、Splash 与 favicon。

**Architecture:** 使用 `@resvg/resvg-js` 将两个 SVG 源文件（完整图标 + Android 前景）批量渲染为各密度 PNG；通过脚本一次性生成 favicon、PWA、Android mipmap 资源，避免手工导出。Splash 中直接使用内联 SVG，favicon 使用 SVG + PNG 回退。

**Tech Stack:** Node.js (ESM), `@resvg/resvg-js`, pnpm, SolidJS, Capacitor, Android Gradle.

---

## File Structure

| 文件 | 职责 |
|------|------|
| `assets/logo/pixivizer-logo.svg` | 主 Logo 源文件（含深色背景），用于 favicon、PWA、Android 旧版图标、Splash。 |
| `assets/logo/ic_launcher_foreground.svg` | Android 自适应图标前景源文件（透明背景，108×108 viewBox）。 |
| `scripts/generate-icons.mjs` | 批量生成所有 PNG 资产的脚本。 |
| `public/favicon.svg` | Web favicon SVG。 |
| `public/favicon-16x16.png` | 小尺寸 favicon。 |
| `public/favicon-32x32.png` | 标准 favicon。 |
| `public/logo-192x192.png` | PWA / 大图标。 |
| `public/logo-512x512.png` | PWA 启动图标。 |
| `android/app/src/main/res/mipmap-*/ic_launcher.png` | Android 旧版启动器图标。 |
| `android/app/src/main/res/mipmap-*/ic_launcher_round.png` | Android 圆形启动器图标。 |
| `android/app/src/main/res/mipmap-*/ic_launcher_foreground.png` | Android 自适应图标前景。 |
| `android/app/src/main/res/values/ic_launcher_background.xml` | Android 自适应图标背景色。 |
| `src/App.tsx` | 启动页 Splash 中替换占位图标。 |
| `index.html` | 添加 favicon 链接。 |

---

## Task 1: Install dependency and create SVG sources

**Files:**
- Create: `assets/logo/pixivizer-logo.svg`
- Create: `assets/logo/ic_launcher_foreground.svg`
- Modify: `package.json`

- [ ] **Step 1: Add `@resvg/resvg-js` as devDependency**

```bash
pnpm add -D @resvg/resvg-js
```

Expected: `package.json` 的 `devDependencies` 中出现 `"@resvg/resvg-js": "^2.x.x"`。

- [ ] **Step 2: Write full logo SVG**

Create `assets/logo/pixivizer-logo.svg`:

```svg
<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0078d4"/>
      <stop offset="55%" stop-color="#2899f5"/>
      <stop offset="100%" stop-color="#60aaff"/>
    </linearGradient>
    <filter id="pShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="6" stdDeviation="8"
                    flood-color="#0078d4" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect x="12" y="12" width="168" height="168" rx="44" fill="#1f1f1f"/>
  <path d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
        fill="url(#pGrad)" filter="url(#pShadow)"/>
  <path d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
        fill="white" fill-opacity="0.12"/>
</svg>
```

- [ ] **Step 3: Write Android foreground SVG**

Create `assets/logo/ic_launcher_foreground.svg`（透明背景，108×108，P 形位于 66×66 安全区中央）：

```svg
<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pGradFg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0078d4"/>
      <stop offset="55%" stop-color="#2899f5"/>
      <stop offset="100%" stop-color="#60aaff"/>
    </linearGradient>
    <filter id="pShadowFg" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="3.375" stdDeviation="4.5"
                    flood-color="#0078d4" flood-opacity="0.35"/>
    </filter>
  </defs>
  <path d="M33.75 22.5 h24.75 a19.125 19.125 0 0 1 0 38.25 h-24.75 v27 h-11.25 v-65.25 z"
        fill="url(#pGradFg)" filter="url(#pShadowFg)"/>
  <path d="M33.75 22.5 h24.75 a19.125 19.125 0 0 1 0 38.25 h-24.75 v27 h-11.25 v-65.25 z"
        fill="white" fill-opacity="0.12"/>
</svg>
```

- [ ] **Step 4: Commit SVG sources and dependency**

```bash
git add package.json pnpm-lock.yaml assets/logo/
git commit -m "chore(assets): add Pixivizer logo SVG sources and resvg dependency"
```

---

## Task 2: Create PNG generation script

**Files:**
- Create: `scripts/generate-icons.mjs`

- [ ] **Step 1: Write `scripts/generate-icons.mjs`**

```javascript
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function render(svgPath, size, outPath) {
  const svg = readFileSync(svgPath, "utf8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "transparent",
  });
  const png = resvg.render().asPng();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  console.log(`generated: ${outPath}`);
}

const androidDensities = [
  { name: "mdpi", scale: 1 },
  { name: "hdpi", scale: 1.5 },
  { name: "xhdpi", scale: 2 },
  { name: "xxhdpi", scale: 3 },
  { name: "xxxhdpi", scale: 4 },
];

const logoSvg = join(root, "assets/logo/pixivizer-logo.svg");
const fgSvg = join(root, "assets/logo/ic_launcher_foreground.svg");

// Favicon + PWA
render(logoSvg, 16, join(root, "public/favicon-16x16.png"));
render(logoSvg, 32, join(root, "public/favicon-32x32.png"));
render(logoSvg, 192, join(root, "public/logo-192x192.png"));
render(logoSvg, 512, join(root, "public/logo-512x512.png"));

// Android legacy launcher icons (48dp base)
for (const d of androidDensities) {
  const size = Math.round(48 * d.scale);
  render(logoSvg, size, join(root, `android/app/src/main/res/mipmap-${d.name}/ic_launcher.png`));
  render(logoSvg, size, join(root, `android/app/src/main/res/mipmap-${d.name}/ic_launcher_round.png`));
}

// Android adaptive icon foreground (108dp base)
for (const d of androidDensities) {
  const size = Math.round(108 * d.scale);
  render(fgSvg, size, join(root, `android/app/src/main/res/mipmap-${d.name}/ic_launcher_foreground.png`));
}
```

- [ ] **Step 2: Make script executable via package.json script (optional but convenient）**

Modify `package.json` 的 `scripts` 部分，添加：

```json
"generate:icons": "node scripts/generate-icons.mjs"
```

- [ ] **Step 3: Commit script**

```bash
git add scripts/generate-icons.mjs package.json pnpm-lock.yaml
git commit -m "build(scripts): add icon generation script"
```

---

## Task 3: Generate favicon and PWA assets

**Files:**
- Create: `public/favicon.svg`
- Create: `public/favicon-16x16.png`
- Create: `public/favicon-32x32.png`
- Create: `public/logo-192x192.png`
- Create: `public/logo-512x512.png`

- [ ] **Step 1: Copy SVG to public**

```bash
cp assets/logo/pixivizer-logo.svg public/favicon.svg
```

- [ ] **Step 2: Run generation script**

```bash
pnpm generate:icons
```

Expected 输出生成 14 个 PNG 文件和 1 个 SVG 的日志。

- [ ] **Step 3: Verify favicon dimensions**

```bash
file public/favicon-16x16.png public/favicon-32x32.png public/logo-192x192.png public/logo-512x512.png
```

Expected: 各文件分别为 16×16、32×32、192×192、512×512 PNG。

- [ ] **Step 4: Commit favicon assets**

```bash
git add public/favicon.svg public/favicon-16x16.png public/favicon-32x32.png public/logo-192x192.png public/logo-512x512.png
git commit -m "feat(assets): generate favicon and PWA logo PNGs"
```

---

## Task 4: Generate Android icons

**Files:**
- Modify: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- Modify: `android/app/src/main/res/mipmap-*/ic_launcher_round.png`
- Modify: `android/app/src/main/res/mipmap-*/ic_launcher_foreground.png`

- [ ] **Step 1: Run generation脚本（已包含 Android 资源）**

如果 Task 3 已执行，则 Android 资源已经生成。否则执行：

```bash
pnpm generate:icons
```

- [ ] **Step 2: 验证 Android 图标尺寸**

```bash
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  echo "mipmap-$d"
  file android/app/src/main/res/mipmap-$d/ic_launcher.png
  file android/app/src/main/res/mipmap-$d/ic_launcher_foreground.png
done
```

Expected sizes:
- `ic_launcher.png` / `ic_launcher_round.png`: 48, 72, 96, 144, 192 px
- `ic_launcher_foreground.png`: 108, 162, 216, 324, 432 px

- [ ] **Step 3: Commit Android icons**

```bash
git add android/app/src/main/res/mipmap-*/
git commit -m "feat(android): regenerate launcher icons with new Pixivizer logo"
```

---

## Task 5: Update Android adaptive icon background color

**Files:**
- Modify: `android/app/src/main/res/values/ic_launcher_background.xml`

- [ ] **Step 1: Replace background color**

文件内容更新为：

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#1f1f1f</color>
</resources>
```

- [ ] **Step 2: Commit**

```bash
git add android/app/src/main/res/values/ic_launcher_background.xml
git commit -m "style(android): update launcher background to dark theme"
```

---

## Task 6: Replace splash icon in `src/App.tsx`

**Files:**
- Modify: `src/App.tsx:148-152`（当前占位 Fluent 图片图标 path）

- [ ] **Step 1: 更新 SVG viewBox**

将 Splash 中图标的 `viewBox` 从 `0 0 24 24` 改为 `0 0 192 192`，保持 `width="64" height="64"` 不变：

```tsx
            <svg
              width="64"
              height="64"
              viewBox="0 0 192 192"
              fill="none"
              aria-hidden="true"
              style="animation: fluent-scale-enter var(--durationNormal) var(--curveDecelerateMid) both"
            >
```

- [ ] **Step 2: 替换 SVG path**

将：

```tsx
              <path
                d="M17.75 3A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3zm-1.72 7.78a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5zM5 15.25V17.5l.005.16A1.75 1.75 0 0 0 6.75 19.25h10.5a1.75 1.75 0 0 0 1.745-1.607L19 17.5v-2.25a.75.75 0 0 0-.648-.743L18.25 14.5H5.75a.75.75 0 0 0-.743.648z"
                fill="var(--colorBrandForeground1)"
              />
```

替换为：

```tsx
              <defs>
                <linearGradient id="splashPGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#0078d4" />
                  <stop offset="55%" stop-color="#2899f5" />
                  <stop offset="100%" stop-color="#60aaff" />
                </linearGradient>
                <filter id="splashPShadow" x="-25%" y="-25%" width="150%" height="150%">
                  <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0078d4" flood-opacity="0.35" />
                </filter>
              </defs>
              <rect x="12" y="12" width="168" height="168" rx="44" fill="#1f1f1f" />
              <path
                d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
                fill="url(#splashPGrad)"
                filter="url(#splashPShadow)"
              />
              <path
                d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
                fill="white"
                fill-opacity="0.12"
              />
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): replace splash placeholder with new Pixivizer logo"
```

---

## Task 7: Add favicon links to `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Insert favicon links**

在 `<title>Pixivizer</title>` 后添加：

```html
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="192x192" href="/logo-192x192.png" />
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(html): add favicon and apple-touch-icon links"
```

---

## Task 8: Verify build and sync

- [ ] **Step 1: Type check and Web build**

```bash
pnpm build
```

Expected: `dist/` 生成成功，无 TypeScript 错误。

- [ ] **Step 2: Sync to Android**

```bash
pnpm cap:sync
```

Expected: Capacitor 同步完成，`android/app/src/main/assets/public/` 出现新的 Web 产物。

- [ ] **Step 3: Android 编译验证（可选但推荐）**

```bash
cd android && ./gradlew assembleDebug
```

Expected: BUILD SUCCESSFUL。

- [ ] **Step 4: 视觉抽检**

在文件管理器或图片查看器中打开以下文件确认没有拉伸、锯齿或截断：
- `public/favicon-32x32.png`
- `public/logo-192x192.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png`

---

## Task 9: Final summary commit（如有多处零散改动）

- [ ] **Step 1: 检查未提交改动**

```bash
git status
```

- [ ] **Step 2: 如有剩余改动，统一提交**

```bash
git add -A
git commit -m "chore: finalize Pixivizer logo integration"
```

---

## Self-Review Checklist

- [ ] Spec coverage：设计文档中的每一条参数（颜色、路径、尺寸、阴影、渐变）均能在本计划中找到对应实现步骤。
- [ ] Placeholder scan：无 TBD / TODO / "稍后处理" / "适当处理"。
- [ ] 路径一致性：`scripts/generate-icons.mjs` 中引用的 SVG 路径与 `assets/logo/` 下文件名一致；Android mipmap 路径与现有工程结构一致。
- [ ] 依赖声明：`@resvg/resvg-js` 已作为 devDependency 安装，并在脚本中导入。
- [ ] 提交粒度：每个任务都有独立的 commit 命令，便于 review 和回滚。
