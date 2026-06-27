# Pictelio 隐私政策

**生效日期**: 2026-06-27

> **占位符声明**：本政策中的联系邮箱 `YOUR_PRIVACY_EMAIL@example.com` 为占位符，将在 Task 15 中替换为实际联系邮箱，正式发布前务必更新。

## 我们收集的信息

Pictelio 是一款第三方插画浏览器，仅在本地设备上处理以下数据：

- **Pixiv refresh_token**: 用于访问 Pixiv API。
  - **Android 原生应用（本公共版本）**: refresh_token 通过 Capacitor 安全存储插件保存到 **Android Keystore** 保护的加密存储中，不会上传至我们的服务器。
  - **iOS / Web（如适用）**: iOS 构建通常保存到 **iOS Keychain**；Web 构建中该插件可能回退到 `localStorage` 并以 base64 编码存储，**不保证强加密**。本公共版本目前仅发布 Android 原生应用。
- **用户偏好**: 包括主题、布局模式、R-18/R-18G 开关、屏蔽列表、举报记录等，本地存储。
- **图片缓存**: 浏览过程中临时缓存的图片文件。缓存大小滑块用于控制自动清理阈值，手动清除选项可能会在后续版本中加入。

## 第三方服务

- **Pixiv API** (`app-api.pixiv.net`): 用于获取插画、用户、收藏等数据。
- **Pixiv CDN** (`i.pximg.net`): 用于加载图片。

## 您的权利

- 后续版本将在应用设置中提供“清除所有本地数据”入口。
- 通过 Pixiv 官方渠道删除您的 Pixiv 账号。

## 联系我们

如有隐私相关问题，请联系：**YOUR_PRIVACY_EMAIL@example.com**

> **占位符声明**：`YOUR_PRIVACY_EMAIL@example.com` 为占位符，正式发布前需替换为实际联系邮箱。
