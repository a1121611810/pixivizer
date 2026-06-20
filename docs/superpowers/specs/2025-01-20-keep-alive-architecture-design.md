# Pixivizer Keep-Alive 页面保活架构设计

**日期**: 2025-01-20
**状态**: 设计中

## 目标

实现全链路页面保活，在以下所有场景中**不重载**：

| #   | 场景                              | 要求               |
| --- | --------------------------------- | ------------------ |
| 1   | 详情 → 点击返回 → 列表            | 列表不重载         |
| 2   | 详情 → 系统侧滑返回 → 列表        | 列表不重载         |
| 3   | 详情 → 大图 → 点击返回 → 详情     | 详情不重载         |
| 4   | 详情 → 大图 → 系统侧滑返回 → 详情 | 详情不重载         |
| 5   | NavTab 互相切换                   | 不重载             |
| 6   | 列表下拉刷新                      | 重载（拉取新数据） |
| 7   | 设置改列表画质                    | 列表重载           |
| 8   | 设置改详情画质                    | 详情重载           |

## 架构概览

**核心思路**：放弃 Solid Router 在 Feed/Detail 之间的路由切换，改为手动页面栈管理 + CSS 可见性切换。Feed 和 Detail 始终存活在 DOM 中。

```
路由层面（Solid Router）
  ├── /login → Login
  └── /*     → MainShell（手动管理页面栈）
                │
                ├── FeedShell              display: block | none
                │   ├── TabPanel(推荐)     display: block | none
                │   ├── TabPanel(关注)     display: block | none
                │   └── TabPanel(收藏)     display: block | none
                │
                └── IllustDetail           display: block | none
                     ├── 详情内容
                     └── ImageViewer       overlay（现有逻辑不变）
```

## 页面栈管理

### 状态机

```
         pushState            pushState
  FEED ────────────▶ DETAIL ────────────▶ (无更深页面)
   ▲                    │
   │    popstate        │ popstate / 点返回
   └────────────────────┘
```

### 导航函数

```
navigateToFeed()
  → pushState({ view: "feed" }, "", "/feed")
  → setCurrentView("feed")

navigateToDetail(id)
  → setDetailIllustId(id)
  → pushState({ view: "detail", id }, "", "/illust/" + id)
  → setCurrentView("detail")

goBack()
  → window.history.back()  // 触发 popstate，由监听器处理状态恢复
```

### 浏览器历史栈

```
/feed
  state: { view: "feed" }

用户点击作品 123:
  pushState → URL: /illust/123, state: { view: "detail", id: 123 }
  历史: [/feed, /illust/123]

用户侧滑返回:
  popstate → 上一状态 { view: "feed" }
  URL 恢复 /feed
  历史: [/feed]

再点击作品 456:
  pushState → URL: /illust/456, state: { view: "detail", id: 456 }
  历史: [/feed, /illust/456]
```

### 初始化（直接从 URL 进入）

```
onMount:
  检查 window.location.pathname
  如果 /illust/:id → setCurrentView("detail"), setDetailIllustId(id)
  如果 /feed → setCurrentView("feed")
  调用 replaceState 修正初始历史条目
```

## 组件设计

### MainShell（新建）

**职责**：管理页面栈、协调 FeedShell 和 IllustDetail 的可见性、处理 popstate

**状态**：

- `currentView: "feed" | "detail"`
- `detailIllustId: number | null`

**渲染**：

```tsx
<div>
  <div style={{ display: currentView() === "feed" ? "block" : "none" }}>
    <FeedShell onIllustClick={(id) => navigateToDetail(id)} />
  </div>
  <div style={{ display: currentView() === "detail" ? "block" : "none" }}>
    <IllustDetail illustId={detailIllustId()} onBack={() => goBack()} />
  </div>
  <SettingsSheet />
</div>
```

### FeedShell（改造自当前 TabFeedPage + NavBar）

**职责**：Tab 面板管理、NavBar

**状态**：

- `currentTab: "recommended" | "follow" | "bookmarks"`
- `activatedTabs: Set<string>`（跟踪哪些 Tab 已被首次激活）

**渲染**：

```tsx
<div>
  <header>Pixivizer</header>
  <TabPanel tab="recommended" visible={currentTab() === "recommended"} />
  <TabPanel tab="follow" visible={currentTab() === "follow"} />
  <TabPanel tab="bookmarks" visible={currentTab() === "bookmarks"} />
  <NavBar
    onTabChange={(tab) => {
      setCurrentTab(tab);
      markTabActivated(tab);
    }}
    onSettingsOpen={...}
  />
</div>
```

**TabPanel 懒激活逻辑**：

- 首次切换到某 Tab 时才创建其内容
- 创建后 DOM 保持存活，后续切换仅切换 CSS display

### TabPanel（新建）

**职责**：延迟初始化并缓存单个 Tab 的 VirtualFeed

```tsx
const TabPanel: Component<{ tab; visible }> = (props) => {
  // 首次 visible=true 时渲染内容，之后永不销毁
  const [everActivated, setEverActivated] = createSignal(false);

  createEffect(() => {
    if (props.visible) setEverActivated(true);
  });

  return (
    <div style={{ display: props.visible ? "block" : "none" }}>
      {everActivated() && <VirtualFeedContent tab={props.tab} />}
    </div>
  );
};
```

### IllustDetail（改造）

**改动**：

- 不再从 `useParams` 读取 illust ID，改为接收 `illustId` prop
- 不再使用 `useNavigate` 导航，改为接收 `onBack` 回调
- `onMount` 数据加载改为响应式：监听 `illustId` prop 变化
- 图片 viewer（ImageViewer/UgoiraViewer）保持现有 overlay 模式不变

## 数据流与缓存

### 三层缓存体系

| 层              | 存储                   | 生命周期       | 作用              |
| --------------- | ---------------------- | -------------- | ----------------- |
| feedStore       | tabIllusts, tabNextUrl | 应用存活       | 避免 API 重复请求 |
| imageLoader LRU | Blob 缓存 (Map)        | 最多 200 条    | 避免图片重复下载  |
| DOM Keep-Alive  | CSS display 切换       | 首次激活后持久 | 避免组件重新挂载  |

### 重载触发

| 触发条件           | 实现                                                                |
| ------------------ | ------------------------------------------------------------------- |
| 下拉刷新           | feedStore.refresh() — 组件不重建，数据替换                          |
| listQuality 变化   | `createEffect` 在 VirtualFeedContent 中监听 → 调用 refresh()        |
| detailQuality 变化 | `createEffect` 在 IllustDetail 中监听 → 重新 fetch 当前 illust 数据 |

## 路由变更

```
当前                          改后
─────────────────────────     ─────────────────────
/login    → Login             /login    → Login
/recommended → TabFeedPage    /*        → MainShell
/following   → TabFeedPage      ↑ 统一入口
/illust/:id  → IllustDetail     ↑ 内部管理 Feed/Detail 切换
/bookmarks   → Bookmarks
```

## 内存评估

- 每个 Tab 面板：~60 张卡片 × ~30 DOM 节点 ≈ 1800 节点
- 3 个面板：~5400 节点
- 详情页：~100 节点
- 合计：~5500 DOM 节点
- 隐藏面板中的 `<img>` 不被浏览器解码，仅占用 DOM 内存
- 对现代移动设备完全可接受

## 实施步骤

1. 新建 `src/components/MainShell.tsx` — 页面栈管理、popstate 监听
2. 新建 `src/components/TabPanel.tsx` — 懒激活容器
3. 改造 `src/routes/FeedShell.tsx`（基于当前 TabFeedPage）— 合并 NavBar + 三 TabPanel
4. 改造 `src/routes/IllustDetail.tsx` — props 驱动替代 route params
5. 更新 `src/App.tsx` — 路由简化为 Login + MainShell
6. 调整 `src/stores/feedStore.ts` — 响应 listQuality 变化触发重载
7. 清理：删除 `src/routes/TabFeedPage.tsx`、移除 `/recommended` `/following` `/bookmarks` 路由
