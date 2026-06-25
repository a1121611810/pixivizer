# Pixivizer

基于 SolidJS 的 Pixiv 第三方客户端，通过 Capacitor 打包为 Android 原生应用。

## 功能特性

- 推荐插画流 (`/recommended`)
- 关注插画流 (`/following`)
- 作品详情页 (`/illust/:id`)：大图查看、多页浏览、Ugoira 动图播放
- 收藏页 (`/bookmarks`)
- 个人中心 (`/me`)
- 用户主页 (`/user/:id`)
- 用户作品列表 (`/user/:id/illusts`)
- 登录页 (`/login`)：支持 refresh_token 与用户名/密码登录
- Android 预测返回手势
- 图片调试页 (`/debug`)

## 技术栈

- **框架**: SolidJS 1.9.13
- **路由**: @solidjs/router 0.16.1
- **构建工具**: Vite 8.0.16
- **样式引擎**: UnoCSS 66.7.2
- **设计语言**: Microsoft Fluent Design System 2
- **移动端运行时**: Capacitor 8.4.0
- **类型系统**: TypeScript 6.0.3（strict 模式）
- **测试**: Vitest 4.1.9
- **包管理器**: pnpm

## 项目结构

```
src/
├── api/            # Pixiv API 层
│   ├── auth.ts     # OAuth 认证
│   ├── client.ts   # HTTP 客户端
│   ├── illust.ts   # 作品 API
│   └── types.ts    # 类型定义
├── components/     # 可复用 UI 组件
├── native/         # 自定义 Capacitor 插件 JS 定义
├── routes/         # 页面组件
├── services/       # 服务封装
├── stores/         # SolidJS 响应式状态
├── styles/         # CSS 分层
│   ├── reset.css
│   ├── tokens.css
│   └── base.css
├── types/          # 环境类型声明
├── utils/          # 工具函数
├── App.tsx         # 应用根组件
└── main.tsx        # 应用入口
```

## 环境要求

- Node.js 18 或更高版本
- pnpm
- Android 构建需要：
  - Android Studio
  - JDK 17
  - Android SDK
  - 已配置 `ANDROID_HOME` 环境变量
  - 已连接 adb 设备（用于 `pnpm dev:android`）

## 安装与运行

```bash
# 安装依赖
pnpm install

# 启动 Vite 开发服务器
pnpm dev
```

### 代理配置

Web 开发阶段通过 Vite 代理访问 Pixiv。项目会自动读取以下环境变量：

- `https_proxy`
- `HTTPS_PROXY`
- `http_proxy`
- `HTTP_PROXY`

若未设置，默认使用 `http://127.0.0.1:10808`。

示例：

```bash
https_proxy=http://127.0.0.1:7890 pnpm dev
```

## Android 构建与开发

### 编译 Debug APK

```bash
pnpm build:android
```

该命令依次执行：

1. `pnpm build`：TypeScript 类型检查与 Vite 生产构建
2. `pnpm cap:sync`：同步 Web 产物到 Android 项目
3. `./gradlew assembleDebug`：编译 debug APK

### 一键开发热重载

```bash
pnpm dev:android
```

该脚本执行以下步骤：

1. 启动 Vite dev server 并暴露到内网
2. 自动获取本机 Wi-Fi IP
3. 将 dev server URL 同步到 Capacitor Android 配置
4. 编译 debug APK
5. 通过 adb 安装到已连接设备

前置条件：

- 手机与电脑连接同一 Wi-Fi
- adb 已连接设备
- 项目依赖已安装

### 常用 Capacitor 命令

```bash
pnpm cap:sync        # 同步 Web 产物和 Capacitor 配置到 Android 项目
pnpm cap:open:android # 在 Android Studio 中打开 android/ 项目
pnpm cap:copy        # 复制 Web 产物到原生平台（不更新依赖/配置）
```

## 登录说明

应用使用 iOS OAuth 凭证策略与 Pixiv 服务器通信。登录方式：

- **refresh_token**：在登录页粘贴从其他渠道获取的 refresh_token
- **用户名/密码**：直接输入 Pixiv 账号密码，应用会通过 OAuth 流程获取 token

登录成功后，token 会自动存储并用于后续 API 请求。

## 设计规范

本项目强制遵循 Microsoft Fluent Design System 2：

- 所有颜色、间距、圆角、阴影、字体大小使用 `src/styles/tokens.css` 中定义的 CSS 变量
- 禁止使用硬编码颜色值、圆角值、阴影值
- 动画缓动曲线仅允许以下四种：
  - `cubic-bezier(0,0,0,1)`：exit / decelerate
  - `cubic-bezier(0.33,0,0.67,1)`：standard
  - `cubic-bezier(0.33,0,0,1)`：enter / accelerate
  - `linear`：仅限 loading spinner
- 动画时长仅允许：100ms、150ms、200ms、300ms、500ms
- 可交互元素必须覆盖 hover、active、focus-visible 三种状态
- 触控目标最小 40×40px

## 可用脚本

| 命令                    | 说明                                          |
| ----------------------- | --------------------------------------------- |
| `pnpm dev`              | 启动 Vite 开发服务器                          |
| `pnpm build`            | TypeScript 检查 + Vite 构建到 `dist/`         |
| `pnpm check`            | 仅 TypeScript 类型检查                        |
| `pnpm preview`          | 预览生产构建                                  |
| `pnpm test`             | 运行 Vitest 测试                              |
| `pnpm test:watch`       | 以 watch 模式运行测试                         |
| `pnpm build:android`    | 构建 Web + Capacitor 同步 + Gradle 编译 APK   |
| `pnpm dev:android`      | 一键启动 Android 开发热重载流程               |
| `pnpm cap:sync`         | 同步 Web 产物和 Capacitor 配置到 Android 项目 |
| `pnpm cap:open:android` | 在 Android Studio 中打开 `android/` 项目      |

## 许可证

MIT
