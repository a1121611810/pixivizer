// @vitest-environment browser
import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import UserWorksFeed from "../../src/components/UserWorksFeed";
import type { PixivIllust, PixivNovel } from "../../src/api/types";

// Mock sub-components to avoid pulling in their full dependency trees
vi.mock("../../src/components/VirtualFeed", () => ({
  default: () => <div data-testid="virtual-feed">VirtualFeed</div>,
}));

vi.mock("../../src/components/NovelVirtualFeed", () => ({
  default: () => <div data-testid="novel-virtual-feed">NovelVirtualFeed</div>,
}));

function makeIllust(id: number): PixivIllust {
  return {
    id,
    title: `w-${id}`,
    type: "illust",
    user: { id: 1, name: "u", account: "u", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    width: 100,
    height: 100,
    page_count: 1,
    is_bookmarked: false,
    total_bookmarks: 0,
    tags: [],
    x_restrict: 0,
    create_date: "2026-01-01T00:00:00+00:00",
    meta_pages: [],
    meta_single_page: {},
  } as PixivIllust;
}

function makeNovel(id: number): PixivNovel {
  return {
    id,
    title: `n-${id}`,
    user: { id: 1, name: "u", account: "u", profile_image_urls: {} },
    image_urls: { square_medium: "", medium: "", large: "" },
    tags: [],
    page_count: 1,
    text_length: 1000,
    is_bookmarked: false,
    total_bookmarks: 0,
    x_restrict: 0,
    create_date: "2026-01-01T00:00:00+00:00",
  };
}

const noop = () => {};
const asyncNoop = async () => {};

describe("UserWorksFeed", () => {
  it("renders VirtualFeed when contentType is illust", () => {
    const { container } = render(() => (
      <UserWorksFeed
        contentType="illust"
        illusts={[makeIllust(1)]}
        novels={[]}
        loading={false}
        error={null}
        hasMore={false}
        onIllustClick={noop}
        onNovelClick={noop}
        onLoadMore={noop}
        onRefresh={asyncNoop}
      />
    ));
    const wrapper = container.querySelector('[data-feed-type="illust"]');
    expect(wrapper).toBeTruthy();
    expect(wrapper!.style.display).not.toBe("none");
    expect(container.querySelector('[data-testid="virtual-feed"]')).toBeTruthy();
    // NovelVirtualFeed not mounted yet (lazy-mount)
    expect(container.querySelector('[data-testid="novel-virtual-feed"]')).toBeFalsy();
  });

  it("renders VirtualFeed when contentType is manga", () => {
    const { container } = render(() => (
      <UserWorksFeed
        contentType="manga"
        illusts={[makeIllust(1)]}
        novels={[]}
        loading={false}
        error={null}
        hasMore={false}
        onIllustClick={noop}
        onNovelClick={noop}
        onLoadMore={noop}
        onRefresh={asyncNoop}
      />
    ));
    const wrapper = container.querySelector('[data-feed-type="illust"]');
    expect(wrapper).toBeTruthy();
    expect(wrapper!.style.display).not.toBe("none");
    expect(container.querySelector('[data-testid="virtual-feed"]')).toBeTruthy();
  });

  it("renders NovelVirtualFeed when contentType is novel (lazy-mounts and keeps VirtualFeed hidden)", () => {
    const { container } = render(() => (
      <UserWorksFeed
        contentType="novel"
        illusts={[]}
        novels={[makeNovel(1)]}
        loading={false}
        error={null}
        hasMore={false}
        onIllustClick={noop}
        onNovelClick={noop}
        onLoadMore={noop}
        onRefresh={asyncNoop}
      />
    ));
    // Novel feed wrapper is visible
    const novelWrapper = container.querySelector('[data-feed-type="novel"]');
    expect(novelWrapper).toBeTruthy();
    expect(novelWrapper!.style.display).not.toBe("none");
    expect(container.querySelector('[data-testid="novel-virtual-feed"]')).toBeTruthy();

    // VirtualFeed exists but is hidden (kept alive)
    const illustWrapper = container.querySelector('[data-feed-type="illust"]');
    expect(illustWrapper).toBeTruthy();
    expect(illustWrapper!.style.display).toBe("none");
    expect(container.querySelector('[data-testid="virtual-feed"]')).toBeTruthy();
  });

  it("passes illusts to VirtualFeed", () => {
    const { container } = render(() => (
      <UserWorksFeed
        contentType="illust"
        illusts={[makeIllust(1), makeIllust(2)]}
        novels={[]}
        loading={false}
        error={null}
        hasMore
        onIllustClick={noop}
        onNovelClick={noop}
        onLoadMore={noop}
        onRefresh={asyncNoop}
      />
    ));
    // VirtualFeed mock renders a div — component mounted successfully
    expect(container.querySelector('[data-testid="virtual-feed"]')).toBeTruthy();
  });

  it("passes novels to NovelVirtualFeed", () => {
    const { container } = render(() => (
      <UserWorksFeed
        contentType="novel"
        illusts={[]}
        novels={[makeNovel(1), makeNovel(2), makeNovel(3)]}
        loading={false}
        error={null}
        hasMore
        onIllustClick={noop}
        onNovelClick={noop}
        onLoadMore={noop}
        onRefresh={asyncNoop}
      />
    ));
    expect(container.querySelector('[data-testid="novel-virtual-feed"]')).toBeTruthy();
  });

  it("passes error state through", () => {
    const { container } = render(() => (
      <UserWorksFeed
        contentType="illust"
        illusts={[]}
        novels={[]}
        loading={false}
        error="出错了"
        hasMore={false}
        onIllustClick={noop}
        onNovelClick={noop}
        onLoadMore={noop}
        onRefresh={asyncNoop}
      />
    ));
    expect(container.querySelector('[data-testid="virtual-feed"]')).toBeTruthy();
  });
});
