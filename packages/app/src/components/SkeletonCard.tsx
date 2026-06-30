import type { Component } from "solid-js";

/** Skeleton placeholder matching ImageCard layout.
 *  Uses existing fluent-shimmer animation + Fluent tokens. */
const SkeletonCard: Component = () => (
  <div class="image-card break-inside-avoid mb-3">
    {/* Thumbnail area — 1:1 aspect ratio shimmer */}
    <div
      class="w-full"
      style={{
        "aspect-ratio": "1 / 1",
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
        class="h-3 rounded w-1/2"
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

export default SkeletonCard;
