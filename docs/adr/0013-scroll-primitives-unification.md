# 滚动驱动 UI 原语统一（Phase 2）：createScrolledPast 与 createScrollDirection

Phase 1（ADR-0012）落地列表页 header 显隐后，项目中仍剩 5 处手写 scroll 监听实现同类模式：NavBar（方向 compact）、Search（位置回顶钮 + 方向 compact header）、IllustDetail（位置回顶钮）、NovelDetail（累计方向 footer）、PersonalCenter（位置 collapse）。决定：沉淀两个薄原语——`createScrolledPast(threshold)`（位置阈值，覆盖 3 处纯位置判定）与 `createScrollDirection(options)`（方向判定，options 的每个参数都有真实使用方：threshold=10/20/30、accumulate=NovelDetail、jumpThreshold=NavBar/NovelDetail 的 200、reset()=NavBar tab 切换/NovelDetail 小说切换），各站点保留自己的小型 policy effect 组合原语。5 处手写监听（含 rAF 门闩样板）全部迁移删除。

## Considered Options

- **单一全能原语（mode knobs 覆盖全部 5 站语义）**：拒绝。各站点"方向→显隐"映射互不相同（NavBar 顶部强制展开、Search 阈值以下强制隐藏、NovelDetail 底部强制显示），全能原语会退化成 Speculative Generality；薄原语 + 站点 policy 组合更诚实。
- **顺带重构 Phase 1 的 createScrollDrivenVisibility 到新原语上**：拒绝。它含 idle 重现 + suppress 抑制窗口的独立语义，7 个 browser 测试覆盖且已验收，重写是纯 churn。
- **NovelDetail 底部保护也参数化进原语**：拒绝。仅一处使用，且依赖文档高度（非响应式），保留站点本地实现。

## Consequences

- 行为差异（刻意，均为修正而非回归）：PersonalCenter 恢复滚动位置打开时首帧 collapsed 即正确（旧实现缺初始化调用）；NavBar 关闭自动隐藏期间方向跟踪不再暂停，重新开启后无陈旧 lastScrollY 边界。
- 每个迁移站点删除其 scroll 监听、rAF 门闩、lastScrollY/阈值常量，改由原语持有。
- 测试 seam：两个原语的公开 API，browser 环境（isServer 门控，同 ADR-0012）。
