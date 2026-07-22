import { type Component } from "solid-js";

interface Props {
  userId: number;
  class?: string;
}

/**
 * Layer 1 (z-index lowest) background for the PersonalCenter page.
 *
 * 3-level fallback strategy:
 *   1. User's representative work image + blur(20px) + scale(1.1)  (future)
 *   2. CSS gradient  (current implementation)
 *   3. Solid fallback color
 *
 * Height is ~55vh to give the profile header a distinct visual section.
 */
const ProfileBackground: Component<Props> = (props) => {
  return (
    <div
      class={`absolute inset-0 w-full h-full ${props.class || ""}`}
      style={{
        background:
          "linear-gradient(135deg, var(--colorBrandBackground) 0%, var(--colorBrandBackground2) 50%, var(--colorNeutralBackground3) 100%)",
        "z-index": 0,
      }}
    />
  );
};

export default ProfileBackground;
