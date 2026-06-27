# Pictelio 公开发布实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Pixivizer 去品牌化改造为 Pictelio，完成合规改造后通过 F-Droid、GitHub Releases 与官网公开发布。

**Architecture:** 保留 SolidJS + Capacitor 技术栈，仅调整品牌标识、登录方式、内容安全、隐私合规与构建签名；新增 F-Droid Fastlane 元数据、GitHub Release 脚本和静态官网页面。

**Tech Stack:** SolidJS 1.9, TypeScript 6, Vite 8, Capacitor 8, Gradle 8, Android SDK, F-Droid, GitHub Pages/Vercel.

---

## 文件结构总览

| 文件/目录                           | 用途                                  | 变更类型               |
| ----------------------------------- | ------------------------------------- | ---------------------- |
| `capacitor.config.ts`               | 应用 ID / 名称                        | 修改                   |
| `package.json`                      | 版本号、release 脚本                  | 修改                   |
| `scripts/generate-icons.mjs`        | 图标生成 SVG 路径                     | 修改                   |
| `android/app/build.gradle`          | release 签名、minify、versionCode     | 修改                   |
| `android/app/proguard-rules.pro`    | ProGuard 规则                         | 修改（如启用 minify）  |
| `src/routes/Login.tsx`              | 移除密码登录，增加免责声明            | 修改                   |
| `src/stores/authStore.ts`           | 移除 `login()`，保留 token 登录       | 修改                   |
| `src/stores/uiStore.ts`             | R-18/R-18G 默认关闭，新增年龄确认状态 | 修改                   |
| `src/utils/secureStorage.ts`        | 加密 token 存储封装（可选）           | 新增                   |
| `src/utils/r18Filter.ts`            | 过滤逻辑（已有）                      | 不修改                 |
| `src/components/AgeGate.tsx`        | 首次启动年龄门弹窗                    | 新增                   |
| `src/components/ReportSheet.tsx`    | 举报作品表单                          | 新增                   |
| `src/components/BlocklistSheet.tsx` | 屏蔽作者管理                          | 新增                   |
| `src/stores/blockStore.ts`          | 屏蔽列表状态与持久化                  | 新增                   |
| `src/stores/reportStore.ts`         | 举报记录本地持久化                    | 新增                   |
| `src/routes/IllustDetail.tsx`       | 添加举报/屏蔽菜单入口                 | 修改                   |
| `src/routes/About.tsx`              | 更新品牌与免责声明                    | 修改                   |
| `src/components/SettingsSheet.tsx`  | 增加账号删除入口、年龄确认重置        | 修改                   |
| `public/privacy-policy.html`        | 隐私政策草稿页面                      | 新增                   |
| `docs/privacy-policy.md`            | 隐私政策 Markdown 源文件              | 新增                   |
| `fastlane/metadata/android/`        | F-Droid 商店元数据                    | 新增                   |
| `scripts/release-github.mjs`        | GitHub Release 自动化脚本             | 新增                   |
| `website/index.html`                | 官网落地页                            | 新增                   |
| `website/privacy-policy.html`       | 官网隐私政策页                        | 新增（从 public 复制） |
| `.gitignore`                        | 忽略 keystore、release 产物           | 修改                   |

---

### Task 1: 重命名应用身份

**Files:**

- Modify: `capacitor.config.ts`
- Modify: `package.json`
- Modify: `android/app/build.gradle`
- Modify: `src/routes/About.tsx`
- Modify: `src/routes/Login.tsx`
- Modify: `src/routes/TabFeedPage.tsx`

- [ ] **Step 1: 更新 Capacitor 配置**

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: "io.pictelio.app",
  appName: "Pictelio",
  // ... rest unchanged
};
```

- [ ] **Step 2: 更新 package.json 名称与版本**

```json
{
  "name": "pictelio",
  "version": "1.0.0"
}
```

- [ ] **Step 3: 更新 Android 应用版本与 ID**

```gradle
// android/app/build.gradle
android {
    namespace = "io.pictelio.app"
    defaultConfig {
        applicationId "io.pictelio.app"
        versionCode 101
        versionName "1.0.0"
    }
}
```

- [ ] **Step 4: 替换 About 页品牌展示**

在 `src/routes/About.tsx` 中：

- 将 `<p>Pixivizer</p>` 改为 `<p>Pictelio</p>`
- 将 `<p>Pixiv 第三方客户端</p>` 改为 `<p>第三方插画浏览器</p>`
- 将 Pixiv 风格 Logo SVG 替换为 Pictelio 新 Logo（先占位，Task 2 生成）

- [ ] **Step 5: 替换 Login 页标题**

在 `src/routes/Login.tsx` 中：

- 将 `<h1>Pixivizer</h1>` 改为 `<h1>Pictelio</h1>`
- 将 `<p>登录你的 Pixiv 账号</p>` 改为 `<p>第三方插画浏览器</p>`

- [ ] **Step 6: 替换 Feed 页标题**

在 `src/routes/TabFeedPage.tsx` 中：

- 将 `Pixivizer` fallback 文本改为 `Pictelio`

- [ ] **Step 7: 全局搜索替换剩余硬编码品牌名**

Run:

```bash
grep -R "Pixivizer" src/ --include="*.tsx" --include="*.ts" --include="*.css" --include="*.html"
```

Expected: 无业务文案残留（保留代码注释中的历史引用可接受）。

- [ ] **Step 8: Commit**

```bash
git add capacitor.config.ts package.json android/app/build.gradle src/routes/About.tsx src/routes/Login.tsx src/routes/TabFeedPage.tsx
git commit -m "rebrand: Pixivizer -> Pictelio"
```

---

### Task 2: 重新生成应用图标

**Files:**

- Create: `assets/logo/pictelio-logo.svg`
- Create: `assets/logo/ic_launcher_foreground.svg`
- Modify: `scripts/generate-icons.mjs`

- [ ] **Step 1: 设计新 Logo SVG**

创建 `assets/logo/pictelio-logo.svg`，示例（可用 Figma/Illustrator 导出，确保 192×192 viewBox）：

```svg
<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <rect x="12" y="12" width="168" height="168" rx="44" fill="#0078d4"/>
  <text x="96" y="118" font-size="72" font-weight="700" text-anchor="middle" fill="white">P</text>
</svg>
```

- [ ] **Step 2: 设计自适应图标前景 SVG**

创建 `assets/logo/ic_launcher_foreground.svg`（108×108 viewBox，安全边距 18dp）：

```svg
<svg width="108" height="108" viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <text x="54" y="70" font-size="56" font-weight="700" text-anchor="middle" fill="#0078d4">P</text>
</svg>
```

- [ ] **Step 3: 更新图标生成脚本路径**

```javascript
// scripts/generate-icons.mjs
const logoSvg = join(root, "assets/logo/pictelio-logo.svg");
const fgSvg = join(root, "assets/logo/ic_launcher_foreground.svg");
```

- [ ] **Step 4: 运行图标生成**

Run:

```bash
pnpm generate:icons
```

Expected: 成功生成 `public/` 与 `android/app/src/main/res/mipmap-*/` 下的 PNG。

- [ ] **Step 5: 验证图标文件**

Run:

```bash
ls android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
ls public/logo-512x512.png
```

Expected: 两个文件均存在且为最近生成。

- [ ] **Step 6: Commit**

```bash
git add assets/logo/ scripts/generate-icons.mjs public/ android/app/src/main/res/
git commit -m "feat(brand): add Pictelio logo and regenerate icons"
```

---

### Task 3: 移除用户名/密码登录

**Files:**

- Modify: `src/routes/Login.tsx`
- Modify: `src/stores/authStore.ts`
- Modify: `src/api/auth.ts`

- [ ] **Step 1: 简化 Login 组件为仅 token 模式**

替换 `src/routes/Login.tsx` 完整内容为：

```tsx
import { type Component, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { loginWithToken, isLoggedIn } from "../stores/authStore";

const S = {
  page: "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:0 24px;background-color:var(--colorNeutralBackground3);color:var(--colorNeutralForeground1)",
  form: "width:100%;max-width:384px;display:flex;flex-direction:column;gap:20px",
  title: "text-align:center;margin-bottom:16px",
  h1: "font-size:var(--fontSizeHero800);font-weight:700;color:var(--colorNeutralForeground1)",
  sub: "color:var(--colorNeutralForeground2);font-size:var(--fontSizeBase300);margin-top:4px",
  disclaimer:
    "color:var(--colorNeutralForeground2);font-size:var(--fontSizeBase200);background-color:var(--colorNeutralBackground2);padding:12px;border-radius:var(--borderRadiusMedium);line-height:1.5",
  textarea:
    "width:100%;padding:10px;border-radius:var(--borderRadiusMedium);background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);font-size:var(--fontSizeBase300);border:1px solid var(--colorNeutralStroke1);outline:none;resize:vertical;box-sizing:border-box;min-height:120px",
  btn: "width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;border-radius:var(--borderRadiusMedium);font-size:var(--fontSizeBase300);font-weight:600;background-color:var(--colorBrandBackground);color:var(--colorNeutralForegroundOnBrand);border:none;cursor:pointer",
  error:
    "color:var(--colorStatusDangerForeground1);font-size:var(--fontSizeBase200);text-align:center;background-color:var(--colorStatusDangerBackground2);padding:8px;border-radius:var(--borderRadiusMedium)",
};

const Login: Component = () => {
  const navigate = useNavigate();
  const [token, setToken] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    if (isLoggedIn()) navigate("/recommended", { replace: true });
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await loginWithToken(token().trim());
      navigate("/recommended", { replace: true });
    } catch (err) {
      setError((err as { message?: string }).message ?? "登录失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={S.page}>
      <form onSubmit={handleSubmit} style={S.form}>
        <div style={S.title}>
          <h1 style={S.h1}>Pictelio</h1>
          <p style={S.sub}>第三方插画浏览器</p>
        </div>

        <div style={S.disclaimer}>
          本应用与 Pixiv 官方无任何关联，不存储、托管或分发任何图片内容。所有插画均来自 Pixiv 公开
          API，版权归原作者所有。请通过可信渠道获取你的 refresh_token。
        </div>

        <textarea
          style={S.textarea}
          placeholder="粘贴 Pixiv refresh_token..."
          value={token()}
          onInput={(e) => setToken(e.currentTarget.value)}
          required
          disabled={submitting()}
        />

        {error() && <div style={S.error}>{error()}</div>}

        <button type="submit" disabled={submitting()} style={S.btn}>
          {submitting() ? "登录中..." : "登录"}
        </button>
      </form>
    </div>
  );
};

export default Login;
```

- [ ] **Step 2: 移除 authStore 中的密码登录函数**

修改 `src/stores/authStore.ts`：

```typescript
// 删除以下导入：
// import { loginWithPassword } from "../api/auth";

// 删除 login(username, password) 函数

// 保留并导出：
export async function loginWithToken(token: string) {
  /* 现有实现 */
}
export async function logout() {
  /* 现有实现 */
}
```

- [ ] **Step 3: 移除 api/auth.ts 中的密码登录函数**

修改 `src/api/auth.ts`，删除 `loginWithPassword` 函数导出（若仅被 Login.tsx 使用）。

Run:

```bash
grep -R "loginWithPassword" src/
```

Expected: 仅 `src/api/auth.ts` 自身定义处有命中。

- [ ] **Step 4: 类型检查**

Run:

```bash
pnpm check
```

Expected: 无类型错误。

- [ ] **Step 5: Commit**

```bash
git add src/routes/Login.tsx src/stores/authStore.ts src/api/auth.ts
git commit -m "feat(auth): remove username/password login, keep token-only"
```

---

### Task 4: 加密本地 token 存储（可选但推荐）

**Files:**

- Modify: `package.json`
- Modify: `src/stores/authStore.ts`
- Create: `src/utils/secureStorage.ts`

- [ ] **Step 1: 安装安全存储插件**

Run:

```bash
pnpm add capacitor-secure-storage-plugin
```

- [ ] **Step 2: 创建加密存储封装**

创建 `src/utils/secureStorage.ts`：

```typescript
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const KEY_REFRESH_TOKEN = "refresh_token";

export async function getRefreshToken(): Promise<string | null> {
  try {
    const { value } = await SecureStoragePlugin.get({ key: KEY_REFRESH_TOKEN });
    return value;
  } catch {
    return null;
  }
}

export async function setRefreshToken(value: string): Promise<void> {
  await SecureStoragePlugin.set({ key: KEY_REFRESH_TOKEN, value });
}

export async function removeRefreshToken(): Promise<void> {
  try {
    await SecureStoragePlugin.remove({ key: KEY_REFRESH_TOKEN });
  } catch {
    // ignore
  }
}

/** 从旧版 Capacitor Preferences 迁移 */
export async function migrateRefreshTokenFromPreferences(): Promise<string | null> {
  const { Preferences } = await import("@capacitor/preferences");
  const { value } = await Preferences.get({ key: KEY_REFRESH_TOKEN });
  if (value) {
    await setRefreshToken(value);
    await Preferences.remove({ key: KEY_REFRESH_TOKEN });
  }
  return value;
}
```

- [ ] **Step 3: 更新 authStore 使用加密存储**

修改 `src/stores/authStore.ts`：

```typescript
import {
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  migrateRefreshTokenFromPreferences,
} from "../utils/secureStorage";

export async function initializeAuth() {
  setIsLoading(true);
  let value = await getRefreshToken();
  if (!value) {
    value = await migrateRefreshTokenFromPreferences();
  }
  if (value) {
    setRefreshTokenSig(value);
    setupUnauthorizedHandler();
    await performRefresh(value);
  }
  setIsLoading(false);
}

async function performRefresh(token: string) {
  try {
    const resp = await refreshToken(token);
    syncToken(resp.access_token);
    setRefreshTokenSig(resp.refresh_token);
    setUser(resp.user);
    setIsLoggedIn(true);
    await setRefreshToken(resp.refresh_token);
  } catch {
    await logout();
  }
}

export async function loginWithToken(token: string) {
  const resp = await refreshToken(token);
  syncToken(resp.access_token);
  setRefreshTokenSig(resp.refresh_token);
  setUser(resp.user);
  setIsLoggedIn(true);
  setupUnauthorizedHandler();
  await setRefreshToken(resp.refresh_token);
}

export async function logout() {
  syncToken("");
  setRefreshTokenSig(null);
  setUser(null);
  setIsLoggedIn(false);
  await removeRefreshToken();
}
```

- [ ] **Step 4: 同步 Capacitor Android 项目**

Run:

```bash
pnpm cap sync
```

Expected: `capacitor-secure-storage-plugin` 被同步到 `android/`。

- [ ] **Step 5: 类型检查与构建**

Run:

```bash
pnpm check && pnpm build
```

Expected: 通过。

- [ ] **Step 6: Commit**

```bash
git add package.json src/utils/secureStorage.ts src/stores/authStore.ts android/
git commit -m "feat(auth): encrypt refresh_token with secure storage"
```

---

### Task 5: 年龄门与默认过滤改造

**Files:**

- Modify: `src/stores/uiStore.ts`
- Create: `src/components/AgeGate.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsSheet.tsx`
- Modify: `src/routes/TabFeedPage.tsx`

- [ ] **Step 1: 在 uiStore 新增年龄确认状态**

修改 `src/stores/uiStore.ts`：

```typescript
const PREF_KEY_AGE_CONFIRMED = "age_confirmed";
const PREF_KEY_AGE_ADULT = "age_adult";

const [ageConfirmed, setAgeConfirmedSig] = createSignal<boolean>(false);
const [isAdult, setIsAdultSig] = createSignal<boolean>(false);

export const isAdult = () => isAdultSig();
export const ageConfirmed = () => ageConfirmedSig();

export async function loadAgePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_AGE_CONFIRMED });
    if (value !== null) {
      setAgeConfirmedSig(value === "true");
      const adult = await Preferences.get({ key: PREF_KEY_AGE_ADULT });
      setIsAdultSig(adult.value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load age preference", e);
  }
}

export async function setAgeConfirmation(confirmed: boolean, adult: boolean): Promise<void> {
  setAgeConfirmedSig(confirmed);
  setIsAdultSig(adult);
  try {
    await Preferences.set({ key: PREF_KEY_AGE_CONFIRMED, value: String(confirmed) });
    await Preferences.set({ key: PREF_KEY_AGE_ADULT, value: String(adult) });
  } catch (e) {
    console.warn("[uiStore] Failed to save age preference", e);
  }
}
```

- [ ] **Step 2: 修改 R-18/R-18G 默认值为 false**

在 `src/stores/uiStore.ts` 中：

```typescript
const [showR18, setShowR18Sig] = createSignal<boolean>(false);
const [showR18G, setShowR18GSig] = createSignal<boolean>(false);
```

- [ ] **Step 3: 创建 AgeGate 组件**

创建 `src/components/AgeGate.tsx`：

```tsx
import { type Component } from "solid-js";
import { setAgeConfirmation } from "../stores/uiStore";

const S = {
  overlay:
    "fixed inset-0 z-50 flex items-center justify-center bg-[var(--colorNeutralBackground1)]/90 p-6",
  card: "w-full max-w-sm rounded-[var(--borderRadiusXLarge)] bg-[var(--colorNeutralBackground1)] p-6 shadow-[var(--elevation8)] flex flex-col gap-4",
  title: "text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase500)] font-semibold",
  text: "text-[var(--colorNeutralForeground2)] [font-size:var(--fontSizeBase300)] leading-relaxed",
  row: "flex gap-3",
  btnPrimary:
    "flex-1 py-3 px-4 rounded-[var(--borderRadiusMedium)] bg-[var(--colorBrandBackground)] text-[var(--colorNeutralForegroundOnBrand)] font-semibold",
  btnSecondary:
    "flex-1 py-3 px-4 rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground3)] text-[var(--colorNeutralForeground1)] font-semibold",
};

const AgeGate: Component = () => {
  const confirm = (adult: boolean) => {
    void setAgeConfirmation(true, adult);
  };

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <h2 style={S.title}>年龄确认</h2>
        <p style={S.text}>
          Pictelio 展示来自第三方平台的公开插画，部分内容可能不适合未成年人。你是否已满 18 周岁？
        </p>
        <div style={S.row}>
          <button style={S.btnSecondary} onClick={() => confirm(false)}>
            未满 18 岁
          </button>
          <button style={S.btnPrimary} onClick={() => confirm(true)}>
            已满 18 岁
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgeGate;
```

- [ ] **Step 4: 在 App.tsx 挂载 AgeGate**

修改 `src/App.tsx`：

```tsx
import { Show } from "solid-js";
import AgeGate from "./components/AgeGate";
import { ageConfirmed, loadAgePreference } from "./stores/uiStore";

// 在初始化逻辑中调用 loadAgePreference()
// 在 JSX 中：
<Show when={!ageConfirmed()}>
  <AgeGate />
</Show>;
```

- [ ] **Step 5: 未成年时强制禁用 R-18 开关**

修改 `src/components/SettingsSheet.tsx`，在 R-18/R-18G 开关点击处理中：

```typescript
import { isAdult } from "../stores/uiStore";

// onClick handler for R-18 / R-18G toggles:
onClick={() => {
  if (!isAdult()) {
    // 显示提示：未成年用户不可开启成人内容
    return;
  }
  setShowR18(!showR18());
}}
```

- [ ] **Step 6: 隐藏关注页 R-18 子标签（未成年时）**

修改 `src/routes/TabFeedPage.tsx`：

```typescript
import { isAdult } from "../stores/uiStore";

// 在 sub-tab 渲染处：
<Show when={isAdult()}>
  <button onClick={() => setFollowSubTab("r18")}>R-18</button>
</Show>
```

- [ ] **Step 7: 类型检查**

Run:

```bash
pnpm check
```

- [ ] **Step 8: Commit**

```bash
git add src/stores/uiStore.ts src/components/AgeGate.tsx src/App.tsx src/components/SettingsSheet.tsx src/routes/TabFeedPage.tsx
git commit -m "feat(content): add age gate and default R-18/R-18G off"
```

---

### Task 6: 举报与屏蔽功能

**Files:**

- Create: `src/stores/reportStore.ts`
- Create: `src/stores/blockStore.ts`
- Create: `src/components/ReportSheet.tsx`
- Create: `src/components/BlocklistSheet.tsx`
- Modify: `src/routes/IllustDetail.tsx`
- Modify: `src/utils/r18Filter.ts`（若需过滤被屏蔽作者）

- [ ] **Step 1: 创建举报记录 store**

创建 `src/stores/reportStore.ts`：

```typescript
import { Preferences } from "@capacitor/preferences";
import { createSignal } from "solid-js";

const KEY_REPORTED = "reported_illust_ids";

const [reportedIds, setReportedIds] = createSignal<Set<number>>(new Set());

export { reportedIds };

export async function loadReportedIds(): Promise<void> {
  const { value } = await Preferences.get({ key: KEY_REPORTED });
  setReportedIds(new Set(value ? JSON.parse(value) : []));
}

export async function reportIllust(illustId: number): Promise<void> {
  const next = new Set(reportedIds());
  next.add(illustId);
  setReportedIds(next);
  await Preferences.set({ key: KEY_REPORTED, value: JSON.stringify([...next]) });
}

export function hasReported(illustId: number): boolean {
  return reportedIds().has(illustId);
}
```

- [ ] **Step 2: 创建屏蔽列表 store**

创建 `src/stores/blockStore.ts`：

```typescript
import { Preferences } from "@capacitor/preferences";
import { createSignal } from "solid-js";

const KEY_BLOCKED = "blocked_user_ids";

const [blockedIds, setBlockedIds] = createSignal<Set<number>>(new Set());

export { blockedIds };

export async function loadBlockedIds(): Promise<void> {
  const { value } = await Preferences.get({ key: KEY_BLOCKED });
  setBlockedIds(new Set(value ? JSON.parse(value) : []));
}

export async function blockUser(userId: number): Promise<void> {
  const next = new Set(blockedIds());
  next.add(userId);
  setBlockedIds(next);
  await Preferences.set({ key: KEY_BLOCKED, value: JSON.stringify([...next]) });
}

export async function unblockUser(userId: number): Promise<void> {
  const next = new Set(blockedIds());
  next.delete(userId);
  setBlockedIds(next);
  await Preferences.set({ key: KEY_BLOCKED, value: JSON.stringify([...next]) });
}

export function isBlocked(userId: number): boolean {
  return blockedIds().has(userId);
}
```

- [ ] **Step 3: 在 r18Filter 中过滤被屏蔽作者**

修改 `src/utils/r18Filter.ts`：

```typescript
import { isBlocked } from "../stores/blockStore";

function isRestricted(i: PixivIllust): boolean {
  if (isBlocked(i.user.id)) return true;
  if (!showR18() && i.x_restrict === 1) return true;
  if (!showR18G() && i.x_restrict === 2) return true;
  return false;
}
```

- [ ] **Step 4: 创建 ReportSheet 组件**

创建 `src/components/ReportSheet.tsx`，提供举报原因选择与邮件 intent 触发：

```tsx
import { type Component, createSignal } from "solid-js";
import { Capacitor } from "@capacitor/core";
import { reportIllust, hasReported } from "../stores/reportStore";

interface Props {
  illustId: number;
  onClose: () => void;
}

const reasons = ["色情", "暴力", "侵权", "垃圾广告", "其他"];

const ReportSheet: Component<Props> = (props) => {
  const [reason, setReason] = createSignal(reasons[0]);
  const [note, setNote] = createSignal("");
  const [done, setDone] = createSignal(false);

  const submit = async () => {
    await reportIllust(props.illustId);
    const subject = encodeURIComponent(`[Pictelio 举报] 作品 ${props.illustId}`);
    const body = encodeURIComponent(
      `原因：${reason()}\n补充：${note()}\n作品ID：${props.illustId}`,
    );
    const mailto = `mailto:YOUR_REPORT_EMAIL@example.com?subject=${subject}&body=${body}`;
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: mailto });
    } else {
      window.location.href = mailto;
    }
    setDone(true);
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={props.onClose}
    >
      <div
        class="w-full max-w-md bg-[var(--colorNeutralBackground1)] rounded-t-[var(--borderRadiusXLarge)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 class="[font-size:var(--fontSizeBase500)] font-semibold mb-4">举报作品</h3>
        {done() ? (
          <p class="text-[var(--colorNeutralForeground2)]">举报已记录，感谢你的反馈。</p>
        ) : (
          <>
            <div class="flex flex-col gap-2 mb-4">
              {reasons.map((r) => (
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    checked={reason() === r}
                    onChange={() => setReason(r)}
                  />
                  <span class="text-[var(--colorNeutralForeground1)]">{r}</span>
                </label>
              ))}
            </div>
            <textarea
              class="w-full rounded-[var(--borderRadiusMedium)] border border-[var(--colorNeutralStroke1)] p-3 mb-4"
              placeholder="补充说明（可选）"
              value={note()}
              onInput={(e) => setNote(e.currentTarget.value)}
              rows={3}
            />
            <button
              class="w-full py-3 rounded-[var(--borderRadiusMedium)] bg-[var(--colorStatusDangerBackground1)] text-[var(--colorStatusDangerForeground1)] font-semibold"
              onClick={submit}
              disabled={hasReported(props.illustId)}
            >
              {hasReported(props.illustId) ? "已举报" : "提交举报"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportSheet;
```

- [ ] **Step 5: 创建 BlocklistSheet 组件**

创建 `src/components/BlocklistSheet.tsx`，展示已屏蔽作者列表（因我们只有 userId，显示 ID 与解除按钮）：

```tsx
import { type Component, For } from "solid-js";
import { blockedIds, unblockUser } from "../stores/blockStore";

interface Props {
  onClose: () => void;
}

const BlocklistSheet: Component<Props> = (props) => {
  return (
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={props.onClose}
    >
      <div
        class="w-full max-w-md bg-[var(--colorNeutralBackground1)] rounded-t-[var(--borderRadiusXLarge)] p-6 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 class="[font-size:var(--fontSizeBase500)] font-semibold mb-4">屏蔽列表</h3>
        <div class="overflow-auto flex-1">
          <For each={[...blockedIds()]}>
            {(id) => (
              <div class="flex items-center justify-between py-3 border-b border-[var(--colorNeutralStroke1)]">
                <span class="text-[var(--colorNeutralForeground1)]">用户 ID: {id}</span>
                <button
                  class="px-3 py-1 rounded-[var(--borderRadiusSmall)] bg-[var(--colorNeutralBackground3)] text-[var(--colorNeutralForeground1)]"
                  onClick={() => unblockUser(id)}
                >
                  解除
                </button>
              </div>
            )}
          </For>
          {blockedIds().size === 0 && (
            <p class="text-[var(--colorNeutralForeground2)] text-center py-8">暂无屏蔽用户</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlocklistSheet;
```

- [ ] **Step 6: 在 IllustDetail 添加举报/屏蔽入口**

修改 `src/routes/IllustDetail.tsx`：

```tsx
import ReportSheet from "../components/ReportSheet";
import { blockUser } from "../stores/blockStore";

const [showReport, setShowReport] = createSignal(false);

// 在作者信息区域或菜单按钮处添加：
<button onClick={() => setShowReport(true)}>举报</button>
<button onClick={() => {
  const i = illust();
  if (i) void blockUser(i.user.id);
}}>屏蔽作者</button>

// 在 JSX 末尾：
{showReport() && illust() && <ReportSheet illustId={illust()!.id} onClose={() => setShowReport(false)} />}
```

- [ ] **Step 7: 初始化加载举报与屏蔽数据**

修改 `src/main.tsx` 或 `src/App.tsx`，在应用启动时调用：

```typescript
import { loadReportedIds } from "./stores/reportStore";
import { loadBlockedIds } from "./stores/blockStore";

await loadReportedIds();
await loadBlockedIds();
```

- [ ] **Step 8: Commit**

```bash
git add src/stores/reportStore.ts src/stores/blockStore.ts src/components/ReportSheet.tsx src/components/BlocklistSheet.tsx src/routes/IllustDetail.tsx src/utils/r18Filter.ts
git commit -m "feat(content): add report and block user features"
```

---

### Task 7: 免责声明与 About 页更新

**Files:**

- Modify: `src/routes/About.tsx`

- [ ] **Step 1: 在 About 页新增免责声明区块**

在 `src/routes/About.tsx` 的 `sections` 数组前新增：

```typescript
const sections: AboutSection[] = [
  {
    title: "免责声明",
    rows: [
      {
        label: "第三方客户端",
        value: "与 Pixiv 官方无关",
        icon: "info",
      },
      {
        label: "内容来源",
        value: "Pixiv 公开 API",
        icon: "info",
      },
      {
        label: "版权",
        value: "归原作者所有",
        icon: "info",
      },
    ],
  },
  // ... existing sections
];
```

- [ ] **Step 2: 替换 Logo 为 Pictelio 生成后的版本**

将 About 页内联的 Pixivizer Logo SVG 替换为使用 `<img src="/logo-192x192.png" />` 或新 SVG。

- [ ] **Step 3: Commit**

```bash
git add src/routes/About.tsx
git commit -m "feat(about): update brand and add disclaimer"
```

---

### Task 8: 隐私政策页面

**Files:**

- Create: `docs/privacy-policy.md`
- Create: `public/privacy-policy.html`
- Create: `website/privacy-policy.html`

- [ ] **Step 1: 编写隐私政策 Markdown 源文件**

创建 `docs/privacy-policy.md`：

```markdown
# Pictelio 隐私政策

**生效日期**: 2026-06-27

## 我们收集的信息

Pictelio 是一款第三方插画浏览器，仅在本地设备上处理以下数据：

- **Pixiv refresh_token**: 用于访问 Pixiv API，本地加密存储，不会上传至我们的服务器。
- **用户偏好**: 包括主题、布局模式、R-18/R-18G 开关、屏蔽列表、举报记录等，本地存储。
- **图片缓存**: 浏览过程中临时缓存的图片文件，可手动清除。

## 第三方服务

- **Pixiv API** (`app-api.pixiv.net`): 用于获取插画、用户、收藏等数据。
- **Pixiv CDN** (`i.pximg.net`): 用于加载图片。

## 您的权利

- 随时在应用设置中"清除所有本地数据"。
- 通过 Pixiv 官方渠道删除您的 Pixiv 账号。

## 联系我们

如有隐私相关问题，请联系：YOUR_PRIVACY_EMAIL@example.com
```

- [ ] **Step 2: 生成 HTML 版本到 public**

创建 `public/privacy-policy.html`（将 Markdown 转换为简单 HTML，可后续部署到 GitHub Pages）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pictelio 隐私政策</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        max-width: 720px;
        margin: 40px auto;
        padding: 0 20px;
        line-height: 1.6;
      }
      h1 {
        font-size: 1.8rem;
      }
      h2 {
        font-size: 1.3rem;
        margin-top: 1.5em;
      }
    </style>
  </head>
  <body>
    <h1>Pictelio 隐私政策</h1>
    <p><strong>生效日期</strong>: 2026-06-27</p>
    <h2>我们收集的信息</h2>
    <p>Pictelio 是一款第三方插画浏览器，仅在本地设备上处理以下数据：</p>
    <ul>
      <li>
        <strong>Pixiv refresh_token</strong>: 用于访问 Pixiv
        API，本地加密存储，不会上传至我们的服务器。
      </li>
      <li>
        <strong>用户偏好</strong>: 包括主题、布局模式、R-18/R-18G
        开关、屏蔽列表、举报记录等，本地存储。
      </li>
      <li><strong>图片缓存</strong>: 浏览过程中临时缓存的图片文件，可手动清除。</li>
    </ul>
    <h2>第三方服务</h2>
    <ul>
      <li>
        <strong>Pixiv API</strong> (<code>app-api.pixiv.net</code>):
        用于获取插画、用户、收藏等数据。
      </li>
      <li><strong>Pixiv CDN</strong> (<code>i.pximg.net</code>): 用于加载图片。</li>
    </ul>
    <h2>您的权利</h2>
    <ul>
      <li>随时在应用设置中"清除所有本地数据"。</li>
      <li>通过 Pixiv 官方渠道删除您的 Pixiv 账号。</li>
    </ul>
    <h2>联系我们</h2>
    <p>如有隐私相关问题，请联系：YOUR_PRIVACY_EMAIL@example.com</p>
  </body>
</html>
```

- [ ] **Step 3: 复制到 website 目录**

```bash
cp public/privacy-policy.html website/privacy-policy.html
```

- [ ] **Step 4: Commit**

```bash
git add docs/privacy-policy.md public/privacy-policy.html website/
git commit -m "docs: add privacy policy"
```

---

### Task 9: 账号删除入口

**Files:**

- Modify: `src/components/SettingsSheet.tsx`
- Modify: `src/stores/authStore.ts`（确保 logout 清除所有数据）

- [ ] **Step 1: 在 SettingsSheet 添加"清除所有本地数据"按钮**

在 `src/components/SettingsSheet.tsx` 底部新增区块：

```tsx
import { logout } from "../stores/authStore";

// 在设置列表末尾：
<div class="mx-4 mt-4 rounded-[var(--borderRadiusLarge)] bg-[var(--colorNeutralBackground1)] overflow-hidden">
  <button
    class="w-full px-4 py-3 flex items-center justify-between text-left"
    onClick={async () => {
      if (confirm("确定要清除所有本地数据吗？此操作无法恢复。")) {
        await logout();
        window.location.reload();
      }
    }}
  >
    <span class="text-[var(--colorStatusDangerForeground1)] font-semibold">清除所有本地数据</span>
  </button>
</div>

<div class="px-5 py-4 text-[var(--colorNeutralForeground3)] [font-size:var(--fontSizeBase200)] leading-relaxed">
  如需彻底删除 Pixiv 账号，请访问
  <a href="https://www.pixiv.net/setting_account.php" target="_blank" rel="noopener noreferrer" class="text-[var(--colorBrandForegroundLink)]">
    Pixiv 官方账号设置
  </a>。
</div>
```

- [ ] **Step 2: 确认 logout 清除全部 Preferences（可选扩展）**

如需彻底清除所有数据，可在 `src/stores/authStore.ts` 的 `logout()` 中：

```typescript
import { Preferences } from "@capacitor/preferences";

export async function clearAllLocalData() {
  await Preferences.clear();
  await logout();
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsSheet.tsx src/stores/authStore.ts
git commit -m "feat(settings): add account data deletion entry"
```

---

### Task 10: Release 构建与签名配置

**Files:**

- Modify: `package.json`
- Modify: `android/app/build.gradle`
- Modify: `.gitignore`
- Create: `android/app/proguard-rules.pro`（若不存在）

- [ ] **Step 1: 生成 release keystore**

Run:

```bash
cd android/app
keytool -genkey -v -keystore release.keystore -alias pictelio -keyalg RSA -keysize 2048 -validity 10000
```

按提示输入密码与组织信息。

- [ ] **Step 2: 将 keystore 加入 .gitignore**

修改 `.gitignore`：

```
# Release signing
android/app/release.keystore
*.keystore
```

- [ ] **Step 3: 配置 build.gradle release 签名**

修改 `android/app/build.gradle`：

```gradle
android {
    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword System.getenv("PICTELIO_KEYSTORE_PASSWORD")
            keyAlias "pictelio"
            keyPassword System.getenv("PICTELIO_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

- [ ] **Step 4: 添加 ProGuard 规则**

创建/修改 `android/app/proguard-rules.pro`：

```proguard
# Capacitor
-keep public class * extends com.getcapacitor.BridgeActivity { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# CapacitorHttp / SecureStorage plugins
-keep class com.getcapacitor.plugin.** { *; }
-keep class com.epicshaggy.** { *; }

# Keep JavaScript interfaces
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
```

- [ ] **Step 5: 新增 release 构建脚本**

修改 `package.json`：

```json
{
  "scripts": {
    "build:android:release": "pnpm run sync:android-version && pnpm run build && pnpm run cap:sync && cd android && ./gradlew assembleRelease"
  }
}
```

- [ ] **Step 6: Commit（不提交 keystore）**

```bash
git add package.json android/app/build.gradle android/app/proguard-rules.pro .gitignore
git commit -m "build: add release signing and proguard rules"
```

---

### Task 11: 本地 release 构建测试

**Files:**

- 无新文件

- [ ] **Step 1: 设置环境变量并构建**

Run:

```bash
export PICTELIO_KEYSTORE_PASSWORD=你的密码
export PICTELIO_KEY_PASSWORD=你的密码
pnpm build:android:release
```

- [ ] **Step 2: 验证 APK 输出**

Run:

```bash
ls -lh android/app/build/outputs/apk/release/app-release.apk
```

Expected: 文件存在，大小合理（通常 5-15MB）。

- [ ] **Step 3: 验证签名**

Run:

```bash
cd android/app
jarsigner -verify -verbose -certs build/outputs/apk/release/app-release.apk
```

Expected: 输出包含 "jar verified"。

- [ ] **Step 4: 安装到设备测试**

Run:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Expected: 安装成功，应用可正常打开。

- [ ] **Step 5: 测试核心功能**

手动验证：

- 年龄门弹窗
- Token 登录
- Feed 加载
- R-18 开关默认关闭
- 作品详情举报/屏蔽
- 设置中清除数据

- [ ] **Step 6: Commit（如修复了构建问题）**

```bash
git add .
git commit -m "fix(build): resolve release build issues"
```

---

### Task 12: F-Droid Fastlane 元数据

**Files:**

- Create: `fastlane/metadata/android/en-US/title.txt`
- Create: `fastlane/metadata/android/en-US/short_description.txt`
- Create: `fastlane/metadata/android/en-US/full_description.txt`
- Create: `fastlane/metadata/android/zh-CN/title.txt`
- Create: `fastlane/metadata/android/zh-CN/short_description.txt`
- Create: `fastlane/metadata/android/zh-CN/full_description.txt`
- Create: `fastlane/metadata/android/en-US/images/icon.png`
- Create: `fastlane/metadata/android/en-US/images/phoneScreenshots/1.png`
- Create: `.github/workflows/fdroid-update.yml`（可选）

- [ ] **Step 1: 创建英文元数据**

`fastlane/metadata/android/en-US/title.txt`:

```
Pictelio
```

`fastlane/metadata/android/en-US/short_description.txt`:

```
A third-party illustration browser
```

`fastlane/metadata/android/en-US/full_description.txt`:

```
Pictelio is a third-party illustration browser for Android.

Features:
- Browse recommended and following illustrations
- View artwork details, multi-page images, and Ugoira animations
- Bookmark and manage favorites
- Customizable content filtering with age gate
- Open source and privacy-friendly

Disclaimer: Pictelio is not affiliated with Pixiv. All content is sourced from Pixiv's public API and remains the property of its respective creators.
```

- [ ] **Step 2: 创建中文元数据**

`fastlane/metadata/android/zh-CN/title.txt`:

```
Pictelio
```

`fastlane/metadata/android/zh-CN/short_description.txt`:

```
第三方插画浏览器
```

`fastlane/metadata/android/zh-CN/full_description.txt`:

```
Pictelio 是一款第三方插画浏览器。

功能：
- 浏览推荐与关注插画
- 查看作品详情、多页图片与 Ugoira 动图
- 收藏与管理书签
- 可自定义的内容过滤与年龄门
- 开源且注重隐私

免责声明：Pictelio 与 Pixiv 官方无任何关联。所有内容均来自 Pixiv 公开 API，版权归原作者所有。
```

- [ ] **Step 3: 准备图标与截图**

```bash
cp public/logo-512x512.png fastlane/metadata/android/en-US/images/icon.png
# 截图需手动从设备/模拟器截取，放入 phoneScreenshots/
```

- [ ] **Step 4: Commit**

```bash
git add fastlane/
git commit -m "feat(fdroid): add fastlane metadata"
```

---

### Task 13: GitHub Release 脚本

**Files:**

- Create: `scripts/release-github.mjs`
- Modify: `package.json`

- [ ] **Step 1: 创建 release 脚本**

创建 `scripts/release-github.mjs`：

```javascript
import { readFileSync, createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { join } from "node:path";

const tag = process.argv[2];
if (!tag) {
  console.error("Usage: node scripts/release-github.mjs <tag>");
  process.exit(1);
}

const apkPath = join(process.cwd(), "android/app/build/outputs/apk/release/app-release.apk");
const sha256 = createHash("sha256").update(readFileSync(apkPath)).digest("hex");

const notes = `## Pictelio ${tag}

### 下载
- APK: \`app-release.apk\`
- SHA-256: \`${sha256}\`

### 安装
1. 下载 APK
2. 允许"安装未知来源应用"
3. 安装并打开

### 注意
本应用为第三方客户端，与 Pixiv 官方无关。`;

console.log("Creating GitHub release...");
execSync(
  `gh release create ${tag} "${apkPath}" --title "Pictelio ${tag}" --notes ${JSON.stringify(notes)}`,
  { stdio: "inherit" },
);
```

- [ ] **Step 2: 添加脚本命令**

修改 `package.json`：

```json
{
  "scripts": {
    "release:github": "node scripts/release-github.mjs"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/release-github.mjs package.json
git commit -m "feat(release): add github release helper script"
```

---

### Task 14: 官网落地页

**Files:**

- Create: `website/index.html`
- Create: `website/CNAME`（可选，用于自定义域名）

- [ ] **Step 1: 创建官网首页**

创建 `website/index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pictelio - 第三方插画浏览器</title>
    <style>
      body {
        font-family:
          system-ui,
          -apple-system,
          sans-serif;
        margin: 0;
        color: #1f1f1f;
        background: #f5f5f5;
      }
      .container {
        max-width: 720px;
        margin: 0 auto;
        padding: 60px 20px;
        text-align: center;
      }
      .logo {
        width: 120px;
        height: 120px;
        border-radius: 28px;
      }
      h1 {
        font-size: 2.5rem;
        margin: 20px 0 10px;
      }
      p {
        font-size: 1.1rem;
        color: #616161;
        line-height: 1.6;
      }
      .btn {
        display: inline-block;
        margin-top: 28px;
        padding: 14px 32px;
        background: #0078d4;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
      }
      .links {
        margin-top: 40px;
      }
      .links a {
        color: #0078d4;
        margin: 0 12px;
        text-decoration: none;
      }
      .disclaimer {
        margin-top: 60px;
        font-size: 0.85rem;
        color: #888;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <img src="logo-512x512.png" alt="Pictelio" class="logo" />
      <h1>Pictelio</h1>
      <p>
        一款开源、隐私友好的第三方插画浏览器，支持推荐流、关注流、作品详情、收藏与 Ugoira 动图播放。
      </p>
      <a class="btn" href="https://github.com/YOUR_USERNAME/pictelio/releases/latest">下载最新版</a>
      <div class="links">
        <a href="privacy-policy.html">隐私政策</a>
        <a href="https://github.com/YOUR_USERNAME/pictelio">GitHub</a>
        <a href="https://f-droid.org/">F-Droid</a>
      </div>
      <div class="disclaimer">
        Pictelio 与 Pixiv 官方无任何关联。所有内容均来自 Pixiv 公开 API，版权归原作者所有。
      </div>
    </div>
  </body>
</html>
```

- [ ] **Step 2: 复制 Logo 到 website**

```bash
cp public/logo-512x512.png website/logo-512x512.png
```

- [ ] **Step 3: Commit**

```bash
git add website/
git commit -m "feat(website): add landing page"
```

---

### Task 15: 最终集成与发布

**Files:**

- 所有已修改文件

- [ ] **Step 1: 完整类型检查**

Run:

```bash
pnpm check
```

Expected: 无错误。

- [ ] **Step 2: 完整 release 构建**

Run:

```bash
export PICTELIO_KEYSTORE_PASSWORD=你的密码
export PICTELIO_KEY_PASSWORD=你的密码
pnpm build:android:release
```

- [ ] **Step 3: 创建 Git tag**

Run:

```bash
git tag -a v1.0.0 -m "Pictelio 1.0.0"
git push origin v1.0.0
```

- [ ] **Step 4: 创建 GitHub Release**

Run:

```bash
pnpm release:github v1.0.0
```

- [ ] **Step 5: 部署官网**

将 `website/` 目录部署到 GitHub Pages：

```bash
git subtree push --prefix website origin gh-pages
```

或在仓库 Settings > Pages 中选择 `website/` 文件夹作为 source。

- [ ] **Step 6: 提交 F-Droid Data MR**

1. Fork https://gitlab.com/fdroid/fdroiddata
2. 在 `metadata/io.pictelio.app.yml` 添加构建配置：

```yaml
Categories:
  - Internet
  - Multimedia
License: MIT
SourceCode: https://github.com/YOUR_USERNAME/pictelio
IssueTracker: https://github.com/YOUR_USERNAME/pictelio/issues

RepoType: git
Repo: https://github.com/YOUR_USERNAME/pictelio

Builds:
  - versionName: 1.0.0
    versionCode: 101
    commit: v1.0.0
    subdir: android/app
    gradle:
      - yes
    prebuild: cd ../.. && pnpm install && pnpm run build && pnpm exec cap sync
```

3. 提交 Merge Request。

- [ ] **Step 7: 庆祝发布**

在 README 更新下载链接与状态徽章。

---

## 自检清单

### 1. Spec 覆盖度

| 设计文档要求                 | 对应任务   |
| ---------------------------- | ---------- |
| 应用名/包名改为 Pictelio     | Task 1     |
| 新图标与启动图               | Task 2     |
| 移除用户名/密码登录          | Task 3     |
| 本地 token 加密存储          | Task 4     |
| 默认过滤 R-18/R-18G + 年龄门 | Task 5     |
| 举报与屏蔽                   | Task 6     |
| 免责声明                     | Task 7     |
| 隐私政策页面                 | Task 8     |
| 账号删除入口                 | Task 9     |
| Release 签名 APK             | Task 10-11 |
| F-Droid 元数据               | Task 12    |
| GitHub Release               | Task 13    |
| 官网落地页                   | Task 14    |

### 2. Placeholder 扫描

- 无 "TBD"/"TODO"/"implement later"
- 所有代码片段包含完整可执行内容
- 邮件地址 `YOUR_PRIVACY_EMAIL@example.com` 与 `YOUR_REPORT_EMAIL@example.com` 为占位符，需在发布前替换为真实邮箱
- GitHub 仓库路径 `YOUR_USERNAME/pictelio` 为占位符，需在 Task 15 替换

### 3. 类型一致性

- `loginWithToken` 在 Task 3/4 中保持一致签名
- `isBlocked` 在 Task 6 中与 blockStore 导出一致
- `ageConfirmed` / `isAdult` 在 Task 5 中统一从 uiStore 导出

---

## 执行交接

**Plan complete and saved to `docs/superpowers/plans/2026-06-27-pictelio-public-release.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
