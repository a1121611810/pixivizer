## v3.11.0 — 搜索、设置重构、PKCE 登录与多项稳定性修复

### ✨ 新功能

- **PKCE OAuth 登录流**：引入 Pixiv PKCE 授权码流程，配合 Fluent Design 2 UI
- **标签搜索页**：点击作品标签跳转专属搜索页，支持 Fluent Design 2 全新视觉
- **搜索快速入口**：Floating Action Button 作为搜索快捷入口（加载中隐藏）
- **设置中心**：原设置抽屉改为完整的子页面导航式设置中心，布局模式抽离为独立页面
- **多标签搜索**：基础设施支持，配合瀑布流高度估算优化

### 🐛 Bug 修复

- **认证/OAuth**：
  - 401 刷新时序竞争：在 `initializeAuth` 中设置 `refreshPromise` 让并发请求等待，并在 render 前完成认证初始化，根除时序竞争
  - 400 OAuth 错误处理：识别 Pixiv OAuth 400 错误，自动重试请求并引导重新登录
- **路由/导航**：
  - 修复 Router 因 Outlet 卸载/重挂载导致 AbortSignal 中止问题（`Outlet` 改为始终渲染）
  - 添加 AbortSignal 中止追踪日志，避免 Loader 重复导航被误终止
- **设置抽屉**：
  - 恢复内联控件（左侧抽屉面板），保留其他重构
  - 添加缺失的 `filter` 图标，解决设置页报错
- **搜索**：修复搜索 FAB 在加载状态下的可见性逻辑
- **瀑布流**：修复多标签切换后的高度估算

### ♻️ 重构

- **SettingsDrawer 架构深化**：拆分为独立组件，提取 `useCardInteractions` hook，收窄 `SearchStore` 接口
- **搜索数据流**：搜索相关 store/loader 接口精简化
- **布局模式**：从设置抽屉抽离为独立路由页面
- **代码清理**：移除 `DEBUG-avatar`、`[DEBUG-ABORT]`、OAuth 调试日志及废弃 `settingsDrawer` 引用
- **格式化**：`UserAvatar`、`PersonalCenter`、`__root` 执行 oxfmt

### 🧪 测试

- 更新 `SettingsDrawer` 浏览器测试，适配子页面段落标题变化
- 修复 `BlocklistSheet` 测试中的 prop 错误

---

### 📋 变更清单

| 类型 | 数量 |
|------|------|
| ✨ Feat | 4 |
| 🐛 Fix | 15 |
| ♻️ Refactor | 4 |
| 🧪 Test | 2 |
| 🧹 Chore | 3 |
| **合计** | **28** |
