# ADR-0005: 移除 Android 预测性返回手势

## 背景

Pictelio 在 Android 端实现了自定义预测性返回手势（Predictive Back）：

- Android 原生层通过 `PredictiveBackPlugin` 监听系统 `OnBackInvokedCallback` 事件；
- JS 层维护独立路由栈，在 `PredictiveBackContainer` 中渲染上一页预览动画；
- 设置面板提供开关，仅对 Android 16（API 36）及以上系统默认启用。

该功能上线后未成为用户核心体验路径，反而引入了跨层复杂度。

## 决定

**彻底移除预测性返回手势功能。**

具体包括：

- 删除 Android 原生插件 `PredictiveBackPlugin` 及动画辅助类 `PredictiveBackAnimator`；
- 删除 JS 服务 `services/predictiveBack.ts` 及其单元测试；
- 删除 `native/PredictiveBack.ts` 类型定义；
- 删除 `components/PredictiveBackContainer.tsx` / `PredictiveBackContainer.css` / `RoutePreview.tsx`；
- 删除设置面板中的预测返回开关及相关状态（`uiStore.ts`）；
- `App.tsx` 中移除 `useBeforeLeave` 路由栈同步、`initPredictiveBack` 与 `PredictiveBackContainer` 包裹；
- Android 返回键行为完全回退到 `CapApp.addListener("backButton", ...)` 的兜底处理。

## 考虑到但拒绝的选项

- **保留代码、默认关闭**：不能真正降低维护成本，代码仍在构建产物和原生注册中占用体积。
- **保留手势事件、删除预览动画**：预览动画正是该功能的主要呈现，保留事件而无动画会让状态机变成“半残”实现，后续维护者更难理解。
- **随路由迁移一起删除**：路由迁移是后续独立决策，不应与删除预测返回耦合；先删除预测返回可简化后续路由层替换。

## 理由

1. **收益有限**：预测返回仅在 Android 16+ 生效，且当前应用以内容浏览为主，侧滑返回的“预览上一页”对核心任务帮助不大。
2. **复杂度高**：需要 JS 路由栈、原生事件、动画状态机、设置持久化四端协同，任何一端的改动都容易破坏返回行为。
3. **阻碍演进**：自定义路由栈与 `useBeforeLeave` 深度绑定，是后续评估/迁移路由方案的主要障碍。
4. **兜底足够**：`CapApp.addListener("backButton")` 已能处理关闭查看器/设置、非根路径返回、根路径双击退出，用户不会失去基本返回能力。

## 影响

- Android 16+ 用户将使用系统默认返回行为，不再看到上一页预览动画。
- `MainActivity.java` 减少一个插件注册。
- 路由返回逻辑不再依赖手写栈，后续路由迁移成本显著降低。
- `NovelDetail.tsx` 等调用 `getRouteStackDepth()` 的位置需改用更简单的历史判断（如直接 `navigate(-1)`）。
