# 虚拟滚动迁移术语表

| 术语 | 定义 |
|------|------|
| **Virtualizer** | TanStack Virtual 的核心类，管理虚拟滚动状态（可见范围、滚动偏移、item 测量）。每个 Virtualizer 绑定一个滚动容器（`Window` 或 `HTMLElement`）。 |
| **createWindowVirtualizer** | TanStack Virtual 的 SolidJS 适配函数，绑定 `window` 作为滚动容器。用于 Feed 页面。 |
| **createVirtualizer** | TanStack Virtual 的 SolidJS 适配函数，绑定一个 `HTMLElement` 作为滚动容器。用于小说正文页（容器滚动模式）。 |
| **estimateSize** | TanStack Virtual 的配置项，一个 `(index: number) => number` 函数。同步返回第 index 个 item 的预估高度（px）。不触发 DOM 测量。 |
| **lanes** | TanStack Virtual 的配置项，指定瀑布流列数。例如 `lanes: 2` 表示 2 列瀑布流。`lanes: 1` 表示单列。 |
| **getItemKey** | TanStack Virtual 的配置项，`(index: number) => Key`。返回 item 的唯一标识，用于跨数据更新保持 item 身份稳定。推荐用数据 ID（illust.id / novel.id）。 |
| **overscan** | TanStack Virtual 的配置项，可见区域上下额外渲染的 item 数量（非像素）。默认 1，本项目用 2。 |
| **measureElement** | TanStack Virtual 的 ref 回调，用于动态测量 item 的真实 DOM 尺寸。挂载在 item 容器上：`ref={virtualizer.measureElement}`。 |
| **virtualItem** | TanStack Virtual 返回的可见项对象，包含 `index`, `key`, `start`（px offset）, `size`（px 高度）, `lane`, `end`。 |
| **takeSnapshot** | `virtualizer.takeSnapshot()` 方法，返回当前已测量 item 的快照 `Array<VirtualItem>`。用于跨导航保存和恢复测量状态。 |
| **initialMeasurementsCache** | Virtualizer 配置项，接收 `takeSnapshot()` 的输出，用于在初始挂载时跳过测量，直接使用之前缓存的尺寸。 |
| **initialOffset** | Virtualizer 配置项，设置初始滚动偏移量（px）。配合 `initialMeasurementsCache` 实现精确滚动恢复。 |
| **getTotalSize** | `virtualizer.getTotalSize()` 方法，返回虚拟内容的总体高度（px），用于设置滚动容器内层的高度。 |
| **getVirtualItems** | `virtualizer.getVirtualItems()` 方法，返回当前可见的 `VirtualItem[]`。每次渲染循环中调用。 |
| **scrollToIndex** | 滚动到指定 index 的 item。支持 `align: 'start' | 'center' | 'end' | 'auto'`。 |
| **scrollToOffset** | 滚动到指定的像素偏移。 |
| **spacer 模式** | 当前 NovelDetail 使用的虚拟渲染方式：top spacer（撑杆）→ 可见内容 → bottom spacer（撑杆）。迁移后改为 absolute + translateY。 |
| **absolute + translateY** | TanStack Virtual 标准渲染方式：父容器 `position: relative`，每个 item `position: absolute; top: 0; transform: translateY(Npx)`。 |
| **MasonryLayout** | 当前项目自定义的布局类型，包含 item 的 x/y/width/height 数组 + totalHeight。迁移后移除。 |
| **ScrollWindow** | 当前 `computeWindow()` 返回的类型 `{ startIndex, endIndex }`。迁移后由 `getVirtualItems()` 替代。 |
| **scroll restoration** | 在路由切换/Tab 切换后，恢复用户之前所在的滚动位置。迁移前用 `createScrollRestoration`（RAF 轮询），迁移后用 `takeSnapshot` + `initialMeasurementsCache`。 |
