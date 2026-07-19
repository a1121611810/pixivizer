import { lazy, type Component } from "solid-js";
import {
  createRootRoute,
  createRoute,
  createRouter,
  type RouteComponent,
} from "@tanstack/solid-router";
import RootLayout from "@/routes/__root";
import { loadDetail } from "@/api/illust";
import { user } from "@/stores/authStore";
import { ensureLoaded } from "@/stores/feedStore";
import {
  loadList as loadFollowList,
  reset as resetFollowList,
  type FollowMode,
} from "@/stores/followListStore";
import { loadNovelEntry, peekEntry, getEntry } from "@/stores/novelCache";
import { setCurrentTab } from "@/stores/uiStore";
import { load as loadUserIllusts, contentType } from "@/stores/userIllustsStore";
import { loadProfile, loadFollowing } from "@/stores/userStore";
import { toApiError } from "./api/client";
import LoadingSpinner from "@/components/LoadingSpinner";

/** 将普通 Solid 组件/懒加载组件断言为 TanStack RouteComponent，避免每处重复转换。 */
function asRoute(component: Component): RouteComponent {
  return component as unknown as RouteComponent;
}

/** Feed 页签类型。 */
type FeedTab = "recommended" | "follow";

/** 构造 Feed 路由的 loader，仅 tab 不同。 */
function makeFeedLoader(tab: FeedTab) {
  return async ({ abortController }: { abortController: AbortController }) => {
    setCurrentTab(tab);
    await ensureLoaded(abortController.signal);
    return {};
  };
}

/** 构造用户关注/粉丝列表路由的 loader，仅 mode 不同。 */
function makeFollowLoader(mode: FollowMode) {
  return async ({ params }: { params: { id: string } }) => {
    resetFollowList();
    await loadFollowList(mode, Number(params.id));
    return {};
  };
}

const Login = lazy(() => import("@/routes/Login"));
const AgeConfirmation = lazy(() => import("@/routes/AgeConfirmation"));
const IllustDetail = lazy(() => import("@/routes/IllustDetail"));
const DebugImage = lazy(() => import("@/routes/DebugImage"));
const Bookmarks = lazy(() => import("@/routes/Bookmarks"));
const TabFeedPage = lazy(() => import("@/routes/TabFeedPage"));
const PersonalCenter = lazy(() => import("@/routes/PersonalCenter"));
const UserIllusts = lazy(() => import("@/routes/UserIllusts"));
const About = lazy(() => import("@/routes/About"));
const ImageHostSettings = lazy(() => import("@/routes/ImageHostSettings"));
const ImageCacheSettings = lazy(() => import("@/routes/ImageCacheSettings"));
const FollowListPage = lazy(() => import("@/routes/FollowListPage"));
const NovelDetail = lazy(() => import("@/routes/NovelDetail"));
const HistoryPage = lazy(() => import("@/routes/HistoryPage"));
const Search = lazy(() => import("@/routes/Search"));

const rootRoute = createRootRoute({ component: RootLayout });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "login",
  component: asRoute(Login),
});

const recommendedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "recommended",
  loader: makeFeedLoader("recommended"),
  component: () => <TabFeedPage tab="recommended" />,
});

const followingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "following",
  loader: makeFeedLoader("follow"),
  component: () => <TabFeedPage tab="follow" />,
});

const illustRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "illust/$id",
  loader: async ({ params }) => {
    try {
      const data = await loadDetail(Number(params.id));
      return { illust: data.illust, error: null };
    } catch (error) {
      return {
        illust: null,
        error: toApiError(error),
      };
    }
  },
  component: asRoute(IllustDetail),
});

const debugRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "debug",
  component: asRoute(DebugImage),
});

const novelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "novel/$id",
  loader: async ({ params }) => {
    try {
      const id = Number(params.id);

      // 辅助函数：从缓存条目加载 profile 并返回 route data
      async function fromEntry(e: import("@/stores/novelCache").CacheEntry) {
        await loadProfile(e.detail.user.id);
        return { novel: e.detail, text: e.text, nav: e.nav, images: e.images, error: null };
      }

      // 优先从缓存读取，零网络请求
      const cached = peekEntry(id);
      if (cached) return fromEntry(cached);
      const dbEntry = await getEntry(id);
      if (dbEntry) return fromEntry(dbEntry);

      const entry = await loadNovelEntry(id);
      return fromEntry(entry);
    } catch (error) {
      return {
        novel: null,
        text: "",
        nav: {},
        images: {},
        error: toApiError(error),
      };
    }
  },
  component: asRoute(NovelDetail),
});

const bookmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "bookmarks",
  component: asRoute(Bookmarks),
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "history",
  component: asRoute(HistoryPage),
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "search",
  component: asRoute(Search),
});

const meRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "me",
  loader: async () => {
    setCurrentTab("me");
    const uid = user()?.id;
    if (uid) {
      await loadProfile(uid);
      await loadFollowing(uid);
    }
    return {};
  },
  component: asRoute(PersonalCenter),
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "about",
  component: asRoute(About),
});

const imageHostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "image-host",
  component: asRoute(ImageHostSettings),
});

const imageCacheRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "image-cache",
  component: asRoute(ImageCacheSettings),
});

const ageConfirmationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "age-confirmation",
  component: asRoute(AgeConfirmation),
});

const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "user/$id",
  loader: async ({ params }) => {
    setCurrentTab("me");
    const uid = Number(params.id);
    await loadProfile(uid);
    await loadFollowing(uid);
    return { userId: uid };
  },
  component: asRoute(PersonalCenter),
});

const userIllustsRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "illusts",
  loader: async ({ params }) => {
    const uid = Number(params.id);
    loadUserIllusts(uid, contentType());
    await loadProfile(uid);
    return { userId: uid };
  },
  component: asRoute(UserIllusts),
});

const userFollowingRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "following",
  loader: makeFollowLoader("following"),
  component: () => <FollowListPage mode="following" />,
});

const userFollowersRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "followers",
  loader: makeFollowLoader("followers"),
  component: () => <FollowListPage mode="followers" />,
});

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  component: asRoute(Login),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  recommendedRoute,
  followingRoute,
  illustRoute,
  debugRoute,
  novelRoute,
  bookmarksRoute,
  historyRoute,
  searchRoute,
  meRoute,
  aboutRoute,
  imageHostRoute,
  imageCacheRoute,
  ageConfirmationRoute,
  userRoute.addChildren([userIllustsRoute, userFollowingRoute, userFollowersRoute]),
  catchAllRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultStaleTime: 0,
  defaultPendingMs: 0,
  defaultPendingMinMs: 0,
  defaultPendingComponent: asRoute(() => <LoadingSpinner text="加载中..." />),
});

// 声明路由类型，供 TanStack 的 type-safe 钩子使用
declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}
