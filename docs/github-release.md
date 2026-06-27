# GitHub Release 发布指南

本文档说明如何通过 `scripts/release-github.mjs` 自动构建 Pictelio 签名 APK，并发布到 GitHub Releases。

---

## 前置条件

在运行发布脚本前，请确保以下条件已满足：

1. **GitHub CLI（`gh`）已安装并登录**
   - 安装地址：https://cli.github.com/
   - 登录命令：
     ```bash
     gh auth login
     ```
   - 登录后可通过 `gh auth status` 验证。

2. **Android Release 签名已配置**
   - `android/app/pictelio-release.keystore` 已存在。
   - 环境变量 `PICTELIO_KEYSTORE_PASSWORD` 与 `PICTELIO_KEY_PASSWORD` 已设置。
   - 详细步骤见 [`docs/release-signing.md`](./release-signing.md)。

3. **目标 GitHub 仓库已指定**
   - 仓库路径格式为 `owner/repo`，例如 `yourname/pictelio`。
   - 脚本按以下优先级读取：
     1. CLI 参数：`--repo=owner/repo`
     2. 环境变量：`PICTELIO_GITHUB_REPO=owner/repo`
     3. 当前 git remote origin 的解析结果

4. **本地可正常构建 Release APK**
   - 建议先确认 `pnpm run build:android:release` 能成功生成 APK。

---

## 设置目标仓库

### 方式一：CLI 参数（推荐，单次生效）

```bash
pnpm exec node scripts/release-github.mjs --repo=yourname/pictelio
```

### 方式二：环境变量（当前终端会话）

```bash
export PICTELIO_GITHUB_REPO=yourname/pictelio
pnpm exec node scripts/release-github.mjs
```

### 方式三：git remote origin

如果当前仓库的 origin remote 是 GitHub 仓库，脚本会自动解析：

```bash
git remote get-url origin
# 支持 https://github.com/owner/repo.git 或 git@github.com:owner/repo.git
```

---

## 运行发布脚本

执行以下命令即可构建并发布：

```bash
pnpm release:github
```

脚本会依次完成：

1. 读取目标仓库、版本号、versionCode。
2. 检查签名环境变量与 keystore 文件。
3. 检查 `gh` CLI 是否安装并认证。
4. 运行 `pnpm run build:android:release` 构建签名 APK。
5. 验证 APK 输出路径：
   ```text
   android/app/build/outputs/apk/release/app-release.apk
   ```
6. 读取 fastlane changelog（如果存在）：
   ```text
   fastlane/metadata/android/en-US/changelogs/{versionCode}.txt
   ```
7. 使用 `gh release create` 创建 Release，并上传 APK。

创建的 Release 信息：

- **Tag**：`v{version}`，例如 `v1.0.0`
- **Title**：`Pictelio v{version}`
- **Notes**：优先使用 `{versionCode}.txt` 中的内容；不存在时使用默认消息。

---

## dry run（预演）

在不实际构建和发布的情况下查看脚本将要执行的步骤：

```bash
pnpm exec node scripts/release-github.mjs --dry-run
```

或：

```bash
pnpm release:github --dry-run
```

`--dry-run` 模式会：

- 解析并打印目标仓库、版本、tag、title。
- 检查签名环境变量与 keystore 文件（与正式流程一致）。
- **跳过** `gh` CLI 认证检查。
- **跳过** 实际构建与发布，仅打印将要执行的命令。

> 注意：dry-run 仍需要签名环境变量和 keystore 文件存在；如果这些条件不满足，脚本会提前退出，方便发现配置问题。

---

## 发布后

发布成功后，可在浏览器中打开：

```text
https://github.com/owner/repo/releases/tag/v{version}
```

用户可从该页面下载 `app-release.apk`。

---

## 故障排查

| 问题                | 可能原因                                                               | 解决方案                                       |
| ------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| 无法确定目标仓库    | 未传 `--repo`，未设 `PICTELIO_GITHUB_REPO`，且 origin 不是 GitHub 仓库 | 使用 `--repo=owner/repo` 显式指定              |
| 缺少签名密码        | 环境变量未设置                                                         | 参考 `docs/release-signing.md` 设置并重新导出  |
| 找不到 keystore     | `android/app/pictelio-release.keystore` 不存在                         | 按 `docs/release-signing.md` 生成              |
| `gh` 未安装或未登录 | GitHub CLI 缺失或 token 过期                                           | 安装 `gh` 并执行 `gh auth login`               |
| 构建失败            | 代码/依赖/Gradle 问题                                                  | 单独运行 `pnpm run build:android:release` 排查 |
| 创建 Release 失败   | 当前 tag 已存在，或没有仓库写权限                                      | 删除已有 tag，或检查 `gh auth status`          |
