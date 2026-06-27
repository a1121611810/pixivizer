# Pictelio Logo 重设计方案

## 背景与目标

当前应用 logo（`assets/logo/pictelio-logo.svg`）为青绿色渐变圆角方块配白色「P」字形，视觉上与 Microsoft Fluent Design System 2 的规范不符，且在小尺寸下辨识度一般。

本方案目标：

- 在保留品牌识别（首字母 P）的前提下，重新设计为 Fluent Design 风格
- 采用用户确认的「暗色/霓虹」方向
- 覆盖 APP 图标、PWA 图标、favicon、Android 自适应图标等全部使用场景
- 不改动现有构建脚本，复用 `scripts/generate-icons.mjs` 自动生成全部位图

## 设计方向：方案 A —— Fluent 层叠 P 字母

### 视觉概念

以 Fluent Design 的 **层叠深度（elevation）** 为核心：

1. **底层**：深色 Fluent squircle 背景，营造暗色主题下的稳定底座
2. **中层**：一层微微浮起的半透明暗色卡片，投射 Fluent 风格阴影，制造纵深感
3. **前景**：由霓虹青到蓝渐变描边构成的圆角「P」字母，带轻微光晕，增强暗色下的辨识度

### 设计原则

- 使用 Fluent 的 squircle 圆角语言
- 使用 elevation shadow 表达层级
- 保持极简，确保 16×16 到 512×512 全尺寸清晰
- 霓虹渐变仅用于静态品牌资产，不进入 UI tokens 层

## 精确规格

### 主 Logo SVG

**文件**：`assets/logo/pictelio-logo.svg`

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

**规格说明**：

| 元素       | 值                                | 说明                                        |
| ---------- | --------------------------------- | ------------------------------------------- |
| 画布       | 192×192                           | 与现有 logo 一致，兼容 `generate-icons.mjs` |
| 背景圆角   | rx="44"                           | Fluent squircle 比例                        |
| 背景色     | `#1f1f2e → #0f0f1a`               | 暗色渐变，与深色主题协调                    |
| 中层卡片   | `#2a2a3e`                         | 半透明感暗色浮层                            |
| 中层圆角   | rx="28"                           | 与背景圆角比例一致                          |
| P 字母     | 描边宽度 10px                     | 在 192 视图下粗细适中                       |
| P 字母圆角 | stroke-linejoin="round"           | Fluent 圆角语言                             |
| 渐变       | `#00d4aa → #00a8e8`               | 霓虹青到蓝                                  |
| 光晕       | `feGaussianBlur stdDeviation="3"` | 轻微发光，不刺眼                            |

### Android 自适应图标前景 SVG

**文件**：`assets/logo/ic_launcher_foreground.svg`

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

**规格说明**：

| 元素     | 值        | 说明                               |
| -------- | --------- | ---------------------------------- |
| 画布     | 108×108   | Android adaptive icon 标准前景画布 |
| 内容     | 仅 P 字母 | 去除背景，由系统蒙版控制形状       |
| 描边宽度 | 7px       | 108 视图下等比缩放                 |

### 浏览器 Favicon SVG

**文件**：`public/favicon.svg`

内容与 `pictelio-logo.svg` 一致，浏览器会直接使用矢量 favicon。

## 输出清单

运行 `pnpm generate:icons` 后，以下位图将被重新生成：

| 用途                       | 尺寸    | 输出路径                                                             |
| -------------------------- | ------- | -------------------------------------------------------------------- |
| Favicon PNG                | 16×16   | `public/favicon-16x16.png`                                           |
| Favicon PNG                | 32×32   | `public/favicon-32x32.png`                                           |
| PWA Icon                   | 192×192 | `public/logo-192x192.png`                                            |
| PWA Icon                   | 512×512 | `public/logo-512x512.png`                                            |
| Android Launcher mdpi      | 48×48   | `android/app/src/main/res/mipmap-mdpi/ic_launcher.png`               |
| Android Launcher hdpi      | 72×72   | `android/app/src/main/res/mipmap-hdpi/ic_launcher.png`               |
| Android Launcher xhdpi     | 96×96   | `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`              |
| Android Launcher xxhdpi    | 144×144 | `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`             |
| Android Launcher xxxhdpi   | 192×192 | `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`            |
| Android Round Launcher     | 同上当  | `android/app/src/main/res/mipmap-*/ic_launcher_round.png`            |
| Android Foreground mdpi    | 108×108 | `android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png`    |
| Android Foreground hdpi    | 162×162 | `android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png`    |
| Android Foreground xhdpi   | 216×216 | `android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png`   |
| Android Foreground xxhdpi  | 324×324 | `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png`  |
| Android Foreground xxxhdpi | 432×432 | `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png` |

## 改动文件

1. `assets/logo/pictelio-logo.svg` — 重写为主 logo
2. `assets/logo/ic_launcher_foreground.svg` — 重写为 Android 自适应图标前景
3. `public/favicon.svg` — 同步替换为新版 SVG
4. `website/logo-mockups.html` — 可选：作为设计过程稿归档或删除
5. 运行 `pnpm generate:icons` 后，所有 `public/` 和 `android/app/src/main/res/mipmap-*/` 下的图标 PNG 会自动更新

## 不在本方案内的范围

- 不修改 `scripts/generate-icons.mjs` 的生成逻辑
- 不新增 `tokens.css` 变量（霓虹色仅用于静态品牌资产）
- 不修改应用名称、包名或应用启动图（splash screen）
- 不修改 `index.html` 中的 manifest 引用（现有引用保持不变即可）

## 验收标准

- [ ] `assets/logo/pictelio-logo.svg` 与 `assets/logo/ic_launcher_foreground.svg` 已替换为新设计
- [ ] `public/favicon.svg` 已替换为新设计
- [ ] 运行 `pnpm generate:icons` 成功，无报错
- [ ] 所有生成的 PNG 文件均为新版 logo
- [ ] 在 Android 设备/模拟器上查看应用图标，显示正常、无拉伸或模糊
- [ ] 在浏览器标签页查看 favicon，显示清晰

## 备注

- 霓虹色（`#00d4aa`、`#00a8e8`）仅用于 logo 资产，不属于 Fluent UI tokens。若后续需要在 UI 中复用，应再评估是否加入 `tokens.css`。
- 当前设计优先保证暗色主题下的表现；若未来需要亮色主题变体，可再补充一套浅色背景版本。
