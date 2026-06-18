import { createSignal } from 'solid-js';
import {
  loadRecommended,
  loadFollow,
  loadNext,
} from '../api/illust';
import type { PixivIllust, ContentType, RestrictType } from '../api/types';

const [illusts, setIllusts] = createSignal<PixivIllust[]>([]);
const [nextUrl, setNextUrl] = createSignal<string | null>(null);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);

export { illusts, nextUrl, loading, error };

export async function fetchRecommended(contentType: ContentType = 'illust') {
  setLoading(true);
  setError(null);
  try {
    const data = await loadRecommended(contentType);
    setIllusts(data.illusts);
    setNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? '加载失败');
  } finally {
    setLoading(false);
  }
}

export async function fetchFollow(restrict: RestrictType = 'public') {
  setLoading(true);
  setError(null);
  try {
    const data = await loadFollow(restrict);
    setIllusts(data.illusts);
    setNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? '加载失败');
  } finally {
    setLoading(false);
  }
}

export async function fetchMore() {
  if (!nextUrl() || loading()) return;
  setLoading(true);
  try {
    const data = await loadNext(nextUrl()!);
    setIllusts([...illusts(), ...data.illusts]);
    setNextUrl(data.next_url);
  } catch (e) {
    setError((e as { message?: string }).message ?? '加载失败');
  } finally {
    setLoading(false);
  }
}
