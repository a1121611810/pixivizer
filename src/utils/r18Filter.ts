import type { PixivIllust, PixivUserPreview } from "../api/types";
import { showR18, showR18G } from "../stores/uiStore";

/**
 * 判断作品是否应被过滤（R-18 或 R-18G 开关关闭时隐藏对应内容）。
 * x_restrict: 0=全年龄, 1=R-18, 2=R-18G
 */
function isRestricted(i: PixivIllust): boolean {
  if (!showR18() && i.x_restrict === 1) return true;
  if (!showR18G() && i.x_restrict === 2) return true;
  return false;
}

/** 根据 R18 / R-18G 开关过滤作品列表 */
export function filterR18(illusts: PixivIllust[]): PixivIllust[] {
  if (showR18() && showR18G()) return illusts;
  return illusts.filter((i) => !isRestricted(i));
}

/** 过滤 user_previews 中的示例作品 */
export function filterUserPreviews(previews: PixivUserPreview[]): PixivUserPreview[] {
  if (showR18() && showR18G()) return previews;
  return previews.map((p) => ({
    ...p,
    illusts: p.illusts.filter((i) => !isRestricted(i)),
  }));
}
