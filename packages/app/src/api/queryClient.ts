import { QueryClient } from "@tanstack/solid-query";

/**
 * 全局 QueryClient 单例。
 *
 * defaultOptions 统一控制所有查询的缓存策略：
 *   staleTime: 5min — 相同 queryKey 的组件挂载不重新拉取
 *   gcTime: 30min — 离开页面后缓存保留 30 分钟，支持 Tab 切换无闪烁
 *   retry: 1 — 失败查一次（client.ts 的指数退避额外处理 429）
 *   refetchOnWindowFocus: false — Capacitor 下 window focus 行为不可预测，
 *     前台恢复由 authStore 的 appStateChange 监听统一处理
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
