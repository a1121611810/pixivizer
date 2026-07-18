import { createSignal } from "solid-js";
import { Preferences } from "@capacitor/preferences";

const PREF_KEY_BLOCKED_IDS = "blocked_user_ids";

const [blockedIds, setBlockedIds] = createSignal<Set<number>>(new Set());

export { blockedIds };

/** 从 Capacitor Preferences 加载已屏蔽用户 ID */
export async function loadBlockedIds(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_BLOCKED_IDS });
    if (value) {
      const ids: number[] = JSON.parse(value);
      setBlockedIds(new Set(ids));
    }
  } catch (error) {
    console.warn("[blockStore] Failed to load blocked ids", error);
  }
}

/** 屏蔽用户并持久化。重复屏蔽会被忽略。 */
export async function blockUser(userId: number): Promise<void> {
  if (blockedIds().has(userId)) {
    return;
  }
  const next = new Set(blockedIds());
  next.add(userId);
  setBlockedIds(next);
  try {
    await Preferences.set({ key: PREF_KEY_BLOCKED_IDS, value: JSON.stringify([...next]) });
  } catch (error) {
    console.warn("[blockStore] Failed to persist blocked ids", error);
  }
}

/** 取消屏蔽用户并持久化。 */
export async function unblockUser(userId: number): Promise<void> {
  if (!blockedIds().has(userId)) {
    return;
  }
  const next = new Set(blockedIds());
  next.delete(userId);
  setBlockedIds(next);
  try {
    await Preferences.set({ key: PREF_KEY_BLOCKED_IDS, value: JSON.stringify([...next]) });
  } catch (error) {
    console.warn("[blockStore] Failed to persist blocked ids", error);
  }
}

/** 判断用户是否已被屏蔽 */
export function isBlocked(userId: number): boolean {
  return blockedIds().has(userId);
}

/** 清空本地屏蔽列表（不操作 Preferences，调用方负责清除）。 */
export function resetBlockedIds(): void {
  setBlockedIds(new Set());
}
