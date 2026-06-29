import { createSignal, createResource } from "solid-js";
import { loadUserIllusts, loadNext } from "../api/illust";
import type { PixivIllust, ContentType } from "../api/types";
import { filterFeedIllusts } from "../utils/r18Filter";

// ── Content type signal ──
const [contentType, setContentType] = createSignal<ContentType>("illust");

// ── Fetch trigger source ──
// Setting this signal triggers the resource fetcher.
// false means "don't fetch"; an object with userId triggers the fetch.
const [fetchSource, setFetchSource] = createSignal<{ userId: number; type: ContentType } | false>(
  false,
);

// ── Resource: fetch triggered by fetchSource changes ──
const [userIllustsResource, { mutate }] = createResource(
  fetchSource,
  async ({ userId, type }) => {
    const data = await loadUserIllusts(userId, type);
    return { illusts: data.illusts, nextUrl: data.next_url };
  },
  { initialValue: { illusts: [] as PixivIllust[], nextUrl: null as string | null } },
);

// ── Derived exports (backward-compatible API) ──

export const illusts = () => {
  const data = userIllustsResource();
  return data ? filterFeedIllusts(data.illusts) : [];
};

export const nextUrl = () => userIllustsResource()?.nextUrl ?? null;

export const loading = () => userIllustsResource.loading;

export const error = () => {
  const err = userIllustsResource.error;
  if (!err) return null;
  return (err as { message?: string }).message ?? "加载失败";
};

export { contentType };

// ── Actions ──

/**
 * Load user illusts for a given userId.
 * Updates fetchSource to trigger createResource fetch pipeline.
 */
export function load(userId: number, type: ContentType = "illust") {
  setContentType(type);
  setFetchSource({ userId, type });
}

/**
 * Load next page of user illusts.
 * Uses mutate to append data without re-fetching the first page.
 */
export async function loadMore() {
  const current = userIllustsResource();
  if (!current?.nextUrl || userIllustsResource.loading) return;
  const data = await loadNext(current.nextUrl);
  mutate((prev) =>
    prev
      ? {
          illusts: [...prev.illusts, ...data.illusts],
          nextUrl: data.next_url,
        }
      : prev,
  );
}

/** Switch content type (illust/manga). Does not trigger load by itself. */
export function switchType(type: ContentType) {
  setContentType(type);
}
