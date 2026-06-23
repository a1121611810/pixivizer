# 收藏按钮爱心粒子特效设计

## 背景

用户希望借当前项目练习 PixiJS，目标是在 `IllustDetail` 作品的收藏按钮上实现一个符合 Microsoft Fluent Design System 2 的爱心粒子特效，作为把 DOM 内容/事件与 PixiJS 渲染结合的练手入口。

## 目标

在 `IllustDetail` 页的收藏按钮被点击收藏时，从按钮中心爆开一组爱心粒子，给用户一个清晰、轻量、符合 Fluent 设计语言的反馈。

## 非目标

- 不替换现有收藏逻辑（`toggleBookmark`、长按私有收藏）
- 不改动按钮的 DOM 样式、布局、交互
- 不在取消收藏时触发反向特效
- 不一次性把详情页整体 GPU 化（那是后续可选方向）

## 范围

- 仅影响 `src/routes/IllustDetail.tsx` 内的收藏按钮区域
- 新增一个可复用的粒子特效组件
- 仅在按钮位置上方叠加一个临时的 PixiJS 画布层

## 架构

```
IllustDetail
└── BookmarkButton (原有 DOM 按钮，保留样式和事件)
    └── HeartBurstOverlay (绝对定位覆盖层)
        └── PixiJS Application
            └── ParticleContainer
                └── HeartSprite × N
```

## 组件设计

### `HeartBurstEffect`

- 位置：固定在收藏按钮正上方，尺寸覆盖按钮周围约 200×200 CSS 像素区域
- `pointer-events: none`，不阻挡按钮点击
- 接收 `trigger` 信号，当 `is_bookmarked` 从 `false` 变为 `true` 时发射一批粒子
- 内部懒初始化 PixiJS `Application`，首次触发时创建，后续复用
- 组件卸载时销毁 `Application` 和 ticker
- 按钮与特效层共用一个 `relative` 定位容器，便于计算按钮中心坐标

### `HeartParticleSystem`

负责粒子发射与生命周期管理：

- 每次发射 8–12 个爱心粒子
- 每个粒子属性：
  - 初始位置：按钮中心（相对画布坐标）
  - 初始速度：按角度均匀分布，速度随机
  - 初始缩放：0.6–0.9
  - 旋转：随机初始角度，缓慢自转
  - 生命周期：500–700ms
  - 透明度：1 → 0（线性淡出）
  - 缩放变化：出生略大，消失前缩小至 0

### 爱心纹理

使用 PixiJS `Graphics` 动态绘制爱心形状并生成单个 `Texture`，所有粒子共享该纹理以适配 `ParticleContainer` 的批处理要求：

- 优点：零外部资源依赖，颜色可直接使用 Fluent token
- 形状：标准爱心 SVG path 等效图形
- 颜色：`var(--colorStatusDangerForeground1)`，与已收藏状态一致

## 动画参数（Fluent Design 合规）

| 参数 | 值 | 说明 |
|------|-----|------|
| 粒子数量 | 8–12 | 足够明显但不杂乱 |
| 生命周期 | 500–700ms | 对应 `--durationUltraSlow` |
| 飞出缓动 | `cubic-bezier(0,0,0,1)` | `--curveDecelerateMid`，飞出后自然减速 |
| 淡出 | linear | 仅限透明度变化 |
| 颜色 | `--colorStatusDangerForeground1` | 与已收藏按钮颜色一致 |
| 发射范围 | 以按钮中心为原点，半径 60–100px | 控制在按钮附近 |

## 交互细节

- 保留按钮原有 `active:scale-95` 按压反馈
- 粒子层在按钮上层，但不接收事件
- 在收藏状态成功变更后触发特效；若 API 调用失败导致状态未变更，则不触发
- 连续快速点击时复用同一个 `Application`，重置粒子状态重新发射
- 如果用户长按触发私密收藏，同样视为一次收藏操作，也触发特效
- 特效失败或初始化超时不阻塞收藏 API 调用

## 降级策略

- PixiJS 初始化失败时静默降级，按钮功能完全正常
- 低端设备上如果 `Application` 创建异常，直接不渲染特效
- WebGL 不可用时可尝试 Canvas2D fallback（PixiJS 自带）

## 性能考虑

- 使用 `ParticleContainer` 批量渲染
- 粒子数量严格控制在 12 个以内
- 画布尺寸限制为 200×200 CSS 像素，避免全屏重绘
- 粒子生命周期结束后 ticker 中移除，避免空转
- 页面离开/组件销毁时清理 PixiJS 资源

## 依赖

新增 `pixi.js` 到项目依赖。安装后可通过 `node_modules/pixi.js/skills/` 获取官方 PixiJS skills 供 AI 工具参考。

## 文件变更

- 新增 `src/components/HeartBurstEffect.tsx`：粒子特效组件
- 新增 `src/utils/heartParticleSystem.ts`：粒子系统逻辑
- 修改 `src/routes/IllustDetail.tsx`：在收藏按钮处引入 `HeartBurstEffect`

## 验收标准

- [ ] 点击收藏按钮时出现爱心中心爆开特效
- [ ] 取消收藏时不触发特效
- [ ] 快速连续点击不崩溃、不卡顿
- [ ] 按钮原有收藏功能和样式不受影响
- [ ] 页面离开后无内存泄漏
- [ ] 代码遵循项目 Fluent Design 规范（使用 tokens、标准缓动/时长）
