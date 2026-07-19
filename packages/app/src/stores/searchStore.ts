import { createSignal } from "solid-js";
import type {
  PixivIllust,
  PixivNovel,
  SearchSort,
  SearchTarget,
  SearchScope,
  ApiError,
} from "@/api/types";
import { searchIllust, searchNovel, searchIllustNext, searchNovelNext } from "@/api/search";
import { toApiError } from "@/api/client";
import { ApiErrorType } from "@/api/types";

export interface SearchStoreState {
  keyword: () => string;
  scope: () => SearchScope;
  sort: () => SearchSort;
  searchTarget: () => SearchTarget;
  illustResults: () => PixivIllust[];
  novelResults: () => PixivNovel[];
  loading: () => boolean;
  error: () => ApiError | null;
  hasMoreIllust: () => boolean;
  hasMoreNovel: () => boolean;
  nextIllustUrl: () => string | null;
  nextNovelUrl: () => string | null;
  searchHistory: () => string[];
  setKeyword: (word: string) => void;
  setScope: (scope: SearchScope) => void;
  setSort: (sort: SearchSort) => void;
  setSearchTarget: (target: SearchTarget) => void;
  setResults: (
    illusts: PixivIllust[],
    novels: PixivNovel[],
    loading: boolean,
    hasMoreIllust: boolean,
    hasMoreNovel: boolean,
    nextIllustUrl: string | null,
    nextNovelUrl: string | null,
  ) => void;
  appendResults: (
    illusts: PixivIllust[],
    novels: PixivNovel[],
    loading: boolean,
    hasMoreIllust: boolean,
    hasMoreNovel: boolean,
    nextIllustUrl: string | null,
    nextNovelUrl: string | null,
  ) => void;
  setLoading: (loading: boolean) => void;
  setError: (err: ApiError | null) => void;
  clearResults: () => void;
  addToHistory: (word: string) => void;
  removeFromHistory: (word: string) => void;
  clearHistory: () => void;
  executeSearch: () => Promise<void>;
  loadMoreIllust: () => Promise<void>;
  loadMoreNovel: () => Promise<void>;
}

const MAX_HISTORY = 50;

export function createSearchStore(): SearchStoreState {
  const [keyword, setKeyword] = createSignal("");
  const [scope, setScope] = createSignal<SearchScope>("all");
  const [sort, setSort] = createSignal<SearchSort>("date_desc");
  const [searchTarget, setSearchTarget] = createSignal<SearchTarget>("partial_match_for_tags");
  const [illustResults, setIllustResults] = createSignal<PixivIllust[]>([]);
  const [novelResults, setNovelResults] = createSignal<PixivNovel[]>([]);
  const [loading, setLoading] = createSignal(false);
  // 独立跟踪并行请求数，避免 boolean loading 的竞态问题
  let pendingRequests = 0;

  function incPending() {
    pendingRequests++;
    setLoading(true);
  }

  function decPending() {
    pendingRequests--;
    if (pendingRequests <= 0) {
      pendingRequests = 0;
      setLoading(false);
    }
  }
  const [error, setError] = createSignal<ApiError | null>(null);
  const [hasMoreIllust, setHasMoreIllust] = createSignal(false);
  const [hasMoreNovel, setHasMoreNovel] = createSignal(false);
  const [nextIllustUrl, setNextIllustUrl] = createSignal<string | null>(null);
  const [nextNovelUrl, setNextNovelUrl] = createSignal<string | null>(null);
  const [searchHistory, setSearchHistory] = createSignal<string[]>([]);

  // ── AbortController management ──
  let abortController: AbortController | null = null;

  function abortPrevious() {
    abortController?.abort();
    abortController = new AbortController();
  }

  function setResults(
    illusts: PixivIllust[],
    novels: PixivNovel[],
    loading: boolean,
    hasMoreI: boolean,
    hasMoreN: boolean,
    nextI: string | null,
    nextN: string | null,
  ) {
    setIllustResults(illusts);
    setNovelResults(novels);
    setLoading(loading);
    setHasMoreIllust(hasMoreI);
    setHasMoreNovel(hasMoreN);
    setNextIllustUrl(nextI);
    setNextNovelUrl(nextN);
    setError(null);
  }

  function appendResults(
    illusts: PixivIllust[],
    novels: PixivNovel[],
    loading: boolean,
    hasMoreI: boolean,
    hasMoreN: boolean,
    nextI: string | null,
    nextN: string | null,
  ) {
    setIllustResults((prev) => [...prev, ...illusts]);
    setNovelResults((prev) => [...prev, ...novels]);
    setLoading(loading);
    setHasMoreIllust(hasMoreI);
    setHasMoreNovel(hasMoreN);
    setNextIllustUrl(nextI);
    setNextNovelUrl(nextN);
  }

  function clearResults() {
    setIllustResults([]);
    setNovelResults([]);
    setLoading(false);
    setError(null);
    setHasMoreIllust(false);
    setHasMoreNovel(false);
    setNextIllustUrl(null);
    setNextNovelUrl(null);
  }

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

  async function executeSearch() {
    const kw = keyword().trim();
    if (!kw) return;

    abortPrevious();
    const signal = abortController!.signal;
    // 重置待处理计数，取消所有进行中的 loadMore 的 pending
    pendingRequests = 0;
    incPending();
    setError(null);
    // Clear previous results to avoid stale data on partial failure
    setIllustResults([]);
    setNovelResults([]);
    setHasMoreIllust(false);
    setHasMoreNovel(false);
    setNextIllustUrl(null);
    setNextNovelUrl(null);

    try {
      const currentScope = scope();
      const currentSort = sort();
      const currentTarget = searchTarget();
      let anySucceeded = false;

      if (currentScope === "illust" || currentScope === "all") {
        try {
          const illustRes = await searchIllust(kw, currentSort, currentTarget, signal);
          setIllustResults(illustRes.illusts);
          setHasMoreIllust(illustRes.next_url != null);
          setNextIllustUrl(illustRes.next_url);
          anySucceeded = true;
        } catch (err) {
          if ((err as Error).name === "AbortError") throw err;
          if (currentScope === "illust") throw err;
        }
      }

      if (currentScope === "novel" || currentScope === "all") {
        try {
          const novelRes = await searchNovel(kw, currentSort, currentTarget, signal);
          setNovelResults(novelRes.novels);
          setHasMoreNovel(novelRes.next_url != null);
          setNextNovelUrl(novelRes.next_url);
          anySucceeded = true;
        } catch (err) {
          if ((err as Error).name === "AbortError") throw err;
          if (currentScope === "novel") throw err;
        }
      }

      // scope=all: both failed, set error
      if (currentScope === "all" && !anySucceeded) {
        setError({ type: ApiErrorType.UNKNOWN, message: "搜索失败，请稍后重试" });
      }

      decPending();
    } catch (err) {
      if ((err as Error).name === "AbortError") { decPending(); return; }
      setError(toApiError(err));
      decPending();
    }
  }

  async function loadMoreIllust() {
    const url = nextIllustUrl();
    if (!url) return;
    setError(null);
    incPending();
    try {
      const res = await searchIllustNext(url, abortController?.signal ?? undefined);
      setIllustResults((prev) => [...prev, ...res.illusts]);
      setHasMoreIllust(res.next_url != null);
      setNextIllustUrl(res.next_url);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(toApiError(err));
    } finally {
      decPending();
    }
  }

  async function loadMoreNovel() {
    const url = nextNovelUrl();
    if (!url) return;
    setError(null);
    incPending();
    try {
      const res = await searchNovelNext(url, abortController?.signal ?? undefined);
      setNovelResults((prev) => [...prev, ...res.novels]);
      setHasMoreNovel(res.next_url != null);
      setNextNovelUrl(res.next_url);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(toApiError(err));
    } finally {
      decPending();
    }
  }

  return {
    keyword,
    scope,
    sort,
    searchTarget,
    illustResults,
    novelResults,
    loading,
    error,
    hasMoreIllust,
    hasMoreNovel,
    nextIllustUrl,
    nextNovelUrl,
    searchHistory,
    setKeyword,
    setScope,
    setSort,
    setSearchTarget,
    setResults,
    appendResults,
    setLoading,
    setError,
    clearResults,
    addToHistory,
    removeFromHistory,
    clearHistory,
    executeSearch,
    loadMoreIllust,
    loadMoreNovel,
  };
}
