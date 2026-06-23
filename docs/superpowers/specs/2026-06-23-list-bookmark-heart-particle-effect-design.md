# 列表收藏按钮爱心粒子特效设计

## 背景

作品详情页（`IllustDetail`）已成功实现点击收藏时的爱心粒子爆发动效。用户希望 Feed 瀑布流和 Bookmarks 页面的收藏按钮也拥有同样的反馈效果。

## 目标

在列表场景的 `ImageCard` 收藏按钮上，复用详情页的爱心粒子特效，但按列表按钮尺寸进行缩放，保持视觉一致且不干扰相邻卡片。

## 非目标

- 不改动详情页的特效行为
- 不引入新的动效风格
- 不影响卡片的虚拟滚动/懒加载逻辑
- 不在取消收藏时触发特效

## 范围

- 修改 `src/components/ImageCard.tsx` 的收藏按钮区域
- 扩展 `src/components/HeartBurstEffect.tsx` 以支持尺寸和粒子数配置
- 可能需要在 `src/utils/heartParticleSystem.ts` 中支持速度缩放

## 架构

```
ImageCard
├── BookmarkButton (原有 DOM 按钮)
└── HeartBurstEffect (叠加层，size=80 particleCount=6)

IllustDetail (保持不变)
└── HeartBurstEffect (默认 size=200 particleCount=10)
```

## 组件 API 变更

### `HeartBurstEffect`

```tsx
interface Props {
  trigger: Accessor<number>;
  size?: number;          // 画布尺寸（px），默认 200
  particleCount?: number; // 粒子数量，默认 10
}
```

- `size` 同时控制画布 CSS 尺寸和 PixiJS Application 的逻辑尺寸
- `particleCount` 控制每次触发发射的粒子数量
- 粒子速度按 `size / 200` 比例自动缩放，保证不同尺寸下动画节奏一致

## 列表视觉参数

| 参数 | 详情页 | 列表页 | 说明 |
|------|--------|--------|------|
| 画布尺寸 | 200×200px | 80×80px | 列表按钮仅 28×28px，避免遮挡相邻卡片 |
| 粒子数量 | 10 | 6 | 列表空间小，减少粒子密度 |
| 速度比例 | 1.0 | 0.4 | 按 `80 / 200` 自动缩放 |
| 生命周期 | 500–700ms | 500–700ms | 保持统一 |

## 交互细节

- 粒子层 `pointer-events: none`，不阻挡按钮长按/点击
- 保留 `ImageCard` 原有的长按私密收藏逻辑
- 仅在收藏成功时触发（`bookmarked` 从 `false` 变为 `true`）
- 快速点击不重复创建 PixiJS Application（复用详情页已有的初始化守卫）
- 尊重 `prefers-reduced-motion`

## 文件变更

- `src/components/HeartBurstEffect.tsx`：扩展 props，内部根据 size 计算速度和画布尺寸
- `src/utils/heartParticleSystem.ts`：可能需要显式传入 `speedMin`/`speedMax`，或接受 `speedScale` 参数
- `src/components/ImageCard.tsx`：添加 trigger signal，包裹收藏按钮

## 验收标准

- [ ] Feed 和 Bookmarks 列表点击收藏按钮时出现爱心粒子特效
- [ ] 列表特效比详情页小且密集度更低
- [ ] 取消收藏不触发特效
- [ ] 快速连续点击不崩溃
- [ ] 详情页特效保持原有行为不变
- [ ] 虚拟滚动/懒加载性能无明显下降
- [ ] 代码遵循项目 Fluent Design 规范
