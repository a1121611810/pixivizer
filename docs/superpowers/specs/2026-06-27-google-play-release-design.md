# Pixivizer 公开发布与分发方案设计

**日期**: 2026-06-27  
**状态**: 已批准（方案 B 调整版：去品牌化合规 + F-Droid/GitHub/官网分发）  
**作者**: Kimi Code ( assisted )  

---

## 1. 背景与目标

Pixivizer 是一款基于 SolidJS + Capacitor 的 Android 应用，当前通过本地构建生成 debug APK。本方案的目标是在符合主流分发渠道政策的前提下，对应用进行合规改造，并通过 **F-Droid、GitHub Releases 与官网**进行公开发布，建立可持续的更新流程。

**重要调整**: 由于 Google Play 对新个人开发者账号强制要求 12 名真实测试者连续 14 天封闭测试，而当前难以招募足够测试者，因此**完全放弃 Google Play 商店**作为首发渠道。

## 2. 当前状态盘点

### 2.1 已满足项

| 项目 | 现状 | 说明 |
|---|---|---|
| 框架版本 | Capacitor 8.4.0 | 较新，支持 Android 16 行为 |
| targetSdkVersion | 36 | ✅ 已满足 2026/08/31 后的新政 |
| compileSdkVersion | 36 | ✅ 与 targetSdk 一致 |
| minSdkVersion | 24 | Android 7.0，覆盖范围较广 |
| 权限 | 仅 `INTERNET` | 无高危权限，审查较友好 |
| 构建工具 | Gradle 8.13 + AGP 8.13 | 较新，支持 AAB 与 Play App Signing |

### 2.2 待改造项

| 项目 | 现状 | 风险/影响 |
|---|---|---|
| 构建产物 | 仅 `assembleDebug` APK | 公开分发需要签名 release APK |
| 签名 | 无 release 签名配置 | 无法生成可公开发布的 APK |
| 隐私政策 | 无 | F-Droid 与 GitHub 用户信任基础，缺失会被投诉或拒审 |
| 账号删除 | 无入口 | 含登录功能的应用需提供数据删除机制 |
| 应用品牌 | 名称/包名/Logo 均含 Pixiv 元素 | 高度涉嫌品牌侵权/假冒行为 |
| 登录方式 | 支持用户名/密码 + refresh_token | 第三方应用收集官方凭证易被认定为钓鱼 |
| 内容过滤 | 无 R-18/R-18G 过滤与年龄门 | 违反性内容与用户生成内容政策 |
| 举报机制 | 无 | UGC 应用必须具备 |

### 2.3 关键政策风险

1. **品牌与知识产权**
   - **具体风险**: 应用名 "Pixivizer"、包名 `com.pixivizer.app`、Logo 与 Pixiv 品牌强相关。Pixiv 有权发送 DMCA/侵权投诉，GitHub/F-Droid 等平台收到投诉后可能下架仓库或应用；应用商店（如 Amazon/Samsung）也可能以"假冒/未授权使用品牌"为由拒绝。
   - **后果**: 仓库被禁用、应用被下架、用户信任崩塌、可能面临法律函件。
   - **缓解**: 彻底更换名称、包名、Logo、品牌色；所有文案不暗示官方关系。
2. **欺骗性行为 / 凭证收集**
   - **具体风险**: 在第三方客户端内要求用户输入 Pixiv 用户名/密码，安全研究者可能将其标记为钓鱼软件或凭证收割工具；杀毒软件/浏览器安全服务可能标记下载链接为危险。
   - **后果**: GitHub Release 被标记为恶意软件、F-Droid 审核拒绝、用户在社群中传播负面评价。
   - **缓解**: 完全移除用户名/密码登录，仅支持 refresh_token 粘贴；在登录页显著声明"本应用不收集密码"。
3. **性内容与 UGC**
   - **具体风险**: Pixiv 平台包含 R-18/R-18G 内容。若应用默认展示且未提供年龄验证、内容过滤、举报机制，将违反 F-Droid 内容政策、GitHub 使用条款以及部分国家/地区的法律法规（如美国 18 U.S.C. § 2252A、欧盟 DSA 对未成年人保护的要求）。
   - **后果**: F-Droid 拒绝收录或从仓库移除、GitHub 仓库被警告或限制、在部分司法管辖区可能承担法律责任。
   - **缓解**: 默认关闭 R-18/R-18G、首次启动年龄门、设置中二次确认、提供举报与屏蔽、隐私政策中明确说明。
4. **账号删除与数据权利**
   - **具体风险**: 应用支持用户登录（OAuth）并存储 token、偏好设置、缓存数据。若未提供清晰的数据删除入口，可能违反 GDPR（欧盟）、CCPA（加州）等数据保护法规，也违反 F-Droid 对隐私友好应用的基本要求。
   - **后果**: 用户投诉、仓库被要求整改、在隐私社区口碑受损。
   - **缓解**: 设置中提供"清除所有本地数据"按钮；提供 Pixiv 官方账号删除链接；隐私政策中列明数据类型与用户权利。
5. **客户端标识（User-Agent）**
   - **具体风险**: 当前 HTTP 请求使用 `PixivIOSApp` 作为 User-Agent 以通过 Pixiv API 校验。虽然这是技术必需，但安全扫描或人工审查可能将其视为仿冒 iOS 客户端或欺骗性标识；若 Pixiv 更改 API 校验逻辑，该标识也可能失效。
   - **后果**: 应用被误标为恶意软件、API 请求失败导致应用无法使用。
   - **缓解**: 保留当前标识以维持功能，但准备技术说明文档解释其必要性；同时监控 API 行为变化，必要时迁移到新的认证方式。

## 3. 可选方案对比

| 方案 | 核心策略 | 优点 | 缺点 | 推荐度 |
|---|---|---|---|---|
| A. 最小改造 | 保留 Pixivizer 品牌，仅做基础过滤与打包 | 改动小、见效快 | 品牌+凭证+UGC 高风险，在 F-Droid/GitHub 仍可能被投诉下架 | 低 |
| **B. 去品牌化合规 + 开源分发** | **改名/换 Logo/换包名；仅 refresh_token；默认过滤 R-18；加年龄门、举报、隐私政策、账号删除；上架 F-Droid + GitHub Releases + 官网** | **避开 Google Play 测试门槛；F-Droid 与 GitHub 对开源第三方客户端更友好；长期可维护** | **需要 rebranding 与功能改造，耗时约 1-2 个月** | **高** |
| C. 官网直链 | 仅通过官网/GitHub 提供 APK，不做任何商店上架 | 最自由、无审核 | 传播范围小，用户需手动允许未知来源安装 | 中 |

**决策**: 采用方案 B（调整版），以 F-Droid、GitHub Releases 与官网为主要分发渠道。

## 4. 详细设计

### 4.1 品牌与身份

- **新应用名**: **Pictelio**（自创词，无同名 App/公司，避开 "Pixiv" 品牌）。
- **新 applicationId**: `io.pictelio.app`（与 `com.pixivizer.app` 不同，使用现代 `io.` 前缀）。
- **新图标与启动图**: 
  - 重新设计 `assets/logo/pictelio-logo.svg` 与 `assets/logo/ic_launcher_foreground.svg`，避免与 Pixiv 品牌色/狐狸形象相似。
  - 更新 `scripts/generate-icons.mjs` 中的 SVG 路径，重新生成 favicon、PWA 图标与 Android mipmap 资源。
  - 运行 `pnpm generate:icons` 验证输出。
- **商店文案**: 不声称"官方 Pixiv 客户端"，明确标注"第三方插画浏览器"。
- **应用内文案**: 登录页、关于页显著提示"本应用与 Pixiv 官方无关"。

### 4.2 登录安全改造

- **移除用户名/密码登录**: 仅保留 `refresh_token` 粘贴登录。
- **安全提示**: 登录页顶部显示免责声明，引导用户通过可信渠道获取 token。
- **本地存储安全**: token 当前使用 Capacitor Preferences 明文存储。考虑到 refresh_token 的敏感性，正式版必须采用以下任一方案，并在隐私政策中披露具体方式：
  - **方案 ①（推荐）**: 引入 `capacitor-secure-storage-plugin`（或 Capacitor Community 的 `@capacitor-community/preferences` 加密封装），利用 Android Keystore 生成/保存密钥，AES 加密后存于 SharedPreferences。优点是与 Capacitor 生态集成好、实现简单；缺点是新增原生依赖。
  - **方案 ②（自研）**: 继续用 Capacitor Preferences，但在 JS 层用 Web Crypto / SubtleCrypto 加密。需要解决密钥派生与存储问题（例如把密钥拆分到 Keychain/Keystore），实现复杂，不推荐。
  - **方案 ③（兜底）**: 若技术上暂不加密，必须在隐私政策中明确告知"refresh_token 以明文形式本地存储，不会上传至我们的服务器"，并建议用户在共享设备上谨慎使用。该方案合规但安全性弱，可能被安全研究者或分发平台质疑。
  - **决策倾向**: 方案 ①，在保障安全的同时满足 F-Droid 与社区对敏感数据存储的期望。

### 4.3 内容合规改造

- **默认过滤**: 应用已具备 R-18 / R-18G 本地过滤开关。正式版需将默认值从 `true` 改为 `false`，确保新用户首次打开时默认不展示成人/猎奇内容。
- **年龄门**: 首次启动弹窗确认用户是否年满 18 岁，并说明应用展示第三方平台公开内容。
  - 选择"是"：允许用户在设置中手动开启 R-18 / R-18G 开关。
  - 选择"否"：强制禁用 R-18 / R-18G 开关，并在设置页提示"未成年用户不可开启成人内容"。
  - 该选择持久化到 Preferences，用户可在设置中重新进行年龄确认。
- **内容开关改造**: 保留设置中的"显示 R-18"和"显示 R-18G"开关，但默认关闭；开启前必须再次确认年龄，并记录用户选择（已通过 Preferences 持久化）。
- **关注页子标签**: 当前关注页有"全部 / R-18"子标签，需默认隐藏"R-18"入口，仅在用户明确开启 R-18 开关后显示。
- **举报与屏蔽**: 在作品详情页菜单中提供两项操作：
  - **举报作品**: 弹出表单，收集举报原因（色情/暴力/侵权/垃圾广告/其他）与补充说明。由于无自建后端，举报内容通过系统分享或邮件 intent 发送至开发者邮箱，同时在本地 Preferences 中记录已举报作品 ID，防止重复举报。
  - **屏蔽作者**: 将作者 ID 加入本地屏蔽列表（Preferences），后续所有 Feed、详情、收藏列表均过滤该作者作品；在设置中提供"管理屏蔽列表"入口，支持批量解除屏蔽。
- **免责声明**: 在登录页、关于页、年龄门、隐私政策中统一展示以下声明：
  - "本应用是第三方客户端，与 Pixiv 官方无任何关联，不存储、托管或分发任何图片内容。"
  - "所有插画均来自 Pixiv 公开 API，版权归原作者所有，用户需遵守 Pixiv 服务条款与当地法律法规。"
  - "未成年人请在监护人指导下使用，开启成人内容前必须确认已年满 18 周岁。"

### 4.4 隐私与数据

- **隐私政策页面（草稿先行）**: 
  - 在项目中创建 `public/privacy-policy.html` 草稿，包含真实隐私政策内容（收集的数据、第三方、用户权利等），后续可一键部署到 GitHub Pages 或独立域名。
  - 声明收集的数据：refresh_token（本地加密存储）、设备信息（用于诊断）、浏览记录（本地缓存）、举报与屏蔽列表（本地）。
  - 声明第三方：Pixiv API、i.pximg.net CDN。
  - 说明用户权利：查看、删除、导出本地数据；账号删除请通过 Pixiv 官方渠道。
  - 官网、GitHub Release、F-Droid 元数据中的隐私政策 URL 在最终发布前替换为真实可访问链接。
- **账号删除入口**: 由于用户在 Pixivizer 中并未创建新账号，而是使用 Pixiv OAuth 登录，因此"账号删除"需拆分为两层实现：
  - **应用内数据删除（必须）**: 在设置页提供"清除所有本地数据"按钮，点击后删除 refresh_token、用户偏好、浏览缓存、举报/屏蔽记录，并自动登出。此操作完全在本地完成，无需联网。
  - **Pixiv 官方账号删除（引导）**: 因为用户的实际账号在 Pixiv 平台，应用无法直接删除。在"清除本地数据"下方提供说明文案与可点击链接："如需彻底删除 Pixiv 账号，请访问 Pixiv 官方账号删除页面"，链接至 `https://www.pixiv.net/setting_account.php` 或官方帮助文档中的删除入口。
  - **删除确认流程**: 用户点击"清除所有本地数据"后，弹出二次确认对话框，明确告知"这将删除本设备上的所有应用数据，且无法恢复"；确认后立即执行并返回登录页。
  - **未来若自建后端**: 需新增"申请删除服务端数据"入口，通过邮件/表单收集用户请求，并在 30 天内完成删除。

### 4.5 构建与签名

- **Release 构建脚本**: 新增 `pnpm build:android:release`，执行以下步骤：
  1. `pnpm run sync:android-version`：将 `package.json` 中的 `version` 同步到 `android/app/build.gradle` 的 `versionName`，并递增 `versionCode`。
  2. `pnpm run build`：Vite 生产构建，输出到 `dist/`。
  3. `pnpm run cap:sync`：将 Web 产物与 Capacitor 配置同步到 `android/`。
  4. `cd android && ./gradlew assembleRelease`：生成签名 APK `android/app/build/outputs/apk/release/app-release.apk`。
     - F-Droid 和 GitHub Releases 均以 APK 为主要分发格式；AAB 对非 Play 渠道不必要。
- **Release 签名配置**: 
  - 生成 release keystore（由开发者自己保管，用于所有公开 APK 签名）：
    ```bash
    keytool -genkey -v -keystore release.keystore -alias pixivizer -keyalg RSA -keysize 2048 -validity 10000
    ```
  - 将 `release.keystore` 放在项目根目录或 `android/app/` 下，**不提交到 git**，并加入 `.gitignore`。
  - 在 `android/app/build.gradle` 的 `android` 块中新增 `signingConfigs`：
    ```gradle
    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword System.getenv("PIXIVIZER_KEYSTORE_PASSWORD")
            keyAlias "pixivizer"
            keyPassword System.getenv("PIXIVIZER_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    ```
  - 环境变量方式避免在仓库中硬编码密码；CI/CD 中通过 secrets 注入。
- **版本号策略**: 
  - `versionCode` 从当前 100 继续递增。
  - `versionName` 从 `0.1.0` 跳至 `1.0.0` 表示首个正式版。
  - 后续更新：补丁版本 `versionName` 如 `1.0.1`，`versionCode` 同步 +1。
- **混淆与压缩**: 
  - release 构建开启 `minifyEnabled true` + `shrinkResources true`。
  - ProGuard 规则保留 Capacitor、SolidJS 所需的类与方法（需测试验证，若出现运行时异常可回退到 `minifyEnabled false`）。

### 4.6 测试与发布流程

1. **本地内部测试**: 
   - 使用 `pnpm build:android:release` 生成签名 APK，手动安装到 2-3 台不同 Android 版本/屏幕尺寸的设备上。
   - 验证核心功能：登录、Feed 加载、作品详情、收藏、Ugoira 播放、设置、年龄门、R-18 开关。
   - 检查崩溃、ANR、UI 适配、内存占用。
2. **GitHub Releases 发布**: 
   - 在 GitHub 创建 Release，上传 `app-release.apk` 与源码 zip。
   - Release Notes 说明版本更新内容、已知问题、安装方式。
   - 提供校验信息（SHA-256）方便用户验证 APK 完整性。
   - 在 README 和官网放置最新版下载链接。
3. **F-Droid 提交**: 
   - **F-Droid 要求**: 应用完全开源、无专有/闭源依赖、无跟踪 SDK、构建可复现（preferred）。
   - 准备 Fastlane 元数据目录：`fastlane/metadata/android/en-US/` 与 `zh-CN/`，包含：
     - `title.txt`（应用名，30 字符内）
     - `short_description.txt`（80 字符内）
     - `full_description.txt`（完整描述）
     - `images/icon.png`（512×512）
     - `images/phoneScreenshots/`（2-8 张截图）
     - `images/featureGraphic.png`（1024×500，可选）
   - 提交 Merge Request 到 F-Droid Data 仓库，引用本项目的 release tag 与 APK 构建配置。
   - F-Droid 审核周期通常 1-4 周，通过后自动根据 Git tag 检测新版本并构建发布。
4. **官网发布**: 
   - 创建简单落地页，包含应用介绍、隐私政策、下载按钮（跳转 GitHub Release）、使用说明、免责声明。
   - 可部署到 GitHub Pages、Vercel、Cloudflare Pages 等免费静态托管。

### 4.7 商店素材清单

- **F-Droid 元数据**: 
  - 512×512 px 应用图标
  - 1024×500 px feature graphic（可选）
  - 2-8 张手机截图（推荐包含浅色/深色主题）
  - 30 字符以内应用名
  - 80 字符以内短描述
  - 完整描述（支持 Markdown）
- **GitHub Release**: 
  - Release title 与 tag（如 `v1.0.0`）
  - 上传签名 APK 与源码压缩包
  - SHA-256 校验值
  - 中文/英文更新日志
- **官网**: 
  - 应用介绍页
  - 隐私政策页面
  - 下载按钮（跳转 GitHub Release）
  - 联系邮箱或 Telegram/Discord 社群入口

## 5. 实施里程碑

| 阶段 | 任务 | 预估耗时 | 依赖 |
|---|---|---|---|
| 1. 品牌决策 | 确定新名称、applicationId、设计新 Logo | 3-5 天 | 用户决策 |
| 2. 代码改造 | rebranding、登录方式、内容过滤、年龄门、举报、关于页免责声明 | 2-3 周 | 阶段 1 |
| 3. 合规文档 | 撰写隐私政策、账号删除流程、README 更新 | 3-5 天 | 阶段 2 |
| 4. 构建与签名 | release APK 脚本、本地 keystore、混淆规则、内部测试 | 1 周 | 阶段 2-3 |
| 5. GitHub 首发 | 创建 v1.0.0 Release、上传签名 APK、发布官网 | 1-2 天 | 阶段 4 |
| 6. F-Droid 提交 | 准备 Fastlane 元数据、提交 F-Droid Data MR | 3-5 天 | 阶段 5 |
| 7. F-Droid 审核与上线 | 等待审核、处理反馈、自动更新配置 | 1-4 周 | 阶段 6 |

**总预估**: 约 5-8 周（含 F-Droid 审核）。Google Play 相关步骤已移除。

## 6. 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|---|---|---|---|
| F-Droid 以"专有依赖/不可复现构建"拒绝 | 中 | 高 | 检查所有依赖许可证；提供完整构建说明；必要时禁用 minify |
| 用户/平台投诉品牌侵权 | 中 | 高 | 彻底去品牌化，商店描述明确第三方身份 |
| 用户投诉成人内容 | 中 | 中 | 默认过滤 R-18，加年龄门与举报 |
| 安全研究者质疑凭证收集 | 低 | 中 | 移除用户名/密码登录，使用加密存储 |
| 混淆导致 Capacitor/SolidJS 异常 | 低 | 中等 | 充分内部测试后再发布 |
| GitHub/F-Droid 政策变化 | 低 | 中 | 保留官网直链作为最终分发备份 |

## 7. 决策记录

- **放弃 Google Play，采用方案 B 调整版**: 由于无法完成 12 人/14 天封闭测试，将分发主战场调整为 F-Droid + GitHub Releases + 官网。
- **采用方案 B（去品牌化合规版）**: 无论选择哪个渠道，去品牌化、内容过滤、移除密码登录都是降低下架/投诉风险的必要改造。
- **默认过滤 R-18**: 优先满足 F-Droid 与社区的内容安全期望；成年用户可在设置中开启。
- **自行管理 Release 签名**: 不再使用 Play App Signing，开发者自行保管 keystore 并签名 APK。

## 8. 其他可选分发渠道

本方案主渠道为 **F-Droid + GitHub Releases + 官网**。后续如条件允许，可考虑扩展至以下渠道：

| 渠道 | 特点 | 适合度 | 注意事项 |
|---|---|---|---|
| **IzzyOnDroid** | F-Droid 的替代仓库，审核相对宽松 | ⭐⭐⭐⭐ | 若进入主 F-Droid 仓库困难，可作为备选。 |
| **Amazon Appstore** | 海外主流替代商店 | ⭐⭐⭐ | 审核比 Google Play 宽松，但成人内容政策严格。 |
| **Samsung Galaxy Store** | 三星设备预装 | ⭐⭐⭐ | 审核周期较短，但对第三方版权内容敏感。 |
| **APKMirror / APKPure** | 第三方 APK 聚合站 | ⭐⭐ | 用户基数大，但应用来源不受开发者直接控制。 |
| **Telegram / Discord** | 海外社群分发 | ⭐⭐ | 适合小范围传播，无法规模化。 |

**不再考虑**: Google Play（因 12 人/14 天封闭测试不可行）。

## 9. 下一步

进入 `writing-plans` 阶段，输出针对 F-Droid + GitHub Releases + 官网分发的可执行实施计划与任务拆分。
