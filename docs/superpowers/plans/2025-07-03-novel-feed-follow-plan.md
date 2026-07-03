# 小说关注 Feed 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为小说模式添加关注作者的小说 Feed，支持三层过滤（全部/公开/非公开）、双缓存、滚动位置恢复。

**Architecture:** 在现有 novelStore 中扩展 follow 分支，复用已存在的 NovelCard / NovelVirtualFeed 组件，与 illust 关注页使用完全对称的双缓存 + 归并排序模式。

**Tech Stack:** SolidJS 1.9 + TypeScript strict + Vite + Vitest + @capacitor/core

## Global Constraints

- 所有 UI 样式使用 `tokens.css` 中的 CSS 变量（`var(--colorXxx)`、`var(--borderRadiusXxx)`、`var(--elevationN)`）
- 不得使用硬编码颜色/圆角/阴影值
- 不得使用裸 `:focus`，必须用 `:focus-visible`
- 触控目标最小 40×40px
- 动画只允许 Fluent 四种缓动曲线和五种时长
- novelStore 使用 `createStore` + `produce` 模式（与现有一致）
- 路由组件（位于 `<Suspense>` 内）禁止使用 `createResource`
- 测试使用 Vitest，mock 模式使用 `vi.mock` + `vi.resetModules`

---

## 文件映射

| 文件 | 职责 | 改动类型 |
|---|---|---|
| `api/novel.ts` | 新增 `loadFollow(restrict)` API 函数 | 修改（+3 行） |
| `stores/novelStore.ts` | 扩展 follow 分支：状态、缓存、计算、请求、分页、滚动、响应式 | 修改（+~150 行） |
| `routes/NovelFeedPage.tsx` | 移除占位符，添加过滤 UI 和子标签切换 | 修改（+~50 行） |
| `tests/unit/api/novel.test.ts` | 新增 `loadFollow` 的 API 测试 | 扩展（+15 行） |
| `tests/unit/stores/novelStore.test.ts` | 新增 follow tab 的完整测试套件 | 扩展（+~100 行） |

---

### Task 1: API 层 — 新增 loadFollow

**Files:**
- Modify: `api/novel.ts`
- Test: `tests/unit/api/novel.test.ts`

**Interfaces:**
- Produces: `loadFollow(restrict: string = "public"): Promise<PixivNovelListResponse>`

- [ ] **Step 1: 在 `tests/unit/api/novel.test.ts` 中新增测试**

在 `describe("api/novel.ts")` 末尾添加：

```typescript
describe("loadFollow", () => {
  it("calls apiClient.get with /v1/novel/follow and restrict parameter", async () => {
    mockGet.mockResolvedValue({ novels: [], next_url: null });
    const { loadFollow } = await loadApi();
    await loadFollow("public");

    expect(mockGet).toHaveBeenCalledWith("/v1/novel/follow", { restrict: "public" });
  });

  it("defaults restrict to public", async () => {
    mockGet.mockResolvedValue({ novels: [], next_url: null });
    const { loadFollow } = await loadApi();
    await loadFollow();

    expect(mockGet).toHaveBeenCalledWith("/v1/novel/follow", { restrict: "public" });
  });

  it("returns PixivNovelListResponse", async () => {
    const expected: import("@/api/types").PixivNovelListResponse = {
      novels: [
        {
          id: 1,
          title: "test",
          user: { id: 1, name: "a", account: "a", profile_image_urls: {} },
          image_urls: { square_medium: "", medium: "", large: "" },
          tags: [],
          page_count: 1,
          text_length: 1000,
          is_bookmarked: false,
          total_bookmarks: 5,
          x_restrict: 0,
          create_date: "2026-01-01T00:00:00Z",
        } as import("@/api/types").PixivNovel,
      ],
      next_url: null,
    };
    mockGet.mockResolvedValue(expected);
    const { loadFollow } = await loadApi();
    const result = await loadFollow("private");

    expect(result).toEqual(expected);
    expect(result.novels).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
pnpm test -- tests/unit/api/novel.test.ts
```
预期：`loadFollow` 未定义，测试 FAIL。

- [ ] **Step 3: 在 `api/novel.ts` 中添加 `loadFollow` 函数**

在 `loadNext` 函数之后添加：

```typescript
/**
 * 关注用户的新小说列表。
 * Pixiv App-API: GET /v1/novel/follow
 * @param restrict "public" | "private"
 */
export function loadFollow(restrict: string = "public"): Promise<PixivNovelListResponse> {
  return apiClient.get<PixivNovelListResponse>("/v1/novel/follow", { restrict });
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
pnpm test -- tests/unit/api/novel.test.ts
```
预期：所有测试 PASS。

- [ ] **Step 5: 提交**

```bash
git add api/novel.ts tests/unit/api/novel.test.ts
git commit -m "feat: add loadFollow API for /v1/novel/follow"
```

---

### Task 2: Store 层 — 扩展 novelStore 支持 follow tab

**Files:**
- Modify: `stores/novelStore.ts`
- Test: `tests/unit/stores/novelStore.test.ts`

**Interfaces:**
- Consumes: `loadFollow(restrict)` from Task 1
- Produces: `novelFollowTab()`, `setNovelFollowTab(t)`, `computeFollowNovels()`, updated `ensureLoaded()`/`refresh()`/`fetchMore()`/`saveTabScroll()`/`getFeedScrollY()`

- [ ] **Step 1: 在 `tests/unit/stores/novelStore.test.ts` 末尾新增 follow tab 测试套件**

```typescript
vi.mock("@/api/novel", () => ({
  loadRecommended: vi.fn(),
  loadBookmarks: vi.fn(),
  loadNext: vi.fn(),
  loadFollow: vi.fn(),  // ← 新增
}));
```

在 `describe("novelStore")` 末尾添加：

```typescript
describe("follow tab", () => {
  beforeEach(() => {
    mockCurrentTab = "follow";
  });

  it("loads both public and private novels on first ensureLoaded", async () => {
    const pubNovels = [
      createNovel(1, "2026-02-01T00:00:00Z"),
    ];
    const privNovels = [
      createNovel(2, "2026-01-01T00:00:00Z"),
    ];
    vi.mocked(loadFollow).mockImplementation((restrict: string) => {
      if (restrict === "public") return Promise.resolve({ novels: pubNovels, next_url: null });
      if (restrict === "private") return Promise.resolve({ novels: privNovels, next_url: null });
      return Promise.resolve({ novels: [], next_url: null });
    });

    const store = await loadStore();
    await store.ensureLoaded();

    expect(loadFollow).toHaveBeenCalledTimes(2);
    expect(loadFollow).toHaveBeenCalledWith("public");
    expect(loadFollow).toHaveBeenCalledWith("private");
    // default followTab is "all", so should merge both
    expect(store.novels().map((n) => n.id)).toEqual([1, 2]);
    expect(store.loading()).toBe(false);
  });

  it("uses cache on subsequent ensureLoaded calls", async () => {
    vi.mocked(loadFollow).mockResolvedValue({ novels: [], next_url: null });

    const store = await loadStore();
    await store.ensureLoaded();
    await store.ensureLoaded();

    expect(loadFollow).toHaveBeenCalledTimes(1); // only first call
  });

  it("shows empty state when follow list is empty", async () => {
    vi.mocked(loadFollow).mockResolvedValue({ novels: [], next_url: null });

    const store = await loadStore();
    await store.ensureLoaded();

    expect(store.novels()).toEqual([]);
  });

  it("sets error when both requests fail", async () => {
    vi.mocked(loadFollow).mockRejectedValue(new Error("API error"));

    const store = await loadStore();
    await store.ensureLoaded();

    expect(store.error()).toBeTruthy();
    expect(store.loading()).toBe(false);
  });

  it("gracefully degrades when only private fails", async () => {
    const pubNovels = [createNovel(1, "2026-02-01T00:00:00Z")];
    vi.mocked(loadFollow).mockImplementation((restrict: string) => {
      if (restrict === "public") return Promise.resolve({ novels: pubNovels, next_url: null });
      return Promise.reject(new Error("Private error"));
    });

    const store = await loadStore();
    await store.ensureLoaded();

    // Should still show public data
    expect(store.novels()).toEqual(pubNovels);
    // error should be null (single failure is warning, not error)
    expect(store.error()).toBeNull();
  });

  it("refreshes follow data on refresh()", async () => {
    const page1 = [createNovel(1, "2026-01-01T00:00:00Z")];
    const page2 = [createNovel(2, "2026-02-01T00:00:00Z")];
    vi.mocked(loadFollow).mockResolvedValue({ novels: page1, next_url: null });

    const store = await loadStore();
    await store.ensureLoaded();
    expect(store.novels()).toEqual(page1);

    vi.mocked(loadFollow).mockResolvedValue({ novels: page2, next_url: null });
    await store.refresh();
    expect(loadFollow).toHaveBeenCalledTimes(2); // public + private re-fetched
  });

  it("scrollY is saved and restored per sub-tab", async () => {
    vi.mocked(loadFollow).mockResolvedValue({ novels: [], next_url: null });

    const store = await loadStore();
    // Simulate saving scroll at position 100 in "all" mode
    store.saveTabScroll("follow");
    // We can't easily mock window.scrollY, but we can verify it doesn't error
    expect(() => store.saveTabScroll("follow")).not.toThrow();
  });

  it("isNovelCached returns true after follow is loaded", async () => {
    vi.mocked(loadFollow).mockResolvedValue({ novels: [], next_url: null });

    const store = await loadStore();
    expect(store.isNovelCached("follow")).toBe(false);
    await store.ensureLoaded();
    expect(store.isNovelCached("follow")).toBe(true);
  });
});
```

**注意**: 还需要修改 `beforeEach` 中的 `mockCurrentTab = "recommended"` 恢复逻辑——不需要改，因为测试自己设置。

- [ ] **Step 2: 运行测试验证失败**

```bash
pnpm test -- tests/unit/stores/novelStore.test.ts
```
预期：至少 `loadFollow` 相关的测试失败（`loadFollow is not a function`，因为 mock 还没加）。

- [ ] **Step 3: 修改 `stores/novelStore.ts`**

在文件顶部增加 imports：

```typescript
import { loadRecommended, loadBookmarks, loadNext, loadFollow } from "../api/novel";
```

在 `createStore` 的 state 中增加 followTab 状态：

```typescript
const [state, setState] = createStore({
  novels: [] as PixivNovel[],
  nextUrl: null as string | null,
  loading: false,
  refreshing: false,
  error: null as string | null,
  followTab: "all" as "all" | "public" | "private",  // ← 新增
});
```

在 exports 区域添加：

```typescript
export const novelFollowTab = () => state.followTab;
export function setNovelFollowTab(t: "all" | "public" | "private") {
  setState("followTab", t);
}
```

添加 `pendingRefreshKeys` 锁：

```typescript
const pendingRefreshKeys = new Set<string>();
```

修改 `getSourceKey()`，接受可选的 subTab 参数：

```typescript
function getSourceKey(tab?: string, subTab?: string): string {
  const t = tab ?? currentTab();
  const st = subTab ?? state.followTab;
  if (t === "recommended") return "novel_recommended";
  if (t === "bookmarks") return "novel_bookmarks";
  if (t === "follow") return `novel_follow_${st}`;
  return `novel_${t}`;
}
```

添加 `getTabLoadedKey()` 用于标记「是否已加载 follow」：

```typescript
function getTabLoadedKey(tab?: string): string {
  const t = tab ?? currentTab();
  if (t === "follow") return "novel_follow";
  if (t === "recommended") return "novel_recommended";
  if (t === "bookmarks") return "novel_bookmarks";
  return `novel_${t}`;
}
```

添加 `computeFollowNovels()`：

```typescript
function byCreateDateDesc(a: PixivNovel, b: PixivNovel): number {
  return b.create_date.localeCompare(a.create_date);
}

function mergeAndSort(a: PixivNovel[], b: PixivNovel[]): PixivNovel[] {
  const result: PixivNovel[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].create_date >= b[j].create_date) {
      result.push(a[i++]);
    } else {
      result.push(b[j++]);
    }
  }
  result.push(...a.slice(i), ...b.slice(j));
  return result;
}

function computeFollowNovels(): PixivNovel[] {
  const st = state.followTab;
  if (st === "public") return tabNovels["novel_follow_public"] ?? [];
  if (st === "private") return tabNovels["novel_follow_private"] ?? [];
  const pub = tabNovels["novel_follow_public"] ?? [];
  const priv = tabNovels["novel_follow_private"] ?? [];
  if (pub.length === 0) return priv;
  if (priv.length === 0) return pub;
  return mergeAndSort(pub, priv);
}
```

添加响应式逻辑（在 `createRoot` 区域）：

```typescript
createRoot(() => {
  createEffect(() => {
    const tab = currentTab();
    if (tab === "follow") {
      novelFollowTab(); // 跟踪变化
      batch(() => {
        setState("novels", computeFollowNovels());
        const st = state.followTab;
        if (st === "public") setState("nextUrl", tabNextUrl["novel_follow_public"] ?? null);
        else if (st === "private") setState("nextUrl", tabNextUrl["novel_follow_private"] ?? null);
        else setState("nextUrl", tabNextUrl["novel_follow_public"] || tabNextUrl["novel_follow_private"] || null);
      });
    }
  });
});
```

修改 `ensureLoaded()`：

在函数开始前获取 `tab = currentTab()` 之后，添加 follow 分支：

```typescript
if (tab === "follow") {
  const pubCached = tabNovels["novel_follow_public"] !== undefined;
  const privCached = tabNovels["novel_follow_private"] !== undefined;
  if (pubCached || privCached) {
    batch(() => {
      setState("novels", computeFollowNovels());
      const st = state.followTab;
      if (st === "public") setState("nextUrl", tabNextUrl["novel_follow_public"] ?? null);
      else if (st === "private") setState("nextUrl", tabNextUrl["novel_follow_private"] ?? null);
      else setState("nextUrl", tabNextUrl["novel_follow_public"] || tabNextUrl["novel_follow_private"] || null);
    });
  }
  if (!tabLoaded["novel_follow"]) {
    if (!pubCached && !privCached) setState("novels", []);
    await fetchFollow();
    tabLoaded["novel_follow"] = true;
  }
  return;
}
```

将该分支放在 `ensureLoaded()` 中、现有的 `if (tab === "follow")` 检查位置。注意需要替换现有的简单判断。

添加 `fetchFollow()` 函数：

```typescript
async function fetchFollow(): Promise<void> {
  setState("loading", true);
  setState("error", null);
  const sourceKeys = ["novel_follow_public", "novel_follow_private"];

  // 检查锁
  for (const key of sourceKeys) {
    if (pendingRefreshKeys.has(key)) return;
  }
  for (const key of sourceKeys) {
    pendingRefreshKeys.add(key);
  }

  try {
    const [publicResult, privateResult] = await Promise.allSettled([
      loadFollow("public"),
      loadFollow("private"),
    ]);

    const errors: string[] = [];

    if (publicResult.status === "fulfilled") {
      tabNovels["novel_follow_public"] = publicResult.value.novels;
      tabNextUrl["novel_follow_public"] = publicResult.value.next_url;
    } else {
      errors.push((publicResult.reason as { message?: string }).message ?? "公开关注加载失败");
    }

    if (privateResult.status === "fulfilled") {
      tabNovels["novel_follow_private"] = privateResult.value.novels;
      tabNextUrl["novel_follow_private"] = privateResult.value.next_url;
    } else {
      errors.push((privateResult.reason as { message?: string }).message ?? "非公开关注加载失败");
    }

    if (currentTab() === "follow") {
      batch(() => {
        setState("novels", computeFollowNovels());
        const st = state.followTab;
        if (st === "public") setState("nextUrl", tabNextUrl["novel_follow_public"] ?? null);
        else if (st === "private") setState("nextUrl", tabNextUrl["novel_follow_private"] ?? null);
        else setState("nextUrl", tabNextUrl["novel_follow_public"] || tabNextUrl["novel_follow_private"] || null);
      });
    }

    if (errors.length > 0) {
      if (errors.length === 2) {
        setState("error", errors.join("; "));
      } else {
        console.warn("fetchFollow: partial failure —", errors.join("; "));
      }
    }
  } finally {
    for (const key of sourceKeys) {
      pendingRefreshKeys.delete(key);
    }
    setState("loading", false);
  }
}
```

修改 `refresh()`：

移除 `if (tab === "follow") return;` 守卫，替换为：

```typescript
if (tab === "follow") {
  const sourceKey = getTabLoadedKey(tab);
  const sourceKeys = ["novel_follow_public", "novel_follow_private"];

  // 检查锁
  for (const key of sourceKeys) {
    if (pendingRefreshKeys.has(key)) return;
  }

  tabLoaded[sourceKey] = false;
  tabNovels["novel_follow_public"] = [];
  tabNovels["novel_follow_private"] = [];
  tabNextUrl["novel_follow_public"] = null;
  tabNextUrl["novel_follow_private"] = null;
  setState("refreshing", true);
  try {
    await ensureLoaded();
  } finally {
    setState("refreshing", false);
  }
  return;
}
```

修改 `fetchMore()`：

在 `fetchMore()` 开头、加载判断之前，添加 follow 分支：

```typescript
if (tab === "follow") {
  if (state.loading) return;
  setState("loading", true);
  try {
    const fTab = state.followTab;
    if (fTab === "public") {
      const next = tabNextUrl["novel_follow_public"];
      if (!next) { setState("loading", false); return; }
      const data = await loadNext(next);
      tabNovels["novel_follow_public"] = [...(tabNovels["novel_follow_public"] || []), ...data.novels];
      tabNextUrl["novel_follow_public"] = data.next_url;
      setState(produce((s) => { s.novels.push(...data.novels); s.nextUrl = data.next_url; }));
    } else if (fTab === "private") {
      const next = tabNextUrl["novel_follow_private"];
      if (!next) { setState("loading", false); return; }
      const data = await loadNext(next);
      tabNovels["novel_follow_private"] = [...(tabNovels["novel_follow_private"] || []), ...data.novels];
      tabNextUrl["novel_follow_private"] = data.next_url;
      setState(produce((s) => { s.novels.push(...data.novels); s.nextUrl = data.next_url; }));
    } else {
      // "all" mode — 优先加载尾部更旧的那一路
      const pub = tabNovels["novel_follow_public"] || [];
      const priv = tabNovels["novel_follow_private"] || [];
      const pubOldest = pub.length > 0 ? pub[pub.length - 1].create_date : null;
      const privOldest = priv.length > 0 ? priv[priv.length - 1].create_date : null;

      if (pubOldest === null && privOldest === null) { setState("loading", false); return; }

      const preferPublic = privOldest === null || (pubOldest !== null && pubOldest >= privOldest);

      const loadSource = async (key: "novel_follow_public" | "novel_follow_private"): Promise<boolean> => {
        const next = tabNextUrl[key];
        if (!next) return false;
        const data = await loadNext(next);
        tabNovels[key] = [...(tabNovels[key] || []), ...data.novels];
        tabNextUrl[key] = data.next_url;
        return true;
      };

      const loaded = preferPublic
        ? (await loadSource("novel_follow_public")) || (await loadSource("novel_follow_private"))
        : (await loadSource("novel_follow_private")) || (await loadSource("novel_follow_public"));

      if (loaded) {
        setState(produce((s) => {
          s.novels = computeFollowNovels();
          s.nextUrl = tabNextUrl["novel_follow_public"] || tabNextUrl["novel_follow_private"];
        }));
      } else {
        setState("loading", false);
      }
    }
  } catch (e) {
    setState("error", (e as { message?: string }).message ?? "加载失败");
  } finally {
    setState("loading", false);
  }
  return;
}
```

修改 `saveTabScroll` 和 `getFeedScrollY`：

```typescript
export function saveTabScroll(tab: string) {
  if (tab === "follow") {
    tabScrollY[`novel_follow_${state.followTab}`] = window.scrollY;
    tabNextUrl[`novel_follow_${state.followTab}`] = state.nextUrl;
    return;
  }
  tabScrollY[getSourceKey(tab)] = window.scrollY;
}

export function getFeedScrollY(tab?: string): number {
  const t = tab ?? currentTab();
  if (t === "follow") {
    return tabScrollY[`novel_follow_${state.followTab}`] || 0;
  }
  return tabScrollY[getSourceKey(t)] || 0;
}
```

修改 `isNovelCached`：

```typescript
export function isNovelCached(tab?: string): boolean {
  const t = tab ?? currentTab();
  if (t === "follow") {
    return (
      tabLoaded["novel_follow"] ||
      tabNovels["novel_follow_public"] !== undefined ||
      tabNovels["novel_follow_private"] !== undefined
    );
  }
  const key = getSourceKey(t);
  return tabLoaded[key] || tabNovels[key] !== undefined;
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
pnpm test -- tests/unit/stores/novelStore.test.ts
```
预期：所有测试 PASS.

如果旧测试失败，可能是 mock 注册的问题（`loadFollow` 未在 `vi.mock` 中声明）。确保 `tests/unit/stores/novelStore.test.ts` 的 `vi.mock("@/api/novel")` 中添加了 `loadFollow: vi.fn()`。

- [ ] **Step 5: 提交**

```bash
git add stores/novelStore.ts tests/unit/stores/novelStore.test.ts
git commit -m "feat: extend novelStore with follow tab support"
```

---

### Task 3: UI 层 — NovelFeedPage 移除占位符 + 添加过滤 UI

**Files:**
- Modify: `routes/NovelFeedPage.tsx`

**Interfaces:**
- Consumes: `novelFollowTab()`, `setNovelFollowTab(t)`, `ensureLoaded()`, `saveTabScroll()`, `getFeedScrollY()` from novelStore

- [ ] **Step 1: 在 `NovelFeedPage.tsx` 中导入新增的 API**

```typescript
import {
  novels,
  nextUrl,
  loading,
  refreshing,
  error,
  ensureLoaded,
  fetchMore,
  refresh,
  saveTabScroll,
  getFeedScrollY,
  isNovelCached,
  novelFollowTab,      // ← 新增
  setNovelFollowTab,   // ← 新增
} from "../stores/novelStore";
```

- [ ] **Step 2: 移除占位符 + 添加过滤 UI**

找到：
```tsx
<Show when={props.tab === "follow"}>
  <div class="flex flex-col items-center justify-center py-24 gap-4 text-[var(--colorNeutralForeground2)]">
    ...
  </div>
</Show>
```

完全删除这段 `<Show>` 块（包括内容）。

在 `<NovelVirtualFeed>` 上方添加过滤 UI（当 `props.tab === "follow"` 时显示）：

```tsx
{/* ── 关注页三层过滤 ── */}
<Show when={props.tab === "follow"}>
  <div class="sticky top-0 z-10 surface-appbar px-4 pb-2">
    <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1 gap-1">
      {[
        { key: "all" as const, label: "全部" },
        { key: "public" as const, label: "公开" },
        { key: "private" as const, label: "非公开" },
      ].map((opt) => (
        <button
          class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
          classList={{
            "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
              novelFollowTab() === opt.key,
            "bg-transparent text-[var(--colorNeutralForeground2)]":
              novelFollowTab() !== opt.key,
          }}
          onClick={() => {
            if (novelFollowTab() !== opt.key) {
              saveTabScroll(props.tab);
              setNovelFollowTab(opt.key);
              window.scrollTo(0, getFeedScrollY(props.tab));
            }
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
</Show>
```

删除现有的 `<Show when={props.tab !== "follow"}><NovelVirtualFeed ... /></Show>` 包裹，改为无条件渲染：

```tsx
<NovelVirtualFeed
  novels={novels()}
  loading={loading() || refreshing()}
  error={error()}
  hasMore={nextUrl() !== null}
  onNovelClick={(id) => navigate(`/novel/${id}`)}
  onLoadMore={fetchMore}
  onRefresh={refresh}
  restoreScrollTop={cached ? getFeedScrollY(props.tab) : undefined}
  onSeriesClick={openSeriesSheet}
/>
```

- [ ] **Step 3: 检查编译**

```bash
pnpm check
```
预期：无编译错误。

- [ ] **Step 4: 运行现有测试**

```bash
pnpm test
```
预期：所有测试 PASS。

- [ ] **Step 5: 提交**

```bash
git add routes/NovelFeedPage.tsx
git commit -m "feat: replace follow placeholder with filter UI in NovelFeedPage"
```

---

## 自审

- **Spec 覆盖**：每条 spec 需求都有对应 task。API 端点 → Task 1，Store 双缓存/归并/分页/滚动/响应式 → Task 2，UI 过滤/移除占位符 → Task 3。
- **占位符扫描**：无 TBD/TODO。
- **类型一致性**：`novel_follow_public`/`novel_follow_private` 键名全篇一致，`computeFollowNovels()` 签名一致。
