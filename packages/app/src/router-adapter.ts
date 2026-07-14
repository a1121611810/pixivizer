import {
  useLocation,
  useNavigate as useTanStackNavigate,
  useParams as useTanStackParams,
  useRouter,
  useSearch as useTanStackSearch,
  type NavigateOptions,
} from "@tanstack/solid-router";

/**
 * 兼容层：将 @tanstack/solid-router 的导航/参数钩子适配为旧版 @solidjs/router 签名。
 * Phase 2 临时使用，后续随组件重构逐步替换为 TanStack 原生 API。
 */

function throwSetterNotImplemented(): never {
  throw new Error("useSearchParams setter is not implemented in the TanStack adapter");
}

/** 返回可像旧版 `params.id` 一样访问的响应式代理对象。 */
export function useParams<T extends Record<string, string | undefined>>(): T {
  const params = useTanStackParams({ strict: false });
  return new Proxy({} as T, {
    get(_, prop) {
      return (params() as Record<string, string | undefined>)[prop as string];
    },
  });
}

/** 兼容旧版 `navigate(to: string | number, options?)` 签名的导航函数。 */
export function useNavigate(): (
  to: string | number,
  options?: { replace?: boolean; state?: unknown; scroll?: boolean },
) => void {
  const navigate = useTanStackNavigate();
  const router = useRouter();

  return (to, options) => {
    if (typeof to === "number") {
      if (to === -1) {
        router.history.back();
      } else {
        router.history.go(to);
      }
      return;
    }

    const opts = { to, ...options } as NavigateOptions;
    void navigate(opts);
  };
}

/** 返回 `[searchParams, setterNever]`，兼容旧版 `const [searchParams] = useSearchParams()` 用法。 */
export function useSearchParams<T extends Record<string, string | undefined>>(): readonly [
  T,
  never,
] {
  const search = useTanStackSearch({ strict: false });
  const proxy = new Proxy({} as T, {
    get(_, prop) {
      return (search() as Record<string, string | undefined>)[prop as string];
    },
  });

  return [proxy, throwSetterNotImplemented as never] as const;
}

export { useLocation };
