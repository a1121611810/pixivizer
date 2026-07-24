import { scrollRestoreGlobal, type ScrollRestoreState } from "./createScrollRestore";
import { currentTab } from "../stores/uiStore";

export function createFeedScrollStore(
  prefix: string,
  getFollowTab?: () => string,
  recommendSubTab?: () => string,
) {
  function getTabKey(tab?: string): string {
    const t = tab ?? currentTab();
    if (t === "follow" && getFollowTab) return `${prefix}follow_${getFollowTab()}`;
    if (t === "recommended" && recommendSubTab) {
      return `${prefix}recommended_${recommendSubTab()}`;
    }
    return `${prefix}${t}`;
  }

  function saveTabScroll(tab: string) {
    scrollRestoreGlobal.saveSimple(getTabKey(tab));
  }

  function getFeedScrollY(tab?: string): number {
    return scrollRestoreGlobal.getSimple(getTabKey(tab)) ?? 0;
  }

  function getScrollStateKey(tab?: string): string {
    const t = tab ?? currentTab();
    if (t === "follow" && getFollowTab) return `${prefix}follow_${getFollowTab()}`;
    if (t === "recommended" && recommendSubTab) {
      return `${prefix}recommended_${recommendSubTab()}`;
    }
    return `${prefix}${t}`;
  }

  function saveScrollState(tab: string, st: ScrollRestoreState) {
    scrollRestoreGlobal.saveVirtual(getScrollStateKey(tab), st);
  }

  function getScrollState(tab?: string): ScrollRestoreState | null {
    return scrollRestoreGlobal.getVirtual(getScrollStateKey(tab)) ?? null;
  }

  return { saveTabScroll, getFeedScrollY, getScrollStateKey, saveScrollState, getScrollState };
}

export type { ScrollRestoreState };
