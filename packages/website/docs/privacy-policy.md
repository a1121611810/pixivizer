---
title: 隐私政策
description: Pictelio 隐私政策 - 说明 Pictelio 第三方 Pixiv 客户端如何收集、存储与处理您的数据。
editLink: false
---

# Pictelio 隐私政策

**最后更新日期：2024 年 10 月 22 日**

本隐私政策适用于 Pictelio（以下简称"本应用"），一款由社区开发的第三方 Pixiv 客户端。本应用尊重并保护您的隐私。

## 数据收集与使用

本应用本身**不收集**任何个人身份信息。应用仅在本地存储以下数据：

- **Pixiv 登录凭证（Token）**：用于通过 Pixiv 官方 API 验证您的身份。该 Token 通过系统安全存储（Keychain/Keystore）加密保存在本地设备上，不会传输给任何第三方，仅用于与 Pixiv API 通信。
- **应用偏好设置**：包括主题选择、语言设置、内容过滤选项等，仅存储在本地。
- **浏览历史记录**：如最近查看的插画 ID，仅用于恢复浏览位置，存储在本地。

## 网络通信

本应用仅与以下服务建立网络连接：

1. **Pixiv 官方 API**（`app-api.pixiv.net`、`oauth.secure.pixiv.net`）：获取插画数据、用户信息、执行搜索等操作。
2. **Pixiv 图片 CDN**（`i.pximg.net`）：加载插画图片。
3. **GitHub API**（`api.github.com`）：用于检查应用更新版本。

所有与 Pixiv 的通信均通过您自己的 Pixiv 账号进行，受 Pixiv 的隐私政策和服务条款约束。本应用不会将您的数据发送给任何其他第三方。

## 数据存储

- 所有数据均存储在您设备的本地存储中。
- 卸载应用将清除所有本地存储的数据。
- 本应用不包含任何分析 SDK 或崩溃报告工具。

## 第三方服务

本应用使用了以下开源组件：

- [Capacitor](https://capacitorjs.com/) - 跨平台原生运行时
- [SolidJS](https://www.solidjs.com/) - UI 框架
- [Vite](https://vite.dev/) - 构建工具

这些组件各自的许可协议适用于其代码部分。

## 安全性

- Pixiv 登录 Token 使用平台安全存储（Android Keystore）加密保存。
- 所有网络通信均通过 HTTPS 加密传输。
- 本应用的源代码完全公开，可在 [GitHub](https://github.com/a1121611810/pixivizer) 上审计。

## 隐私联系邮箱

如您对本隐私政策有任何疑问或关切，请通过以下邮箱联系：

**a1121611810@outlook.com**

## 隐私政策的变更

本隐私政策可能不时更新。重大变更时，我们将在应用内或通过 GitHub Release 通知用户。继续使用本应用即表示您同意更新后的政策。

## 举报联系邮箱

如您发现本应用中存在侵犯您权益的内容或行为，请通过以下邮箱举报：

**a1121611810@outlook.com**

---

*本隐私政策最后更新于 2024 年 10 月 22 日。*
