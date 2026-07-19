# Pixiv 第三方 Android 客户端登录页 UI 设计参考

> 研究日期：2026-07-20
> 研究范围：PixEz Flutter、Pixiv-Shaft（Shaft）
> PixShaft (wgh136/PixShaft) 仓库已不存在，无法研究。

---

## 1. PixEz Flutter (Notsfsssf/pixez-flutter)

**技术栈：** Flutter (Dart) + MobX 状态管理
**仓库分支：** `master`
**相关文件：**
- `lib/page/login/login_page.dart` — 登录页面主 UI
- `lib/page/login/token_page.dart` — 手动 Token 输入页
- `lib/page/login/login_store.dart` — 登录 Store（密码登录代码已注释）
- `lib/network/oauth_client.dart` — OAuth 客户端（PKCE 授权码流程）
- `lib/page/webview/webview_page.dart` — OAuth WebView 页

### 布局结构

```
┌──────────────────────────────────┐
│  [透明 AppBar]                    │  ← elevation: 0, backgroundColor: transparent
│                                  │     extendBodyBehindAppBar: true
│                                  │
│           ┌──────┐               │
│           │ LOGO │               │  ← Image.asset('assets/images/icon.png')
│           │80x80 │               │     80x80 px, 居中
│           └──────┘               │
│                                  │
│  ┌────────────────────────────┐  │
│  │   [FilledButton]  登录      │  │  ← Material 3 FilledButton
│  │                            │  │     全宽，stretch
│  ├────────────────────────────┤  │
│  │   [FilledButton]  注册      │  │  ← 同样 FilledButton 样式
│  ├────────────────────────────┤  │
│  │   [OutlinedButton]  Token  │  │  ← OutlinedButton，手动输入 refresh_token
│  ├────────────────────────────┤  │
│  │     使用条款 (TextButton)   │  │  ← 普通 TextButton，打开网页
│  └────────────────────────────┘  │
│                                  │
│  ┌──────────────────────────┐    │
│  │ ⚙️ settings  | 💬 about  │    │  ← BottomAppBar
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

### 关键 UI 细节

| 元素 | 描述 |
|------|------|
| **背景色** | 使用 Material Theme 默认背景（亮色/暗色跟随系统） |
| **AppBar** | 完全透明（`elevation: 0.0`, `backgroundColor: Colors.transparent`），不遮挡内容 |
| **Logo** | `assets/images/icon.png`，80×80 px，圆形，位于内容区顶部居中 |
| **登录按钮** | `FilledButton`（Material 3 填充按钮），全宽（`crossAxisAlignment: CrossAxisAlignment.stretch`），按钮间距 4px |
| **注册按钮** | 同样 `FilledButton`，文案来自 I18n：`dont_have_account` |
| **Token 输入** | `OutlinedButton` 风格，点击跳转到 `TokenPage`（独立的、含文本输入框的页面） |
| **使用条款** | `TextButton`，点击打开 `https://www.pixiv.net/terms/?page=term` |
| **底部栏** | `BottomAppBar`，包含设置和关于两个 `IconButton` |
| **按钮间距** | `SizedBox(height: 4)` 间隔有序按钮，顶部 10px 间距 |

### TokenPage（手动 token 输入页）

```
┌──────────────────────────────────┐
│  [AppBar]  ←                    │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 👤  token [___________]    │  │  ← TextFormField
│  │                            │  │     icon: Icons.supervised_user_circle
│  │                            │  │     hintText/labelText: 'token'
│  ├────────────────────────────┤  │
│  │       [  Next  ]          │  │  ← ElevatedButton
│  ├────────────────────────────┤  │
│  │  (错误信息 - 红色背景白字)   │  │  ← Visibility 控制，红色背景
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### 登录流程

1. 用户点击「登录」按钮 → `OAuthClient.generateWebviewUrl()` 生成 PKCE 授权 URL
2. 根据平台：
   - **iOS:** 内嵌 WebView 页面，拦截回调
   - **Android:** 使用 Custom Tab 或内嵌 WebView（取决于网络模式设置）
   - **macOS:** Custom Tab
3. OAuth 回调后执行 `code2Token()` 交换授权码为 Token
4. 自动跳转到主页

---

## 2. Shaft / Pixiv-Shaft (CeuiLiSA/Pixiv-Shaft)

**技术栈：** Kotlin + Java（混合），原生 Android
**仓库分支：** `classic`
**相关文件：**
- `app/src/main/java/ceui/lisa/fragments/FragmentLogin.kt` — 登录 Fragment（核心 UI 逻辑）
- `app/src/main/java/ceui/pixiv/login/PixivLogin.kt` — OAuth 登录入口
- `app/src/main/java/ceui/pixiv/login/PixivOAuthClient.kt` — OAuth Client
- `app/src/main/res/layout/activity_login.xml` — 登录 Activity 根布局
- `app/src/main/res/layout/page_login.xml` — 登录页内容布局
- `app/src/main/res/layout/page_language_selection.xml` — 语言选择页布局
- `app/src/main/res/drawable/login_scrim_gradient.xml` — 渐变遮罩层
- `app/src/main/res/drawable/round_corner_white_r20.xml` — 按钮背景圆角
- `app/src/main/res/menu/login_menu.xml` — 工具栏菜单

### 整体布局（两阶段启动页面）

Pixiv-Shaft 的登录页是**两阶段**设计：先选语言，再展示登录按钮。

#### 阶段一：语言选择页 (`page_language_selection.xml`)

```
┌──────────────────────────────────┐
│                                  │
│                                  │
│         Welcome                  │  ← greeting_hero: 44sp, Bold, 白字阴影
│       Choose your language       │  ← subtitle: 14sp, 75% 透明度
│                                  │
│  ┌────────────────────────────┐  │
│  │  ○ English                 │  │  ← 语言行列表
│  ├────────────────────────────┤  │
│  │  ● 中文 (简体)             │  │  ← 带 divider 分割线 (0.33 透明度白)
│  ├────────────────────────────┤  │
│  │  ○ 中文 (繁體)             │  │
│  ├────────────────────────────┤  │
│  │  ○ 日本語                  │  │
│  └────────────────────────────┘  │
│                                  │
│       ┌────────────────┐         │
│       │   Continue     │         │  ← 56dp 高，白色圆角背景，20sp 黑字
│       └────────────────┘         │     圆角 16dp
└──────────────────────────────────┘
```

**语言页设计细节：**
- 欢迎词每 2.2 秒循环切换（7 种语言），带淡入淡出动画（180ms fade out → 260ms fade in）
- 语言标签 "Welcome" 带阴影：`shadowColor="#80000000"`，偏移 (4, 8)，模糊半径 16
- 语言行列表渲染在 `NestedScrollView` 中（支持滚动）
- 选中语言后有选中指示器动画（check 图标透明度渐变 160ms）
- 行与行之间：0.5dp 白色分隔线（透明度 0.33）
- Continue 按钮文案随语言切换

#### 阶段二：登录页 (`page_login.xml`)

```
┌──────────────────────────────────┐
│  [Toolbar]           ⋮ (菜单)    │  ← 透明 Toolbar，含 settings/import
│                                  │
│                                  │
│         (动态隧道背景)            │  ← TracedTunnelView（全屏动画背景）
│                                  │
│                                  │
│  ┌────────────────────────────┐  │
│  │        [ 登录 ]            │  │  ← 白底圆角按钮，50dp 高，16dp 圆角
│  │        [ 注册 ]            │  │     30dp 水平边距，16sp 黑字
│  │                            │  │
│  │   邮箱备份/恢复登录 (13sp)  │  │  ← 85% 透明度白字
│  │                            │  │
│  │  ☐ 我已阅读并同意...       │  │  ← 12sp 白字，可点击的 ToS/Privacy 链接
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### 关键 UI 细节

| 元素 | 描述 |
|------|------|
| **背景色** | 纯黑 (`@android:color/black`) |
| **背景动画** | `TracedTunnelView` — 自定义隧道/粒子动画视图，随时间变化 |
| **渐变遮罩** | `login_scrim_gradient.xml` — 从透明 → 40% 黑色 → 88% 黑色（自顶向下），覆盖在背景动画上以增强按钮可读性 |
| **Loading Spinner** | 启动时显示白色 indetermindate ProgressBar (36dp)，着色 `@android:color/white`，shader 编译完成后淡出消失 |
| **工具栏** | 透明背景，右上角 overflow 菜单含"设置"和"导入账号"两项 |
| **语言页→登录页过渡** | 交叉淡入淡出（380ms），无 Activity recreate，保持动画背景连续 |
| **登录按钮** | `TextView` 模拟按钮，白色背景 (`#FFFFFF`)，16dp 圆角，50dp 高，水平边距 30dp，16sp 半粗体 Montserrat，黑色文字，底部间距 10dp |
| **注册按钮** | 与登录按钮完全相同样式 |
| **邮箱恢复** | 仅在非 lite 渠道显示，13sp，85% 白色透明度 |
| **协议复选框** | 自定义 FrameLayout + ImageView（`terms_checkbox`），12sp 白字，可点击 ToS 和 Privacy Policy 链接（SpannableString + ClickableSpan） |
| **底部间距** | 动态适配系统导航栏高度，20dp + 系统导航栏高度 |
| **API 33+** | 等待 Shader 编译完成后才展示 UI（淡入 800-1200ms） |

### 登录流程

1. 应用启动 → `FragmentLogin` 加载
2. 如首次使用 → 显示**语言选择页**（`page_language_selection`）
3. 用户选择语言→点击 Continue → 语言页淡出，登录页淡入
4. 如已有语言配置 → 直接显示登录页
5. 用户点击「登录」或「注册」→ 弹出代理提示 Dialog → 确认后通过 Chrome Custom Tabs 打开 Pixiv OAuth URL
6. 回调处理 → 交换 authorization code → 获取 token → 进入主页

### 账号导入功能

工具栏菜单提供「导入账号」功能，从剪贴板读取 JSON 格式的用户信息，支持离线恢复登录。

## 3. PixShaft (wgh136/PixShaft)

**仓库 `https://github.com/wgh136/PixShaft` 已不存在（返回 404），无法研究。**

## 总结对比

| 特性 | PixEz Flutter | Shaft (Pixiv-Shaft) |
|------|---------------|---------------------|
| **框架** | Flutter (Dart) | 原生 Android (Kotlin/Java) |
| **背景** | 跟随系统 Material Theme | 纯黑 + 动态隧道动画背景 |
| **Logo** | 80×80 App icon，居中 | 无 Logo |
| **品牌位置** | Logo 在页面顶部 | 无品牌元素 |
| **语言选择** | 无（首次启动引导在 GuidePage） | 内置语言选择欢迎页（7 种语言） |
| **登录方式** | PKCE OAuth (WebView/CustomTab) + 手动 Token | PKCE OAuth (Chrome CustomTabs) + 导入账号 |
| **注册入口** | 有（"Don't have an account"） | 有（"Sign up"按钮） |
| **使用条款** | TextButton 打开外部链接 | 内联 SpannableString 可点击链接 |
| **底部栏** | Settings + About IconButton | Toolbar overflow 菜单 |
| **按钮风格** | Material 3 (FilledButton/OutlinedButton) | 自定义白色圆角 TextButton |
| **登录按钮样式** | FilledButton（主题色填充） | 白色底黑字，16dp 圆角 |
| **动画** | 无特殊动画 | 背景隧道动画 + 语言轮播 + 淡入淡出过渡 |
| **未登录预览** | PreviewPage 展示 | 无（直接显示登录页） |
| **密码登录** | 支持（代码中存在，但已注释） | 不支持（仅 OAuth） |
