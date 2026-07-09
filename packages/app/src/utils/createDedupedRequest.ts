/**
 * 对同一 key 的并发请求进行去重。
 *
 * 只有在途请求会被复用；请求完成后（无论成功或失败）会立即从内部 map 移除，
 * 以便下一次调用可以重新发起请求，而不是永久复用旧结果。
 */
export function createDedupedRequest<K, T>(
  fetcher: (key: K) => Promise<T>,
): {
  request: (key: K) => Promise<T>;
  clear: () => void;
} {
  const inflight = new Map<K, Promise<T>>();

  function request(key: K): Promise<T> {
    const existing = inflight.get(key);
    if (existing) return existing;

    const promise = fetcher(key).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, promise);
    return promise;
  }

  function clear(): void {
    inflight.clear();
  }

  return { request, clear };
}
