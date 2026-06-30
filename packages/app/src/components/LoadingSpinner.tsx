import type { Component } from "solid-js";

interface Props {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeMap = { sm: "tiny", md: "small", lg: "medium" } as const;

const LoadingSpinner: Component<Props> = (props) => (
  <div class="flex flex-col items-center justify-center gap-3 py-8">
    <fluent-spinner size={sizeMap[props.size ?? "md"]} />
    {props.text && (
      <p class="text-[var(--colorNeutralForegroundDisabled)] text-[var(--fontSizeBase200)]">
        {props.text}
      </p>
    )}
  </div>
);

export default LoadingSpinner;
