/**
 * 检测当前运行环境是否支持 pretext 所需的 API：
 * - Intl.Segmenter（字素分割）
 * - document.createElement("canvas").getContext("2d").measureText
 */
export function isPretextSupported(): boolean {
  return (
    typeof Intl !== "undefined" &&
    typeof Intl.Segmenter === "function" &&
    typeof document !== "undefined" &&
    typeof document.createElement === "function" &&
    !!(document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D | null)
      ?.measureText
  );
}
