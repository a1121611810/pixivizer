import { createSignal } from "solid-js";
import { getUserDetail, getUserFollowing, getUserFollowers } from "../api/user";
import { followUser, unfollowUser } from "../api/illust";
import type { PixivProfile, PixivUserPreview } from "../api/types";
import { user } from "./authStore";

const [profile, setProfile] = createSignal<PixivProfile | null>(null);
const [followingList, setFollowingList] = createSignal<PixivUserPreview[]>([]);
const [followersList, setFollowersList] = createSignal<PixivUserPreview[]>([]);
const [followingNextUrl, setFollowingNextUrl] = createSignal<string | null>(null);
const [followersNextUrl, setFollowersNextUrl] = createSignal<string | null>(null);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);
const [activeTab, setActiveTab] = createSignal<"following" | "followers">("following");

export {
  profile,
  followingList,
  followersList,
  followingNextUrl,
  followersNextUrl,
  loading,
  error,
  activeTab,
};

export async function loadProfile() {
  const u = user();
  if (!u) return;
  try {
    const data = await getUserDetail(u.id);
    setProfile(data.profile);
  } catch (e) {
    console.warn("[userStore] Failed to load profile", e);
  }
}

export async function loadFollowing() {
  const u = user();
  if (!u) return;
  setLoading(true);
  setError(null);
  try {
    const data = await getUserFollowing(u.id);
    setFollowingList(data.user_previews);
    setFollowingNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
  } finally {
    setLoading(false);
  }
}

export async function loadFollowers() {
  const u = user();
  if (!u) return;
  setLoading(true);
  setError(null);
  try {
    const data = await getUserFollowers(u.id);
    setFollowersList(data.user_previews);
    setFollowersNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
  } finally {
    setLoading(false);
  }
}

export async function loadMoreFollowing() {
  const url = followingNextUrl();
  if (!url || loading()) return;
  setLoading(true);
  try {
    const data = await getUserFollowing(user()!.id, "public", followingList().length);
    setFollowingList((prev) => [...prev, ...data.user_previews]);
    setFollowingNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
  } finally {
    setLoading(false);
  }
}

export async function loadMoreFollowers() {
  const url = followersNextUrl();
  if (!url || loading()) return;
  setLoading(true);
  try {
    const data = await getUserFollowers(user()!.id, followersList().length);
    setFollowersList((prev) => [...prev, ...data.user_previews]);
    setFollowersNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
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
