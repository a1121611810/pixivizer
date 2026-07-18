import { prepareWithSegments, measureNaturalWidth, layout } from "@chenglou/pretext";
import { isPretextSupported } from "./isPretextSupported";

export interface MeasureTextOptions {
  text: string;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  maxWidth: number;
  lineHeight: number;
  maxLines?: number;
}

export interface MeasuredText {
  lineCount: number;
  width: number;
  height: number;
}

function buildFontString(fontSize: number, fontWeight: number, fontFamily: string): string {
  return `${fontWeight} ${fontSize}px ${fontFamily}, sans-serif`;
}

/**
 * 测量单段文本的自然宽度。
 *
 * 优先使用 pretext 精确测量；不支持时按平均字符宽度估算。
 */
export function measureTextWidth(
  text: string,
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
): number {
  if (text.length === 0) {
    return 0;
  }

  const fontString = buildFontString(fontSize, fontWeight, fontFamily);
  if (isPretextSupported()) {
    const prepared = prepareWithSegments(text, fontString);
    return measureNaturalWidth(prepared);
  }

  // 降级：按平均 0.6em 估算字符宽度
  return text.length * fontSize * 0.6;
}

/**
 * 测量文本在限定宽度下的行数、最宽行宽度和总高度。
 *
 * 优先使用 pretext 精确计算；不支持时按平均字符宽度估算行数。
 */
export function measureTextLines(options: MeasureTextOptions): MeasuredText {
  const { text, fontSize, fontWeight, fontFamily, maxWidth, lineHeight, maxLines } = options;

  if (maxWidth <= 0 || text.length === 0) {
    return { lineCount: 1, width: 0, height: lineHeight };
  }

  const fontString = buildFontString(fontSize, fontWeight, fontFamily);
  let lineCount: number;
  let width: number;

  if (isPretextSupported()) {
    const prepared = prepareWithSegments(text, fontString);
    const result = layout(prepared, maxWidth, lineHeight);
    lineCount = result.lineCount;
    width = measureNaturalWidth(prepared);
  } else {
    // 降级：按平均字符宽度估算行数
    const charsPerLine = Math.max(1, Math.floor(maxWidth / (fontSize * 0.6)));
    lineCount = Math.ceil(text.length / charsPerLine);
    width = text.length * fontSize * 0.6;
  }

  const clampedLineCount = maxLines != null ? Math.min(lineCount, maxLines) : lineCount;
  return {
    lineCount: Math.max(1, clampedLineCount),
    width,
    height: Math.max(1, clampedLineCount) * lineHeight,
  };
}
