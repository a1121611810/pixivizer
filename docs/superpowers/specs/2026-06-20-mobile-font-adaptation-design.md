# Pixivizer 移动端字体适配方案

**日期**: 2026-06-20
**状态**: 待实施

---

## 背景

Pixivizer 是一个基于 SolidJS + Capacitor 的 Android 应用，当前所有字体使用 `px` 硬编码。移动端存在两个层面的字体适配需求：

1. **设备尺寸适配**：不同手机宽度（360dp ~ 420dp）和平板（600dp+）上，固定 px 字号观感不一致
2. **系统字体缩放**：用户在 Android 无障碍设置中调整字体大小后，应用应跟随

当前 `viewport meta` 设为 `user-scalable=no`，用户无法手动缩放，进一步放大了这两个问题。

---

## 架构总览

```
┌──────────────────────────────────────────────────────────────┐
│  开发时                                          浏览器中     │
│                                                              │
│  tokens.css 写 px   ──pxtorem──▶   变成 rem                  │
│  组件引用 token      ──自动──▶     继承 rem                   │
│  UnoCSS utilities    ──本来就是──▶  输出 rem                  │
│                                                              │
│  Hero 级 token      ──clamp()──▶   流体缩放                   │
│                                                              │
│  Android WebView    ──自动──▶      × 系统字体倍率             │
└──────────────────────────────────────────────────────────────┘
```

三层解耦：

| 层       | 机制                                    | 负责                     |
| -------- | --------------------------------------- | ------------------------ |
| 工具链层 | `postcss-pxtorem`（源码 px → 构建 rem） | 开发体验：写 px，看 rem  |
| Token 层 | rem + 选择性 `clamp()`                  | 设备尺寸适配（Hero 级）  |
| 系统层   | Android WebView 自动缩放 `rem`          | 无障碍：跟随系统字体设置 |

---

## 第一层：postcss-pxtorem 自动转换

### 安装

```bash
pnpm add -D postcss-pxtorem
```

### vite.config.ts 配置

```ts
import postcssPxToRem from "postcss-pxtorem";

export default defineConfig({
  // ...existing config...
  css: {
    postcss: {
      plugins: [
        postcssPxToRem({
          rootValue: 16, // 1rem = 16px
          propList: ["font-size"], // 只转换 font-size
          minPixelValue: 2, // ≤2px 的忽略（border 等）
        }),
      ],
    },
  },
});
```

### 覆盖范围

| 文件类型                                     | 是否转换  | 说明                              |
| -------------------------------------------- | --------- | --------------------------------- |
| `tokens.css` 中的 `font-size`                | ✅        | 核心                              |
| `base.css` 中的 `font-size`                  | ✅        | body 等                           |
| UnoCSS bracket 语法 `[font-size:var(--xxx)]` | 间接 ✅   | token 值是 rem，引用自动生效      |
| UnoCSS utility（`p-2.5`、`gap-3`）           | ✅ 无需转 | UnoCSS 本身输出就是 rem           |
| `.tsx` 中 inline `style={}` 对象             | ❌        | 不走 PostCSS（见 Login.tsx 改造） |
| JS 中的数字常量                              | ❌        | 不需要                            |

---

## 第二层：Token 改造

### 字体 Token（由 pxtorem 自动转）

| 源码（写 px）              | 构建产物（浏览器看到 rem） |
| -------------------------- | -------------------------- |
| `--fontSizeBase100: 10px`  | `0.625rem`                 |
| `--fontSizeBase200: 12px`  | `0.75rem`                  |
| `--fontSizeBase300: 14px`  | `0.875rem`                 |
| `--fontSizeBase400: 16px`  | `1rem`                     |
| `--fontSizeBase500: 20px`  | `1.25rem`                  |
| `--fontSizeBase600: 24px`  | `1.5rem`                   |
| `--fontSizeHero700: 28px`  | `1.75rem`                  |
| `--fontSizeHero800: 32px`  | `2rem`                     |
| `--fontSizeHero900: 40px`  | `2.5rem`                   |
| `--fontSizeHero1000: 68px` | `4.25rem`                  |

### 行高 Token（手动改为无单位比值）

行高的 `propList` 未包含，需手动改。无单位比值是最佳实践——在任何缩放下都保持正确比例。

| Token                 | 现值   | 目标值   | 公式  |
| --------------------- | ------ | -------- | ----- |
| `--lineHeightBase100` | `14px` | `1.4`    | 14/10 |
| `--lineHeightBase200` | `16px` | `1.333`  | 16/12 |
| `--lineHeightBase300` | `20px` | `1.4286` | 20/14 |
| `--lineHeightBase400` | `22px` | `1.375`  | 22/16 |
| `--lineHeightBase500` | `28px` | `1.4`    | 28/20 |
| `--lineHeightBase600` | `32px` | `1.333`  | 32/24 |

### Hero 级 clamp()（可选流体增强）

仅对 Base600 及以上（≥24px）做 fluid。正文 Base100~500 在手机宽度范围内差异 < 2px，不值得 fluid。

```css
/* 源码写 px，构建后 clamp 内 px 也转为 rem */
--fontSizeHero700: clamp(24px, 1.2vw + 20px, 28px);
--fontSizeHero800: clamp(28px, 1.5vw + 22px, 32px);
--fontSizeHero900: clamp(32px, 2vw + 24px, 40px);
--fontSizeHero1000: clamp(50px, 4vw + 32px, 68px);
```

| Token    | 360dp 屏 | 420dp 屏 | 600dp 平板 |
| -------- | -------- | -------- | ---------- |
| Hero700  | 24px     | 25px     | 28px       |
| Hero800  | 28px     | 29px     | 32px       |
| Hero900  | 32px     | 34px     | 40px       |
| Hero1000 | 50px     | 54px     | 68px       |

### 不动的 Token

```
--spacingHorizontal*   保留 px  （Fluent 固定 4px 网格）
--spacingVertical*     保留 px
--borderRadius*        保留 px
--strokeWidth*         保留 px
--elevation*           保留 px
--duration*            保留 ms
--curve*               保留 easing
```

---

## 第三层：Android WebView 系统缩放

**无需任何代码。** Android WebView 会自动对所有 `rem` 字号应用系统字体倍率。用户设置特大字体（1.3x）后，0.875rem 的正文实际显示为 18.2px。

`@capacitor/text-zoom` 的 `getPreferred()` 可在日后需要时读取用户偏好，现阶段不是必需依赖。

---

## base.css 改动

```css
html {
  font-size: 100%; /* 显式声明 = 16px，不玩 62.5% 技巧 */
}
```

---

## Login.tsx 改造

### 问题

Login.tsx 使用 `style={}` 内联样式对象，不经过 PostCSS，包含硬编码 px 和颜色值。

### S 对象新增成员

```ts
const S = {
  // ... 现有不变 ...

  // Hero 级的 emoji 图标
  emoji: "font-size:var(--fontSizeHero900);margin-bottom:var(--spacingVerticalS)",

  // 表单间距（按 Fluent 语义）
  fieldGroup: "display:flex;flex-direction:column;gap:var(--spacingVerticalL)",
  fieldGroupSmall: "display:flex;flex-direction:column;gap:var(--spacingVerticalS)",
  fieldGroupTight: "display:flex;flex-direction:column;gap:var(--spacingVerticalM)",

  // textarea 功能性尺寸
  textareaToken: S.textarea + ";min-height:96px",
  textareaSmart: S.textarea + ";min-height:80px",

  // 修正：btn 颜色使用 token
  btn: "...color:var(--colorNeutralForegroundOnBrand);...",
};
```

### JSX 内联样式替换

| 位置      | 现状                                       | 改为                        |
| --------- | ------------------------------------------ | --------------------------- |
| L88 emoji | `style="font-size:36px;margin-bottom:8px"` | `style={S.emoji}`           |
| L107      | `style="display:flex;...gap:16px"`         | `style={S.fieldGroup}`      |
| L110      | `style={S.textarea + ";min-height:96px"}`  | `style={S.textareaToken}`   |
| L122      | `style="display:flex;...gap:16px"`         | `style={S.fieldGroup}`      |
| L145      | `style="display:flex;...gap:16px"`         | `style={S.fieldGroup}`      |
| L146      | `style="display:flex;...gap:8px"`          | `style={S.fieldGroupSmall}` |
| L149      | `style={S.textarea + ";min-height:80px"}`  | `style={S.textareaSmart}`   |
| L162      | `style="display:flex;...gap:12px"`         | `style={S.fieldGroupTight}` |

### 修改后效果

- Login.tsx 中不再有裸 `px` 和裸颜色值
- 所有尺寸通过 token 或 S 常量引用
- pxtorem 覆盖不到的 inline style 问题消除

---

## 不改的文件

| 文件                                  | 理由                                            |
| ------------------------------------- | ----------------------------------------------- |
| `src/components/*.tsx`（除引用外）    | 全部用 `var(--fontSizeXxx)` 或 UnoCSS utilities |
| `src/routes/*.tsx`（Login 除外）      | 同上                                            |
| `uno.config.ts`                       | shortcut 全用 bracket token 或 UnoCSS utility   |
| `VirtualFeed.tsx` `GAP_PX=12`         | JS 数学常量，非样式                             |
| `ImageViewer.tsx` `translate(xxx px)` | 动态平移计算，必须 px                           |
| `base.css` keyframe 动画              | `translateY(6px)` 等是视觉效果，非字号          |

---

## 改动文件清单

| 文件                    | 改动类型                                                  |
| ----------------------- | --------------------------------------------------------- |
| `package.json`          | `devDependencies` 加 `postcss-pxtorem`                    |
| `vite.config.ts`        | `css.postcss.plugins` 添加 pxtorem 配置                   |
| `src/styles/tokens.css` | 行高 token 手动改为无单位比值；Hero 级 token 加 `clamp()` |
| `src/styles/base.css`   | 添加 `html { font-size: 100% }`                           |
| `src/routes/Login.tsx`  | S 对象扩展 + JSX 内联样式替换                             |
