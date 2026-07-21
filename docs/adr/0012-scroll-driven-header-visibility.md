# 列表页 header 滚动驱动显隐与 @solid-primitives 分阶段采用

列表页 header 需要"下滑隐藏、上滑显示、停止后重现"的滚动驱动显隐。项目中已有 5 处手写 scroll 监听实现同类模式（NavBar、Search、NovelDetail、PersonalCenter、IllustDetail），骨架完全重复（passive 监听 + rAF 节流 + scrollY 读取 + 阈值/方向判定 + onCleanup）。决定：引入 `@solid-primitives/scroll` + `@solid-primitives/scheduled`，新建 `src/primitives/createScrollDrivenVisibility.ts` 作为唯一出口，本次只应用于列表页 header；A 类其余 5 处留待 Phase 2 逐个迁移；虚拟化核心的 4 处 scroll 监听（createFeedVirtualizer、createNovelVirtualLayout、VirtualFeed、NovelVirtualFeed）与程序性滚动（scrollToTop、createVirtualScrollRestore 等）明确不动。

## Considered Options

- **继续手写 scroll 监听**（现状模式）：拒绝。第 6 份重复实现，且无法解决"停止判定"——rAF 无法监听滚动结束，只能每帧轮询 scrollY，空转耗电。
- **rAF 计时替代 setTimeout debounce**：拒绝。rAF 语义是帧同步，保持帧循环活跃只为计时不必要；停止判定是纯时间延迟，setTimeout debounce 更省更简单，header 显示走 CSS transition 无需帧对齐。
- **页面直接使用 @solid-primitives 不封装**：拒绝。方向阈值、顶部保护区、suppress 抑制窗口没有现成包，必须自研；封装后页面只依赖自己的 primitive，未来换实现不动调用方。
- **本次顺带统一 NavBar 等 5 处**：拒绝。改动面扩大到 6 个页面 + 1 个核心组件，违背本次需求的可控范围；分阶段沉淀基础设施。

## Consequences

- `packages/app/package.json` 新增 2 个依赖（各约 1-2KB，tree-shakable）。
- VirtualFeed / NovelVirtualFeed 增加可选 prop `suppressHeaderVisibility`，在显式恢复（`restoreScroll()`）前后调用，避免程序性大位移导致 header 闪烁；不传时行为与现状一致。
- NavBar 本次保持手写实现不动，与列表 header 独立运行、不共享状态。
