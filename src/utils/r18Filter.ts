import type { PixivIllust, PixivUserPreview } from "../api/types";
import { showR18 } from "../stores/uiStore";

/** 根据 R18 开关过滤作品列表 */
export function filterR18(illusts: PixivIllust[]): PixivIllust[] {
  if (showR18()) return illusts;
  return illusts.filter((i) => !i.x_restrict);
}

/** 过滤 user_previews 中的示例作品 */
export function filterUserPreviews(previews: PixivUserPreview[]): PixivUserPreview[] {
  if (showR18()) return previews;
  return previews.map((p) => ({
    ...p,
    illusts: p.illusts.filter((i) => !i.x_restrict),
  }));
}
