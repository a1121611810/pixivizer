# Pictelio 浏览上下文

本上下文描述 Pictelio 中作品（插画、小说）的列表浏览与详情阅读之间的导航概念，以及错误处理领域模型。

## 术语

### 浏览导航

**列表页（List）**：
以网格、瀑布流或文本列表形式展示多个作品的页面，例如推荐页、关注页、收藏页。

**详情页（Detail）**：
展示单个作品的完整内容页面，例如插画详情页、小说详情页。

**回顶（Scroll-to-top）**：
通过双击操作将页面滚动到最顶部（scrollY = 0）。
_Avoid_ 指术语层面避免使用"双击刷新""双击返回顶部"等表述，统一称"回顶"。
> 注：当前回顶使用即时滚动（`behavior: "auto"`），未加动画。

**滚动位置恢复（Scroll restoration）**：
从详情页返回到列表页时，恢复到离开前保存的精确滚动偏移（scrollY），而不是回到页面顶部。

**阅读进度（Reading progress）**：
小说详情中用户当前的阅读位置，滚动停止后持久化。双击回顶后阅读进度同步为开头。

### 错误处理

**代理错误（Proxy Error）**：
Vite 开发代理无法连接上游 Pixiv 服务器时产生的错误。代理层返回统一 JSON 载荷：
```json
{ "error": "proxy_error", "message": "代理连接失败，请检查网络或代理状态" }
```
`client.ts` 将其分类为 `ApiErrorType.PROXY`。

**ApiErrorType**：
`api/types.ts` 中定义的错误分类枚举。当前值：
- `NETWORK` — 网络不可用（`TypeError`：fetch 完全不可达）
- `UNAUTHORIZED` — HTTP 401，登录过期
- `FORBIDDEN` — HTTP 403，无权限
- `RATE_LIMIT` — HTTP 429，请求频繁
- `SERVER` — HTTP 5xx，服务器错误
- `PROXY` — 本地代理连接失败
- `UNKNOWN` — 无法归类的错误

**可操作错误指引（Actionable Error Guidance）**：
错误 UI 中根据 `ApiError.type` 渲染的、告诉用户具体该做什么的提示文字和按钮组合。例如：
- `PROXY` → "请检查本地代理 127.0.0.1:10808 是否运行"
- `NETWORK` → "请检查网络连接"
- `UNAUTHORIZED` → "请重新登录"

**统一错误展示组件（ErrorDisplay）**：
`src/components/ErrorDisplay.tsx` — 所有页面共享的错误展示组件。接收 `ApiError` 对象，按类型渲染不同操作指引 + 重试按钮。替代各页面各自为政的 `setState("error", msg)`。

### 浏览历史（Browsing History）

**浏览历史记录（HistoryEntry）**：
用户打开作品详情页时自动记录访问的条目。链路：详情页 data loaded → `collection.insert/update` → TanStack DB localStorage 持久化。

**历史时间线（History Timeline）**：
历史页面的展示形式——按日期分组的一维拍平数组，单实例 `Virtualizer`（`lanes: 1`）。数据源为 TanStack DB `localStorageCollectionOptions` collection 通过 `useLiveQuery` 获取。

**条目主键（Entry Key）**：
复合字符串 `"${userId}_${type}_${id}"`。`id` 不可单独做主键（illust 和 novel ID 空间不重叠但数值可撞），`type` 加上后保证跨类型唯一。

**用户隔离（User Isolation）**：
`userId` 字段嵌入每个 HistoryEntry，复合 key 天然隔离。登录/切换用户时对应刷新 L1 hot cache。登出不清空数据。

**1 个月过期（30-day Expiry）**：
浏览记录的自动淘汰窗口。写入时懒清除 `visitedAt < Date.now() - 30天` 的条目。不设条数硬上限。

**本地优先（Local-first）**：
浏览历史纯本地存储，不同步 Pixiv 服务端。使用 `@tanstack/solid-db` 的 `localStorageCollectionOptions` 持久化。
