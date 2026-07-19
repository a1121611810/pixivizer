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

**滚动恢复模式（Scroll restoration mode）**：
`simple` 模式保存 `window.scrollY` 数值，适用于非虚拟滚动的页面；`virtual` 模式保存 TanStack Virtual 的 `ScrollRestoreState`（`VirtualItem[] + offset`），适用于虚拟滚动 Feed 的精确恢复。

**全局滚动缓存（scrollRestoreGlobal）**：
`src/primitives/createScrollRestore.ts` 导出的模块级单例，提供 `saveSimple/getSimple/setSimple/saveVirtual/getVirtual/remove/clearAll` 方法。所有 store（feedStore、novelStore、bookmarkStore、userIllustsStore）的滚动位置统一通过此单例管理，不再各自维护独立变量。底层使用 LRU 缓存：simple 模式最多 80 条，virtual 模式最多 20 条。

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

**OAuth Token 400 错误（OAuth Token 400 Error）**：
Pixiv OAuth 端点在 refresh_token 已过期/无效时返回 HTTP 400 而非 401，
响应体格式为 `{ error: { message: "...OAuth...invalid_request..." } }`。
`client.ts` 中 `isOAuthTokenErrorResponse()` 检测此模式，将其视为 token 失效错误，
`classifyError()` 将其分类为 `ApiErrorType.UNAUTHORIZED` 并返回友好提示
"登录凭证已失效，请重新登录"；`executeRequest()` 在抛出前先触发 `onUnauthorized()`
清理流程（调用 `logout()` 清除 token 状态），确保用户被引导到登录页而非卡在重试循环中。

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

### 搜索

**搜索范围（Search Scope）**：
搜索前选择的资源类型，决定 API 调用的目标端点。可选值：`全部`（调用 illust + novel 两个端点并合流）、`插画·漫画`（仅 `/v1/search/illust`）、`小说`（仅 `/v1/search/novel`）。搜索范围作为搜索请求参数的一部分，在搜索执行前设定。

**搜索关键词（Search Query）**：
用户输入的搜索文本，即 Pixiv API 的 `word` 参数。支持标签名、标题、画师名等。搜索历史以关键词为单位持久化。

**搜索排序（Search Sort）**：
搜索结果的时间/热门度排序方式。对应 Pixiv API 的 `sort` 参数：`date_desc`（按时间降序）、`date_asc`（按时间升序）、`popular_desc`（按热门度降序）。

**搜索目标（Search Target）**：
关键词匹配的作品字段。对应 Pixiv API 的 `search_target` 参数（目前已归档确认，暂不排除后续对用户暴露）。取值包括 `partial_match_for_tags`（标签部分匹配，默认）、`exact_match_for_tags`（标签精确匹配）、`title_and_caption`（标题和说明文）。

**搜索建议（Search Autocomplete）**：
用户输入过程中，从 Pixiv `/v1/search/autocomplete` 接口拉取的标签补全建议列表。仅作为建议展示，用户可选择补全到搜索框。

**搜索历史（Search History）**：
用户曾经搜索过的关键词列表，本地持久化。历史以倒序展示，支持点击快速复用和单条删除。不设置过期时间，但条数有上限（最近 50 条）。

**搜索结果混排（Mixed Search Results）**：
当搜索范围为「全部」时，同时调用 `search/illust` 和 `search/novel` 两个 API，将返回的 `PixivIllust[]` 和 `PixivNovel[]` 按 `create_date` 降序合流为单一时间线。用户可通过 filter chip 筛选只查看某一类型。

**结果类型筛选（Type Filter Chip）**：
搜索结果显示后，在结果列表顶部提供的一组 filter chip，用于在混排结果中筛选类型：「全部 / 插画·漫画 / 小说」。筛选不影响 API 请求，仅客户端过滤已加载的结果。

**FAB（Floating Action Button）**：
悬浮在页面右下角或左下角的可拖动搜索入口图标。在所有页面可见。单击展开搜索页，可长按拖动改变位置。位置偏好持久化到本地。

**标签导航（Tag Navigation）**：
在作品详情页（插画/小说）的标签区域，点击标签直接导航到搜索页，以该标签名作为搜索关键词，默认搜索范围设为「全部」。

**搜索合流（Search Merge）**：
客户端将 `search/illust` 和 `search/novel` 的响应合并为统一列表的过程。以 `create_date` 为主排序键，同类型内部保持 API 返回的相对顺序。合流后的每一项具有统一结构（`SearchResultItem`），包含类型标记、作品实体和排序时间戳。
