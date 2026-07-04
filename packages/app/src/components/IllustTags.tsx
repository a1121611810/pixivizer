import { type Component, For } from "solid-js";
import type { PixivIllustTag } from "../api/types";

interface IllustTagsProps {
  tags: PixivIllustTag[];
  size?: "small" | "medium";
  class?: string;
}

const sizeClasses: Record<NonNullable<IllustTagsProps["size"]>, string> = {
  small:
    "[font-size:var(--fontSizeBase100)] [line-height:var(--lineHeightBase100)] px-[var(--spacingHorizontalXS)] py-[var(--spacingVerticalXXS)]",
  medium:
    "[font-size:var(--fontSizeBase200)] [line-height:var(--lineHeightBase200)] px-[var(--spacingHorizontalS)] py-[var(--spacingVerticalXS)]",
};

const IllustTags: Component<IllustTagsProps> = (props) => {
  const size = () => props.size ?? "small";
  return (
    <div
      class={`flex flex-wrap gap-[var(--spacingHorizontalXXS)] ${props.class ?? ""}`}
      role="list"
      aria-label="作品标签"
    >
      <For each={props.tags}>
        {(tag) => (
          <span
            class={`inline-flex items-center rounded-[var(--borderRadiusMedium)] bg-[var(--colorNeutralBackground3)] text-[var(--colorNeutralForeground2)] ${sizeClasses[size()]}`}
            role="listitem"
          >
            {tag.translated_name ?? tag.name}
          </span>
        )}
      </For>
    </div>
  );
};

export default IllustTags;
