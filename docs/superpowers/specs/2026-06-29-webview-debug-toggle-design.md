# WebView 调试开关 — 设计文档

## 背景

`WebView.setWebContentsDebuggingEnabled(true)` 之前在 `MainActivity.java` 中硬编码启用，
用于调试检查更新问题。但 release build 不应默认暴露 WebView 调试接口，
需要改为可由用户控制的开关。

## 需求

- 在「关于」页面的「开发者选项」区域添加一个开关
- 默认关闭（release 安全）
- 打开后即时生效，下次启动也记住状态
- 关闭后即时禁用

## 架构

```
┌──────────────────────────┐     JS Plugin Call     ┌──────────────────────────┐
│  About.tsx               │ ──────────────────────▶ │  WebDebugPlugin.java     │
│  [WebView 调试] 开关     │                        │  ┌────────────────────┐  │
│                          │ ◀────────────────────── │  │ setEnabled(bool)   │  │
│  App.tsx (启动时同步)    │   getIsEnabled()        │  │ getIsEnabled()     │  │
│                          │                        │  │ SharedPreferences  │  │
└──────────────────────────┘                        └──────────┬───────────────┘
                                                               │
                                                      onCreate() 时读取
                                                               │
                                                  ┌──────────────▼───────────┐
                                                  │  MainActivity.java       │
                                                  │  onCreate():             │
                                                  │    prefs →               │
                                                  │    setWebContentsDebug.. │
                                                  └──────────────────────────┘
```

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `android/app/src/main/java/io/pictelio/app/WebDebugPlugin.java` | 新建 | Capacitor 插件，暴露 setEnabled / getIsEnabled |
| `android/app/src/main/java/io/pictelio/app/MainActivity.java` | 修改 | 注册插件 + onCreate 读取 SharedPreferences |
| `src/stores/uiStore.ts` | 修改 | 新增 webDebugEnabled 状态 + 初始化方法 |
| `src/services/webDebugService.ts` | 新建 | 封装插件调用 |
| `src/routes/About.tsx` | 修改 | 添加「开发者选项」区块 + 开关 |

## 数据流

### 启动时
1. `MainActivity.onCreate()` → 读 SharedPreferences key `webview_debug_enabled`
2. 若为 true → `WebView.setWebContentsDebuggingEnabled(true)`
3. JS 侧 `App.tsx` → 调用 `WebDebugPlugin.getIsEnabled()` → 同步到 store

### 用户切换时
1. About 页面开关变化 → 调用 `webDebugService.setEnabled(bool)`
2. service → `WebDebugPlugin.setEnabled({ enabled: bool })`
3. Plugin → 写入 SharedPreferences + `WebView.setWebContentsDebuggingEnabled(bool)`
4. 返回结果 → 更新 store 状态 → UI 更新

## UI

在「关于」页面的致谢区块下方添加「开发者选项」区块：

```
─────────────────────────────
  开发者选项
  ┌─────────────────────────┐
  │  WebView 调试    [开关] │
  └─────────────────────────┘
─────────────────────────────
```

开关样式与 SettingsSheet 中「启动时检查更新」保持一致（iOS 风格 toggle）。

## 默认值

- `webDebugEnabled` = `false`（默认关闭）

## 安全考量

- 开关默认关闭，release build 不会有 WebView 调试暴露风险
- 即使开启，也需要 USB/无线 ADB 连接才能使用 DevTools
- `WebView.setWebContentsDebuggingEnabled` 影响当前进程所有 WebView 实例

## 测试

- 手动：开关 → 打开 app → edge://inspect 能看到页面
- 关闭 → 重启 app → edge://inspect 看不到页面
- 开关状态在重启后保持
