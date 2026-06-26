import { type Component, createSignal, onMount, onCleanup } from "solid-js";
import ImageCard from "./ImageCard";
import SkeletonCard from "./SkeletonCard";
import type { PixivIllust } from "../api/types";

interface Props {
  illust: PixivIllust;
  onClick: (id: number) => void;
  /** 首次渲染时是否跳过入场动画（缓存恢复场景） */
  skipAnimation?: boolean;
  rowIndex?: number;
}

/**
 * 轻量虚拟化卡片：首次进入视口才渲染 ImageCard，之前用占位 div。
 * 一旦变为可见则永久渲染（不回溯销毁），避免滚动抖动。
 */
const LazyImageCard: Component<Props> = (props) => {
  const [everVisible, setEverVisible] = createSignal(false);
  let el: HTMLDivElement | undefined;

  onMount(() => {
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setEverVisible(true);
          observer.disconnect();
        }
      },
      {
        // 提前 300px 开始加载，让图片在滚入前就位
        rootMargin: "300px",
      },
    );
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div ref={el}>
      {everVisible() ? (
        <ImageCard illust={props.illust} onClick={props.onClick} />
      ) : (
        <SkeletonCard />
      )}
    </div>
  );
};

export default LazyImageCard;
