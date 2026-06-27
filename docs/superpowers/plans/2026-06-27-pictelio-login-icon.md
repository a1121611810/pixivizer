# Pictelio 登录页图标 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按设计文档 `docs/superpowers/specs/2026-06-27-pictelio-login-icon-design.md` 替换登录页 emoji 图标为白色徽章 + 手绘画笔 P SVG。

**Architecture：** 新增一个静态 SVG 文件作为图标源，修改 `src/routes/Login.tsx` 用内联 SVG 替换 emoji，并新增两个样式类控制徽章容器和图标尺寸。

**Tech Stack：** SVG、SolidJS、TSX、UnoCSS 内联样式字符串

---

## File Structure

| 文件                                  | 操作 | 说明                                                           |
| ------------------------------------- | ---- | -------------------------------------------------------------- |
| `assets/logo/pictelio-login-icon.svg` | 创建 | 64×64 手绘画笔 P SVG 源文件                                    |
| `src/routes/Login.tsx`                | 修改 | 替换 emoji 为徽章容器 + SVG，新增 `iconBadge` / `iconSvg` 样式 |

---

## Task 1: 创建登录页图标 SVG

**Files:**

- Create: `assets/logo/pictelio-login-icon.svg`

- [ ] **Step 1: 写入 SVG 内容**

```svg
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
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
```

- [ ] **Step 2: 验证文件内容**

Run:

```bash
cat assets/logo/pictelio-login-icon.svg | head -3
```

Expected: 文件以 `<svg viewBox="0 0 64 64"` 开头，包含 `#2b579a`

---

## Task 2: 修改 Login.tsx

**Files:**

- Modify: `src/routes/Login.tsx`

- [ ] **Step 1: 替换 `S.emoji` 样式为 `S.iconBadge` 和 `S.iconSvg`**

将：

```tsx
emoji: "font-size:var(--fontSizeHero900);margin-bottom:var(--spacingVerticalS)",
```

替换为：

```tsx
iconBadge:
  "width:80px;height:80px;border-radius:24px;background-color:#ffffff;display:flex;align-items:center;justify-content:center;margin:0 auto var(--spacingVerticalM);box-shadow:var(--elevation4)",
iconSvg: "width:52px;height:52px;display:block",
```

- [ ] **Step 2: 替换 emoji div 为徽章容器 + SVG**

将：

```tsx
<div style={S.emoji}>🎨</div>
```

替换为：

```tsx
<div style={S.iconBadge}>
  <svg style={S.iconSvg} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
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
</div>
```

- [ ] **Step 3: 运行类型检查**

Run:

```bash
pnpm check
```

Expected: 无 TypeScript 错误

- [ ] **Step 4: 启动开发服务器验证视觉效果**

Run:

```bash
pnpm dev
```

打开 `http://localhost:5173/login`（或实际 dev server 地址），确认：

- 白色徽章显示正常
- 画笔 P SVG 居中
- 标题、副标题、表单层级清晰
- 徽章投影自然

---

## Self-Review Checklist

- [ ] 设计文档中的 SVG 内容已完整映射到 Task 1
- [ ] Login.tsx 改动已完整映射到 Task 2
- [ ] 计划内无 "TBD" / "TODO" 等占位
- [ ] 所有文件路径均为项目内的精确相对路径
