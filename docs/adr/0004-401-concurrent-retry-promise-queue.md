# ADR-0004: 401 并发重试 — Promise 队列代替 boolean 标志

`client.ts:22` 用模块级 `isRetryingAfter401: boolean` 防止 401 → refresh 的无限循环。两个并发请求同时收到 401 时：第一个创建 refresh，第二个看到标志为 true 直接抛出 401 错误——即使 refresh 成功。调用方看到错误的 401 失败。

## 决定

将 `isRetryingAfter401: boolean` 替换为 `refreshPromise: Promise<void> | null`：

- 首次 401：创建 `refreshPromise = onUnauthorized().finally(() => refreshPromise = null)`
- 后续 401：`await refreshPromise` 共享同一个 refresh 结果
- `onUnauthorized()` 内部 `catch` 所有异常（`authStore.ts:59`），因此 Promise 始终 resolve，不 reject
- refresh 完成后统一的 `if (!accessToken) throw` 让所有请求一致地继续或一致地失败

## 考虑到但拒绝的选项

- **请求队列 + 重放**（暂停所有排队请求，refresh 后重放）—— 实现复杂，需要维护请求队列和重放机制，增加内存占用。收益（refresh 前后的所有请求都被重放）超过了实际需要——Pixiv API 调用不会在 401 期间堆积大量请求。

- **tryLock 模式 + 轮询**（sleep + retry）—— 非标准模式，sleep 浪费事件循环，不确定延迟。

## 影响

- 删除 1 行 (`isRetryingAfter401`)、新增 6 行 (`refreshPromise` + 逻辑)
- 并发场景下 0 个请求丢失，全部共享同一次 refresh 结果
- JavaScript 事件循环保证 `if (!refreshPromise) → refreshPromise = ...` 在同一同步 tick 完成，无竞态
