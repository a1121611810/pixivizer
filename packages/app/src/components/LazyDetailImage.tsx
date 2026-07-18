import type { Component } from "solid-js";
import PixivImage from "./PixivImage";
import { createViewportLazy } from "../primitives/useViewportLazy";

interface Props {
  /** 用户设定质量的图片 URL（medium / large） */
  src: string;
  pageIndex: number;
  totalPages: number;
  width: number;
  height: number;
  onClick: () => void;
  /** 父组件跟踪的当前可见页码，用于精准控制预加载数量 */
  visiblePage?: number;
}

/**
 * 详情页多图懒加载组件：
 *
 * 加载由 visiblePage 信号驱动：pageIndex <= visiblePage + 1 的图片立即加载，
 * 其余保持在 aspect-ratio 占位状态。无 visiblePage 时退回到 IntersectionObserver 兜底。
 */
const LazyDetailImage: Component<Props> = (props) => {
  const { everVisible, attach } = createViewportLazy({
    rootMargin: "100px",
    initialVisible:
      props.visiblePage !== undefined ? props.pageIndex <= props.visiblePage + 1 : false,
    externalVisible: () => {
      const vp = props.visiblePage;
      if (vp === undefined) {
        return false;
      }
      return props.pageIndex <= vp + 1;
    },
    skipObserver: props.visiblePage !== undefined,
  });

  return (
    <div
      ref={attach}
      class="relative cursor-pointer"
      data-page-index={props.pageIndex}
      onClick={props.onClick}
    >
      {everVisible() ? (
        <div class="relative">
          <PixivImage
            src={props.src}
            alt={`page ${props.pageIndex + 1}`}
            class="w-full object-contain"
          />
          <span
            class="absolute top-2 left-2 px-2 py-0.5 rounded-[var(--borderRadiusSmall)] text-[var(--colorImageBadgeForeground)]"
            style={{ "background-color": "var(--colorImageBadgeBackground)" }}
          >
            <span style={{ "font-size": "var(--fontSizeBase100)" }}>
              {props.pageIndex + 1} / {props.totalPages}
            </span>
          </span>
        </div>
      ) : (
        <div
          style={{
            "aspect-ratio": `${props.width} / ${props.height}`,
            background: "var(--colorNeutralBackground2)",
            "border-radius": "var(--borderRadiusMedium)",
          }}
        />
      )}
    </div>
  );
};

export default LazyDetailImage;
