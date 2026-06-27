# Pictelio 公共版本发布前检查清单

> 本文件由 Task 15「最终集成与发布」生成，记录 Tasks 1-15 完成情况、验证结果以及正式发布前仍需处理的占位符与检查项。

---

## 一、Tasks 1-15 完成摘要

| 任务    | 内容                    | 关键产出                                                                                   |
| ------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| Task 1  | 重命名应用身份          | 应用名/包名改为 Pictelio (`io.pictelio.app`)，`APP_VERSION` 从 `package.json` 注入         |
| Task 2  | 重新生成应用图标        | 生成 Pictelio 品牌图标与启动图，覆盖 `assets/`、`public/`、`android/app/src/main/res/`     |
| Task 3  | 移除用户名/密码登录     | 仅保留 refresh_token 登录方式，移除密码输入与相关 API                                      |
| Task 4  | 加密本地 token 存储     | 使用 `capacitor-secure-storage-plugin` 将 refresh_token 存入 Android Keystore              |
| Task 5  | 年龄门与默认过滤改造    | 默认过滤 R-18/R-18G，首次展示敏感内容前弹出年龄确认                                        |
| Task 6  | 举报与屏蔽功能          | 新增 `ReportSheet`、`BlockSheet` 与对应 store，支持举报/屏蔽用户或作品                     |
| Task 7  | 免责声明与 About 页更新 | `About.tsx` 加入第三方免责声明，说明与 Pixiv 无关联                                        |
| Task 8  | 隐私政策页面            | 新增 `docs/privacy-policy.md`、`website/privacy-policy.html`、`public/privacy-policy.html` |
| Task 9  | 账号删除入口            | 设置中提供「清除所有本地数据」入口                                                         |
| Task 10 | Release 构建与签名配置  | 配置 Gradle release 签名、`android/app/pictelio-release.keystore` 占位                     |
| Task 11 | 本地 release 构建测试   | 验证签名 APK 构建流程                                                                      |
| Task 12 | F-Droid Fastlane 元数据 | 创建 `fastlane/metadata/android/` 多语言描述、图标、截图与功能图占位                       |
| Task 13 | GitHub Release 脚本     | `scripts/release-github.mjs` 自动构建签名 APK 并发布到 GitHub Releases                     |
| Task 14 | 官网落地页              | 创建 `website/index.html`、`website/privacy-policy.html` 等品牌官网                        |
| Task 15 | 最终集成与发布          | 替换 GitHub 仓库占位符、同步隐私政策、全量验证、Android 构建冒烟测试                       |

---

## 二、占位符替换情况

- ✅ `YOUR_USERNAME/pictelio` → `a1121611810/pixivizer`（已替换于 `website/index.html`）
- ✅ `YOUR_NAME` → `a1121611810`（已替换于 `website/index.html` 版权信息）
- ⏸ `YOUR_PRIVACY_EMAIL@example.com`（保留，正式发布前替换）
- ⏸ `YOUR_REPORT_EMAIL@example.com`（保留，正式发布前替换）
- ✅ `public/privacy-policy.html` 已与 `website/privacy-policy.html` 保持同步

---

## 三、预发布检查清单

- [ ] 替换 `YOUR_PRIVACY_EMAIL@example.com` 为真实隐私联系邮箱
- [ ] 替换 `YOUR_REPORT_EMAIL@example.com` 为真实举报联系邮箱
- [ ] 创建真实 release keystore 于 `android/app/pictelio-release.keystore`
- [ ] 设置环境变量 `PICTELIO_KEYSTORE_PASSWORD` 与 `PICTELIO_KEY_PASSWORD`
- [ ] 验证 `pnpm release:github --repo=a1121611810/pixivizer` 可正常工作
- [ ] 向 `fastlane/metadata/android/en-US/images/phoneScreenshots/` 添加真实截图
- [ ] 向 `fastlane/metadata/android/en-US/images/featureGraphic.png` 添加真实功能图
- [ ] 提交 F-Droid 收录申请（参考 `docs/superpowers/plans/2026-06-27-pictelio-public-release.md` 中的 metadata 模板）

---

## 四、Task 15 验证结果

| 验证项             | 命令                                                | 结果                                                         |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------ |
| 格式化             | `pnpm fmt`                                          | ✅ 通过（134 文件，863 ms）                                  |
| 类型检查与代码检查 | `pnpm check`                                        | ✅ 通过（格式化 + lint 均无问题）                            |
| 单元测试           | `pnpm test -- --run`                                | ✅ 通过（6 个测试文件，48 个测试）                           |
| 生产构建           | `pnpm build`                                        | ✅ 成功生成 `dist/`                                          |
| Android Debug 构建 | `cd android && ./gradlew assembleDebug --no-daemon` | ✅ `BUILD SUCCESSFUL`（213 个任务，27 执行，186 up-to-date） |

> 注：Android Debug 构建仅作冒烟测试；正式发布前仍需使用真实 keystore 执行 `pnpm build:android:release` 生成签名 APK。

---

## 五、Git 信息

- **分支**：`feature/pictelio-public-release`
- **当前 commit**：`186541fba707e79c89d1d2027b1e8428dfabe1a3`
- **commit message**：`fix(website): align landing page with tokens and a11y`
- **本次修改文件**：
  - `website/index.html`
  - `public/privacy-policy.html`

---

## 六、后续行动

完成「预发布检查清单」中的所有项目后，即可执行：

```bash
# 1. 创建并推送 tag
git tag -a v1.0.0 -m "Pictelio 1.0.0"
git push origin v1.0.0

# 2. 发布 GitHub Release
pnpm release:github --repo=a1121611810/pixivizer

# 3. 部署官网（GitHub Pages）
git subtree push --prefix website origin gh-pages
```
