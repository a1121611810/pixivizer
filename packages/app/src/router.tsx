import { lazy, type Component } from "solid-js";
import {
  createRootRoute,
  createRoute,
  createRouter,
  type RouteComponent,
} from "@tanstack/solid-router";
import RootLayout from "@/routes/__root";
import { loadDetail } from "@/api/illust";
import { loadDetail as loadNovelDetail, fetchNovelData } from "@/api/novel";
import type { PixivIllust, PixivNovel, SeriesNavigation } from "@/api/types";
import type { NovelImagesMap } from "@/api/novel";
import { user } from "@/stores/authStore";
import { ensureLoaded } from "@/stores/feedStore";
import { loadList as loadFollowList, reset as resetFollowList } from "@/stores/followListStore";
import { setEntry } from "@/stores/novelCache";
import { setCurrentTab } from "@/stores/uiStore";
import { load as loadUserIllusts, contentType } from "@/stores/userIllustsStore";
import { loadProfile, loadFollowing } from "@/stores/userStore";

/** 将普通 Solid 组件/懒加载组件断言为 TanStack RouteComponent，避免每处重复转换。 */
function asRoute(component: Component): RouteComponent {
  return component as unknown as RouteComponent;
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

const rootRoute = createRootRoute({ component: RootLayout });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "login",
  component: asRoute(Login),
});

const recommendedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "recommended",
  loader: async ({ abortController }) => {
    setCurrentTab("recommended");
    await ensureLoaded(abortController.signal);
    return {};
  },
  component: () => <TabFeedPage tab="recommended" />,
});

const followingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "following",
  loader: async ({ abortController }) => {
    setCurrentTab("follow");
    await ensureLoaded(abortController.signal);
    return {};
  },
  component: () => <TabFeedPage tab="follow" />,
});

const illustRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "illust/$id",
  loader: async ({ params }) => {
    try {
      const data = await loadDetail(Number(params.id));
      return { illust: data.illust, error: null as string | null };
    } catch (e) {
      return {
        illust: null as PixivIllust | null,
        error: (e as { message?: string }).message ?? "加载失败",
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
      const [{ novel }, novelData] = await Promise.all([
        loadNovelDetail(id),
        fetchNovelData(id).catch(() => ({ text: "", navigation: {}, images: {} })),
      ]);
      await setEntry(id, {
        detail: novel,
        text: novelData.text,
        nav: novelData.navigation,
        images: novelData.images ?? {},
      });
      await loadProfile(novel.user.id);
      return {
        novel,
        text: novelData.text,
        nav: novelData.navigation,
        images: novelData.images ?? {},
        error: null as string | null,
      };
    } catch (e) {
      return {
        novel: null as PixivNovel | null,
        text: "",
        nav: {} as SeriesNavigation,
        images: {} as NovelImagesMap,
        error: (e as { message?: string }).message ?? "加载失败",
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
  loader: async ({ params }) => {
    resetFollowList();
    await loadFollowList("following", Number(params.id));
    return {};
  },
  component: () => <FollowListPage mode="following" />,
});

const userFollowersRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "followers",
  loader: async ({ params }) => {
    resetFollowList();
    await loadFollowList("followers", Number(params.id));
    return {};
  },
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
});

// 声明路由类型，供 TanStack 的 type-safe 钩子使用
declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}
