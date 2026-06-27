# Pictelio 统一 Brush-P Logo 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将项目所有 dark-neon P Logo 替换为登录页同款白色 Fluent 徽章 + 手绘画笔 P。

**Architecture:** 先替换 SVG 源文件，再运行图标生成脚本产出全部 PNG，最后逐文件替换应用内内联 SVG 和官网 HTML 中的旧 Logo。

**Tech Stack:** SVG、Node.js (`@resvg/resvg-js`)、SolidJS/TSX、HTML/CSS

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `assets/logo/pictelio-logo.svg` | 替换 | 主 Logo：白色徽章 + 画笔 P |
| `assets/logo/ic_launcher_foreground.svg` | 替换 | Android 自适应前景：白色徽章 + 画笔 P，透明底 |
| `android/app/src/main/res/values/ic_launcher_background.xml` | 修改 | 背景色 `#1f1f2e` → `#f5f5f5` |
| `public/*.png` | 重新生成 | favicon-16/32、logo-192/512 |
| `android/app/src/main/res/mipmap-*/*.png` | 重新生成 | 全部 Android 图标 |
| `src/App.tsx` | 修改 | Splash 内联 SVG 替换 |
| `src/components/SettingsSheet.tsx` | 修改 | 关于条目内联 SVG 替换 |
| `website/index.html` | 修改 | Header + Hero 内联 SVG 替换 |
| `website/privacy-policy.html` | 修改 | Header 内联 SVG 替换 |
| `public/privacy-policy.html` | 修改 | 同步副本 |
| `scripts/generate-screenshots.mjs` | 修改 | 品牌背景色更新 |

---

### Task 1: 替换主 Logo SVG 源文件

**Files:**
- Modify: `assets/logo/pictelio-logo.svg`（完全替换）

- [ ] **Step 1: 写入新的 pictelio-logo.svg**

```svg
<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.10"/>
    </filter>
  </defs>
  <rect x="12" y="12" width="168" height="168" rx="44" fill="#ffffff" filter="url(#badgeShadow)"/>
  <svg x="36" y="36" width="120" height="120" viewBox="0 0 64 64">
    <path
      d="M18 12 C18 12 16 28 19 52 C19 52 22 54 24 50 C26 47 24 39 26 33 C26 33 37 35 45 27 C51 21 47 13 38 11 C31 9 24 12 18 12 Z"
      fill="#2b579a"
    />
    <path
      d="M22 16 C22 16 21 28 23 46"
      fill="none"
      stroke="#5a9fd4"
      stroke-width="3"
      stroke-linecap="round"
    />
    <circle cx="42" cy="19" r="2" fill="#7ab8e8" />
    <circle cx="46" cy="25" r="1.5" fill="#7ab8e8" />
  </svg>
</svg>
```

- [ ] **Step 2: 提交**

```bash
git add assets/logo/pictelio-logo.svg
git commit -m "feat: replace main logo with unified white badge + brush P"
```

---

### Task 2: 替换 Android 自适应图标前景 SVG

**Files:**
- Modify: `assets/logo/ic_launcher_foreground.svg`（完全替换）

- [ ] **Step 1: 写入新的 ic_launcher_foreground.svg**

```svg
<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="4" width="100" height="100" rx="26" fill="#ffffff"/>
  <svg x="18" y="18" width="72" height="72" viewBox="0 0 64 64">
    <path
      d="M18 12 C18 12 16 28 19 52 C19 52 22 54 24 50 C26 47 24 39 26 33 C26 33 37 35 45 27 C51 21 47 13 38 11 C31 9 24 12 18 12 Z"
      fill="#2b579a"
    />
    <path
      d="M22 16 C22 16 21 28 23 46"
      fill="none"
      stroke="#5a9fd4"
      stroke-width="3"
      stroke-linecap="round"
    />
    <circle cx="42" cy="19" r="2" fill="#7ab8e8" />
    <circle cx="46" cy="25" r="1.5" fill="#7ab8e8" />
  </svg>
</svg>
```

- [ ] **Step 2: 提交**

```bash
git add assets/logo/ic_launcher_foreground.svg
git commit -m "feat: replace Android adaptive foreground with unified brush P"
```

---

### Task 3: 更新 Android 自适应图标背景色

**Files:**
- Modify: `android/app/src/main/res/values/ic_launcher_background.xml`

- [ ] **Step 1: 修改背景色**

将 `<color name="ic_launcher_background">#1f1f2e</color>` 改为 `<color name="ic_launcher_background">#f5f5f5</color>`。

- [ ] **Step 2: 提交**

```bash
git add android/app/src/main/res/values/ic_launcher_background.xml
git commit -m "feat: change Android adaptive icon background to light gray #f5f5f5"
```

---

### Task 4: 重新生成全部图标 PNG

**Files:**
- 重新生成: `public/favicon-16x16.png`、`public/favicon-32x32.png`、`public/logo-192x192.png`、`public/logo-512x512.png`
- 重新生成: `android/app/src/main/res/mipmap-*/ic_launcher*.png`

- [ ] **Step 1: 运行图标生成脚本**

```bash
pnpm generate:icons
```

输出应显示每个文件的生成日志，以 `generated:` 前缀开始。

- [ ] **Step 2: 提交**

```bash
git add public/favicon-*.png public/logo-*.png
git add android/app/src/main/res/mipmap-*/ic_launcher*.png
git commit -m "chore: regenerate all icon PNGs from unified brush P SVGs"
```

---

### Task 5: 替换 App.tsx Splash 启动屏内联 SVG

**Files:**
- Modify: `src/App.tsx` — Splash fallback 中的 dark-neon 内联 SVG（第 151–205 行）

- [ ] **Step 1: 替换整个 Splash 图标 SVG 块**

将现有的 dark-neon logo SVG 块（从 `<svg width="64" height="64" viewBox="0 0 192 192" ...>` 到对应的 `</svg>`）替换为：

```tsx
<svg
  width="64"
  height="64"
  viewBox="0 0 192 192"
  fill="none"
  aria-hidden="true"
  style="animation: fluent-scale-enter var(--durationNormal) var(--curveDecelerateMid) both"
>
  <defs>
    <filter id="splashShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow
        dx="0"
        dy="6"
        stdDeviation="10"
        flood-color="#000000"
        flood-opacity="0.10"
      />
    </filter>
  </defs>
  <rect
    x="12"
    y="12"
    width="168"
    height="168"
    rx="44"
    fill="#ffffff"
    filter="url(#splashShadow)"
  />
  <svg x="36" y="36" width="120" height="120" viewBox="0 0 64 64">
    <path
      d="M18 12 C18 12 16 28 19 52 C19 52 22 54 24 50 C26 47 24 39 26 33 C26 33 37 35 45 27 C51 21 47 13 38 11 C31 9 24 12 18 12 Z"
      fill="#2b579a"
    />
    <path
      d="M22 16 C22 16 21 28 23 46"
      fill="none"
      stroke="#5a9fd4"
      stroke-width="3"
      stroke-linecap="round"
    />
    <circle cx="42" cy="19" r="2" fill="#7ab8e8" />
    <circle cx="46" cy="25" r="1.5" fill="#7ab8e8" />
  </svg>
</svg>
```

- [ ] **Step 2: 提交**

```bash
git add src/App.tsx
git commit -m "feat: replace Splash logo with unified white badge + brush P"
```

---

### Task 6: 替换 SettingsSheet.tsx 关于条目内联 SVG

**Files:**
- Modify: `src/components/SettingsSheet.tsx` — 第 1107–1158 行的 dark-neon 内联 SVG

- [ ] **Step 1: 替换内联 SVG 块**

将现有的 dark-neon logo SVG（32×32 尺寸）替换为：

```tsx
<svg
  width="32"
  height="32"
  viewBox="0 0 192 192"
  fill="none"
  aria-hidden="true"
  class="flex-shrink-0"
>
  <defs>
    <filter id="settingsShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow
        dx="0"
        dy="4"
        stdDeviation="6"
        flood-color="#000000"
        flood-opacity="0.08"
      />
    </filter>
  </defs>
  <rect
    x="12"
    y="12"
    width="168"
    height="168"
    rx="44"
    fill="#ffffff"
    filter="url(#settingsShadow)"
  />
  <svg x="36" y="36" width="120" height="120" viewBox="0 0 64 64">
    <path
      d="M18 12 C18 12 16 28 19 52 C19 52 22 54 24 50 C26 47 24 39 26 33 C26 33 37 35 45 27 C51 21 47 13 38 11 C31 9 24 12 18 12 Z"
      fill="#2b579a"
    />
    <path
      d="M22 16 C22 16 21 28 23 46"
      fill="none"
      stroke="#5a9fd4"
      stroke-width="3"
      stroke-linecap="round"
    />
    <circle cx="42" cy="19" r="2" fill="#7ab8e8" />
    <circle cx="46" cy="25" r="1.5" fill="#7ab8e8" />
  </svg>
</svg>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/SettingsSheet.tsx
git commit -m "feat: replace About icon in settings with unified brush P logo"
```

---

### Task 7: 替换 website/index.html 中的两处内联 SVG

**Files:**
- Modify: `website/index.html` — Header brand logo（第 745–787 行）和 Hero logo（第 805–847 行）

- [ ] **Step 1: 替换 Header brand logo SVG**

将 header 内 `.brand-logo` 的 SVG（36×36）替换为：

```svg
<svg class="brand-logo" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <filter id="brandLogoShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.08"/>
    </filter>
  </defs>
  <rect x="12" y="12" width="168" height="168" rx="44" fill="#ffffff" filter="url(#brandLogoShadow)"/>
  <svg x="36" y="36" width="120" height="120" viewBox="0 0 64 64">
    <path d="M18 12 C18 12 16 28 19 52 C19 52 22 54 24 50 C26 47 24 39 26 33 C26 33 37 35 45 27 C51 21 47 13 38 11 C31 9 24 12 18 12 Z" fill="#2b579a"/>
    <path d="M22 16 C22 16 21 28 23 46" fill="none" stroke="#5a9fd4" stroke-width="3" stroke-linecap="round"/>
    <circle cx="42" cy="19" r="2" fill="#7ab8e8"/>
    <circle cx="46" cy="25" r="1.5" fill="#7ab8e8"/>
  </svg>
</svg>
```

- [ ] **Step 2: 替换 Hero logo SVG**

将 hero 内 `.hero-logo` 的 SVG（96×96）替换为：

```svg
<svg class="hero-logo" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <filter id="heroLogoShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.10"/>
    </filter>
  </defs>
  <rect x="12" y="12" width="168" height="168" rx="44" fill="#ffffff" filter="url(#heroLogoShadow)"/>
  <svg x="36" y="36" width="120" height="120" viewBox="0 0 64 64">
    <path d="M18 12 C18 12 16 28 19 52 C19 52 22 54 24 50 C26 47 24 39 26 33 C26 33 37 35 45 27 C51 21 47 13 38 11 C31 9 24 12 18 12 Z" fill="#2b579a"/>
    <path d="M22 16 C22 16 21 28 23 46" fill="none" stroke="#5a9fd4" stroke-width="3" stroke-linecap="round"/>
    <circle cx="42" cy="19" r="2" fill="#7ab8e8"/>
    <circle cx="46" cy="25" r="1.5" fill="#7ab8e8"/>
  </svg>
</svg>
```

- [ ] **Step 3: 提交**

```bash
git add website/index.html
git commit -m "feat: replace website header and hero logos with unified brush P"
```

---

### Task 8: 替换 website/privacy-policy.html 内联 SVG

**Files:**
- Modify: `website/privacy-policy.html` — Header brand logo（第 311–353 行）

- [ ] **Step 1: 替换 Header brand logo SVG**

将 header 内 `.brand-logo` 的 SVG（32×32）替换为：

```svg
<svg class="brand-logo" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <filter id="ppLogoShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.08"/>
    </filter>
  </defs>
  <rect x="12" y="12" width="168" height="168" rx="44" fill="#ffffff" filter="url(#ppLogoShadow)"/>
  <svg x="36" y="36" width="120" height="120" viewBox="0 0 64 64">
    <path d="M18 12 C18 12 16 28 19 52 C19 52 22 54 24 50 C26 47 24 39 26 33 C26 33 37 35 45 27 C51 21 47 13 38 11 C31 9 24 12 18 12 Z" fill="#2b579a"/>
    <path d="M22 16 C22 16 21 28 23 46" fill="none" stroke="#5a9fd4" stroke-width="3" stroke-linecap="round"/>
    <circle cx="42" cy="19" r="2" fill="#7ab8e8"/>
    <circle cx="46" cy="25" r="1.5" fill="#7ab8e8"/>
  </svg>
</svg>
```

- [ ] **Step 2: 同步 public/privacy-policy.html**

```bash
cp website/privacy-policy.html public/privacy-policy.html
```

- [ ] **Step 3: 提交**

```bash
git add website/privacy-policy.html public/privacy-policy.html
git commit -m "feat: replace privacy policy header logo with unified brush P"
```

---

### Task 9: 更新截图生成脚本的品牌配色

**Files:**
- Modify: `scripts/generate-screenshots.mjs` — BRAND 对象与 background gradient

- [ ] **Step 1: 替换 BRAND 对象**

将第 20–34 行的 BRAND 对象替换为：

```js
const BRAND = {
  blue: "#2b579a",
  blueLight: "#5a9fd4",
  blueLighter: "#7ab8e8",
  white: "#ffffff",
  black: "#1a1a1a",
  lightBg: "#f5f5f5",
  gray100: "#f3f2f1",
  gray200: "#e1dfdd",
  gray300: "#c8c6c4",
  gray500: "#8a8886",
  gray700: "#616161",
  gray900: "#323130",
  danger: "#d13438",
};
```

- [ ] **Step 2: 替换 bgGrad 渐变定义**

将第 65–69 行的 bgGrad 渐变替换为浅色柔和渐变：

```svg
<linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#e8f4fd"/>
  <stop offset="55%" stop-color="#f0f0f0"/>
  <stop offset="100%" stop-color="#e8f4fd"/>
</linearGradient>
```

- [ ] **Step 3: 更新 feature graphic 中 titles/CTA 文字色**

由于 bgGrad 从暗色改为浅色，需要将 feature graphic 中的白色文字（`fill="${BRAND.white}"`）改为深色文字。将 `featureGraphic()` 函数中的三处 `fill="${BRAND.white}"` 分别改为：
  - Logo 下方 title "Pictelio": `fill="${BRAND.gray900}"`
  - 副标题: `fill="${BRAND.gray700}"`
  - 装饰横条: `fill="${BRAND.blue}" opacity="0.6"`

- [ ] **Step 4: 提交**

```bash
git add scripts/generate-screenshots.mjs
git commit -m "feat: update screenshot script brand colors for unified brush P theme"
```

---

### Task 10: 最终验证

- [ ] **Step 1: TypeScript 检查 + 格式化**

```bash
pnpm check
```

预期：所有检查通过，0 错误。

- [ ] **Step 2: 生产构建**

```bash
pnpm build
```

预期：`pnpm build` 成功，输出到 `dist/`。

- [ ] **Step 3: 确认构建产物**

```bash
ls -la public/favicon-16x16.png public/favicon-32x32.png public/logo-192x192.png public/logo-512x512.png
```

确认四个文件存在且时间戳为最新。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: final verification after full logo unification"
```
