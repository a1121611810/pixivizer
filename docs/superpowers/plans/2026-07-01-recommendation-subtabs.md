# 推荐页「综合 / 插画 / 漫画」子 tab 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在推荐页内部增加「综合 / 插画 / 漫画」三个子 tab，其中综合 tab 通过双源并行 + 按时间合并实现真正的插画+漫画混合 feed。

**Architecture:** 复用现有 `/v1/illust/recommended` App API，通过 `content_type=illust|manga` 区分数据源；在 `feedStore` 中新增 `recommendSubTab` 状态、双源缓存 key、合并与分页逻辑；在 `TabFeedPage` 中新增子 tab 切换条；通过 Vitest 单元测试覆盖合并、加载、分页、失败场景。

**Tech Stack:** SolidJS 1.9 + TypeScript 6.0 (strict) + Vite 8.0 + Vitest 4.1

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `packages/app/src/api/illust.ts` | 新增 `loadMangaRecommended()` 作为漫画推荐的独立入口（内部调用 `/v1/illust/recommended?content_type=manga`，便于后续切换到 `/v1/manga/recommended`）。 |
| `packages/app/src/api/types.ts` | 确认 `ContentType` 已包含 `"manga"`，无需改动（当前定义已是 `"illust" \| "manga"`）。 |
| `packages/app/src/stores/feedStore.ts` | 新增 `recommendSubTab` 状态；新增综合 feed 双源合并、缓存、分页逻辑；调整 `ensureLoaded` / `refresh` / `fetchMore` 路由。 |
| `packages/app/src/stores/__tests__/feedStore.test.ts` | 新增 `computeMixedIllusts`、`fetchMixed`、`fetchMoreMixed`、子 tab 切换相关单元测试。 |
| `packages/app/src/routes/TabFeedPage.tsx` | 在推荐页渲染「综合 / 插画 / 漫画」子 tab 切换条，切换时保存/恢复滚动位置并触发加载。 |

---

## Task 1: API 层新增漫画推荐入口

**Files:**
- Modify: `packages/app/src/api/illust.ts:80-88`

**Context:** 当前 `loadRecommended(contentType)` 已支持 `content_type=manga`，但为了代码可读性和后续可切换到 `/v1/manga/recommended`，封装一个独立的 `loadMangaRecommended()`。

- [ ] **Step 1: 添加 `loadMangaRecommended` 函数**

```typescript
export function loadMangaRecommended(): Promise<PixivIllustListResponse> {
  return loadRecommended("manga");
}
```

- [ ] **Step 2: 提交**

```bash
git add packages/app/src/api/illust.ts
git commit -m "feat(api): add loadMangaRecommended wrapper for manga recommendations"
```

---

## Task 2: feedStore 新增子 tab 状态

**Files:**
- Modify: `packages/app/src/stores/feedStore.ts:8-17`

**Context:** 在 `feedStore` 中新增 `recommendSubTab` 状态，用于在推荐页内部切换综合/插画/漫画。

- [ ] **Step 1: 在 state 中新增字段并在顶部定义类型**

在文件顶部（`import` 之后，`const [state, setState]` 之前）添加：

```typescript
export type RecommendSubTab = "mixed" | "illust" | "manga";
```

在 `createStore` 初始状态中添加：

```typescript
const [state, setState] = createStore({
  illusts: [] as PixivIllust[],
  nextUrl: null as string | null,
  loading: false,
  refreshing: false,
  error: null as string | null,
  followTab: "all" as "all" | "public" | "private",
  recommendSubTab: "mixed" as RecommendSubTab,
});
```

- [ ] **Step 2: 导出 getter / setter**

在 `setFollowTab` 附近添加：

```typescript
export const recommendSubTab = () => state.recommendSubTab;
export const setRecommendSubTab = (t: RecommendSubTab) => setState("recommendSubTab", t);
```

- [ ] **Step 3: 提交**

```bash
git add packages/app/src/stores/feedStore.ts
git commit -m "feat(feedStore): add recommendSubTab state for recommended sub-tabs"
```

---

## Task 3: 实现综合 feed 合并函数

**Files:**
- Modify: `packages/app/src/stores/feedStore.ts`

**Context:** 综合 tab 需要把插画源和漫画源按 `create_date` 降序合并，再经 `filterFeedIllusts` 过滤。`mergeAndSort` 已在文件中存在，复用它。

- [ ] **Step 1: 新增 `computeMixedIllusts` 函数**

```typescript
/**
 * 计算综合推荐：合并插画源和漫画源，按 create_date 降序排序后过滤。
 */
export function computeMixedIllusts(): PixivIllust[] {
  const illust = tabIllusts["recommended_illust"] ?? [];
  const manga = tabIllusts["recommended_manga"] ?? [];
  if (illust.length === 0) return filterFeedIllusts(manga);
  if (manga.length === 0) return filterFeedIllusts(illust);
  return filterFeedIllusts(mergeAndSort(illust, manga));
}
```

- [ ] **Step 2: 提交**

```bash
git add packages/app/src/stores/feedStore.ts
git commit -m "feat(feedStore): add computeMixedIllusts for merged recommended feed"
```

---

## Task 4: 实现综合 tab 加载函数并测试

**Files:**
- Modify: `packages/app/src/stores/feedStore.ts`
- Modify: `packages/app/src/stores/__tests__/feedStore.test.ts`

**Context:** 综合 tab 进入时需要并行请求插画和漫画两路推荐，成功后合并并更新状态。

- [ ] **Step 1: 实现 `fetchMixed`**

```typescript
export async function fetchMixed() {
  setState("loading", true);
  setState("error", null);
  const errors: string[] = [];

  try {
    const [illustResult, mangaResult] = await Promise.allSettled([
      loadRecommended("illust"),
      loadMangaRecommended(),
    ]);

    if (illustResult.status === "fulfilled") {
      tabIllusts["recommended_illust"] = illustResult.value.illusts;
      tabNextUrl["recommended_illust"] = illustResult.value.next_url;
    } else {
      errors.push((illustResult.reason as { message?: string }).message ?? "插画推荐加载失败");
    }

    if (mangaResult.status === "fulfilled") {
      tabIllusts["recommended_manga"] = mangaResult.value.illusts;
      tabNextUrl["recommended_manga"] = mangaResult.value.next_url;
    } else {
      errors.push((mangaResult.reason as { message?: string }).message ?? "漫画推荐加载失败");
    }

    if (currentTab() === "recommended" && recommendSubTab() === "mixed") {
      batch(() => {
        setState("illusts", computeMixedIllusts());
        setState("nextUrl", tabNextUrl["recommended_illust"] || tabNextUrl["recommended_manga"]);
      });
    }

    if (errors.length > 0) {
      if (errors.length === 2) {
        setState("error", errors.join("; "));
      } else {
        console.warn("fetchMixed: partial failure —", errors.join("; "));
      }
    }
  } catch (e) {
    setState("error", (e as { message?: string }).message ?? "加载失败");
  } finally {
    setState("loading", false);
  }
}
```

- [ ] **Step 2: 编写测试**（mock `loadRecommended` 返回两组数据，验证合并顺序与过滤）

在 `feedStore.test.ts` 中：

```typescript
import { loadRecommended, loadMangaRecommended, loadNext } from "../api/illust";

function createIllust(id: number, createDate: string, type: "illust" | "manga" = "illust"): PixivIllust {
  return {
    id,
    title: `work-${id}`,
    type,
    user: { id: 1, name: "u", account: "u", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    width: 100,
    height: 100,
    page_count: 1,
    is_bookmarked: false,
    total_bookmarks: 0,
    tags: [],
    x_restrict: 0,
    create_date: createDate,
    meta_pages: [],
    meta_single_page: {},
  } as PixivIllust;
}

describe("fetchMixed", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCurrentTab = "recommended";
    vi.mocked(loadRecommended).mockReset();
    vi.mocked(loadMangaRecommended).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).window = undefined;
  });

  it("merges illust and manga by create_date descending", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [
        createIllust(1, "2026-07-01T09:00:00+09:00", "illust"),
        createIllust(3, "2026-07-01T11:00:00+09:00", "illust"),
      ],
      next_url: "https://app-api.pixiv.net/v1/illust/recommended?content_type=illust&offset=30",
    });
    vi.mocked(loadMangaRecommended).mockResolvedValue({
      illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
      next_url: "https://app-api.pixiv.net/v1/illust/recommended?content_type=manga&offset=30",
    });

    const { setRecommendSubTab, illusts, ensureLoaded } = await import("../feedStore");
    setRecommendSubTab("mixed");
    await ensureLoaded();

    const ids = illusts().map((i) => i.id);
    expect(ids).toEqual([3, 2, 1]);
  });

  it("shows partial data when one source fails", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(1, "2026-07-01T09:00:00+09:00", "illust")],
      next_url: null,
    });
    vi.mocked(loadMangaRecommended).mockRejectedValue(new Error("manga error"));

    const { setRecommendSubTab, illusts, ensureLoaded } = await import("../feedStore");
    setRecommendSubTab("mixed");
    await ensureLoaded();

    expect(illusts().map((i) => i.id)).toEqual([1]);
  });
});
```

注意：由于 `loadMangaRecommended` 尚未在 mock 中声明，需要更新 `feedStore.test.ts` 顶部的 mock：

```typescript
vi.mock("../api/illust", () => ({
  loadRecommended: vi.fn(),
  loadMangaRecommended: vi.fn(),
  loadFollow: vi.fn(),
  loadNext: vi.fn(),
}));
```

- [ ] **Step 3: 提交**

```bash
git add packages/app/src/stores/feedStore.ts packages/app/src/stores/__tests__/feedStore.test.ts
git commit -m "feat(feedStore): implement fetchMixed with dual-source merge and tests"
```

---

## Task 5: 实现综合 tab 加载更多并测试

**Files:**
- Modify: `packages/app/src/stores/feedStore.ts`
- Modify: `packages/app/src/stores/__tests__/feedStore.test.ts`

**Context：** 综合 tab 加载更多时，需要维护两个源的 `next_url`，并根据当前合并列表尾部时间决定加载哪一路。

- [ ] **Step 1: 实现 `fetchMoreMixed`**

```typescript
export async function fetchMoreMixed() {
  if (state.loading) return;

  const illustsArr = tabIllusts["recommended_illust"] ?? [];
  const mangaArr = tabIllusts["recommended_manga"] ?? [];

  const illustOldest = illustsArr.length > 0 ? illustsArr[illustsArr.length - 1].create_date : null;
  const mangaOldest = mangaArr.length > 0 ? mangaArr[mangaArr.length - 1].create_date : null;

  const loadSource = async (key: "recommended_illust" | "recommended_manga"): Promise<boolean> => {
    const next = tabNextUrl[key];
    if (!next) return false;
    setState("loading", true);
    try {
      const data = await loadNext(next);
      tabIllusts[key] = [...(tabIllusts[key] || []), ...data.illusts];
      tabNextUrl[key] = data.next_url;
      return true;
    } catch (e) {
      setState("error", (e as { message?: string }).message ?? "加载失败");
      return false;
    } finally {
      setState("loading", false);
    }
  };

  // 优先加载当前合并列表尾部时间较早的那一路
  const preferIllust = mangaOldest === null || (illustOldest !== null && illustOldest >= mangaOldest);

  const loaded = preferIllust
    ? (await loadSource("recommended_illust")) || (await loadSource("recommended_manga"))
    : (await loadSource("recommended_manga")) || (await loadSource("recommended_illust"));

  if (loaded && currentTab() === "recommended" && recommendSubTab() === "mixed") {
    batch(() => {
      setState("illusts", computeMixedIllusts());
      setState("nextUrl", tabNextUrl["recommended_illust"] || tabNextUrl["recommended_manga"]);
    });
  }
}
```

- [ ] **Step 2: 编写测试**

```typescript
describe("fetchMoreMixed", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCurrentTab = "recommended";
    vi.mocked(loadRecommended).mockReset();
    vi.mocked(loadMangaRecommended).mockReset();
    vi.mocked(loadNext).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).window = undefined;
  });

  it("loads more from the source with older tail first", async () => {
    (globalThis as any).window = { scrollY: 0 };
    vi.mocked(loadRecommended).mockResolvedValue({
      illusts: [createIllust(1, "2026-07-01T12:00:00+09:00", "illust")],
      next_url: "next-illust",
    });
    vi.mocked(loadMangaRecommended).mockResolvedValue({
      illusts: [createIllust(2, "2026-07-01T10:00:00+09:00", "manga")],
      next_url: "next-manga",
    });
    vi.mocked(loadNext).mockImplementation(async (url: string) => {
      if (url === "next-manga") {
        return {
          illusts: [createIllust(3, "2026-07-01T09:00:00+09:00", "manga")],
          next_url: null,
        };
      }
      return { illusts: [], next_url: null };
    });

    const { setRecommendSubTab, ensureLoaded, fetchMore, illusts } = await import("../feedStore");
    setRecommendSubTab("mixed");
    await ensureLoaded();
    expect(illusts().map((i) => i.id)).toEqual([1, 2]);

    await fetchMore();
    expect(illusts().map((i) => i.id)).toEqual([1, 2, 3]);
    expect(loadNext).toHaveBeenCalledWith("next-manga");
  });
});
```

- [ ] **Step 3: 提交**

```bash
git add packages/app/src/stores/feedStore.ts packages/app/src/stores/__tests__/feedStore.test.ts
git commit -m "feat(feedStore): implement fetchMoreMixed with source selection and tests"
```

---

## Task 6: 调整 ensureLoaded / refresh / fetchMore 路由

**Files:**
- Modify: `packages/app/src/stores/feedStore.ts`

**Context：** 现有 `ensureLoaded`、`refresh`、`fetchMore` 只处理 `recommended` 和 `follow` 两种 tab。现在 `recommended` 内部有三个子 tab，需要按子 tab 分发。

- [ ] **Step 1: 修改 `ensureLoaded`**

在 `ensureLoaded` 函数的 `if (tab === "follow") { ... }` 分支之后、非关注 tab 处理之前，插入：

```typescript
  // Recommended tab with sub-tabs
  if (tab === "recommended") {
    const subTab = recommendSubTab();

    if (subTab === "mixed") {
      const illustCached = tabIllusts["recommended_illust"] !== undefined;
      const mangaCached = tabIllusts["recommended_manga"] !== undefined;
      if (illustCached || mangaCached) {
        setState("illusts", computeMixedIllusts());
        setState("nextUrl", tabNextUrl["recommended_illust"] || tabNextUrl["recommended_manga"] || null);
      }
      if (!tabLoaded["recommended_mixed"]) {
        if (!illustCached && !mangaCached) {
          setState("illusts", []);
        }
        fetchMixed();
        tabLoaded["recommended_mixed"] = true;
      }
      return;
    }

    const sourceKey = subTab === "illust" ? "recommended_illust" : "recommended_manga";
    if (tabLoaded[sourceKey]) {
      if (tabIllusts[sourceKey]) {
        batch(() => {
          setState("illusts", filterFeedIllusts(tabIllusts[sourceKey]));
          setState("nextUrl", tabNextUrl[sourceKey] || null);
        });
      }
      return;
    }
    if (tabIllusts[sourceKey]) {
      batch(() => {
        setState("illusts", filterFeedIllusts(tabIllusts[sourceKey]));
        setState("nextUrl", tabNextUrl[sourceKey] || null);
      });
      tabLoaded[sourceKey] = true;
      return;
    }
    setState("illusts", []);
    if (subTab === "illust") {
      fetchRecommended("illust");
    } else {
      fetchManga();
    }
    tabLoaded[sourceKey] = true;
    return;
  }
```

- [ ] **Step 2: 新增 `fetchManga` 函数**

```typescript
export async function fetchManga() {
  setState("loading", true);
  setState("error", null);
  try {
    const data = await loadMangaRecommended();
    tabIllusts["recommended_manga"] = data.illusts;
    tabNextUrl["recommended_manga"] = data.next_url;
    if (currentTab() === "recommended" && recommendSubTab() === "manga") {
      batch(() => {
        setState("illusts", filterFeedIllusts(data.illusts));
        setState("nextUrl", data.next_url);
      });
    }
  } catch (e) {
    setState("error", (e as { message?: string }).message ?? "加载失败");
  } finally {
    setState("loading", false);
  }
}
```

- [ ] **Step 3: 修改 `refresh` 函数**

```typescript
export async function refresh() {
  const tab = currentTab();
  setState("refreshing", true);
  try {
    if (tab === "recommended") {
      const subTab = recommendSubTab();
      if (subTab === "mixed") {
        await fetchMixed();
      } else if (subTab === "illust") {
        await fetchRecommended("illust");
      } else {
        await fetchManga();
      }
    } else if (tab === "follow") {
      await fetchFollow();
    }
  } finally {
    setState("refreshing", false);
  }
}
```

- [ ] **Step 4: 修改 `fetchMore` 函数**

```typescript
export async function fetchMore() {
  const tab = currentTab();
  if (tab === "recommended" && recommendSubTab() === "mixed") {
    return fetchMoreMixed();
  }
  // 原有 follow 逻辑保持不变...
  // 原有非 follow 逻辑需要按子 tab 取 key
  if (tab !== "follow") {
    const sourceKey = tab === "recommended"
      ? recommendSubTab() === "illust" ? "recommended_illust" : "recommended_manga"
      : tab;
    if (!state.nextUrl) return;
    setState("loading", true);
    try {
      const data = await loadNext(state.nextUrl);
      tabIllusts[sourceKey] = [...(tabIllusts[sourceKey] || []), ...data.illusts];
      batch(() => {
        setState(
          produce((s) => {
            s.illusts.push(...filterFeedIllusts(data.illusts));
            s.nextUrl = data.next_url;
          }),
        );
      });
    } catch (e) {
      setState("error", (e as { message?: string }).message ?? "加载失败");
    } finally {
      setState("loading", false);
    }
    return;
  }

  // follow 逻辑保持原样...
}
```

注意：保持 `fetchMore` 原有 follow 分支不动。非 follow 分支中，推荐页按当前子 tab 取 `sourceKey`（`recommended_illust` 或 `recommended_manga`），其余 tab 保持原 `tab` 值。

- [ ] **Step 5: 修改 `saveTabScroll` 以支持子 tab 滚动位置**

```typescript
export function saveTabScroll(tab: string) {
  if (tab === "follow") {
    tabScrollY[tab] = window.scrollY;
    return;
  }
  if (tab === "recommended") {
    const key = `recommended_${recommendSubTab()}`;
    tabNextUrl[key] = state.nextUrl;
    tabScrollY[key] = window.scrollY;
    return;
  }
  tabNextUrl[tab] = state.nextUrl;
  tabScrollY[tab] = window.scrollY;
}
```

同时修改 `getFeedScrollY` 和 `isFeedCached` 使其感知推荐页的子 tab：

```typescript
export function getFeedScrollY(tab?: string) {
  const t = tab ?? currentTab();
  if (t === "recommended") {
    return tabScrollY[`recommended_${recommendSubTab()}`] || 0;
  }
  return tabScrollY[t] || 0;
}

export function isFeedCached(tab?: string) {
  const t = tab ?? currentTab();
  if (t === "recommended") {
    const key = `recommended_${recommendSubTab()}`;
    return tabLoaded[key] || tabIllusts[key] !== undefined;
  }
  return tabLoaded[t] || tabIllusts[t] !== undefined;
}
```

- [ ] **Step 6: 提交**

```bash
git add packages/app/src/stores/feedStore.ts
git commit -m "feat(feedStore): route ensureLoaded/refresh/fetchMore by recommended sub-tab"
```

---

## Task 7: 在 TabFeedPage 添加子 tab 切换条

**Files:**
- Modify: `packages/app/src/routes/TabFeedPage.tsx`

**Context：** 在推荐页 header 下方渲染「综合 / 插画 / 漫画」切换条，切换时保存旧子 tab 滚动、加载新子 tab、恢复滚动。

- [ ] **Step 1: 导入新增 store 成员**

```typescript
import {
  illusts,
  nextUrl,
  loading,
  refreshing,
  error,
  ensureLoaded,
  fetchMore,
  refresh,
  saveTabScroll,
  isFeedCached,
  getFeedScrollY,
  followTab,
  setFollowTab,
  recommendSubTab,
  setRecommendSubTab,
} from "../stores/feedStore";
```

- [ ] **Step 2: 在 header 下方添加子 tab 切换条**

在现有 `{/* ── 关注页三层过滤 ── */}` 之前插入：

```tsx
{/* ── 推荐页子 tab 切换 ── */}
<Show when={props.tab === "recommended"}>
  <div class="sticky top-12 z-10 surface-appbar px-4 pb-2" onDblClick={scrollToTop}>
    <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1 gap-1">
      {[
        { key: "mixed" as const, label: "综合" },
        { key: "illust" as const, label: "插画" },
        { key: "manga" as const, label: "漫画" },
      ].map((opt) => (
        <button
          class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
          classList={{
            "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
              recommendSubTab() === opt.key,
            "bg-transparent text-[var(--colorNeutralForeground2)]":
              recommendSubTab() !== opt.key,
          }}
          onClick={() => {
            if (recommendSubTab() !== opt.key) {
              saveTabScroll(props.tab);
              setRecommendSubTab(opt.key);
              ensureLoaded();
              // 恢复滚动位置
              const y = getFeedScrollY(props.tab);
              requestAnimationFrame(() => window.scrollTo(0, y));
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

注意：`scrollToTop` 函数已存在，可直接复用。

- [ ] **Step 3: 提交**

```bash
git add packages/app/src/routes/TabFeedPage.tsx
git commit -m "feat(TabFeedPage): add recommended sub-tab switcher for mixed/illust/manga"
```

---

## Task 8: 类型检查与测试验证

**Files:** 不涉及文件修改，仅运行命令。

- [ ] **Step 1: 运行 TypeScript 类型检查**

```bash
pnpm check
```

Expected: 无类型错误。

- [ ] **Step 2: 运行测试**

```bash
pnpm test
```

Expected: 所有测试通过，包括新增的 `feedStore` 测试。

- [ ] **Step 3: 运行 lint（可选但推荐）**

```bash
pnpm lint
```

Expected: 无新增 lint 错误。

- [ ] **Step 4: 提交**

```bash
git commit --allow-empty -m "chore: verify types and tests for recommendation sub-tabs"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** 设计文档中的每个章节（API 映射、数据流、UI、错误处理、缓存、测试）均有对应任务。
- [ ] **Placeholder scan:** 计划中没有 TBD / TODO / "implement later" / "add appropriate error handling" 等模糊描述。
- [ ] **Type consistency:** `RecommendSubTab`、`recommended_illust`、`recommended_manga`、`recommended_mixed` 等命名在所有任务中保持一致。
- [ ] **测试覆盖:** `fetchMixed` 双源成功/单源失败、`fetchMoreMixed` 源选择、子 tab 缓存隔离均有测试。
- [ ] **无破坏性变更:** 关注页逻辑和原有推荐页行为（现在对应「插画」子 tab）保持兼容。
