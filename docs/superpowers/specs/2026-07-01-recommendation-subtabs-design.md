# 推荐页「综合 / 插画 / 漫画」子 tab 设计

## 背景与问题

Pixiv 官网（`www.pixiv.net`）首页存在三个独立入口：

- **首页（综合推荐）**：`POST /ajax/street/v2/main`，返回插画、漫画等混合内容。
- **插画**：`GET /ajax/top/illust?mode=all&lang=zh`，仅返回插画。
- **漫画**：`GET /ajax/top/manga?mode=all&lang=zh`，仅返回漫画。

当前 Pictelio 的「推荐」tab 调用的是 Pixiv App API：

```
GET /v1/illust/recommended?content_type=illust&filter=for_ios
```

也就是说，**当前推荐页实际只展示「插画推荐」**，与官网的「综合推荐」语义不一致。

## 目标

在保持底部导航「推荐」入口不变的前提下，进入推荐页后提供三个子 tab：

- **综合**：真正的混合 feed，同时包含插画和漫画推荐。
- **插画**：仅插画推荐（与当前行为一致）。
- **漫画**：仅漫画推荐。

## 方案选型

我们评估了三种实现策略：

| 策略 | 说明 | 取舍 |
|---|---|---|
| 双源并行 + 时间线合并 | 同时请求 illust/manga 两路推荐，按 `create_date` 降序合并；加载更多时维护各自的 `next_url`，优先补充时间线较旧的那一路。 | **推荐**。最接近官网「综合」语义，体验连贯。 |
| 双源交替分页 | 第一次请求 illust，第二次请求 manga，交替加载。 | 实现简单但时间线不连贯，出现插画/漫画区块交替。 |
| 单源切换 fallback | 综合 tab 实际只用 illust 推荐，UI 保留三个 tab 占位。 | 改动最小但偏离目标。 |

最终采用 **双源并行 + 时间线合并**。

## API 映射

| 子 tab | 请求 API | 备注 |
|---|---|---|
| 综合 | 同时请求 `GET /v1/illust/recommended?content_type=illust` 和 `GET /v1/illust/recommended?content_type=manga` | 双源合并 |
| 插画 | `GET /v1/illust/recommended?content_type=illust` | 与当前一致 |
| 漫画 | `GET /v1/illust/recommended?content_type=manga` | 第一版先用此参数；后续可评估 `/v1/manga/recommended` |

> 说明：Pixiv App API 的 `/v1/illust/recommended` 支持 `content_type: illust | manga`（PixivPy 等第三方库均已验证），不存在省略 `content_type` 就返回混合内容的调用方式。因此「综合」必须在客户端合并两路数据。

## 架构与路由

- 底部导航「推荐」入口保持 `/recommended` 路由不变。
- 推荐页内部新增子 tab 切换器，状态存放在 `feedStore` 中：
  ```ts
  type RecommendSubTab = "mixed" | "illust" | "manga";
  ```
- 第一版不改变 URL，子 tab 通过状态切换；后续可选支持查询参数 `/recommended?sub=illust` 便于刷新恢复。

### 改动文件

| 文件 | 改动内容 |
|---|---|
| `packages/app/src/api/illust.ts` | 复用现有 `loadRecommended(contentType)`，确认 `manga` 参数有效。 |
| `packages/app/src/stores/feedStore.ts` | 新增综合 feed 的双源合并、独立缓存、分页逻辑。 |
| `packages/app/src/routes/TabFeedPage.tsx` | 在 `props.tab === "recommended"` 时渲染子 tab 切换条。 |
| `packages/app/src/stores/uiStore.ts` | （可选）持久化用户上次选择的子 tab。 |
| `packages/app/src/stores/feedStore.test.ts` | 新增综合 feed 相关单元测试。 |

## 数据流

### 缓存 key 设计

```ts
// 原始数据缓存（分别维护）
tabIllusts["recommended_illust"]: PixivIllust[]
tabIllusts["recommended_manga"]: PixivIllust[]

// 各自的 next_url
tabNextUrl["recommended_illust"]: string | null
tabNextUrl["recommended_manga"]: string | null

// 综合 tab 不单独缓存合并结果，每次从原始数据重新计算
```

### 综合 tab 加载流程

1. 调用 `Promise.allSettled([loadRecommended("illust"), loadRecommended("manga")])`。
2. 两路成功后，将 `illusts` 数组合并，按 `create_date` 降序排序。
3. 经过 `filterFeedIllusts` 过滤（R18/R18G/屏蔽用户）。
4. 更新 `state.illusts` 和 `state.nextUrl`。

### 综合 tab 加载更多

1. 查看当前合并列表尾部作品的时间戳。
2. 比较 illust 源和 manga 源各自最后一条数据的时间戳。
3. 优先加载「当前合并列表尾部时间较早」的那一路，保证时间线连续。
4. 如果该路已耗尽（`nextUrl` 为 null），fallback 到另一路。
5. 加载完成后重新合并并更新状态。

### 插画 / 漫画 tab

复用现有单源逻辑，仅将缓存 key 替换为 `recommended_illust` / `recommended_manga`。

## UI 与交互

### 子 tab 切换条

- 位置：推荐页 header 下方，与关注页现有的 all/public/private 切换条样式一致。
- 三个选项：综合 / 插画 / 漫画。
- 样式复用 Fluent 令牌：
  - 容器：`bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1 gap-1`
  - 选中项：`bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]`
  - 未选中项：`bg-transparent text-[var(--colorNeutralForeground2)]`
- 切换行为：
  1. 保存旧子 tab 滚动位置。
  2. 更新 `recommendSubTab`。
  3. 调用 `ensureLoaded()`。
  4. 恢复新子 tab 滚动位置。

### 卡片标识

综合 tab 不显示额外「漫画」角标，依赖作品内容（长图、多页等）自然区分，保持卡片简洁。

### 空状态 / 错误状态

- 综合 tab 单路失败：非阻塞提示，例如「漫画推荐加载失败，仅显示插画推荐」。
- 综合 tab 双路失败：复用 `VirtualFeed` 的全页错误 UI。
- 插画 / 漫画 tab：保持现有单源错误处理。

## 错误处理

- 综合 tab 使用 `Promise.allSettled`，避免单点失败导致整页空白。
- 单路失败时：
  - 将成功那路数据正常渲染。
  - 通过 `console.warn` 输出失败详情。
  - 在 UI 上显示轻量提示条（不阻塞滚动）。
- 双路失败时：
  - 设置 `state.error`。
  - 触发 `VirtualFeed` 错误 UI。

## 缓存与滚动恢复

- 每个子 tab 的原始数据、`next_url`、`scrollY` 独立保存。
- 综合 tab 不持久化合并结果，每次切换回综合时重新计算。
- R18 / R18G 开关切换、布局模式切换时，三个子 tab 都应刷新（沿用现有 `r18Changed` / `layoutModeChanged` 事件机制）。

## 测试计划

| 测试文件 | 覆盖点 |
|---|---|
| `packages/app/src/stores/__tests__/feedStore.test.ts`（或新增 `feedStore.test.ts`） | `computeMixedIllusts` 按 `create_date` 降序合并；`fetchMixed` 双源成功、单源失败、双源失败；`fetchMoreMixed` 选择正确源加载更多；切换子 tab 时缓存隔离。 |
| `packages/app/src/api/illust.ts` | `loadRecommended("manga")` 调用参数正确。 |
| `TabFeedPage` | 后续补充组件测试或 E2E，验证子 tab 切换触发正确请求。 |

## 实现顺序

1. 在 `api/illust.ts` 中验证 `content_type=manga` 可用性（必要时提供 `/v1/manga/recommended` fallback）。
2. 在 `feedStore.ts` 中新增 `recommendSubTab` 状态、综合 feed 合并与分页逻辑。
3. 在 `TabFeedPage.tsx` 中新增子 tab 切换 UI。
4. 补充 `feedStore` 单元测试。
5. 运行 `pnpm check` 和 `pnpm test` 验证类型与测试。

## 风险与后续优化

- **API 兼容性**：`content_type=manga` 在 App API 中的返回字段与 `illust` 一致（Pixiv 数据模型中 `type` 字段区分），风险较低。
- **性能**：综合 tab 每次加载会发起两个并行请求，网络开销翻倍，但可通过缓存缓解。
- **后续优化**：
  - 评估 `/v1/manga/recommended` 与 `content_type=manga` 的数据质量差异，选择更优方案。
  - 支持 URL 查询参数持久化子 tab 状态。
  - 在综合 tab 卡片上增加可选的类型角标（根据用户反馈决定）。
