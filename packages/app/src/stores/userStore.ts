import { createSignal } from "solid-js";
import { getUserDetail, getUserFollowing, getUserFollowers } from "../api/user";
import { followUser, unfollowUser } from "../api/illust";
import {
  type ApiError,
  type PixivProfile,
  type PixivUserPreview,
  type PixivUser,
} from "../api/types";
import { user } from "./authStore";
import { filterUserPreviews } from "../utils/r18Filter";
import { toApiError } from "../api/client";

const [profile, setProfile] = createSignal<PixivProfile | null>(null);
const [viewedUser, setViewedUser] = createSignal<PixivUser | null>(null);
const [followingList, setFollowingList] = createSignal<PixivUserPreview[]>([]);
const [followersList, setFollowersList] = createSignal<PixivUserPreview[]>([]);
const [followingNextUrl, setFollowingNextUrl] = createSignal<string | null>(null);
const [followersNextUrl, setFollowersNextUrl] = createSignal<string | null>(null);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<ApiError | null>(null);
const [activeTab, setActiveTab] = createSignal<"following" | "followers">("following");

// 缓存已加载的用户数据，避免返回时重复请求
const profileCache = new Map<number, { profile: PixivProfile; user: PixivUser }>();
const followingCache = new Map<number, { list: PixivUserPreview[]; nextUrl: string | null }>();

export {
  profile,
  viewedUser,
  followingList,
  followersList,
  followingNextUrl,
  followersNextUrl,
  loading,
  error,
  activeTab,
};

export async function loadProfile(userId?: number) {
  const id = userId ?? user()?.id;
  if (!id) {
    return;
  }
  // 命中缓存则直接恢复
  const cached = profileCache.get(Number(id));
  if (cached) {
    setProfile(cached.profile);
    setViewedUser(cached.user);
    return;
  }
  try {
    const data = await getUserDetail(id);
    setProfile(data.profile);
    setViewedUser(data.user);
    profileCache.set(Number(id), { profile: data.profile, user: data.user });
  } catch (error) {
    console.warn("[userStore] Failed to load profile", error);
  }
}

export async function loadFollowing(userId?: number) {
  const id = userId ?? user()?.id;
  if (!id) {
    return;
  }
  // 命中缓存则直接恢复
  const cached = followingCache.get(Number(id));
  if (cached) {
    setFollowingList(cached.list);
    setFollowingNextUrl(cached.nextUrl);
    setLoading(false);
    return;
  }
  setLoading(true);
  setError(null);
  try {
    const data = await getUserFollowing(id);
    setFollowingList(filterUserPreviews(data.user_previews));
    setFollowingNextUrl(data.next_url);
    followingCache.set(Number(id), {
      list: filterUserPreviews(data.user_previews),
      nextUrl: data.next_url,
    });
  } catch (error) {
    setError(toApiError(error));
  } finally {
    setLoading(false);
  }
}

export async function loadFollowers() {
  const u = user();
  if (!u) {
    return;
  }
  setLoading(true);
  setError(null);
  try {
    const data = await getUserFollowers(u.id);
    setFollowersList(data.user_previews);
    setFollowersNextUrl(data.next_url);
  } catch (error) {
    setError(toApiError(error));
  } finally {
    setLoading(false);
  }
}

export async function loadMoreFollowing() {
  const url = followingNextUrl();
  if (!url || loading()) {
    return;
  }
  setLoading(true);
  try {
    const data = await getUserFollowing(user()!.id, "public", followingList().length);
    setFollowingList((prev) => [...prev, ...data.user_previews]);
    setFollowingNextUrl(data.next_url);
  } catch (error) {
    setError(toApiError(error));
  } finally {
    setLoading(false);
  }
}

export async function loadMoreFollowers() {
  const url = followersNextUrl();
  if (!url || loading()) {
    return;
  }
  setLoading(true);
  try {
    const data = await getUserFollowers(user()!.id, followersList().length);
    setFollowersList((prev) => [...prev, ...data.user_previews]);
    setFollowersNextUrl(data.next_url);
  } catch (error) {
    setError(toApiError(error));
  } finally {
    setLoading(false);
  }
}

export async function toggleUserFollow(
  preview: PixivUserPreview,
  listType: "following" | "followers",
) {
  const targetUser = preview.user;
  const prev = targetUser.is_followed ?? false;
  targetUser.is_followed = !prev;
  // Trigger reactivity by reassigning the list
  if (listType === "following") {
    setFollowingList((list) => [...list]);
  } else {
    setFollowersList((list) => [...list]);
  }
  try {
    if (prev) {
      await unfollowUser(targetUser.id);
    } else {
      await followUser(targetUser.id);
    }
  } catch {
    targetUser.is_followed = prev;
    if (listType === "following") {
      setFollowingList((list) => [...list]);
    } else {
      setFollowersList((list) => [...list]);
    }
  }
}

export function switchTab(tab: "following" | "followers") {
  setActiveTab(tab);
  if (tab === "following" && followingList().length === 0) {
    loadFollowing();
  } else if (tab === "followers" && followersList().length === 0) {
    loadFollowers();
  }
}

export function resetData() {
  setProfile(null);
  setViewedUser(null);
  setFollowingList([]);
  setFollowersList([]);
  setFollowingNextUrl(null);
  setFollowersNextUrl(null);
  setError(null);
  setLoading(false);
}
