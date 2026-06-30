import type { Component } from "solid-js";

interface Props {
  /** 图片原始宽度（来自 API 或 URL 解析），用于设置正确的 aspect-ratio */
  width?: number;
  /** 图片原始高度 */
  height?: number;
}

/** Skeleton placeholder matching ImageCard layout.
 *  Uses existing fluent-shimmer animation + Fluent tokens.
 *  如果传入 width/height，使用正确的 aspect-ratio 避免布局回退；
 *  否则回退 1:1（初始加载无数据时）。 */
const SkeletonCard: Component<Props> = (props) => {
  const aspectRatio = props.width && props.height ? `${props.width} / ${props.height}` : "1 / 1";

  return (
    <div class="image-card break-inside-avoid mb-3">
      {/* Thumbnail area — 使用正确比例避免 skeleton→image 切换时 reflow */}
      <div
        class="w-full"
        style={{
          "aspect-ratio": aspectRatio,
          background:
            "linear-gradient(90deg, var(--colorNeutralBackground2) 25%, var(--colorNeutralBackground1) 50%, var(--colorNeutralBackground2) 75%)",
          "background-size": "200% 100%",
          animation: "fluent-shimmer var(--durationSlower) var(--curveEasyEase) infinite",
        }}
      />
      {/* Text lines matching ImageCard p-2.5 */}
      <div class="p-2.5 flex flex-col gap-1.5">
        <div
          class="h-3 rounded w-3/4"
          style={{
            background:
              "linear-gradient(90deg, var(--colorNeutralBackground2) 25%, var(--colorNeutralBackground1) 50%, var(--colorNeutralBackground2) 75%)",
            "background-size": "200% 100%",
            animation: "fluent-shimmer var(--durationSlower) var(--curveEasyEase) infinite",
          }}
        />
        <div
          class="h-10 rounded w-1/2"
          style={{
            background:
              "linear-gradient(90deg, var(--colorNeutralBackground2) 25%, var(--colorNeutralBackground1) 50%, var(--colorNeutralBackground2) 75%)",
            "background-size": "200% 100%",
            animation: "fluent-shimmer var(--durationSlower) var(--curveEasyEase) infinite",
          }}
        />
      </div>
    </div>
  );
};

export default SkeletonCard;
