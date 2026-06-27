import type { PixivIllust, PixivUserPreview } from "../api/types";
import { showR18, showR18G } from "../stores/uiStore";
import { isBlocked } from "../stores/blockStore";

/**
 * 判断作品是否应被过滤（R-18 或 R-18G 开关关闭时隐藏对应内容）。
 * x_restrict: 0=全年龄, 1=R-18, 2=R-18G
 */
function isRestricted(i: PixivIllust): boolean {
  if (!showR18() && i.x_restrict === 1) return true;
  if (!showR18G() && i.x_restrict === 2) return true;
  return false;
}

/** 判断作品作者是否已被屏蔽 */
function isBlockedUser(i: PixivIllust): boolean {
  return isBlocked(i.user.id);
}

/**
 * 过滤作品列表：同时应用 R18 / R-18G 开关与屏蔽用户。
 * 被屏蔽用户的所有作品都会被隐藏。
 */
export function filterFeedIllusts(illusts: PixivIllust[]): PixivIllust[] {
  return illusts.filter((i) => !isRestricted(i) && !isBlockedUser(i));
}

/** 过滤 user_previews：移除被屏蔽用户，并对其示例作品应用 R18 过滤 */
export function filterUserPreviews(previews: PixivUserPreview[]): PixivUserPreview[] {
  return previews
    .filter((p) => !isBlocked(p.user.id))
    .map((p) =>
      Object.assign({}, p, {
        illusts: p.illusts.filter((i) => !isRestricted(i)),
      }),
    );
}
