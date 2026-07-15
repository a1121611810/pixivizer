import { createSignal } from "solid-js";
import { getUserFollowing, getUserFollowers } from "../api/user";
import { followUser, unfollowUser } from "../api/illust";
import { filterUserPreviews } from "../utils/r18Filter";
import type { PixivUserPreview } from "../api/types";
import { type ApiError } from "../api/types";
import { toApiError } from "../api/client";

export type FollowMode = "following" | "followers";

const [users, setUsers] = createSignal<PixivUserPreview[]>([]);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<ApiError | null>(null);
const [nextUrl, setNextUrl] = createSignal<string | null>(null);

export { users, loading, error, nextUrl };

export async function loadList(mode: FollowMode, userId: number): Promise<void> {
  setLoading(true);
  setError(null);
  try {
    let data: { user_previews: PixivUserPreview[]; next_url: string | null };
    if (mode === "following") {
      data = await getUserFollowing(userId);
      data.user_previews = filterUserPreviews(data.user_previews);
    } else {
      data = await getUserFollowers(userId);
    }
    setUsers(data.user_previews);
    setNextUrl(data.next_url);
  } catch (e) {
    setError(toApiError(e));
  } finally {
    setLoading(false);
  }
}

export async function loadMore(mode: FollowMode, userId: number): Promise<void> {
  if (loading() || !nextUrl()) return;
  setLoading(true);
  try {
    let data: { user_previews: PixivUserPreview[]; next_url: string | null };
    if (mode === "following") {
      data = await getUserFollowing(userId, "public", users().length);
      data.user_previews = filterUserPreviews(data.user_previews);
    } else {
      data = await getUserFollowers(userId, users().length);
    }
    setUsers((prev) => [...prev, ...data.user_previews]);
    setNextUrl(data.next_url);
  } catch (e) {
    setError(toApiError(e, "加载更多失败"));
  } finally {
    setLoading(false);
  }
}

export async function toggleFollow(index: number): Promise<void> {
  const current = users();
  const preview = current[index];
  if (!preview) return;
  const prev = preview.user.is_followed ?? false;
  preview.user.is_followed = !prev;
  setUsers([...current]); // trigger reactivity
  try {
    if (prev) {
      await unfollowUser(preview.user.id);
    } else {
      await followUser(preview.user.id);
    }
  } catch {
    preview.user.is_followed = prev; // rollback
    setUsers([...current]);
  }
}

export function reset(): void {
  setUsers([]);
  setLoading(false);
  setError(null);
  setNextUrl(null);
}
