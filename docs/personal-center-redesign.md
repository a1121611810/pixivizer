# 个人中心（PersonalCenter）重新设计方案

> 日期: 2026-07-18
> 方案: Fluent Layers（方案 E）
> 状态: 已审批，待实施

---

## 1. 问题分析

### 1.1 当前问题

- **视觉单调**: 纯卡片堆叠，缺少层次感和 Fluent 设计语言深度运用
- **页面松散**: 信息密度低，大量空白区域
- **风格不协调**: 未充分利用项目已有的 Fluent 设计令牌（acrylic、elevation、motion curves）
- **功能分散**: 设置、收藏、历史等入口散布在不同位置，缺乏统一聚合

### 1.2 范围界定

个人中心 `PersonalCenter.tsx` 同时覆盖两个路由：

| 路由 | 用途 | 差异点 |
|------|------|--------|
| `/me` | 当前用户个人中心 | 显示「编辑资料」按钮 |
| `/user/:id` | 他人用户页 | 显示「关注/已关注」按钮 |

排除在外的功能（已有独立页面，不重复放置）：
- 浏览历史 → `/history`
- 收藏 → `/bookmarks`
- 关于 → `/about`
- 图片缓存/托管设置 → `/image-cache`, `/image-host`
- 布局设置 → `/layout-settings`
- 设置 → `SettingsDrawer`（从 NavBar 头像进入）

---

## 2. 设计概念：Fluent Layers（四层深度叠层）

### 2.1 核心理念

利用 Fluent Design System 2 的 **Depth（深度）** 和 **Acrylic（毛玻璃）** 特性，将页面分为四个视觉层级，每层具有不同的 elevation、透明度和滚动速度，形成沉浸式空间感。

### 2.2 层级结构

```
Layer (Z-index)     Content              Elevation         Opacity
──────────────────────────────────────────────────────────
Layer 1 (最低)     背景渐变色/模糊作品图   elevation0        1.0
Layer 2            头像（浮动光晕）       elevation4        1.0
Layer 3            信息卡片（Acrylic）    elevation2        ~0.85 半透明
Layer 4 (最高)     Tab + 内容瀑布流       elevation0        1.0（不透明）
```

### 2.3 首屏布局（滚动起始态）

```
┌─────────────────────────────────┐  ← Layer 1: 背景
│  以用户作品主色调生成的渐变色    │     高度约 55vh
│  或代表性作品的高斯模糊版       │     占首屏大半
│                                 │
│  ┌─────────────────────────┐   │  ← Layer 3: Acrylic 信息卡
│  │ ┌────┐                   │   │     浮动在背景上方
│  │ │头像│ Name              │   │     半透明磨砂效果
│  │ │120 │ @account          │   │     backdrop-filter: blur(20px)
│  │ │ px │ "简介"            │   │     圆角 large
│  │ └────┘                   │   │
│  │                          │   │
│  │ 作品 1,234               │   │  ← 简约数字行
│  │ 关注 567  粉丝 890        │   │
│  │                          │   │
│  │ [编辑资料/关注]           │   │  ← Fluent subtle/primary button
│  └─────────────────────────┘   │
│                                 │
│  ── Layer 4: 内容区 ────────  │  ← 不透明，最高层级
│  ┌─────┬─────┬─────┐          │
│  │ 插画  │ 漫画  │ 小说  │          │  ← Segmented control
│  └─────┴─────┴─────┘          │
│  [作品瀑布流 无限滚动]         │
└─────────────────────────────────┘
```

### 2.4 滚动行为与过渡动画

| 滚动阶段 | Layer 1 背景 | Layer 3 信息卡 | Header |
|----------|-------------|----------------|--------|
| 0–60px | 视差慢速上移 `translateY(scrollY * 0.3)` | 不动 | 透明 |
| 60–140px | 继续慢速上移 | 透明度 1→0, scale 1→0.85, 上移 | 透明度 0→1 |
| 140px+ | 完全滚出可视区 | 隐藏 | 紧凑态显示 |

**紧凑态 Header（滚动 140px+ 后）：**

```
┌───────────────────────────┐
│ [←]  [小头像 28px]  Name │ sticky, solid background
└───────────────────────────┘
```

- 头像从 120px 平滑缩小到 28px，移入 header
- Header 背景使用 `--colorNeutralBackgroundAlpha` + `backdrop-blur`
- 动画曲线: `cubic-bezier(0.33,0,0,1)` (enter/accelerate)
- 动画时长: `var(--durationSlow)` (300ms)

---

## 3. 组件架构

### 3.1 组件拆分

```
PersonalCenter.tsx                  ← 容器组件，路由逻辑
├── ProfileBackground.tsx           ← Layer 1: 背景
│   ├── GradientBackground          ─ 渐变背景（默认）
│   └── BlurredWorkBackground       ─ 作品模糊背景（增强）
├── ProfileCard.tsx                 ← Layer 3: Acrylic 信息卡
│   ├── AvatarSection               ─ 头像（120px）+ 浮动光晕
│   ├── UserInfo                    ─ Name + @account + 简介
│   ├── StatsRow                    ─ 作品/关注/粉丝数字
│   └── ActionButton                ─ 编辑资料/关注按钮
├── CollapsedHeader.tsx             ← 紧凑态 header
│   ├── BackButton                  ─ 返回按钮
│   ├── MiniAvatar                  ─ 28px 小头像
│   └── MiniName                    ─ Name 文字
└── ContentSection.tsx              ← Layer 4: 内容区
    ├── WorkTypeTabs                ─ Segmented control (插画/漫画/小说)
    └── UserWorksFeed               ─ 作品瀑布流（复用现有组件）
```

### 3.2 数据流

```
userStore / authStore
  │
  ├── profile() ──────────→ ProfileCard (姓名、简介、统计)
  ├── viewedUser() ───────→ ActionButton (关注/取消关注)
  ├── user() ─────────────→ 判断 isSelf (编辑资料 vs 关注)
  │
  └── userIllustsStore
        └── contentType() ─→ WorkTypeTabs (当前选中的作品类型)
        └── illusts() ─────→ UserWorksFeed (作品数据)
```

---

## 4. 视觉细节

### 4.1 背景层（Layer 1）

优先级策略:
1. **最佳**: 取用户最近作品的第一张，`<img>` + `filter: blur(20px)` + `scale(1.1)` 实现实时模糊背景
2. **回退**: 从用户头像中提取主色调生成渐变 `linear-gradient(135deg, color1, color2)`
3. **兜底**: 使用 `--colorNeutralBackground3` 纯色背景

### 4.2 Acrylic 信息卡（Layer 3）

```css
/* 毛玻璃效果 */
background: var(--colorNeutralBackgroundAlpha);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border-radius: var(--borderRadiusLarge);
box-shadow: var(--elevation2); /* 或 Fluent shadow token */
```

- 头像 120×120px，`borderRadiusCircular`
- 光环: `box-shadow: 0 0 0 3px var(--colorBrandStroke1), 0 0 20px var(--colorBrandStroke1Hover)`
- 信息卡 padding: `var(--spacingHorizontalXXL)` / `var(--spacingVerticalXXL)`

### 4.3 统计数字

- 使用 `fmtNum()` 现有函数（≥10000 显示「1.2万」）
- 作品统计 = `total_illusts + total_manga + total_novels`
- 可点击导航到对应独立页

### 4.4 紧凑态 Header

```css
/* Header 背景 */
background: var(--colorNeutralBackgroundAlpha);
backdrop-filter: var(--backdropBlurDefault);
backdrop-saturate: var(--backdropSaturateDefault);
border-bottom: var(--strokeWidthThin) solid var(--colorNeutralStroke2);
```

- 小头像 28×28px
- Name 使用 `fontSizeBase300` semibold

### 4.5 他人用户页差异

| 区域 | `/me` | `/user/:id` |
|------|-------|-------------|
| ActionButton | 「编辑资料」subtle button | 「关注」primary / 「已关注」subtle |
| 背景色 | 从自己作品提取 | 从对方作品提取 |
| 作品 Tab | 所有作品+小说 | 对方公开作品 |
| 统计点击 | 导航到本应用内页面 | 同样导航 |

---

## 5. Fluent 设计令牌对齐清单

| 使用场景 | Token | 当前是否合规 |
|---------|-------|------------|
| 背景色 | `--colorNeutralBackground1` / `Alpha` | ✅ |
| 卡片背景 | `var(--colorNeutralBackground1)` | ⚠️ 改用 Acrylic |
| 文字颜色 | `--colorNeutralForeground1/2/3` | ✅ |
| 品牌色 | `--colorBrandBackground` / `Stroke1` | ✅ |
| 圆角 | `--borderRadiusLarge/Circular` | ✅ |
| 间距 | `--spacingHorizontal/Vertical*` | ✅ |
| 动效曲线 | `--curveEasyEase` | ✅ |
| 动效时长 | `--durationSlow` (300ms) | ✅ |
| 阴影 | `--elevation2` / `--elevation4` | ⚠️ 当前未使用 elevation tokens |
| 毛玻璃 | `backdropFilter` + `colorNeutralBackgroundAlpha` | ✅ 已有 token |

---

## 6. 实施计划要点（概览）

1. **新建组件** `ProfileBackground.tsx` — 背景层
2. **新建组件** `ProfileCard.tsx` — Acrylic 信息卡
3. **新建组件** `CollapsedHeader.tsx` — 紧凑态 header
4. **重构** `PersonalCenter.tsx` — 集成四层结构 + 滚动动画
5. **整合** `WorkTypeTabs` + `UserWorksFeed`（复用现有组件）
6. **样式** 对齐 Fluent elevation 和 acrylic tokens
7. **测试** 滚动动画、视差效果、头像加载、关注按钮状态

---

## 7. 未纳入范围

- 封面图上传（Pixiv API 不支持）
- 用户的 Pixiv 背景图（API 无此字段）
- 嵌入收藏/历史列表（已有独立页面）
- 页面编辑模式
