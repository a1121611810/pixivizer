import { QueryClient } from "@tanstack/solid-query";

/**
 * Full Jitter: random(0, min(cap, 2^attempt * base))
 * AWS 推荐策略，在指数退避基础上添加随机抖动，
 * 避免并发 429 客户端同时重试导致峰值反弹。
 */
function fullJitterDelay(attempt: number): number {
  const base = 1000;
  const cap = 30_000;
  const exp = Math.min(cap, base * Math.pow(2, attempt));
  return Math.round(Math.random() * exp);
}

/**
 * 全局 QueryClient 单例。
 *
 * defaultOptions 统一控制所有查询的缓存策略：
 *   staleTime: 5min — 相同 queryKey 的组件挂载不重新拉取
 *   gcTime: 30min — 离开页面后缓存保留 30 分钟，支持 Tab 切换无闪烁
 *   retry: 2 — HTTP 重试由 TQ 处理（client.ts 做了纯传输）
 *   retryDelay: Full Jitter — AWS 推荐，防重试风暴
 *   refetchOnWindowFocus: false — Capacitor 下 window focus 行为不可预测，
 *     前台恢复由 authStore 的 appStateChange 监听统一处理
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      retryDelay: fullJitterDelay,
      refetchOnWindowFocus: false,
    },
  },
});
