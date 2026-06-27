# Pictelio 统一 Logo 设计方案

## 状态

待实现（2026-06-27）。本方案取代 2026-06-26 的 dark-neon P Logo 方案，将登录页的白色徽章 + 手绘画笔 P 作为唯一品牌标识应用到所有场景。

## 背景

Pixivizer 是基于 SolidJS + Capacitor 的 Pixiv 第三方客户端，设计系统强制遵循 Microsoft Fluent Design System 2。此前已完成登录页图标设计（`assets/logo/pictelio-login-icon.svg`），采用白色 Fluent 圆角徽章 + 手绘画笔 P。用户确认该图标为**唯一 Logo**，要求将 dark-neon 几何 P 全面替换为该风格，覆盖：

- Android 启动器图标与自适应图标
- Web favicon / PWA 图标
- 应用内 Splash 启动屏
- 设置页「关于」图标
- 官网首页与隐私政策页

## 目标

1. 建立唯一、统一的品牌标识，所有场景使用同一视觉语言。
2. 消除旧 dark-neon P 的「AI 感」，保留手绘画笔 P 的人格化特征。
3. 保证 16×16 到 512×512 全尺寸范围内的清晰度和一致性。
4. 符合 Fluent Design System 2 的圆角、层级、投影规范。

## 约束

- 必须复用已确认的登录页画笔 P 图形路径，仅做尺寸/容器适配，不重新设计图形。
- 颜色仅使用画笔 P 现有蓝色系：`#2b579a`、`#5a9fd4`、`#7ab8e8`。
- 必须满足 Android 自适应图标 66×66 dp 安全区。
- 所有颜色、尺寸、路径参数可量化，禁止模糊描述。

## 设计决策

### 核心意象

- **手绘画笔 P**：对应应用名 Pictelio，并通过画笔/墨点表达插画属性。
- **白色 Fluent 圆角徽章**：作为统一容器，提供跨背景的一致边界和层级。
- **一致而非反色**：即使暗色背景也使用同一白色徽章，依靠徽章自身边界形成对比，避免维护两套资源。

### 主图标规格（APP / PWA / Splash / 设置 / 官网）

画布尺寸 192×192，内容为一枚白色 Fluent squircle 徽章，内部居中放置 64×64 画笔 P。

| 项目         | 值                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------- |
| 画布         | 192 × 192                                                                                 |
| 徽章容器     | 白色 `#ffffff`，圆角 `rx=44`（约 23%），尺寸 168×168，居中                                |
| 徽章投影     | `filter="url(#badgeShadow)"`：feDropShadow dx=0 dy=6 stdDeviation=10，flood-opacity=0.10 |
| 画笔 P 容器  | 64×64 viewBox 等比缩放至 120×120，居中                                                    |
| P 字形填充   | `#2b579a`                                                                                 |
| 高光描边     | `#5a9fd4`，stroke-width=3，stroke-linecap=round                                           |
| 墨点         | `#7ab8e8`，两个圆：r=2 与 r=1.5                                                           |

#### 主 SVG 源码（`assets/logo/pictelio-logo.svg`）

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

### Android 自适应图标前景（`assets/logo/ic_launcher_foreground.svg`）

画布 108×108，白色徽章 + 画笔 P 居中，透明背景。

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

徽章圆角 rx=26（约 26%，使徽章在 66dp 安全区内完整可见）。

### Favicon 规格（16×16 / 32×32）

复用同一白色徽章 + 画笔 P，但在 16×16 时简化：隐藏最小墨点（r=1.5 的圆），保留较大墨点或全部隐藏，以提升像素级清晰度。

| 尺寸  | 徽章圆角 | 简化策略                  |
| ----- | -------- | ------------------------- |
| 32×32 | rx=8     | 保留两个墨点              |
| 16×16 | rx=4     | 仅保留 P 字与高光描边，无墨点 |

`public/favicon.svg` 使用完整 192×192 主 SVG，由浏览器自行缩放。

### Android 自适应图标

- **前景层**（`ic_launcher_foreground.svg`）：白色徽章 + 画笔 P，透明背景。
  - 画布 108×108 dp，实际内容居中置于 66×66 dp 安全区内。
  - 与主 SVG 比例一致，缩放后安全区内可见完整徽章。
- **背景层**：纯色 `#f5f5f5`（`--colorNeutralBackground3` 浅色），与白色徽章形成柔和对比。
- **旧版启动器图标**：由 `pictelio-logo.svg` 导出，透明背景。

### 登录页

保持现有实现不变：80×80 白色徽章 + 52×52 画笔 P。详见 `2026-06-27-pictelio-login-icon-design.md`。

## 交付物

### 源文件

1. `assets/logo/pictelio-logo.svg` — 统一主 Logo（取代旧 dark-neon 版本）。
2. `assets/logo/ic_launcher_foreground.svg` — Android 自适应图标前景。
3. `assets/logo/pictelio-login-icon.svg` — 登录页图标（已存在，保持不变）。

### 生成资源（`pnpm generate:icons` 自动产出）

- `public/favicon.svg`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/logo-192x192.png`
- `public/logo-512x512.png`
- `android/app/src/main/res/mipmap-*/ic_launcher_foreground.png`
- `android/app/src/main/res/mipmap-*/ic_launcher_background.png`
- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- `android/app/src/main/res/mipmap-*/ic_launcher_round.png`

### 代码更新

1. `src/App.tsx` — Splash 启动屏的图标替换为统一主 Logo。
2. `src/components/SettingsSheet.tsx` — 「关于 Pictelio」条目图标替换为统一主 Logo。
3. `index.html` — favicon 链接保持，内容自动由生成脚本更新。
4. `website/index.html` — 官网 hero 区 Logo 替换为统一主 Logo。
5. `website/privacy-policy.html` — header Logo 替换为统一主 Logo。
6. `public/privacy-policy.html` — 同上（构建产物，但保留源文件同步）。
7. `android/app/src/main/res/values/colors.xml` — 自适应图标背景色更新为 `#f5f5f5`。
8. `scripts/generate-screenshots.mjs` — 截图脚本去掉 dark-neon 渐变背景，改为浅色/中性背景，并在登录截图等处使用新的白色徽章 Logo。

## 工程集成点

- 运行 `pnpm generate:icons` 重新生成全部 PNG。
- 运行 `pnpm check` 确保 TypeScript 与格式化通过。
- 运行 `pnpm build` 验证构建产物中 favicon、PWA 图标正确。
- 可选：在 Android 模拟器中验证自适应图标效果。

## 不在本方案内的范围

- 动画 Logo。
- 浅色/暗色双版本：统一使用白色徽章版。
- 应用商店宣传图 / feature 图。
- 登录页图标本身的几何修改。

## 验收标准

- [ ] `assets/logo/pictelio-logo.svg` 已替换为白色徽章 + 画笔 P。
- [ ] `assets/logo/ic_launcher_foreground.svg` 已替换为白色徽章 + 画笔 P（透明背景）。
- [ ] `pnpm generate:icons` 成功运行，全部 PNG 已更新。
- [ ] `src/App.tsx` Splash 图标显示统一 Logo。
- [ ] `src/components/SettingsSheet.tsx` 「关于」图标显示统一 Logo。
- [ ] `website/index.html` 与 `website/privacy-policy.html` 使用统一 Logo。
- [ ] `public/privacy-policy.html` 与官网源文件一致。
- [ ] Android 自适应图标背景色为 `#f5f5f5`。
- [ ] `pnpm check` 与 `pnpm build` 通过。
- [ ] 旧 dark-neon Logo SVG 及引用已清理。

## 决策记录

| 日期       | 决策                                        | 原因                             |
| ---------- | ------------------------------------------- | -------------------------------- |
| 2026-06-27 | 唯一 Logo = 登录页白色徽章 + 手绘画笔 P     | 用户确认                         |
| 2026-06-27 | 全场景使用同一白色徽章版，不做暗色反色版    | 简化资产、保持一致               |
| 2026-06-27 | Android 自适应背景改为浅灰 `#f5f5f5`        | 衬托白色徽章，避免与深色背景融合 |
| 2026-06-27 | Favicon 小尺寸简化墨点                      | 保证 16×16 像素级清晰            |
