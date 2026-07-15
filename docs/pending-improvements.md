# 待改进项

本文件记录项目中已识别但尚未实施的体验改进与已知问题，便于后续单独跟进。

## 代理/网络错误反馈未闭环

**状态**: 待处理  
**提出时间**: 2026-07-15  
**相关文件**:
- `packages/app/src/api/client.ts` — `classifyError`、`extractPixivErrorMessage`
- `packages/app/vite.config.ts` — `server.proxy` 错误处理
- `packages/app/src/routes/Login.tsx` — 登录错误展示
- `packages/app/src/stores/bookmarkStore.ts` — 收藏页错误映射示例

### 问题描述

当前应用在代理失败或网络异常时，错误没有被一致地、可操作地传递给用户：

1. **Vite 代理层错误处理不一致**
   - `/pixiv-api` 和 `/pixiv-www` 已配置 `proxy.on("error")`，代理失败时返回统一的 `proxy_error` JSON。
   - `/pixiv-oauth` 和 `/pixiv-img` **未配置**同样的错误处理，依赖 Vite/http-proxy 默认行为，返回的错误格式不一致。

2. **错误消息不够具体**
   - `client.ts` 的 `classifyError` 把代理失败归类为 `NETWORK` 或 `SERVER`，消息为"网络不可用，请检查连接"或"服务器错误"。
   - 用户无法从提示中得知具体应检查本地代理（默认 `127.0.0.1:10808`）是否运行。

3. **UI 层缺少统一的错误状态展示**
   - `Login.tsx` 和 `bookmarkStore.error()` 有基础错误提示。
   - 但 Feed、收藏、详情等主要页面大多只有 loading 状态，请求失败时容易静默失败或仅在 console 报错，用户看不到明确的错误原因和重试入口。

### 建议改进

1. **统一代理错误响应**
   给 `/pixiv-oauth` 和 `/pixiv-img` 也加上 `configure` 错误处理，返回与 `/pixiv-api` 一致的 `proxy_error` JSON：
   ```json
   { "error": "proxy_error", "message": "代理连接失败，请检查网络或代理状态" }
   ```

2. **让 `client.ts` 识别 `proxy_error` 并给出可操作消息**
   在 `extractPixivErrorMessage` 或 `classifyError` 中检测 `proxy_error`，把消息改为：
   > "本地代理连接失败（127.0.0.1:10808），请检查代理软件是否运行"

3. **为主要页面增加错误状态展示**
   至少应包括：
   - 显示错误原因（区分网络错误、代理错误、服务端错误）
   - 提供"重试"按钮
   - 对 NETWORK/代理类错误显示可操作指引

### 优先级判断

这是一个真实的体验缺口，但不是功能 bug：当代理和 token 都正常时，当前流程完全可用。建议作为**体验优化**单独排期处理。
