# 评论系统设计文档

> 为 Pixiv 第三方客户端 Pictelio（pixivizer）的插画详情页和小说详情页添加评论功能。

## 概述

在插画详情（`/illust/:id`）和小说详情（`/novel/:id`）页面添加评论功能，支持查看、发表、回复、删除评论。采用半屏覆盖层（Instagram 风格）交互，仅登录用户可用。

## 需求范围

| 维度 | 决策 |
|------|------|
| 目标页面 | 插画详情 + 小说详情 |
| 交互方式 | 半屏覆盖层（从底部升起，背景变暗） |
| 功能 | 查看根评论（分页）、展开回复、发表评论、回复评论、删除自己的评论 |
| 登录要求 | 仅登录用户可看/可发 |
| 组件策略 | 单一通用组件，通过 `type` prop 适配插画/小说 |
| 加载策略 | 根评论默认分页 30 条/页，回复按需展开加载 |

## 类型定义

添加到 `src/api/types.ts`：

```typescript
export interface PixivCommentUser {
  id: number;
  name: string;
  account: string;
  profile_image_urls: { medium?: string };
}

export interface PixivComment {
  id: number;
  comment: string;
  comment_date: string;
  user: PixivCommentUser;
  parent_comment_id?: number;
  storable: boolean;
  root_comment_id?: number;
}

export interface PixivCommentRootResponse {
  comments: PixivComment[];
  next_url: string | null;
}

export interface PixivCommentReplyResponse {
  comments: PixivComment[];
  next_url: string | null;
}
```

## API 层

新建 `src/api/comment.ts`，提供 10 个函数：

| 函数 | Pixiv Endpoint | 说明 |
|------|----------------|------|
| `loadIllustRootComments(illustId, signal?)` | `GET /v1/illust/comment/root?illust_id=X` | 加载插画根评论（分页） |
| `loadIllustRootCommentsNext(url, signal?)` | `next_url` | 加载插画根评论下一页 |
| `loadIllustReplies(illustId, rootCommentId, signal?)` | `GET /v1/illust/comment/reply?illust_id=X&root_comment_id=Y` | 加载插画某条根评论的回复 |
| `postIllustComment(illustId, comment, parentCommentId?)` | `POST /v1/illust/comment/add` | 发表/回复插画评论 |
| `deleteIllustComment(commentId)` | `DELETE /v1/illust/comment/delete` | 删除插画评论 |
| `loadNovelRootComments(novelId, signal?)` | `GET /v1/novel/comment/root?novel_id=X` | 加载小说根评论（分页） |
| `loadNovelRootCommentsNext(url, signal?)` | `next_url` | 加载小说根评论下一页 |
| `loadNovelReplies(novelId, rootCommentId, signal?)` | `GET /v1/novel/comment/reply` | 加载小说回复 |
| `postNovelComment(novelId, comment, parentCommentId?)` | `POST /v1/novel/comment/add` | 发表/回复小说评论 |
| `deleteNovelComment(commentId)` | `DELETE /v1/novel/comment/delete` | 删除小说评论 |

所有函数通过 `apiClient.get/post` 调用，自动处理认证和 401 刷新。

## 组件设计

### CommentOverlay

**文件**：`src/components/CommentOverlay.tsx`

**Props**：

```typescript
interface CommentOverlayProps {
  type: "illust" | "novel";
  targetId: number;
  isOpen: boolean;
  onClose: () => void;
}
```

**内部状态（组件内 createSignal/createStore）**：

| 状态 | 类型 | 初始值 | 说明 |
|------|------|--------|------|
| `rootComments` | `PixivComment[]` | `[]` | 已加载的根评论 |
| `nextUrl` | `string \| null` | `null` | 分页下一页 URL |
| `loading` | `boolean` | `true` | 首次加载中 |
| `loadingMore` | `boolean` | `false` | 加载更多中 |
| `expandedReplies` | `Set<number>` | `new Set()` | 已展开回复的根评论 ID |
| `repliesMap` | `Record<number, PixivComment[]>` | `{}` | 根评论 ID → 回复列表 |
| `replyLoading` | `number \| null` | `null` | 正在加载回复的根评论 ID |
| `inputText` | `string` | `""` | 输入框文本 |
| `replyingTo` | `PixivComment \| null` | `null` | 正在回复的目标评论 |
| `error` | `string \| null` | `null` | 错误信息 |

**渲染结构**：

```
<div fixed inset-0 z-50>                    // 全屏蒙层容器
  <div absolute inset-0 bg-black/50 />       // 半透明背景（点空白关闭）
  <div absolute bottom-0 left-0 right-0 h-[80vh]>  // 下半屏覆盖层
    <header sticky>                          // 顶部栏：评论数 + 关闭按钮
    <div overflow-y-auto>                    // 评论列表（可滚动）
      ├─ <LoadingSpinner /> (首次加载)
      ├─ <For each={rootComments}>
      │    └─ 评论项（头像 + 用户名 + 正文 + 时间 + [回复] [删除]）
      │       └─ <Show replies> 回复列表
      │       └─ 展开/收起回复按钮
      ├─ 分页哨兵（触发加载更多）
      └─ 空状态展示
    <div sticky bottom-0>                    // 底部输入栏
      ├─ 回复目标提示 + [取消]
      └─ <input> + [发送] 按钮
```

### CommentItem（CommentOverlay 内部定义的小组件）

为了保持职责内聚，CommentItem 定义为 CommentOverlay 文件内的辅助组件（非独立文件），接收 props：

- `comment: PixivComment`
- `replies?: PixivComment[]`
- `isExpanded: boolean`
- `onToggleReplies: () => void`
- `onReply: (comment: PixivComment) => void`
- `onDelete: (commentId: number) => void`

### 状态机

```
idle → posting       (发送评论中)
idle → loadingMore   (滚动哨兵触发分页)
idle → loadingReply  (展开回复)
idle → deleting      (删除中)
以上操作成功 → idle
以上操作失败 → idle + 显示错误
```

### 生命周期

1. `onMount` / `isOpen` 变为 `true` → 调用 `loadXxxRootComments(targetId, signal)`
2. 加载完成 → 填充 `rootComments` 和 `nextUrl`
3. 滚动到底触发哨兵 → `loadRootCommentsNext(url, signal)`
4. 展开回复 → `loadXxxReplies(targetId, rootCommentId, signal)` → 写入 `repliesMap`
5. 发表/回复 → `postXxxComment(...)` → 成功则追加到对应列表
6. 删除 → `deleteXxxComment(commentId)` → 成功则从列表移除
7. 关闭 Overlay (`isOpen` → false) → 组件 unmount，所有 signal 释放，AbortController abort
8. 每次重新打开 → 全新加载，不保留历史状态

## 与详情页集成

### IllustDetail.tsx 改动

1. 导入 `CommentOverlay`
2. 新增 `createSignal(false)` 控制 overlay 开关
3. 统计行已有的 `total_comments` 改为可点击按钮，点击打开 overlay
4. 在返回 JSX 末尾（ReportSheet 附近）渲染 `<CommentOverlay>`，位于 `<PageTransition>` 内部但不受 Suspense 影响（position: fixed 脱离文档流）

### NovelDetail.tsx 改动

同上，统计行已有 `total_comments` 显示，改为可点击。

## 错误处理

| 场景 | 处理 |
|------|------|
| 网络错误 | 内联显示"网络不可用，请检查连接" + 重试按钮 |
| 401 | 自动触发 token 刷新（apiClient 内置），刷新失败则 overlay 关闭（当前未登录） |
| 发送失败 | 保留输入内容，显示内联错误"发送失败，请重试" |
| 删除失败 | toast 提示"删除失败" |
| 加载更多失败 | 哨兵位置显示"加载失败，点击重试" |

## 安全

- 评论正文为纯文本（Pixiv API 返回纯文本），直接插值 `{text}` 渲染，不注入 innerHTML
- 所有 API 请求通过 `apiClient` 自动附加 Bearer token
- 删除操作由 Pixiv 服务端鉴权
- 关闭 overlay 时 abort 所有飞行中请求

## 性能

- 分页加载（30 条/页），内存中仅持有已加载的评论
- 回复按需加载，不预拉取
- 无虚拟化：30 条/页远低于虚拟化必要性
- Overlay 关闭时组件完全卸载，无内存泄漏
- Overlay 通过 `position: fixed` 脱离文档流，不拖累详情页渲染性能

## 不包含的范围

- 评论编辑（Pixiv API 不支持）
- 评论点赞（Pixiv API 不支持公开的评论点赞）
- @提及和富文本评论
- 评论排序切换（Pixiv API 只返回时间降序）
- 图片评论（Pixiv API 不支持）

## 测试

### 单元测试

| 测试文件 | 测试内容 | 说明 |
|----------|----------|------|
| `src/api/__tests__/comment.test.ts` | API 函数调用 | mock `apiClient.get/post`，验证 URL 和参数构造 |
| `src/components/__tests__/CommentOverlay.test.tsx` | 组件渲染和行为 | Vitest browser mode，mock API，测试各状态 |

### API 层测试（`src/api/__tests__/comment.test.ts`）

测试场景（Vitest node 环境，mock `client.ts` 的 `apiClient`）：

1. `loadIllustRootComments(123)` → 验证调用 `apiClient.get("/v1/illust/comment/root", { illust_id: "123" })`
2. `loadIllustRootCommentsNext("next_url_val")` → 验证调用 `apiClient.get("next_url_val")`
3. `loadIllustReplies(123, 456)` → 验证调用 `apiClient.get("/v1/illust/comment/reply", { illust_id: "123", root_comment_id: "456" })`
4. `postIllustComment(123, "好图！")` → 验证调用 `apiClient.post("/v1/illust/comment/add", { illust_id: "123", comment: "好图！" })`
5. `postIllustComment(123, "回复", 456)` → 验证 `parent_comment_id: "456"` 参数
6. `deleteIllustComment(789)` → 验证调用 `apiClient.post("/v1/illust/comment/delete", { comment_id: "789" })`
7–12. 同上，前缀换为 `novel`，路径换为 `/v1/novel/comment/`
13. AbortSignal 透传 → 验证 `apiClient.get` 第三个参数为 signal

### 组件测试（`src/components/__tests__/CommentOverlay.test.tsx`）

使用 Vitest browser mode（项目已配置）。mock `src/api/comment.ts` 的全部导出。

| 测试 | 描述 | 验证点 |
|------|------|--------|
| 渲染空列表 | mock 返回空 comments + next_url=null | 显示空状态文案 |
| 渲染评论列表 | mock 返回 2 条根评论 | 显示用户名、正文、日期 |
| loading spinner | mock 延迟返回数据 | 显示 LoadingSpinner |
| 加载失败 | mock 返回 rejected | 显示错误信息和重试按钮 |
| 展开回复 | 点击展开 → mock 返回 2 条回复 | 回复列表出现，按钮变"收起" |
| 收起回复 | 再次点击收起 | 回复列表隐藏 |
| 分页加载更多 | 哨兵触发 → mock 返回下一页 2 条 | 列表追加到 4 条 |
| 无更多页 | mock 返回 next_url=null | 哨兵不渲染 |
| 发表根评论 | 输入文字 + 点发送 | 评论追加到列表顶部，输入框清空 |
| 发表回复 | 点回复 + 输入 + 发送 | 追加到 repliesMap，退出回复模式 |
| 发送失败 | mock postComment rejected | 显示错误，输入内容保留 |
| 删除评论 | 点删除 | 评论从列表移除 |
| 删除失败 | mock deleteComment rejected | toast 显示"删除失败" |

### E2E 测试

如果项目已有 Playwright E2E 框架（参见 `e2e-test-setup.md` 记忆），补充：

1. `specs/comments-illust.spec.ts` — 登录 → 打开插画详情 → 点击评论数 → overlay 出现 → 发表评论
2. `specs/comments-novel.spec.ts` — 同上，小说详情页

### 测试优先级

API 单元测试 → 组件测试 → E2E，每层通过后再进入下一层。

| 操作 | 文件 |
|------|------|
| 新建 | `src/api/comment.ts` |
| 编辑 | `src/api/types.ts`（添加类型） |
| 新建 | `src/components/CommentOverlay.tsx` |
| 编辑 | `src/routes/IllustDetail.tsx` |
| 编辑 | `src/routes/NovelDetail.tsx` |
