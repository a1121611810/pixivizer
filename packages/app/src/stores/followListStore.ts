import { createRoot, createSignal } from "solid-js";
import { createInfiniteQuery } from "@tanstack/solid-query";
import { getUserFollowing, getUserFollowers } from "../api/user";
import { followUser, unfollowUser } from "../api/illust";
import { filterUserPreviews } from "../utils/r18Filter";
import type { PixivUserPreview, ApiError } from "../api/types";
import { queryKeys } from "../api/queryKeys";
import { normalizeQueryError } from "../api/normalizeQueryError";
import { queryClient } from "../api/queryClient";
import { apiClient } from "../api/client";

export type FollowMode = "following" | "followers";

// ── Reactive source signals ──
const [mode, setMode] = createSignal<FollowMode>("following");
const [userId, setUserId] = createSignal<number>(0);

// ── TQ Infinite Query ──
const query = createRoot(() =>
  createInfiniteQuery(
    () => ({
      queryKey: queryKeys.followList(mode(), userId()),
      queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
        if (pageParam) {
          return apiClient.get<{ user_previews: PixivUserPreview[]; next_url: string | null }>(
            pageParam,
          );
        }
        if (mode() === "following") {
          return getUserFollowing(userId());
        }
        return getUserFollowers(userId());
      },
      getNextPageParam: (lastPage) => lastPage.next_url ?? undefined,
      initialPageParam: undefined as string | undefined,
      enabled: userId() > 0,
    }),
    () => queryClient,
  ),
);

// ── Derived exports ──
export const users = (): PixivUserPreview[] => {
  const data = query.data;
  if (!data) {
    return [];
  }
  return filterUserPreviews(data.pages.flatMap((p) => p.user_previews));
};

export const loading = () => query.isFetching;
export const error = (): ApiError | null => normalizeQueryError(query.error);
export const nextUrl = (): string | null => {
  const data = query.data;
  if (!data) {
    return null;
  }
  return data.pages[data.pages.length - 1]?.next_url ?? null;
};

// ── Actions ──

export function loadList(m: FollowMode, uid: number): Promise<void> {
  setMode(m);
  setUserId(uid);
  // TQ auto-fetches via queryKey reactivity
}

export async function loadMore(): Promise<void> {
  if (!query.hasNextPage || query.isFetchingNextPage) {
    return;
  }
  await query.fetchNextPage();
}

/**
 * Optimistic toggle: mutate data in-place, then revert on API failure.
 * Uses setQueryData to re-trigger the derived users() signal to re-evaluate.
 */
export async function toggleFollow(index: number): Promise<void> {
  const current = users();
  const preview = current[index];
  if (!preview) {
    return;
  }

  const prev = preview.user.is_followed ?? false;
  preview.user.is_followed = !prev;

  // Re-trigger reactivity: must pass a new reference so TQ notifies observers
  queryClient.setQueryData(queryKeys.followList(mode(), userId()), (old) => {
    if (!old) {
      return old;
    }
    return { ...old, pages: [...old.pages] };
  });

  try {
    if (prev) {
      await unfollowUser(preview.user.id);
    } else {
      await followUser(preview.user.id);
    }
  } catch {
    // Rollback
    preview.user.is_followed = prev;
    queryClient.setQueryData(queryKeys.followList(mode(), userId()), (old) => {
      if (!old) {
        return old;
      }
      return { ...old, pages: [...old.pages] };
    });
  }
}

export function reset(): void {
  setMode("following");
  setUserId(0);
  // TQ 缓存不会因 query disabled 自动清除
  queryClient.removeQueries({ queryKey: ["user", "followList"] });
}
