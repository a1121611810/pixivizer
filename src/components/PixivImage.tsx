import { type Component, createSignal, onMount, onCleanup } from "solid-js";
import { loadImage } from "../utils/imageLoader";

interface PixivImageProps {
  src: string;
  alt?: string;
  class?: string;
  style?: string | Record<string, string | number>;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  draggable?: boolean;
  onClick?: (e: MouseEvent) => void;
}

const PixivImage: Component<PixivImageProps> = (props) => {
  const [displayUrl, setDisplayUrl] = createSignal("");
  const [failed, setFailed] = createSignal(false);
  let cleanupFn: (() => void) | null = null;

  // Compute aspect ratio from width/height to prevent layout shift (CLS)
  const aspectRatio = props.width && props.height ? `${props.width} / ${props.height}` : undefined;

  onMount(() => {
    if (!props.src) return;
    load();
  });

  onCleanup(() => {
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = null;
    }
  });

  async function load() {
    try {
      const result = await loadImage(props.src);
      cleanupFn = result.cleanup;
      setDisplayUrl(result.url);
    } catch (e) {
      console.error(`[PixivImage] Failed: ${props.src}`, e);
      setFailed(true);
    }
  }

  function handleError(e: Event) {
    const img = e.target as HTMLImageElement;
    console.error(`[PixivImage] <img> onError: ${img.src}`);
    setFailed(true);
  }

  // Shared style for all states — preserves aspect ratio to prevent CLS
  const sizingStyle = aspectRatio ? { "aspect-ratio": aspectRatio } : {};

  return (
    <>
      {displayUrl() && !failed() ? (
        <img
          src={displayUrl()}
          alt={props.alt || ""}
          class={props.class || ""}
          width={props.width}
          height={props.height}
          loading={props.loading || "lazy"}
          draggable={props.draggable}
          onClick={props.onClick}
          onError={handleError}
          style={{ height: "auto" }}
        />
      ) : failed() ? (
        <div
          class={`bg-[var(--colorNeutralBackground2)] flex flex-col items-center justify-center gap-1 ${props.class || ""}`}
          style={{ ...sizingStyle, ...(typeof props.style === "object" ? props.style : {}) }}
        >
          <span class="text-[var(--colorNeutralForeground3)] text-xs">⚠</span>
          <span class="text-[var(--colorNeutralForegroundDisabled)] [font-size:var(--fontSizeBase100)]">
            加载失败
          </span>
        </div>
      ) : (
        <div
          class={`flex flex-col items-center justify-center gap-1.5 ${props.class || ""}`}
          style={{
            "aspect-ratio": aspectRatio,
            background:
              "linear-gradient(90deg, var(--colorNeutralBackground2) 25%, var(--colorNeutralBackground1) 50%, var(--colorNeutralBackground2) 75%)",
            "background-size": "200% 100%",
            animation: "fluent-shimmer var(--durationSlower) var(--curveEasyEase) infinite",
          }}
        >
          <span class="spinner w-4 h-4" />
          <span class="text-[var(--colorNeutralForegroundDisabled)] [font-size:var(--fontSizeBase100)]">
            加载中...
          </span>
        </div>
      )}
    </>
  );
};

export default PixivImage;
