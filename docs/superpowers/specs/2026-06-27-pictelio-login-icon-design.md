# Pictelio 登录页图标设计方案

## 背景与目标

当前登录页（`src/routes/Login.tsx`）标题 "Pictelio" 上方使用 emoji `🎨` 作为占位图标，与应用整体品牌不统一。用户希望：

- 不再复用 APP 的暗色霓虹 logo
- 设计一个原创、不「AI 感」、符合 Microsoft Fluent Design 风格的登录页图标
- 与登录页浅色背景和谐适配

## 设计方向：方案 2-1 —— 白色徽章 + 手绘画笔 P

### 视觉概念

用一个白色 Fluent 圆角徽章作为容器，内部放置手绘感的画笔 P 字形图标。整体像一枚应用图标置于登录表单上方，既保留品牌首字母识别，又通过「画笔」意象表达插画/创作属性，同时避免通用图标库的「AI 感」。

### 设计原则

- 使用 Fluent 的 squircle 圆角语言
- 使用 Fluent elevation shadow（`--elevation4` 级别）
- 使用项目已有的品牌蓝色系，但降低饱和度，更稳重
- 手绘 P 字形有轻微不对称，增加原创感和人格化
- 图标在浅色登录背景上有明确边界，但不突兀

## 精确规格

### 新增 SVG 资产

**文件**：`assets/logo/pictelio-login-icon.svg`

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

**规格说明**：

| 元素     | 值                       | 说明                       |
| -------- | ------------------------ | -------------------------- |
| 画布     | 64×64                    | 登录页图标内部绘制尺寸     |
| P 字形   | `#2b579a`                | 墨蓝色，稳重且与品牌蓝同系 |
| 高光描边 | `#5a9fd4`                | 模拟画笔笔触高光           |
| 墨点     | `#7ab8e8`                | 增加手绘细节               |
| 描边端点 | `stroke-linecap="round"` | Fluent 圆角语言            |

### Login.tsx 改动

**位置**：`src/routes/Login.tsx`

将原有 emoji 容器：

```tsx
<div style={S.emoji}>🎨</div>
```

替换为徽章容器 + SVG：

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

新增样式（替换原 `S.emoji`）：

```tsx
iconBadge:
  "width:80px;height:80px;border-radius:24px;background-color:#ffffff;display:flex;align-items:center;justify-content:center;margin:0 auto var(--spacingVerticalM);box-shadow:var(--elevation4)",
iconSvg: "width:52px;height:52px;display:block",
```

### 样式说明

| 元素       | 值                                       | 说明                                                                   |
| ---------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| 徽章尺寸   | `80×80px`                                | 在表单上方有存在感但不压过标题                                         |
| 徽章圆角   | `24px`                                   | Fluent squircle 比例                                                   |
| 徽章背景   | `#ffffff`                                | 与浅色登录背景形成轻微对比                                             |
| 徽章投影   | `var(--elevation4)`                      | Fluent 标准投影 `0 0 2px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.14)` |
| SVG 尺寸   | `52×52px`                                | 在徽章内居中，四周留呼吸空间                                           |
| 与标题间距 | `margin-bottom: var(--spacingVerticalM)` | 12px，来自 Fluent tokens                                               |

## 改动文件

1. `assets/logo/pictelio-login-icon.svg` — 新增登录页图标 SVG 源文件
2. `src/routes/Login.tsx` — 替换 emoji 为徽章容器 + 内联 SVG，更新样式对象

## 不在本方案内的范围

- 不修改登录页背景色、表单输入框、按钮样式
- 不修改登录逻辑
- 不新增 tokens.css 变量（颜色在 SVG 中直接写死，仅用于此静态图标）
- 不改 APP logo（已完成在另一方案中）

## 验收标准

- [ ] `assets/logo/pictelio-login-icon.svg` 已创建且内容正确
- [ ] `src/routes/Login.tsx` 中 emoji 已替换为白色徽章 + 画笔 P SVG
- [ ] 徽章尺寸、圆角、投影符合 Fluent 规范
- [ ] 登录页在浏览器中显示正常，图标与标题、表单层级清晰
- [ ] 图标在 16×16 到 80×80 尺寸下保持清晰（虽然登录页只使用 80×80）

## 备注

- 颜色 `#2b579a`、`#5a9fd4`、`#7ab8e8` 仅用于此登录页图标，不进入 UI tokens。
- 若后续需要在其他页面复用该图标，再评估是否提炼为组件或 token。
