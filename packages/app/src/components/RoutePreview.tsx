import { type Component } from "solid-js";
import SkeletonCard from "./SkeletonCard";

interface RoutePreviewProps {
  path: string;
}

/**
 * 预测返回手势的上一页预览。
 *
 * 为了降低手势期间的布局/绘制开销，这里不渲染真实路由组件，
 * 只渲染与上一页类型匹配的轻量占位，让用户在边缘看到上一页的大致轮廓即可。
 */
const RoutePreview: Component<RoutePreviewProps> = (props) => {
  const path = props.path;
  const isFeed = path === "/recommended" || path === "/following" || path === "/bookmarks";
  const isDetail = /^\/illust\/\d+$/.test(path);
  const isLogin = path === "/login";

  if (isFeed) {
    return (
      <div data-preview="true" class="w-full h-full overflow-hidden">
        {/* App bar placeholder */}
        <div
          class="h-12 flex items-center px-4"
          style={{ "background-color": "var(--colorNeutralBackground1)" }}
        >
          <div
            class="h-4 w-24 rounded"
            style={{ "background-color": "var(--colorNeutralBackground3)" }}
          />
        </div>
        {/* Skeleton cards in a simple vertical stack */}
        <div class="px-3 pt-3 space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isDetail) {
    return (
      <div data-preview="true" class="w-full h-full overflow-hidden">
        <div
          class="h-12 flex items-center px-4 gap-3"
          style={{ "background-color": "var(--colorNeutralBackground1)" }}
        >
          <div
            class="w-8 h-8 rounded"
            style={{ "background-color": "var(--colorNeutralBackground3)" }}
          />
          <div
            class="h-4 w-1/2 rounded"
            style={{ "background-color": "var(--colorNeutralBackground3)" }}
          />
        </div>
        <div
          class="w-full"
          style={{
            "aspect-ratio": "1 / 1",
            "background-color": "var(--colorNeutralBackground2)",
          }}
        />
      </div>
    );
  }

  if (isLogin) {
    return (
      <div
        data-preview="true"
        class="w-full h-full flex flex-col items-center justify-center gap-4"
      >
        <div
          class="w-16 h-16 rounded"
          style={{ "background-color": "var(--colorNeutralBackground3)" }}
        />
        <div
          class="h-4 w-32 rounded"
          style={{ "background-color": "var(--colorNeutralBackground3)" }}
        />
      </div>
    );
  }

  return <div data-preview="true" class="w-full h-full" />;
};

export default RoutePreview;
