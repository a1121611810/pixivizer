import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";
import { useNavigate, useSearch } from "@tanstack/solid-router";
import FluentIcon from "@/components/ui/FluentIcon";
import { createSearchStore, readSearchCache } from "@/stores/searchStore";
import SearchResults from "@/components/SearchResults";
import { mergeSearchResults } from "@/utils/searchMerger";
import { createScrollRestore } from "@/primitives/createScrollRestore";
import type { SearchScope, SearchSort } from "@/api/types";

const SCOPE_OPTIONS: { value: SearchScope; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "illust", label: "插画·漫画" },
  { value: "novel", label: "小说" },
];

const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: "date_desc", label: "最新" },
  { value: "date_asc", label: "最早" },
  { value: "popular_desc", label: "热门" },
];

const Search: Component = () => {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });

  const store = createSearchStore();

  // ── Local UI state ──
  const [filterType, setFilterType] = createSignal<"all" | "illust" | "novel">("all");

  // ── Back-to-top state ──
  const [showBackToTop, setShowBackToTop] = createSignal(false);

  const mergedResults = createMemo(() => {
    if (filterType() === "illust") {
      return mergeSearchResults(store.illustResults(), []);
    }
    if (filterType() === "novel") {
      return mergeSearchResults([], store.novelResults());
    }
    return mergeSearchResults(store.illustResults(), store.novelResults());
  });

  // ── Scroll position restoration ──
  const scrollRestore = createScrollRestore(() =>
    store.keyword().trim() ? `search_${store.keyword()}` : undefined,
  );

  onCleanup(() => scrollRestore.save());

  // ── Scroll-to-top listener ──
  onMount(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", onScroll));
  });

  // ── Sync URL params → store ──
  createEffect(() => {
    const params = searchParams() as Record<string, string | undefined>;
    if (params.word) store.setKeyword(params.word);
    if (params.scope) store.setScope(params.scope as SearchScope);
    if (params.sort) store.setSort(params.sort as SearchSort);
  });

  // ── Execute search on URL param hydration (only on initial load / deep links) ──
  const [hydrated, setHydrated] = createSignal(false);
  createEffect(() => {
    const params = searchParams() as Record<string, string | undefined>;
    if (!hydrated() && params.word?.trim()) {
      setHydrated(true);

      // 优先从缓存恢复，避免重复请求
      const cached = readSearchCache(
        params.word.trim(),
        (params.scope as SearchScope) || "all",
        (params.sort as SearchSort) || "date_desc",
      );
      if (cached) {
        store.setResults(
          cached.illustResults,
          cached.novelResults,
          false,
          cached.hasMoreIllust,
          cached.hasMoreNovel,
          cached.nextIllustUrl,
          cached.nextNovelUrl,
        );
        scrollRestore.restore();
        return; // ← 不发网络请求
      }

      store.executeSearch();
    }
    // Mark as hydrated once any word is seen (even empty)
    if (!hydrated() && params.word === undefined) {
      setHydrated(true);
    }
  });

  // ── Restore scroll position when results finish loading ──
  const [scrollRestored, setScrollRestored] = createSignal(false);
  createEffect(() => {
    const results = mergedResults();
    if (hydrated() && !scrollRestored() && results.length > 0) {
      const restored = scrollRestore.restore();
      void restored; // suppress unused variable warning
      setScrollRestored(true); // gate off regardless of restore success
    }
  });

  // ── Debounced search execution ──
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(debounceTimer));
  const handleInput = (value: string) => {
    store.setKeyword(value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (value.trim()) {
        store.addToHistory(value.trim());
        void navigate({
          to: "/search",
          search: { word: value.trim(), scope: store.scope(), sort: store.sort() },
        });
        store.executeSearch();
      }
    }, 300);
  };

  // ── Scope/sort change → update URL ──
  function updateUrl() {
    const kw = store.keyword().trim();
    if (!kw) return;
    void navigate({
      to: "/search",
      search: { word: kw, scope: store.scope(), sort: store.sort() },
    });
  }

  function handleScopeChange(scope: SearchScope) {
    store.setScope(scope);
    updateUrl();
  }

  function handleSortChange(sort: SearchSort) {
    store.setSort(sort);
    updateUrl();
  }

  const hasActiveSearch = createMemo(() => store.keyword().trim() !== "");

  return (
    <div class="page">
      <div class="pt-4 px-4 pb-24 max-w-3xl mx-auto">
        {/* ── Search bar ── */}
        <div class="flex items-center gap-2 p-3 mb-3 rounded-[var(--borderRadiusLarge)] bg-[var(--colorNeutralBackground1)] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)]">
          <button
            class="flex items-center justify-center min-w-11 min-h-11 rounded-[var(--borderRadiusCircular)] text-[var(--colorNeutralForeground2)] hover:bg-[var(--colorNeutralBackground3)] active:scale-90 transition-transform duration-[var(--durationFast)]"
            onClick={() => window.history.back()}
            aria-label="返回"
          >
            <FluentIcon name="chevronLeft" size={20} />
          </button>
          <FluentIcon name="search" size={20} />
          <input
            type="search"
            class="flex-1 bg-transparent border-none outline-none text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase300)] placeholder:text-[var(--colorNeutralForeground4)]"
            placeholder="输入标签或关键词搜索"
            aria-label="搜索关键词"
            value={store.keyword()}
            onInput={(e) => handleInput(e.currentTarget.value)}
          />
          <Show when={store.keyword() !== ""}>
            <button
              class="flex items-center justify-center min-w-11 min-h-11 rounded-[var(--borderRadiusCircular)] text-[var(--colorNeutralForeground2)] hover:bg-[var(--colorNeutralBackground3)] active:scale-90 transition-transform duration-[var(--durationFast)]"
              onClick={() => {
                clearTimeout(debounceTimer);
                store.setKeyword("");
                void navigate({ to: "/search", search: {} });
              }}
              aria-label="清除搜索"
            >
              <FluentIcon name="dismiss" size={18} />
            </button>
          </Show>
        </div>

        {/* ── Scope + Sort controls ── */}
        <div class="flex items-center justify-between mb-4">
          {/* Scope pills */}
          <div class="flex gap-1.5" role="radiogroup" aria-label="搜索范围">
            <For each={SCOPE_OPTIONS}>
              {(opt) => (
                <button
                  class="px-3 py-1.5 rounded-[var(--borderRadiusMedium)] text-sm font-medium transition-[background-color,color] duration-[var(--durationFast)] focus-visible:outline-[var(--colorStrokeFocus2)] focus-visible:outline-2 focus-visible:outline-offset-1"
                  classList={{
                    "bg-[var(--colorBrandBackground)] text-[var(--colorNeutralForegroundOnBrand)]":
                      store.scope() === opt.value,
                    "bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground2)] hover:bg-[var(--colorNeutralBackground3)]":
                      store.scope() !== opt.value,
                  }}
                  onClick={() => handleScopeChange(opt.value)}
                  role="radio"
                  aria-checked={store.scope() === opt.value}
                >
                  {opt.label}
                </button>
              )}
            </For>
          </div>

          {/* Sort buttons */}
          <div class="flex gap-2" role="group" aria-label="排序方式">
            <For each={SORT_OPTIONS}>
              {(opt) => (
                <button
                  class="px-2 py-1 text-sm transition-[color,border-color] duration-[var(--durationFast)] focus-visible:outline-[var(--colorStrokeFocus2)] focus-visible:outline-2 focus-visible:outline-offset-1"
                  classList={{
                    "text-[var(--colorBrandBackground)] border-b-2 border-[var(--colorBrandBackground)]":
                      store.sort() === opt.value,
                    "text-[var(--colorNeutralForeground3)] border-b-2 border-transparent hover:text-[var(--colorNeutralForeground1)]":
                      store.sort() !== opt.value,
                  }}
                  onClick={() => handleSortChange(opt.value)}
                >
                  {opt.label}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* ── Search history (when no keyword) ── */}
        <Show when={!hasActiveSearch()}>
          <SearchHistorySection
            history={store.searchHistory()}
            onSelect={(word) => {
              clearTimeout(debounceTimer);
              store.setKeyword(word);
              store.addToHistory(word);
              void navigate({
                to: "/search",
                search: { word, scope: store.scope(), sort: store.sort() },
              });
              store.executeSearch();
            }}
            onRemove={(word) => store.removeFromHistory(word)}
            onClear={() => store.clearHistory()}
          />
        </Show>

        {/* ── Filter chips ── */}
        <Show when={hasActiveSearch() && !store.error()}>
          <div class="flex gap-1.5 mb-3" role="group" aria-label="结果类型筛选">
            <For
              each={[
                { value: "all" as const, label: "全部" },
                { value: "illust" as const, label: "插画·漫画" },
                { value: "novel" as const, label: "小说" },
              ]}
            >
              {(opt) => (
                <button
                  class="px-3 py-1.5 rounded-[var(--borderRadiusMedium)] text-sm font-medium transition-[background-color,color] duration-[var(--durationFast)] focus-visible:outline-[var(--colorStrokeFocus2)] focus-visible:outline-2 focus-visible:outline-offset-1"
                  classList={{
                    "bg-[var(--colorBrandBackground)] text-[var(--colorNeutralForegroundOnBrand)]":
                      filterType() === opt.value,
                    "bg-[var(--colorNeutralBackground2)] text-[var(--colorNeutralForeground2)] hover:bg-[var(--colorNeutralBackground3)]":
                      filterType() !== opt.value,
                  }}
                  onClick={() => setFilterType(opt.value)}
                >
                  {opt.label}
                </button>
              )}
            </For>
          </div>
        </Show>

        {/* ── Search results ── */}
        <Show when={hasActiveSearch()}>
          <SearchResults
            results={mergedResults()}
            loading={store.loading()}
            hasMore={store.hasMoreIllust() || store.hasMoreNovel()}
            onLoadMore={() => {
              // Run both in parallel to avoid loading() guard starvation
              if (store.hasMoreIllust() && store.hasMoreNovel()) {
                store.loadMoreIllust();
                store.loadMoreNovel();
              } else if (store.hasMoreIllust()) {
                store.loadMoreIllust();
              } else if (store.hasMoreNovel()) {
                store.loadMoreNovel();
              }
            }}
            onIllustClick={(id) => navigate({ to: "/illust/$id", params: { id: String(id) } })}
            onNovelClick={(id) => navigate({ to: "/novel/$id", params: { id: String(id) } })}
            onRefresh={() => store.executeSearch()}
            error={store.error()}
          />
        </Show>
      </div>

      {/* ── Back to top ── */}
      <Show when={showBackToTop()}>
        <button
          class="fixed z-20 bottom-24 right-4 w-11 h-11 flex items-center justify-center rounded-[var(--borderRadiusCircular)] bg-[var(--colorOverlaySurface)] backdrop-blur-[30px] backdrop-saturate-[125%] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)] text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorOverlaySurfaceHover)] active:scale-90 transition-all duration-[var(--durationFast)]"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="回顶"
        >
          <span class="text-lg font-bold">↑</span>
        </button>
      </Show>
    </div>
  );
};

// ── Search history sub-component ──

interface HistoryProps {
  history: string[];
  onSelect: (word: string) => void;
  onRemove: (word: string) => void;
  onClear: () => void;
}

const SearchHistorySection: Component<HistoryProps> = (props) => {
  return (
    <div>
      <Show
        when={props.history.length > 0}
        fallback={
          <div class="flex flex-col items-center gap-2 py-12 text-center">
            <FluentIcon name="search" size={40} />
            <p class="text-[var(--colorNeutralForeground3)] text-sm">输入关键词开始搜索</p>
          </div>
        }
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold text-[var(--colorNeutralForeground1)]">最近搜索</h3>
          <button
            class="text-xs text-[var(--colorNeutralForeground4)] hover:text-[var(--colorNeutralForeground1)] transition-colors duration-[var(--durationFast)]"
            onClick={props.onClear}
          >
            清空
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <For each={props.history}>
            {(word) => (
              <div class="flex items-center gap-1 px-3 py-1.5 rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground2)] text-sm text-[var(--colorNeutralForeground1)] cursor-pointer hover:bg-[var(--colorNeutralBackground3)] transition-colors duration-[var(--durationFast)] group">
                <span onClick={() => props.onSelect(word)} class="select-none">
                  {word}
                </span>
                <button
                  class="ml-0.5 min-w-11 min-h-11 flex items-center justify-center rounded-[var(--borderRadiusCircular)] text-[var(--colorNeutralForeground4)] opacity-0 group-hover:opacity-100 hover:text-[var(--colorNeutralForeground1)] transition-[opacity,color] duration-[var(--durationFast)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onRemove(word);
                  }}
                  aria-label={`删除 ${word}`}
                >
                  <FluentIcon name="dismiss" size={12} />
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default Search;
