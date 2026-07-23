# ADR-0015：虚拟滚动卡片高度从预计算迁移到 DOM 实测

**状态**：提议  
**日期**：2026-07-23  
**决策者**：团队成员  
**背景**：参考 `grill-with-docs` 会话记录  

---

## 背景

当前小说虚拟滚动使用**纯预计算**确定卡片高度：

```
createComputedTextCard（pretext 测量标题/标签行数）
  → PRESETS（固定像素值表示 margin/padding/行高）
    → resolveCssToken（运行时读取 CSS token 优化精度）
      → estimateSize（同步返回高度）
        → TanStack Virtualizer（按固定高度定位 item）
```

存在以下问题：

1. **预计算在根本上不可靠**——CSS 使用 `clamp()` 流体字号，在不同视口宽度下解析为不同像素值；pretext 用 Canvas API 测量文本，字体度量与 DOM 渲染存在差异（当前 3% 宽度缩减只缓解不根除）。
2. **维护成本持续上升**——每次调整卡片 CSS 都需同步更新 PRESETS 表（`createComputedTextCard.ts` 内 ~70 行硬编码布局常量）；上周修复 padding 偏差（10→12px）花了三轮 TDD + 五轮 code-review 迭代。
3. **精度修复是打补丁游戏**——增加 `ESTIMATE_SAFETY_MARGIN = 12px` 覆盖流体字号偏差，但用户仍反馈 152px 计算值 vs 164.71px 实际值不匹配。
4. **代码复杂度高**——`createComputedTextCard.ts`（~400 行）、`resolveCssToken.ts`（~200 行）的存在仅服务于一个需求：算出一个准确的像素高度传给虚拟滚动器。而 TanStack Virtual 本身提供了 `measureElement` ref 回调——在浏览器渲染后**直接读取 `getBoundingClientRect()`** 获得真实高度。

## 决策

将虚拟滚动高度策略从「纯预计算」切换到「粗估种子值 + DOM 实测纠正」：

1. **接入 `measureElement`**：卡片容器 ref 挂接 `virtualizer.measureElement`，TanStack Virtual 在渲染后自动读取真实 DOM 高度并更新内部测量缓存。
2. **`estimateSize` 降级为粗估种子**：不再包含 pretext 换行计算、tag 行数预测、3% 宽度缩减。textList 模式估 120px，list 模式估 160px，coverWall 模式估 300px。
3. **coverWall 特殊处理**：瀑布流模式启用 `laneAssignmentMode: 'measured'`，先渲染后分配列，避免基于粗估种子将卡片分配到错误的列。
4. **首次渲染跳动接受**：`measureElement` 在渲染后才更新高度，首屏可能有短暂位置调整。TanStack Virtual 默认只在非回滚时调整，向上滚时感知不到跳动。

## 替代方案评估

| 方案 | 评估 |
|------|------|
| **保留现状**（纯预计算 + 补丁） | 精度永远追不上 DOM 渲染，维护成本线性增长（每个 CSS 改动需同步 PRESETS）。拒绝。 |
| **预计算 + `overflow: hidden` 裁切** | 遮挡溢出但阴影/焦点环被裁剪，卡片视觉品质下降。拒绝。 |
| **TanStack Virtual `measureElement`**（本方案） | 利用现成 API，删减大量代码，根除预计算—渲染偏差。接受。 |
| **react-virtuoso 风格**（零配置自动测量） | 换库成本高，且需放弃当前对 lanes/overscan/snapshot 的精细控制。拒绝。 |
| **CSS `content-visibility: auto`** | 不回收 DOM，不外挂测量缓存，无法用于本项目小说 feed 的 5000+ item 规模。拒绝。 |

## 影响范围

### 删除或大幅简化的文件

| 文件 | 处理 | 理由 |
|------|------|------|
| `primitives/createComputedTextCard.ts` | **删除** | pretext 换行计算、PRESETS 表、所有模式高度计算均不再需要 |
| `utils/resolveCssToken.ts` | **删除** | 运行时 CSS token 读取不再需要 |
| `primitives/measureText.ts` 中卡片路径 | **简化** | `measureTextLines`/`measureTextWidth` 仅保留 NovelDetail 正文路径使用 |

### 修改的文件

| 文件 | 改动概要 |
|------|----------|
| `components/NovelVirtualFeed.tsx` | ① 移除三个 `createComputedTextCard` 实例；② `estimateSize` 改为粗估值；③ 卡片容器加 `ref={instance.measureElement}` + `data-index` |
| `primitives/createNovelTextLayout.ts` | 保持不变——用于 NovelDetail 正文渲染，独立子系统 |
| `primitives/novelTextLayoutCache.ts` | 保持不变 |
| `tests/unit/primitives/createComputedTextCard.test.ts` | **删除** |
| `tests/unit/utils/resolveCssToken.test.ts` | **删除** |

### 不变的模块

| 模块 | 理由 |
|------|------|
| `createNovelTextLayout.ts` | 小说正文虚拟化（NovelDetail），与卡片高度无关 |
| `createNovelVirtualLayout.ts` | 同上 |
| `createVirtualScrollRestore.ts` | 滚动恢复机制不变 |
| `Visibility primitives`（`everVisible`/`sentinel`） | 哨兵分页机制不变 |
| `createImageSizeWorker.ts` | 插画瀑布流（illust feed），不在本次范围 |

## 架构变更

### 迁移前

```
estimateSize(index)
  └→ createComputedTextCard.getInfoHeight(novel.id)
       └→ measureTitle（pretext 换行计算）
       └→ computeTagLines（pretext 宽度测量）
       └→ PRESETS 硬编码布局常量（padding/margin/行高）
       └→ resolveCssToken（运行时 CSS token 读取）
            └→ 固定 height → Virtualizer 定位
```

### 迁移后

```
estimateSize(index) → 粗估常量（120/160/300px）→ Virtualizer 初始定位
                                                     ↓
measureElement ref ← getBoundingClientRect() ← 浏览器渲染后实测 ← Virtualizer 纠正位置
```

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 首次渲染跳动（粗估值→实测值位置调整） | TanStack Virtual 默认策略：仅在非回滚时调整，向上滚时感知不到跳动。粗估种子值设得偏大可减少首次可见 item 的实测触发频率 |
| coverWall lane 分配不准 | 启用 `laneAssignmentMode: 'measured'`，实测后重新分配 lane |
| 滚动恢复状态（snapshot）与新模式兼容 | `takeSnapshot` 存储 `VirtualItem[]`，格式不变。`initialMeasurementsCache` 加载后，实测值逐渐覆盖缓存值 |
| `measureElement` 在某些环境下不触发（display:none / 离屏） | TanStack Virtual 在 item 重新进入视口时自动检测并测量，无需手动干预 |
| 旧测试文件删除后覆盖率下降 | 新模式对测试的依赖从「预计算精度」变为「TanStack Virtual API 正确接线」；必要时增加浏览器环境集成测试 |

## 实施步骤

1. 在 `NovelVirtualFeed` 中对一个模式（textList）接入 `measureElement`，并行运行旧逻辑，验证实测值稳定后再替换。
2. 逐步覆盖 list、coverWall 模式。
3. 确认所有模式稳定后，删除 `createComputedTextCard.ts`、`resolveCssToken.ts` 及其测试。
4. 清理 `measureText.ts` 中仅卡片使用的路径。
5. 更新 `glossary-virtual-scroll.md` 术语表。
