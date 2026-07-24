# ADR-0019: 提取 useComments 原语

## 状态

提议

## 背景

CommentOverlay.tsx（445 行）管理 9 个独立信号和 4 个 async 操作（加载、分页、发布、删除），所有状态和逻辑混杂在渲染组件中。测试覆盖为 0。

API 层已通过 ADR-0017（comment.ts 参数化重构）统一，但组件层仍直接管理 CRUD 状态。

## 决策

**提取 `src/primitives/useComments.ts` 原语**，封装评论 CRUD 的所有状态和操作逻辑。CommentOverlay.tsx 降级为纯渲染组件。

### 原语接口

```typescript
function useComments(
  type: Accessor<CommentContentType>,
  targetId: Accessor<number>,
  enabled: Accessor<boolean>,
): {
  comments: Accessor<PixivComment[]>;
  hasLoaded: Accessor<boolean>;
  loading: Accessor<boolean>;
  error: Accessor<string | null>;
  postError: Accessor<string | null>;
  posting: Accessor<boolean>;
  deletingId: Accessor<number | null>;
  hasMore: Accessor<boolean>;
  loadMore: () => void;
  post: (text: string, parentId?: number) => Promise<void>;
  remove: (commentId: number) => Promise<void>;
  sentinelAttach: (el: HTMLDivElement) => void;
}
```

### 职责分配

| 层 | 职责 | 文件 |
|----|------|------|
| API 层 | HTTP 调用 | `api/comment.ts` |
| 状态层 | CRUD 状态、分页、AbortController 生命周期 | `primitives/useComments.ts` |
| 渲染层 | Header、评论列表、输入区、CommentItem | `components/CommentOverlay.tsx` |

## 约束

- `useComments` 使用 Accessor 参数（而非原始值），与 SolidJS 响应式范式一致
- `type` 或 `targetId` 变化时自动重新加载（via `createEffect`）
- `enabled` 控制是否激活（对应 `props.isOpen`）
- 不改变用户交互行为

## 后果

### 正面

- 评论逻辑可独立测试（mock `api/comment` 导入即可）
- 渲染层移除 120+ 行状态管理代码
- 其他组件（如详情页评论区）可复用 `useComments`
- 与 ADR-0017（参数化 comment API）形成完整分层：API → 原语 → 组件

### 反面

- 新增一个模块文件（~120 行）
- Accessor 参数的抽象增加了初次理解的认知成本

## 与现有 ADR 的关系

配合 ADR-0017（comment API 参数化），形成三层架构。

## 实施建议

1. 先写 `useComments.test.ts`（TDD Red）
2. 实现 `useComments.ts`（TDD Green）
3. 重构 CommentOverlay.tsx 使用原语
4. code-review 验证
