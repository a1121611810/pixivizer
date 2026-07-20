import { type Component } from "solid-js";

interface Props {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeMap = { sm: 64, md: 80, lg: 96 } as const;
const CHAR_POP_DURATION = 0.3; // 每个字蹦出动画时长 (300ms = Fluent gentle)
const CHAR_STAGGER = 0.1; // 字间交错延迟 (s)

/**
 * Pictelio 品牌 loading — Fluent Design 2 风格
 *
 * 布局：Pictelio logo + 白底品牌色扫光 + 可选文字（逐个蹦出循环）
 * 无独立 spinner，loading 状态通过 logo 表面的光泽扫光表达
 */
const LoadingSpinner: Component<Props> = (props) => {
  const size = () => props.size ?? "md";

  return (
    <div
      class="flex flex-col items-center justify-center py-12 gap-3"
      style={{
        animation: "fluent-scale-enter var(--durationNormal) var(--curveDecelerateMid) both",
      }}
    >
      {/* ── Logo + Shimmer 扫光 ── */}
      <div
        class="relative"
        style={{
          width: `${sizeMap[size()]}px`,
          height: `${sizeMap[size()]}px`,
        }}
      >
        {/* Pictelio logo SVG */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 192 192"
          fill="none"
          aria-hidden="true"
          class="absolute inset-0"
        >
          <defs>
            <filter id="loadingLogoShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="6"
                flood-color="#000000"
                flood-opacity="0.08"
              />
            </filter>
          </defs>
          <rect
            x="12"
            y="12"
            width="168"
            height="168"
            rx="44"
            fill="#ffffff"
            filter="url(#loadingLogoShadow)"
          />
          <svg x="36" y="36" width="120" height="120" viewBox="0 0 64 64">
            <path
              d="M18 12 C18 12 16 28 19 52 C19 52 22 54 24 50 C26 47 24 39 26 33 C26 33 37 35 45 27 C51 21 47 13 38 11 C31 9 24 12 18 12 Z"
              fill="#2b579a"
            />
            <path
              d="M22 16 C22 16 21 28 23 46"
              fill="none"
              stroke="#5a9fd4"
              stroke-width="3"
              stroke-linecap="round"
            />
            <circle cx="42" cy="19" r="2" fill="#7ab8e8" />
            <circle cx="46" cy="25" r="1.5" fill="#7ab8e8" />
          </svg>
        </svg>

        {/* Shimmer 扫光层 — 覆盖白色徽章区域 */}
        <div
          class="absolute overflow-hidden pointer-events-none"
          style={{
            left: "calc(12 / 192 * 100%)",
            top: "calc(12 / 192 * 100%)",
            width: "calc(168 / 192 * 100%)",
            height: "calc(168 / 192 * 100%)",
            "border-radius": "calc(44 / 168 * 100%)",
          }}
        >
          {/* 滑动的渐变条 — 从左侧扫入，右侧扫出 */}
          <div
            class="absolute inset-0 shimmer-gradient"
            style={{
              animation: "fluent-shimmer-sweep var(--durationSlower) var(--curveEasyEase) infinite",
            }}
          />
        </div>
      </div>

      {/* ── 可选文字（逐个蹦出，循环播放） ── */}
      {props.text && (
        <p
          class="text-[var(--colorNeutralForegroundDisabled)] text-[var(--fontSizeBase200)]"
        >
          {props.text.split("").map((char, i) => (
            <span
              class="inline-block"
              style={{
                animation: `char-pop ${CHAR_POP_DURATION}s ${CHAR_STAGGER + i * CHAR_STAGGER}s both`,
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
