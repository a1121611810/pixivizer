# Pictelio 品牌色重构方案 — CSS Token 系统颜色迁移

## 状态

已确认设计（2026-06-28），准备实现。

## 背景

Pictelio 项目设计系统强制遵循 Microsoft Fluent Design System 2，品牌色使用标准的 Fluent Blue 色链：

- 亮色主色：`#0078d4`（标准 Microsoft 蓝）
- 暗色主色：`#106ebe` / `#479ef5`

用户反馈这套蓝色"AI 味道太重"，要求将颜色改为贴近 logo 实际颜色或直接使用 logo 的颜色。

### Logo 色源

项目统一 logo（手绘画笔 P）使用三种蓝色：

| 角色 | 色值 | 说明 |
|------|------|------|
| P 字填充（主色） | `#2b579a` | 深沉、带灰调的蓝，手作感 |
| 高光描边 | `#5a9fd4` | 中明度蓝，温和 |
| 墨点 | `#7ab8e8` | 浅蓝，透气 |

### 设计目标

1. 消除 `#0078d4` 系列带来的"AI 感"和"Microsoft 感"，转向 logo 的手绘画笔气质
2. 品牌色直接使用 logo 三色，不做多余混合
3. 中性色微调去冷感，与品牌色协调
4. 亮色/暗色双主题统一迁移
5. 网站（website/）同步更新

### 关键决策

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-06-28 | 品牌色 = 以 logo 三色重建完整色链 | 用户确认 |
| 2026-06-28 | 中性色微暖调整 | 用户选择方案 A（微暖中性色） |
| 2026-06-28 | 亮色/暗色同步调整 | 用户接受推荐 |

## 品牌蓝色链

### 亮色主题 Light Theme

| Token | 当前值（AI 蓝） | 新值（Logo 蓝） |
|-------|----------------|----------------|
| `--colorBrandBackground` | `#0078d4` | **`#2b579a`** |
| `--colorBrandBackgroundHover` | `#106ebe` | **`#3a6fb5`** |
| `--colorBrandBackgroundPressed` | `#005a9e` | **`#1e3d6e`** |
| `--colorBrandBackgroundSelected` | `#005a9e` | **`#1e3d6e`** |
| `--colorBrandForeground1` | `#0078d4` | **`#2b579a`** |
| `--colorBrandForegroundLink` | `#106ebe` | **`#2b579a`** |
| `--colorBrandForegroundLinkHover` | `#005a9e` | **`#5a9fd4`** |
| `--colorBrandForegroundLinkPressed` | `#004578` | **`#1e3d6e`** |
| `--colorBrandStroke1` | `#0078d4` | **`#2b579a`** |
| `--colorBrandStroke2` | `#c2e0f4` | **`#d2e3f5`** |
| `--colorNeutralForegroundOnBrand` | `#ffffff` | **`#ffffff`** |
| `--colorCompoundBrandBackground` | `#0078d4` | **`#2b579a`** |
| `--colorCompoundBrandBackgroundHover` | `#106ebe` | **`#3a6fb5`** |
| `--colorCompoundBrandBackgroundPressed` | `#005a9e` | **`#1e3d6e`** |
| `--colorCompoundBrandForeground1` | `#0078d4` | **`#2b579a`** |
| `--colorCompoundBrandStroke1` | `#0078d4` | **`#2b579a`** |

### 暗色主题 Dark Theme

暗色背景上使用 logo 的较亮两色以保证对比度。

| Token | 当前值（AI 蓝） | 新值（Logo 蓝） |
|-------|----------------|----------------|
| `--colorBrandBackground` | `#106ebe` | **`#5a9fd4`** |
| `--colorBrandBackgroundHover` | `#0078d4` | **`#7ab8e8`** |
| `--colorBrandBackgroundPressed` | `#005a9e` | **`#4285b4`** |
| `--colorBrandBackgroundSelected` | `#005a9e` | **`#4285b4`** |
| `--colorBrandForeground1` | `#479ef5` | **`#7ab8e8`** |
| `--colorBrandForegroundLink` | `#2899f5` | **`#7ab8e8`** |
| `--colorBrandForegroundLinkHover` | `#479ef5` | **`#8fc9f0`** |
| `--colorBrandForegroundLinkPressed` | `#60aaff` | **`#5a9fd4`** |
| `--colorBrandStroke1` | `#2899f5` | **`#5a9fd4`** |
| `--colorBrandStroke2` | `#1a3a5c` | **`#1a3052`** |
| `--colorNeutralForegroundOnBrand` | `#ffffff` | **`#ffffff`** |
| `--colorCompoundBrandBackground` | `#0078d4` | **`#5a9fd4`** |
| `--colorCompoundBrandBackgroundHover` | `#106ebe` | **`#7ab8e8`** |
| `--colorCompoundBrandBackgroundPressed` | `#005a9e` | **`#4285b4`** |
| `--colorCompoundBrandForeground1` | `#479ef5` | **`#7ab8e8`** |
| `--colorCompoundBrandStroke1` | `#2899f5` | **`#5a9fd4`** |

## 中性色微暖调整

### 亮色中性色

| Token | 当前值（冷灰） | 新值（暖灰） |
|-------|-------------|-------------|
| `--colorNeutralBackground1` | `#ffffff` | **`#fefcf8`** |
| `--colorNeutralBackground2` | `#fafafa` | **`#f7f4ee`** |
| `--colorNeutralBackground3` | `#f5f5f5` | **`#f0ece4`** |
| `--colorNeutralBackground1Hover` | `#f5f5f5` | **`#f0ece4`** |
| `--colorNeutralBackground1Pressed` | `#ebebeb` | **`#e6e2d8`** |
| `--colorNeutralBackground1Selected` | `#ebebeb` | **`#e6e2d8`** |
| `--colorNeutralForeground1` | `#242424` | **`#2c2822`** |
| `--colorNeutralForeground2` | `#424242` | **`#4a453e`** |
| `--colorNeutralForeground3` | `#616161` | **`#696358`** |
| `--colorNeutralForegroundDisabled` | `#bdbdbd` | **`#bbb5aa`** |
| `--colorNeutralStroke1` | `#d1d1d1` | **`#cdc8be`** |
| `--colorNeutralStroke2` | `#e0e0e0` | **`#dcd7ce`** |
| `--colorNeutralStrokeAccessible` | `#616161` | **`#696358`** |
| `--colorNeutralStrokeAccessibleHover` | `#575757` | **`#5f5950`** |
| `--colorNeutralStrokeDisabled` | `#e0e0e0` | **`#dcd7ce`** |
| `--colorNeutralBackgroundAlpha` | `rgba(255,255,255,0.8)` | **`rgba(254,252,248,0.8)`** |
| `--colorNeutralBackgroundAlpha2` | `rgba(255,255,255,0.6)` | **`rgba(254,252,248,0.6)`** |

### 暗色中性色

| Token | 当前值（冷深灰） | 新值（暖深灰） |
|-------|---------------|---------------|
| `--colorNeutralBackground1` | `#292929` | **`#2a2622`** |
| `--colorNeutralBackground2` | `#1f1f1f` | **`#211d19`** |
| `--colorNeutralBackground3` | `#141414` | **`#181410`** |
| `--colorNeutralBackground1Hover` | `#333333` | **`#34302a`** |
| `--colorNeutralBackground1Pressed` | `#3d3d3d` | **`#3e3832`** |
| `--colorNeutralBackground1Selected` | `#3d3d3d` | **`#3e3832`** |
| `--colorNeutralForeground1` | `#ffffff` | **`#ffffff`** |
| `--colorNeutralForeground2` | `#d6d6d6` | **`#d4cfc8`** |
| `--colorNeutralForeground3` | `#adadad` | **`#aba59c`** |
| `--colorNeutralForegroundDisabled` | `#5c5c5c` | **`#5e5852`** |
| `--colorNeutralStroke1` | `#666666` | **`#656058`** |
| `--colorNeutralStroke2` | `#4d4d4d` | **`#4c473f`** |
| `--colorNeutralStrokeAccessible` | `#adadad` | **`#aba59c`** |
| `--colorNeutralStrokeAccessibleHover` | `#bdbdbd` | **`#bbb5aa`** |
| `--colorNeutralStrokeDisabled` | `#333333` | **`#34302a`** |
| `--colorNeutralBackgroundAlpha` | `rgba(41,41,41,0.8)` | **`rgba(42,38,34,0.8)`** |
| `--colorNeutralBackgroundAlpha2` | `rgba(41,41,41,0.6)` | **`rgba(42,38,34,0.6)`** |

### 不变的中性色

以下 token 的值在两主题中不变，无需改动：

- `--colorScrim`：`rgba(0,0,0,0.4)` / `rgba(0,0,0,0.6)`
- `--shadowAmbient*` / `--shadowKey*` / `--elevation*`：阴影色保持不变
- `--colorStrokeFocus1` / `--colorStrokeFocus2`：焦点指示器颜色
- `--colorStatusDanger*` / `--colorStatusSuccess*` / `--colorStatusWarning*`：状态色保持不变
- `--colorOverlayBackground` / `--colorOverlayForeground` / `--colorOverlaySurface*`：覆盖层不变
- `--colorImageBadgeBackground` / `--colorImageBadgeForeground`：图片标签不变

## 网站配色同步

`website/index.html` 和 `website/privacy-policy.html` 中定义了独立的网站配色变量，需替换：

```css
/* 当前 */
--colorPictelioTeal: #0078d4;
--colorPictelioTealDark: #106ebe;
--colorPictelioTealDarker: #005a9e;
--colorPictelioTealLight: #2899f5;
--colorPictelioTealLighter: #60aaff;
--colorPictelioTealBgSubtle: #e6f5ff;

/* 替换为 */
--colorPictelioDeep: #2b579a;
--colorPictelioMid: #5a9fd4;
--colorPictelioLight: #7ab8e8;
--colorPictelioBgSubtle: #ede6d8;
```

同时更新：
- `--revealHighlight` 中的 rgba: `rgba(0,120,212,0.08)` → `rgba(43,87,154,0.08)`（亮色）/ `rgba(90,159,212,0.12)` → `rgba(90,159,212,0.12)`（暗色，暗色中已是 rgba(96,170,255,0.12)，改为 rgba(90,159,212,0.12)）
- `body` 背景渐变中 `rgba(0,120,212,0.03)` → `rgba(43,87,154,0.03)`

## 无需改动的文件

- `uno.config.ts` — 全部引用 CSS 变量，变量值变了自动生效
- `src/styles/reset.css` — 纯 CSS reset，无色值
- `src/styles/base.css` — 需检查后确认，但预期无色值
- `src/components/PredictiveBackContainer.css` — 引用 CSS 变量，自动生效

## 影响范围

| 文件 | 改动性质 | 改动量 |
|------|---------|--------|
| `src/styles/tokens.css` | 全部品牌色 + 中性色替换 | ~60 行色值替换 |
| `website/index.html` | `--colorPictelioTeal*` → `--colorPictelioDeep/Mid/Light`，revealHighlight 颜色 | ~15 行 |
| `website/privacy-policy.html` | 同 index.html | ~10 行 |
| `public/privacy-policy.html` | 构建产物，与 website/ 源文件同步 | 视情况 |

## 验收标准

- [ ] `tokens.css` 中所有 `--colorBrand*` 值已替换为 logo 蓝色链
- [ ] `tokens.css` 中所有中性色已替换为微暖版本
- [ ] 亮色主题和暗色主题均已完成替换
- [ ] `website/index.html` 中 `--colorPictelioTeal*` 已替换
- [ ] `website/index.html` 中 `--revealHighlight` 颜色已同步
- [ ] `website/index.html` 中 body 背景渐变已同步
- [ ] `website/privacy-policy.html` 同 index.html 同步
- [ ] `pnpm check` / `pnpm build` 通过
- [ ] 视觉上无硬编码 `#0078d4` 残留

## 不在本方案内的范围

- 色值以外的设计 token（间距、圆角、动效等）不变
- 状态色（danger/success/warning）不变
- 阴影色不变
- 字体、字重等不变
- Android 原生颜色（`colors.xml`）在独立方案中处理
