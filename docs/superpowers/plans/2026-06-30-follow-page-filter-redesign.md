# 关注页过滤重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the follow page filter from dual-layer (公开/非公开 + 全部/R-18) to a single three-segment control (全部/公开/非公开), with R18 as badge-only indicator.

**Architecture:** Follow page data source splits from single `tabIllusts["follow"]` into dual caches `tabIllusts["follow_public"]` and `tabIllusts["follow_private"]`. A `mergeAndSort()` function merges both arrays in `create_date` descending order. The `followTab` signal replaces `followRestrict` to control which view (all/public/private) is shown. UI changes from two stacked segmented controls to one single pill-style control.

**Tech Stack:** SolidJS, TypeScript, SolidJS Store, Pixiv API

## Global Constraints

- No changes to `api/illust.ts` (loadFollow interface stays the same)
- No changes to `utils/r18Filter.ts` (global R18/R18G filter logic unchanged)
- No changes to `components/ImageCard.tsx` (R18/R18G badges already exist)
- R-18 sub-tab completely removed (no `FollowSubTab` type)
- `"all"` mode fetches both public + private in parallel and merges
- Must maintain backward-compatible exports for other consumers (if any)

---

### Task 1: Refactor feedStore.ts — dual cache + mergeAndSort + parallel fetch

**Files:**
- Modify: `stores/feedStore.ts` (entire file)

**Interfaces:**
- Consumes: `loadFollow(restrict)` from `api/illust.ts`, `filterFeedIllusts()` from `utils/r18Filter.ts`, `currentTab` from `uiStore.ts`
- Produces: `followTab` / `setFollowTab` signals, `mergeAndSort()` helper, updated `fetchFollow()` (parallel dual fetch), updated `fetchMore()` (dual-source pagination)

- [ ] **Step 1: Replace the store state structure**

Old:
```typescript
const [state, setState] = createStore({
  illusts: [] as PixivIllust[],
  nextUrl: null as string | null,
  loading: false,
  refreshing: false,
  error: null as string | null,
  followRestrict: "public" as RestrictType,
});
```

New:
```typescript
const [state, setState] = createStore({
  illusts: [] as PixivIllust[],
  loading: false,
  refreshing: false,
  error: null as string | null,
  followTab: "all" as "all" | "public" | "private",
});
```

Note: `nextUrl` moves to per-source tracking in the tab cache (below). `followRestrict` is replaced by `followTab`.

- [ ] **Step 2: Update the tab cache structure**

Old:
```typescript
const tabIllusts: Record<string, PixivIllust[]> = {};
const tabNextUrl: Record<string, string | null> = {};
```

New — dual keys for follow:
```typescript
const tabIllusts: Record<string, PixivIllust[]> = {};
const tabNextUrl: Record<string, string | null> = {};
// Follow-specific keys used:
//   tabIllusts["follow_public"], tabNextUrl["follow_public"]
//   tabIllusts["follow_private"], tabNextUrl["follow_private"]
// Non-follow tabs keep using tabIllusts["recommended"] etc.
```

- [ ] **Step 3: Update exported signals**

Replace:
```typescript
export const followRestrict = () => state.followRestrict;
export const setFollowRestrict = (r: RestrictType) => setState("followRestrict", r);
```

With:
```typescript
export const followTab = () => state.followTab;
export const setFollowTab = (t: "all" | "public" | "private") => setState("followTab", t);
```

Remove `getTabRawIllusts` — it's no longer needed since the R-18 sub-tab is gone.

- [ ] **Step 4: Add mergeAndSort helper**

Add before the actions section:

```typescript
/**
 * 合并两个已按 create_date 降序排列的数组，保持全局时间降序。
 * 用于「全部」视图下合并 public + private 两路数据。
 */
function mergeAndSort(a: PixivIllust[], b: PixivIllust[]): PixivIllust[] {
  const result: PixivIllust[] = [];
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
```

- [ ] **Step 5: Add computeIllusts helper**

This replaces the inline logic from TabFeedPage's `filteredIllusts` memo and makes it available to `ensureLoaded`:

```typescript
/**
 * 根据当前 followTab 和双缓存计算出当前视图应展示的作品列表。
 * 全部 → mergeAndSort(public, private) 后 filterFeedIllusts
 * 公开 → filterFeedIllusts(tabIllusts["follow_public"])
 * 非公开 → filterFeedIllusts(tabIllusts["follow_private"])
 */
function computeFollowIllusts(): PixivIllust[] {
  const tab = currentTab();
  if (tab !== "follow") return filterFeedIllusts(tabIllusts[tab] ?? []);
  const fTab = state.followTab;
  if (fTab === "public") return filterFeedIllusts(tabIllusts["follow_public"] ?? []);
  if (fTab === "private") return filterFeedIllusts(tabIllusts["follow_private"] ?? []);
  // "all" — merge both sources
  const pub = tabIllusts["follow_public"] ?? [];
  const priv = tabIllusts["follow_private"] ?? [];
  if (pub.length === 0) return filterFeedIllusts(priv);
  if (priv.length === 0) return filterFeedIllusts(pub);
  return filterFeedIllusts(mergeAndSort(pub, priv));
}
```

- [ ] **Step 6: Update ensureLoaded**

Replace the body of `ensureLoaded` to handle dual caches:

```typescript
export function ensureLoaded() {
  const tab = currentTab();
  if (tab === "follow") {
    // Follow tab: show cached data if available
    const pubCached = tabIllusts["follow_public"] !== undefined;
    const privCached = tabIllusts["follow_private"] !== undefined;
    if (pubCached || privCached) {
      setState("illusts", computeFollowIllusts());
      setState("nextUrl", tabNextUrl[tab] || null);
    }
    if (!tabLoaded[tab]) {
      if (!pubCached && !privCached) {
        setState("illusts", []);
      }
      fetchFollow();
      tabLoaded[tab] = true;
    }
    return;
  }

  // Non-follow tabs (recommended etc.)
  if (tabLoaded[tab]) {
    if (tabIllusts[tab]) {
      batch(() => {
        setState("illusts", filterFeedIllusts(tabIllusts[tab]));
        setState("nextUrl", tabNextUrl[tab] || null);
      });
    }
    return;
  }
  if (tabIllusts[tab]) {
    batch(() => {
      setState("illusts", filterFeedIllusts(tabIllusts[tab]));
      setState("nextUrl", tabNextUrl[tab] || null);
    });
    tabLoaded[tab] = true;
    return;
  }
  setState("illusts", []);
  if (tab === "recommended") {
    fetchRecommended();
  }
  tabLoaded[tab] = true;
}
```

Note: `setState("nextUrl", ...)` will need the `nextUrl` property back on state. Let me also add it back since other code (feedStore itself via `saveTabScroll`) references `state.nextUrl`. Let me update Step 1 to keep `nextUrl`:

Re-revised Step 1 — keep `nextUrl` on state since `saveTabScroll` and other consumers reference it:
```typescript
const [state, setState] = createStore({
  illusts: [] as PixivIllust[],
  nextUrl: null as string | null,
  loading: false,
  refreshing: false,
  error: null as string | null,
  followTab: "all" as "all" | "public" | "private",
});
```

- [ ] **Step 7: Rewrite fetchFollow for parallel dual fetch**

```typescript
export async function fetchFollow() {
  setState("loading", true);
  setState("error", null);
  try {
    const [publicData, privateData] = await Promise.all([
      loadFollow("public"),
      loadFollow("private"),
    ]);
    // Cache both sources
    tabIllusts["follow_public"] = publicData.illusts;
    tabIllusts["follow_private"] = privateData.illusts;
    tabNextUrl["follow_public"] = publicData.next_url;
    tabNextUrl["follow_private"] = privateData.next_url;
    // Update display if current tab is follow
    if (currentTab() === "follow") {
      batch(() => {
        setState("illusts", computeFollowIllusts());
        setState("nextUrl", null); // nextUrl semantics: for "all" view, nextUrl is managed per-source
      });
    }
  } catch (e) {
    setState("error", (e as { message?: string }).message ?? "加载失败");
  } finally {
    setState("loading", false);
  }
}
```

- [ ] **Step 8: Rewrite fetchMore for dual-source pagination**

```typescript
export async function fetchMore() {
  if (state.loading) return;
  const tab = currentTab();
  if (tab !== "follow") {
    // Non-follow tabs — existing behavior
    if (!state.nextUrl) return;
    setState("loading", true);
    try {
      const data = await loadNext(state.nextUrl);
      tabIllusts[tab] = [...(tabIllusts[tab] || []), ...data.illusts];
      batch(() => {
        setState(produce((s) => {
          s.illusts.push(...filterFeedIllusts(data.illusts));
          s.nextUrl = data.next_url;
        }));
      });
    } catch (e) {
      setState("error", (e as { message?: string }).message ?? "加载失败");
    } finally {
      setState("loading", false);
    }
    return;
  }

  // Follow tab — per-source pagination
  setState("loading", true);
  try {
    const fTab = state.followTab;
    if (fTab === "public") {
      // Load more for public only
      const pubNext = tabNextUrl["follow_public"];
      if (!pubNext) { setState("loading", false); return; }
      const data = await loadNext(pubNext);
      tabIllusts["follow_public"] = [...(tabIllusts["follow_public"] || []), ...data.illusts];
      tabNextUrl["follow_public"] = data.next_url;
      setState(produce((s) => {
        s.illusts.push(...filterFeedIllusts(data.illusts));
      }));
    } else if (fTab === "private") {
      // Load more for private only
      const privNext = tabNextUrl["follow_private"];
      if (!privNext) { setState("loading", false); return; }
      const data = await loadNext(privNext);
      tabIllusts["follow_private"] = [...(tabIllusts["follow_private"] || []), ...data.illusts];
      tabNextUrl["follow_private"] = data.next_url;
      setState(produce((s) => {
        s.illusts.push(...filterFeedIllusts(data.illusts));
      }));
    } else {
      // "all" mode — load the source with older tail first
      const pubIllusts = tabIllusts["follow_public"] || [];
      const privIllusts = tabIllusts["follow_private"] || [];
      const pubOldest = pubIllusts.length > 0 ? pubIllusts[pubIllusts.length - 1].create_date : null;
      const privOldest = privIllusts.length > 0 ? privIllusts[privIllusts.length - 1].create_date : null;

      if (pubOldest === null && privOldest === null) { setState("loading", false); return; }
      if (privOldest === null || (pubOldest !== null && pubOldest >= privOldest)) {
        // Load public next page
        const pubNext = tabNextUrl["follow_public"];
        if (!pubNext) { setState("loading", false); return; }
        const data = await loadNext(pubNext);
        tabIllusts["follow_public"] = [...pubIllusts, ...data.illusts];
        tabNextUrl["follow_public"] = data.next_url;
        setState(produce((s) => {
          s.illusts = computeFollowIllusts();
        }));
      } else {
        // Load private next page
        const privNext = tabNextUrl["follow_private"];
        if (!privNext) { setState("loading", false); return; }
        const data = await loadNext(privNext);
        tabIllusts["follow_private"] = [...privIllusts, ...data.illusts];
        tabNextUrl["follow_private"] = data.next_url;
        setState(produce((s) => {
          s.illusts = computeFollowIllusts();
        }));
      }
    }
  } catch (e) {
    setState("error", (e as { message?: string }).message ?? "加载失败");
  } finally {
    setState("loading", false);
  }
}
```

- [ ] **Step 9: Update refresh**

`refresh()` calls either `fetchRecommended()` or `fetchFollow()`. Since `fetchFollow` now does parallel dual fetch, no change needed — it will automatically pick up. Just verify:

```typescript
export async function refresh() {
  const tab = currentTab();
  setState("refreshing", true);
  try {
    if (tab === "recommended") {
      await fetchRecommended();
    } else if (tab === "follow") {
      await fetchFollow();
    }
  } finally {
    setState("refreshing", false);
  }
}
```
(This should already be correct — no change needed.)

- [ ] **Step 10: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/src/stores/feedStore.ts
git commit -m "refactor(feed): split follow cache into dual public/private sources

- Replace followRestrict signal with followTab (all|public|private)
- Add mergeAndSort() for combined "all" view
- Add computeFollowIllusts() helper for reactive view computation
- Rewrite fetchFollow() to parallel-fetch public+private
- Rewrite fetchMore() with dual-source pagination
- Remove getTabRawIllusts() (no longer needed)
"
```

---

### Task 2: Update TabFeedPage.tsx — single segmented control UI

**Files:**
- Modify: `routes/TabFeedPage.tsx`

**Interfaces:**
- Consumes: `followTab`, `setFollowTab` from `feedStore.ts` (replacing `followRestrict`, `setFollowRestrict`, `getTabRawIllusts`)
- Produces: Updated follow page UI

- [ ] **Step 1: Update imports**

Remove:
```typescript
import {
  ...
  getTabRawIllusts,
  followRestrict,
  setFollowRestrict,
} from "../stores/feedStore";
```

Add:
```typescript
import {
  ...
  followTab,
  setFollowTab,
} from "../stores/feedStore";
```

Remove unused `RestrictType` import if it becomes unused.

- [ ] **Step 2: Remove FollowSubTab type and followSubTab signal**

Remove these lines:
```typescript
type FollowSubTab = "all" | "r18" | "r18g";
// ...
const [followSubTab, setFollowSubTab] = createSignal<FollowSubTab>("all");
```

Also remove the `createEffect` block that resets `followSubTab` for non-adult users (lines 58-62).

- [ ] **Step 3: Simplify filteredIllusts memo**

Replace:
```typescript
const filteredIllusts = createMemo<PixivIllust[]>(() => {
  if (props.tab !== "follow") return illusts();
  const sub = followSubTab();
  if (sub === "all") return illusts();
  const raw = getTabRawIllusts("follow");
  if (sub === "r18") return raw.filter((i) => i.x_restrict === 1 || i.x_restrict === 2);
  return illusts();
});
```

With:
```typescript
const filteredIllusts = createMemo<PixivIllust[]>(() => {
  return illusts(); // feedStore.computeFollowIllusts() already handles follow tab filtering
});
```

Note: `illusts()` from feedStore now already returns the correct filtered + merged data for the current `followTab`. The memo just passes through.

- [ ] **Step 4: Replace the dual-layer filter UI with single segmented control**

Replace the entire `Show when={props.tab === "follow"}` block (lines 140-197):

Old:
```tsx
<Show when={props.tab === "follow"}>
  <div class="sticky top-12 z-10 surface-appbar px-4 pb-2" onDblClick={scrollToTop}>
    {/* 第1层：公开/非公开 — 紧凑型，次要操作 */}
    <div class="flex items-center justify-between mb-2">
      <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] select-none">
        浏览范围
      </span>
      <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-0.5 gap-0.5">
        {(
          [
            { key: "public", label: "公开" },
            { key: "private", label: "非公开" },
          ] as { key: RestrictType; label: string }[]
        ).map((r) => (
          <button ...>...</button>
        ))}
      </div>
    </div>
    {/* 第2层：全部 / R-18 — 主要过滤 */}
    <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1 gap-1">
      {(
        [
          { key: "all", label: "全部" },
          ...(isAdult() ? [{ key: "r18" as const, label: "R-18" }] : []),
        ] as { key: FollowSubTab; label: string }[]
      ).map((sub) => (
        <button ...>...</button>
      ))}
    </div>
  </div>
</Show>
```

New:
```tsx
<Show when={props.tab === "follow"}>
  <div class="sticky top-12 z-10 surface-appbar px-4 pb-2" onDblClick={scrollToTop}>
    <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1 gap-1">
      {(
        [
          { key: "all" as const, label: "全部" },
          { key: "public" as const, label: "公开" },
          { key: "private" as const, label: "非公开" },
        ]
      ).map((opt) => (
        <button
          class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
          classList={{
            "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
              followTab() === opt.key,
            "bg-transparent text-[var(--colorNeutralForeground2)]":
              followTab() !== opt.key,
          }}
          onClick={() => {
            if (followTab() !== opt.key) {
              setFollowTab(opt.key);
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

- [ ] **Step 5: Clean up unused imports**

Remove imports that are no longer used:
- `createSignal` (if no longer used elsewhere)
- `createMemo` (check if filteredIllusts still needs it)
- Remove `FollowSubTab` type, `RestrictType` import if unused
- `getTabRawIllusts` already removed in step 1

Keep `createMemo` for `filteredIllusts`. Keep `Show` for the tab check. Remove `createSignal` if `followSubTab` was the only signal.

Check the file for any other references to `followSubTab`, `FollowSubTab`, `RestrictType`, `getTabRawIllusts` to ensure they're all cleaned up.

- [ ] **Step 6: Verify the file compiles**

Run:
```bash
cd /Users/lilianda/develop/pixivizer/packages/app
npx tsc --noEmit 2>&1 | head -30
```
Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add packages/app/src/routes/TabFeedPage.tsx
git commit -m "refactor(ui): replace follow dual-layer filter with single segmented control

- Remove FollowSubTab type and followSubTab signal
- Remove R-18 sub-tab entirely
- Replace stacked filter UI with single three-option pill control
- Simplify filteredIllusts to pass through feedStore output
"
```

---

### Task 3: Verify build + smoke test

- [ ] **Step 1: Full build check**

```bash
cd /Users/lilianda/develop/pixivizer/packages/app
npx vite build 2>&1 | tail -10
```
Expected: Build succeeds with no errors.

- [ ] **Step 2: Final commit with all changes**

```bash
cd /Users/lilianda/develop/pixivizer
git add -A
git commit -m "feat: follow page filter redesign — single segmented control with dual-source cache"
```
