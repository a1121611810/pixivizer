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
import { createSearchStore } from "@/stores/searchStore";
import SearchResults from "@/components/SearchResults";
import { createScrollRestore } from "@/primitives/createScrollRestore";
import type { SearchScope, SearchSort } from "@/api/types";
import PageTransition from "@/components/PageTransition";
import { scrollToTop } from "@/utils/scrollToTop";

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

/** 获取当前 scope 的中文标签 */
function scopeLabel(value: SearchScope): string {
  return SCOPE_OPTIONS.find((o) => o.value === value)?.label ?? "全部";
}

const Search: Component = () => {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });

  const store = createSearchStore();

  // ── Local state: search history, autocomplete, type filter ──
  const [searchHistory, setSearchHistory] = createSignal<string[]>([]);
  const MAX_HISTORY = 50;

  function addToHistory(word: string) {
    if (!word.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((h) => h !== word);
      return [word, ...filtered].slice(0, MAX_HISTORY);
    });
  }

  function removeFromHistory(word: string) {
    setSearchHistory((prev) => prev.filter((h) => h !== word));
  }

  function clearHistory() {
    setSearchHistory([]);
  }

  // ── Back-to-top state & compact header state ──
  const [showBackToTop, setShowBackToTop] = createSignal(false);
  const [showCompactHeader, setShowCompactHeader] = createSignal(false);

  // ── Scroll position restoration ──
  const scrollRestore = createScrollRestore(() =>
    store.keyword().trim() ? `search_${store.keyword()}` : undefined,
  );

  onCleanup(() => scrollRestore.save());

  // ── Scroll listener: back-to-top + compact header ──
  let lastScrollY = 0;
  const SCROLL_HEADER_THRESHOLD = 150;
  const SCROLL_DIRECTION_DEADZONE = 10;

  onMount(() => {
    const onScroll = () => {
      const currentY = window.scrollY;

      // Back-to-top
      setShowBackToTop(currentY > 300);

      // Compact header: show when scrolled past threshold AND scrolling up
      if (
        currentY > SCROLL_HEADER_THRESHOLD &&
        lastScrollY - currentY > SCROLL_DIRECTION_DEADZONE
      ) {
        setShowCompactHeader(true);
      } else if (
        currentY <= SCROLL_HEADER_THRESHOLD ||
        currentY - lastScrollY > SCROLL_DIRECTION_DEADZONE
      ) {
        setShowCompactHeader(false);
      }

      lastScrollY = currentY;
    };
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
      store.setKeyword(params.word.trim());
      if (params.scope) store.setScope(params.scope as SearchScope);
      if (params.sort) store.setSort(params.sort as SearchSort);
      store.executeSearch().then(() => scrollRestore.restore());
    }
    if (!hydrated() && params.word === undefined) {
      setHydrated(true);
    }
  });

  // ── Restore scroll position when results finish loading ──
  const [scrollRestored, setScrollRestored] = createSignal(false);
  createEffect(() => {
    const results = store.results();
    if (hydrated() && !scrollRestored() && results.length > 0) {
      const restored = scrollRestore.restore();
      void restored;
      setScrollRestored(true);
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
        addToHistory(value.trim());
        void navigate({
          to: "/search",
          search: { word: value.trim(), scope: store.scope(), sort: store.sort() },
        });
        store.executeSearch();
      }
    }, 300);
  };

  // ── Enter key also triggers search immediately ──
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      const value = (e.currentTarget as HTMLInputElement).value.trim();
      if (value) {
        clearTimeout(debounceTimer);
        addToHistory(value);
        void navigate({
          to: "/search",
          search: { word: value, scope: store.scope(), sort: store.sort() },
        });
        store.executeSearch();
      }
    }
  }

  function handleScopeChange(scope: SearchScope) {
    store.setScope(scope);
    const kw = store.keyword().trim();
    if (kw) {
      clearTimeout(debounceTimer);
      void navigate({
        to: "/search",
        search: { word: kw, scope, sort: store.sort() },
      });
      store.executeSearch();
    }
  }

  function handleSortChange(sort: SearchSort) {
    store.setSort(sort);
    const kw = store.keyword().trim();
    if (kw) {
      clearTimeout(debounceTimer);
      void navigate({
        to: "/search",
        search: { word: kw, scope: store.scope(), sort },
      });
      store.executeSearch();
    }
  }

  let mainInputRef: HTMLInputElement | undefined;

  /** 聚焦紧凑 header 的搜索框时滚回顶部显示完整搜索栏 */
  function onCompactInputFocus() {
    scrollToTop();
    // 稍后聚焦主搜索框
    setTimeout(() => mainInputRef?.focus(), 350);
  }

  const hasActiveSearch = createMemo(() => store.keyword().trim() !== "");

  return (
    <PageTransition>
      {/* ── Compact header — 滚出阈值后上滑展示 ── */}
      <header
        class="fixed top-0 left-0 right-0 z-30 surface-appbar transition-transform duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
        classList={{
          "translate-y-0": showCompactHeader(),
          "-translate-y-full": !showCompactHeader(),
        }}
      >
        <div class="flex items-center gap-2 px-4 h-12 max-w-3xl mx-auto">
          <button
            class="flex items-center justify-center min-w-10 min-h-10 rounded-[var(--borderRadiusSmall)] text-[var(--colorNeutralForeground2)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-95 transition-all duration-[var(--durationFast)] flex-shrink-0"
            onClick={() => window.history.back()}
            aria-label="返回"
          >
            <FluentIcon name="chevronLeft" size={20} />
          </button>

          <div class="flex items-center gap-1.5 flex-1 min-w-0 bg-[var(--colorNeutralBackground1)] rounded-[var(--borderRadiusMedium)] border border-[var(--colorNeutralStroke2)] px-[var(--spacingHorizontalMNudge)] py-[var(--spacingVerticalSNudge)]">
            <FluentIcon name="search" size={16} />
            <input
              type="search"
              class="flex-1 min-w-0 bg-transparent border-none outline-none text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase300)] placeholder:text-[var(--colorNeutralForeground3)]"
              placeholder="搜索"
              aria-label="搜索"
              value={store.keyword()}
              onInput={(e) => handleInput(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              onFocus={onCompactInputFocus}
            />
            <Show when={store.keyword() !== ""}>
              <button
                class="flex items-center justify-center min-w-8 min-h-8 rounded-[var(--borderRadiusSmall)] text-[var(--colorNeutralForeground3)] hover:bg-[var(--colorNeutralBackground2)] hover:text-[var(--colorNeutralForeground1)] active:scale-90 transition-all duration-[var(--durationFast)]"
                onClick={(e) => {
                  e.stopPropagation();
                  clearTimeout(debounceTimer);
                  store.setKeyword("");
                  void navigate({ to: "/search", search: {} });
                }}
                aria-label="清除搜索"
              >
                <FluentIcon name="dismiss" size={16} />
              </button>
            </Show>
          </div>

          {/* Compact filter indicator */}
          <button
            class="flex-shrink-0 text-xs text-[var(--colorNeutralForeground3)] whitespace-nowrap px-[var(--spacingHorizontalXS)] py-[var(--spacingVerticalXXS)] rounded-[var(--borderRadiusSmall)] hover:bg-[var(--colorNeutralBackground1Hover)] transition-colors duration-[var(--durationFast)]"
            onClick={() => scrollToTop()}
            aria-label="切换筛选"
          >
            {scopeLabel(store.scope())}
          </button>
        </div>
      </header>

      <div class="pb-16">
        <div class="max-w-3xl mx-auto">
          {/* ── Search bar — Fluent 2 flat surface card ── */}
          <div class="surface-card mx-4 mt-4 flex items-center gap-2 px-[var(--spacingHorizontalM)] py-[var(--spacingVerticalM)]">
            <span class="flex-shrink-0 text-[var(--colorNeutralForeground3)]">
              <FluentIcon name="search" size={20} />
            </span>
            <input
              ref={(el) => (mainInputRef = el)}
              type="search"
              class="flex-1 min-w-0 bg-transparent border-none outline-none text-[var(--colorNeutralForeground1)] [font-size:var(--fontSizeBase300)] placeholder:text-[var(--colorNeutralForeground3)]"
              placeholder="输入标签或关键词搜索"
              aria-label="搜索关键词"
              value={store.keyword()}
              onInput={(e) => handleInput(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
            />
            <Show when={store.keyword() !== ""}>
              <button
                class="flex items-center justify-center min-w-8 min-h-8 rounded-[var(--borderRadiusSmall)] text-[var(--colorNeutralForeground3)] hover:bg-[var(--colorNeutralBackground2)] hover:text-[var(--colorNeutralForeground1)] active:scale-90 transition-all duration-[var(--durationFast)]"
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

          {/* ── Scope + Sort controls — Fluent 2 tabs + inline sort ── */}
          <div class="px-4 mt-4 mb-3 flex flex-col gap-[var(--spacingVerticalM)]">
            <div
              class="flex border-b border-[var(--colorNeutralStroke2)]"
              role="radiogroup"
              aria-label="搜索范围"
            >
              <For each={SCOPE_OPTIONS}>
                {(opt) => (
                  <button
                    class="flex-1 pb-[var(--spacingVerticalSNudge)] [font-size:var(--fontSizeBase300)] font-medium text-center transition-all duration-[var(--durationFast)] focus-visible:outline-[var(--colorStrokeFocus2)] focus-visible:outline-2 focus-visible:outline-offset-1 relative"
                    classList={{
                      "text-[var(--colorBrandForeground1)]": store.scope() === opt.value,
                      "text-[var(--colorNeutralForeground3)] hover:text-[var(--colorNeutralForeground1)]":
                        store.scope() !== opt.value,
                    }}
                    onClick={() => handleScopeChange(opt.value)}
                    role="radio"
                    aria-checked={store.scope() === opt.value}
                  >
                    {opt.label}
                    {store.scope() === opt.value && (
                      <span class="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--colorBrandStroke1)] rounded-full" />
                    )}
                  </button>
                )}
              </For>
            </div>

            <div
              class="flex items-center justify-center gap-[var(--spacingHorizontalS)]"
              role="group"
              aria-label="排序方式"
            >
              <For each={SORT_OPTIONS}>
                {(opt, index) => (
                  <>
                    <Show when={index() > 0}>
                      <span
                        class="text-[var(--colorNeutralForegroundDisabled)] text-xs select-none"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                    </Show>
                    <button
                      class="[font-size:var(--fontSizeBase200)] transition-colors duration-[var(--durationFast)] focus-visible:outline-[var(--colorStrokeFocus2)] focus-visible:outline-2 focus-visible:outline-offset-1"
                      classList={{
                        "text-[var(--colorBrandForeground1)] font-semibold":
                          store.sort() === opt.value,
                        "text-[var(--colorNeutralForeground3)] hover:text-[var(--colorNeutralForeground1)]":
                          store.sort() !== opt.value,
                      }}
                      onClick={() => handleSortChange(opt.value)}
                    >
                      {opt.label}
                    </button>
                  </>
                )}
              </For>
            </div>
          </div>

          {/* ── Search history (when no keyword) ── */}
          <Show when={!hasActiveSearch()}>
            <SearchHistorySection
              history={searchHistory()}
              onSelect={(word) => {
                clearTimeout(debounceTimer);
                store.setKeyword(word);
                addToHistory(word);
                void navigate({
                  to: "/search",
                  search: { word, scope: store.scope(), sort: store.sort() },
                });
                store.executeSearch();
              }}
              onRemove={(word) => removeFromHistory(word)}
              onClear={() => clearHistory()}
            />
          </Show>

          {/* ── Search results ── */}
          <Show when={hasActiveSearch()}>
            <div class="px-4">
              <SearchResults
                results={store.results()}
                loading={store.loading()}
                hasMore={store.hasMore()}
                onLoadMore={() => store.loadMore()}
                onIllustClick={(id) => navigate({ to: "/illust/$id", params: { id: String(id) } })}
                onNovelClick={(id) => navigate({ to: "/novel/$id", params: { id: String(id) } })}
                onRefresh={() => store.executeSearch()}
                error={store.error()}
              />
            </div>
          </Show>
        </div>
      </div>

      {/* ── Back to top ── */}
      <Show when={showBackToTop()}>
        <button
          class="fixed z-20 bottom-24 right-4 w-11 h-11 flex items-center justify-center rounded-[var(--borderRadiusCircular)] bg-[var(--colorOverlaySurface)] backdrop-blur-[30px] backdrop-saturate-[125%] border border-[var(--colorNeutralStroke2)] shadow-[var(--elevation4)] text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorOverlaySurfaceHover)] active:scale-90 transition-all duration-[var(--durationFast)]"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="回顶"
        >
          <FluentIcon name="chevronUp" size={20} />
        </button>
      </Show>
    </PageTransition>
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
    <div class="px-4">
      <Show
        when={props.history.length > 0}
        fallback={
          <div class="flex flex-col items-center gap-2 py-12 text-center">
            <span class="text-[var(--colorNeutralForeground4)]">
              <FluentIcon name="search" size={40} />
            </span>
            <p class="text-[var(--colorNeutralForeground3)] text-sm">输入关键词开始搜索</p>
          </div>
        }
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-[var(--colorNeutralForeground1)]">最近搜索</h3>
          <button class="history-clear-btn" onClick={props.onClear}>
            清空
          </button>
        </div>
        <div class="flex flex-col gap-1">
          <For each={props.history}>
            {(word) => (
              <div class="flex items-center gap-2 px-3 py-2 rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground2)] cursor-pointer hover:bg-[var(--colorNeutralBackground3)] transition-colors duration-[var(--durationFast)] min-h-[44px]">
                <span
                  class="flex-1 text-sm text-[var(--colorNeutralForeground1)] select-none truncate"
                  onClick={() => props.onSelect(word)}
                >
                  {word}
                </span>
                <button
                  class="min-w-9 min-h-9 flex items-center justify-center rounded-[var(--borderRadiusSmall)] text-[var(--colorNeutralForeground4)] hover:text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorNeutralBackground1)] active:scale-90 transition-all duration-[var(--durationFast)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onRemove(word);
                  }}
                  aria-label={`删除 ${word}`}
                >
                  <FluentIcon name="dismiss" size={14} />
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
