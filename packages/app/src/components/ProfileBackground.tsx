import { type Component } from "solid-js";

interface Props {
  class?: string;
}

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
