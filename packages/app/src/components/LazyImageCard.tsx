import type { Component } from "solid-js";
import ImageCard from "./ImageCard";
import SkeletonCard from "./SkeletonCard";
import type { PixivIllust } from "../api/types";
import { createViewportLazy } from "../primitives/useViewportLazy";

interface Props {
  illust: PixivIllust;
  onClick: (id: number) => void;
}

/**
 * 轻量虚拟化卡片：首次进入视口才渲染 ImageCard，之前用 SkeletonCard 占位。
 * 一旦变为可见则永久渲染（不回溯销毁），避免滚动抖动。
 */
const LazyImageCard: Component<Props> = (props) => {
  const { everVisible, attach } = createViewportLazy({ rootMargin: "100px" });

  return (
    <div ref={attach}>
      {everVisible() ? (
        <ImageCard illust={props.illust} onClick={props.onClick} />
      ) : (
        <SkeletonCard />
      )}
    </div>
  );
};

export default LazyImageCard;
