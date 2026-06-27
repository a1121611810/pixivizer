# Pictelio Logo 重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按设计文档 `docs/superpowers/specs/2026-06-27-pictelio-logo-redesign-design.md` 替换 Pictelio 的 logo SVG 资产，并运行 `pnpm generate:icons` 重新生成所有 PNG/mipmap。

**Architecture：** 仅替换两个源 SVG（主 logo + Android adaptive foreground）与 `public/favicon.svg`，其余所有位图通过现有脚本 `scripts/generate-icons.mjs` 自动渲染，不修改构建逻辑。

**Tech Stack：** SVG、Node.js、`@resvg/resvg-js`（已存在）、pnpm

---

## File Structure

| 文件                                                 | 操作       | 说明                                           |
| ---------------------------------------------------- | ---------- | ---------------------------------------------- |
| `assets/logo/pictelio-logo.svg`                      | 重写       | 192×192 主 logo，含背景、中层卡片、霓虹 P 字母 |
| `assets/logo/ic_launcher_foreground.svg`             | 重写       | 108×108 Android adaptive icon 前景，仅 P 字母  |
| `public/favicon.svg`                                 | 重写       | 浏览器矢量 favicon，内容与主 logo 一致         |
| `website/logo-mockups.html`                          | 可选删除   | 设计过程稿，实现完成后可清理                   |
| `public/favicon-16x16.png`                           | 由脚本生成 | 验证存在且为新内容                             |
| `public/favicon-32x32.png`                           | 由脚本生成 | 验证存在且为新内容                             |
| `public/logo-192x192.png`                            | 由脚本生成 | 验证存在且为新内容                             |
| `public/logo-512x512.png`                            | 由脚本生成 | 验证存在且为新内容                             |
| `android/app/src/main/res/mipmap-*/ic_launcher*.png` | 由脚本生成 | 验证存在且为新内容                             |

---

## Task 1: 重写主 logo SVG

**Files:**

- Modify: `assets/logo/pictelio-logo.svg`

- [ ] **Step 1: 写入新的主 logo SVG**

```svg
<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f1f2e"/>
      <stop offset="100%" stop-color="#0f0f1a"/>
    </linearGradient>
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00d4aa"/>
      <stop offset="100%" stop-color="#00a8e8"/>
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.4"/>
    </filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect x="12" y="12" width="168" height="168" rx="44" fill="url(#bg)"/>
  <rect x="44" y="44" width="104" height="104" rx="28" fill="#2a2a3e" filter="url(#shadow)"/>
  <path d="M76 60 h28 a20 20 0 0 1 0 40 h-28 v40 h-16 v-80 z" fill="none" stroke="url(#neon)" stroke-width="10" stroke-linejoin="round" filter="url(#glow)"/>
</svg>
```

- [ ] **Step 2: 验证 SVG 文件已更新**

Run:

```bash
cat assets/logo/pictelio-logo.svg | head -5
```

Expected: 文件内容以 `<svg viewBox="0 0 192 192"` 开头，且包含 `#1f1f2e` 与 `#00d4aa`

- [ ] **Step 3: Commit**

```bash
git add assets/logo/pictelio-logo.svg
git commit -m "design(logo): rewrite main logo as Fluent layered neon P"
```

---

## Task 2: 重写 Android adaptive icon 前景 SVG

**Files:**

- Modify: `assets/logo/ic_launcher_foreground.svg`

- [ ] **Step 1: 写入新的 foreground SVG**

```svg
<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00d4aa"/>
      <stop offset="100%" stop-color="#00a8e8"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <path d="M40.5 31.5 h21 a15.75 15.75 0 0 1 0 31.5 h-21 v25.5 h-12 v-57 z" fill="none" stroke="url(#neon)" stroke-width="7" stroke-linejoin="round" filter="url(#glow)"/>
</svg>
```

- [ ] **Step 2: 验证 foreground SVG 已更新**

Run:

```bash
cat assets/logo/ic_launcher_foreground.svg | head -3
```

Expected: 文件内容以 `<svg viewBox="0 0 108 108"` 开头

- [ ] **Step 3: Commit**

```bash
git add assets/logo/ic_launcher_foreground.svg
git commit -m "design(logo): rewrite android adaptive icon foreground"
```

---

## Task 3: 重写浏览器 favicon SVG

**Files:**

- Modify: `public/favicon.svg`

- [ ] **Step 1: 写入新的 favicon SVG**

```svg
<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f1f2e"/>
      <stop offset="100%" stop-color="#0f0f1a"/>
    </linearGradient>
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00d4aa"/>
      <stop offset="100%" stop-color="#00a8e8"/>
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.4"/>
    </filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect x="12" y="12" width="168" height="168" rx="44" fill="url(#bg)"/>
  <rect x="44" y="44" width="104" height="104" rx="28" fill="#2a2a3e" filter="url(#shadow)"/>
  <path d="M76 60 h28 a20 20 0 0 1 0 40 h-28 v40 h-16 v-80 z" fill="none" stroke="url(#neon)" stroke-width="10" stroke-linejoin="round" filter="url(#glow)"/>
</svg>
```

- [ ] **Step 2: 验证 favicon SVG 已更新**

Run:

```bash
cat public/favicon.svg | head -3
```

Expected: 文件内容以 `<svg viewBox="0 0 192 192"` 开头

- [ ] **Step 3: Commit**

```bash
git add public/favicon.svg
git commit -m "design(logo): update vector favicon to new Fluent design"
```

---

## Task 4: 运行图标生成脚本

**Files:**

- 由脚本生成：
  - `public/favicon-16x16.png`
  - `public/favicon-32x32.png`
  - `public/logo-192x192.png`
  - `public/logo-512x512.png`
  - `android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
  - `android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png`
  - `android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png`
  - ...（hdpi / xhdpi / xxhdpi / xxxhdpi 对应文件）

- [ ] **Step 1: 运行生成脚本**

Run:

```bash
pnpm generate:icons
```

Expected: 终端输出 `generated: ...` 共 17 条记录，无报错

- [ ] **Step 2: 验证关键 PNG 已生成且非零字节**

Run:

```bash
ls -lh public/logo-192x192.png public/logo-512x512.png public/favicon-32x32.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
```

Expected: 所有列出的文件存在且大小 > 0

- [ ] **Step 3: Commit 生成结果**

```bash
git add public/ android/app/src/main/res/mipmap-*/
git commit -m "chore(assets): regenerate icons and launcher mipmaps"
```

---

## Task 5: 验证生成结果符合设计

**Files:**

- Read only：所有生成的 PNG

- [ ] **Step 1: 使用 file 命令确认格式正确**

Run:

```bash
file public/logo-192x192.png public/favicon-16x16.png android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png
```

Expected: 输出显示 `PNG image data` 且尺寸与预期一致

- [ ] **Step 2: 使用 identify（如可用）或 sips 检查尺寸**

Run:

```bash
sips -g pixelWidth -g pixelHeight public/logo-192x192.png public/logo-512x512.png public/favicon-16x16.png public/favicon-32x32.png
```

Expected:

- `logo-192x192.png`: 192×192
- `logo-512x512.png`: 512×512
- `favicon-16x16.png`: 16×16
- `favicon-32x32.png`: 32×32

- [ ] **Step 3: 快速视觉检查**

在浏览器打开 `http://localhost:8080/website/logo-mockups.html`（如本地服务仍在运行）或直接用系统图片预览查看 `public/logo-192x192.png`，确认：

- 暗色 squircle 背景
- 中层卡片与阴影
- 霓虹青到蓝的 P 字母

- [ ] **Step 4: Commit（如有调整）**

若无调整，本任务无需新 commit。

---

## Task 6: 清理设计过程稿（可选）

**Files:**

- Delete: `website/logo-mockups.html`

- [ ] **Step 1: 删除临时 mockup 页面**

Run:

```bash
rm website/logo-mockups.html
```

- [ ] **Step 2: 验证已删除**

Run:

```bash
test ! -f website/logo-mockups.html && echo "removed"
```

Expected: 输出 `removed`

- [ ] **Step 3: Commit**

```bash
git rm website/logo-mockups.html
git commit -m "chore(website): remove temporary logo mockup page"
```

---

## Self-Review Checklist

- [ ] 设计文档中的主 logo SVG 已完整映射到 Task 1
- [ ] 设计文档中的 Android foreground SVG 已完整映射到 Task 2
- [ ] favicon SVG 已明确为 Task 3
- [ ] `pnpm generate:icons` 的调用与输出清单已覆盖 Task 4
- [ ] 验收标准中的尺寸检查、视觉检查已覆盖 Task 5
- [ ] 计划内无 "TBD" / "TODO" / "后续再填" 等占位
- [ ] 所有文件路径均为项目内的精确相对路径
