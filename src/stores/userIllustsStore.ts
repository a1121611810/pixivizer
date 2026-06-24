import { createSignal } from "solid-js";
import { loadUserIllusts, loadNext } from "../api/illust";
import type { PixivIllust, ContentType } from "../api/types";

const [illusts, setIllusts] = createSignal<PixivIllust[]>([]);
const [nextUrl, setNextUrl] = createSignal<string | null>(null);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);
const [contentType, setContentType] = createSignal<ContentType>("illust");

export { illusts, nextUrl, loading, error, contentType };

export async function load(userId: number, type: ContentType = "illust") {
  setLoading(true);
  setError(null);
  setContentType(type);
  try {
    const data = await loadUserIllusts(userId, type);
    setIllusts(data.illusts);
    setNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
  } finally {
    setLoading(false);
  }
}

export async function loadMore() {
  if (!nextUrl() || loading()) return;
  setLoading(true);
  try {
    const data = await loadNext(nextUrl()!);
    setIllusts((prev) => [...prev, ...data.illusts]);
    setNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? "加载失败");
  } finally {
    setLoading(false);
  }
}

export function switchType(type: ContentType) {
  setContentType(type);
}
