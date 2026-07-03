import { createSignal, onCleanup } from "solid-js";

/**
 * 手动 fetch 封装，替代 createResource 用于路由级组件。
 *
 * 为什么不用 createResource：
 *   App.tsx 的 <Suspense> 包裹了整棵路由树，createResource 会触发
 *   Suspense fallback，导致整页白屏。
 *
 * 用法：
 *   const fetcher = useManualFetch((signal) => loadSeries(seriesId));
 *   fetcher.execute();
 *   // fetcher.data() → T | null
 *   // fetcher.loading() → boolean
 *   // fetcher.error() → string | null
 */
export function createManualFetch<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = createSignal<T | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let abortController: AbortController | null = null;

  function cancel() {
    abortController?.abort();
    abortController = null;
  }

  async function execute(): Promise<void> {
    cancel();

    abortController = new AbortController();
    const signal = abortController.signal;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await fetcher(signal);
      if (!signal.aborted) {
        setData(result);
      }
    } catch (e) {
      if (!signal.aborted) {
        setError((e as { message?: string }).message ?? String(e));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }

  onCleanup(() => {
    cancel();
  });

  return { data, loading, error, execute, cancel } as const;
}
