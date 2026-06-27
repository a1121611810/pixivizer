# Android Release 签名配置指南

本文档说明如何为 Pictelio 配置 Android Release 构建签名，以便生成可以公开发布的 APK。

---

## 1. 什么是 Keystore？

**Keystore（密钥库）** 是 Android 用来证明应用身份的加密文件。每个发布到应用商店或通过其他渠道分发的 Android 应用，都必须使用同一个 keystore 进行签名。如果 keystore 丢失或泄露：

- **丢失**：你将无法更新已发布的应用，必须重新发布一个全新包名的应用。
- **泄露**：攻击者可以用你的身份伪造应用更新，危及用户安全。

因此，**keystore 必须妥善保管，绝不要提交到 git，也不要通过聊天工具、邮件等明文传输。**

---

## 2. 生成 Release Keystore

### 前置条件

确保已安装 JDK，`keytool` 命令可用：

```bash
keytool -help
```

### 生成命令

在项目根目录执行以下命令：

```bash
keytool -genkey -v \
  -keystore android/app/pictelio-release.keystore \
  -alias pictelio \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

命令说明：

| 参数                                              | 含义                            |
| ------------------------------------------------- | ------------------------------- |
| `-keystore android/app/pictelio-release.keystore` | keystore 文件存放位置           |
| `-alias pictelio`                                 | 密钥别名，项目固定为 `pictelio` |
| `-keyalg RSA`                                     | 使用 RSA 算法                   |
| `-keysize 2048`                                   | 密钥长度 2048 位                |
| `-validity 10000`                                 | 有效期 10000 天                 |

执行后 `keytool` 会提示输入以下信息：

1. **Keystore 密码**：用于保护整个 keystore 文件，请牢记并安全备份。
2. **Key 密码**：用于保护别名对应的私钥。可以与 keystore 密码相同，也可以不同。
3. **证书信息**（CN / OU / O / L / ST / C）：可以全部填写 `Pictelio`，也可以填写你的真实组织信息。

示例交互：

```text
输入密钥库口令:  <输入并牢记>
再次输入新口令:  <再次输入>
您的名字与姓氏是什么?
  [Unknown]:  Pictelio
您的组织单位名称是什么?
  [Unknown]:  Pictelio
您的组织名称是什么?
  [Unknown]:  Pictelio
您所在的城市或区域名称是什么?
  [Unknown]:  Pictelio
您所在的省/市/自治区名称是什么?
  [Unknown]:  Pictelio
该单位的双字母国家/地区代码是什么?
  [Unknown]:  CN
CN=Pictelio, OU=Pictelio, O=Pictelio, L=Pictelio, ST=Pictelio, C=CN 是否正确?
  [否]:  y

输入 <pictelio> 的密钥口令
	(如果和密钥库口令相同, 按回车):  <输入并牢记>
```

完成后，会在 `android/app/pictelio-release.keystore` 生成 keystore 文件。

---

## 3. 放置 Keystore 文件

生成命令已经把 keystore 放在了正确位置：

```text
android/app/pictelio-release.keystore
```

无需移动。

---

## 4. 配置环境变量

项目通过环境变量注入签名密码，避免在代码中硬编码敏感信息。

需要设置两个环境变量：

| 环境变量                     | 说明                            |
| ---------------------------- | ------------------------------- |
| `PICTELIO_KEYSTORE_PASSWORD` | keystore 文件的密码             |
| `PICTELIO_KEY_PASSWORD`      | 别名 `pictelio` 对应的 key 密码 |

### macOS / Linux

在终端执行（仅对当前会话有效）：

```bash
export PICTELIO_KEYSTORE_PASSWORD="你的keystore密码"
export PICTELIO_KEY_PASSWORD="你的key密码"
```

若希望长期生效，可将上述两行添加到 `~/.zshrc` 或 `~/.bashrc`，然后执行：

```bash
source ~/.zshrc  # 或 source ~/.bashrc
```

> **安全提示**：不要把这些密码写入项目中的任何文件，尤其是 `.env` 或 shell 脚本。

### Windows (PowerShell)

```powershell
$env:PICTELIO_KEYSTORE_PASSWORD="你的keystore密码"
$env:PICTELIO_KEY_PASSWORD="你的key密码"
```

### CI / GitHub Actions

在 CI 中，请使用 Secrets 功能（例如 GitHub Actions 的 `secrets.PICTELIO_KEYSTORE_PASSWORD`），并在 workflow 中通过 `env` 注入。

---

## 5. 构建 Release APK

确认已设置环境变量，并且 `android/app/pictelio-release.keystore` 存在后，执行：

```bash
pnpm run build:android:release
```

该命令会依次完成：

1. 同步版本号到 Android 项目
2. 构建 Web 产物
3. 同步 Capacitor 资源
4. 调用 Gradle 构建 Release APK

构建成功后，签名 APK 位于：

```text
android/app/build/outputs/apk/release/app-release.apk
```

---

## 6. 验证 APK 已签名

可使用 `apksigner` 或 `jarsigner` 验证：

```bash
apksigner verify -v android/app/build/outputs/apk/release/app-release.apk
```

---

## 7. 安全与备份

- **禁止提交 keystore**：`android/app/*.keystore`、`android/app/*.jks` 已被 `.gitignore` 忽略，请务必不要强制添加。
- **多重备份**：建议将 keystore 文件及其密码分别保存到至少两个安全位置，例如加密 U 盘、密码管理器、私有云存储。
- **密码不可恢复**：如果忘记密码，将无法继续使用该 keystore 更新应用。

---

## 8. 常见问题

### Release 构建失败，提示密码为空或找不到 keystore

请检查：

1. `android/app/pictelio-release.keystore` 是否存在。
2. 环境变量 `PICTELIO_KEYSTORE_PASSWORD` 与 `PICTELIO_KEY_PASSWORD` 是否已正确设置。
3. 当前终端会话是否已重新加载环境变量。

### Debug 构建是否需要设置环境变量？

不需要。Debug 构建使用 Android 默认的 debug keystore，不依赖本指南中的环境变量。
