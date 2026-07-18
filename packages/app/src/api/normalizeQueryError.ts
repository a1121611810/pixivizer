import type { ApiError } from "./types";
import { ApiErrorType } from "./types";

/**
 * 将 TanStack Query 的 `query.error` 统一转换为应用的 ApiError 类型。
 *
 * client.ts 在 HTTP 请求出错时已抛出带 type 属性的 ApiError 对象，
 * 因此 TQ 的 query.error 可能为：
 *   1. ApiError 实例（从 client.ts 透传）→ 原样返回
 *   2. Error 实例（TQ 内部异常）→ 兜底为 UNKNOWN 类型
 *   3. null（无错误）→ 返回 null
 */
export function normalizeQueryError(err: unknown): ApiError | null {
  if (!err) {
    return null;
  }
  if (typeof err === "object" && "type" in err) {
    return err as ApiError;
  }
  return {
    type: ApiErrorType.UNKNOWN,
    message: (err as { message?: string })?.message ?? "加载失败",
  };
}
