import { lazy, type Component } from "solid-js";
import {
  createRootRoute,
  createRoute,
  createRouter,
  type RouteComponent,
} from "@tanstack/solid-router";
import RootLayout from "@/routes/__root";

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
  component: () => <TabFeedPage tab="recommended" />,
});

const followingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "following",
  component: () => <TabFeedPage tab="follow" />,
});

const illustRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "illust/$id",
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
  component: asRoute(PersonalCenter),
});

const userIllustsRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "illusts",
  component: asRoute(UserIllusts),
});

const userFollowingRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "following",
  component: () => <FollowListPage mode="following" />,
});

const userFollowersRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "followers",
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
