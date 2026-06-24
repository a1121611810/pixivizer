import { createSignal, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import JSZip from "jszip";
import { loadUgoiraMetadata } from "../api/illust";
import PixivImage from "./PixivImage";
import { usePredictiveBackOverlayStyle } from "../services/predictiveBack";

interface Props {
  illustId: number;
  coverUrl: string;
  onClose: () => void;
}

interface Frame {
  url: string; // blob URL for the frame JPEG
  delay: number; // milliseconds
}

const UgoiraViewer: Component<Props> = (props) => {
  const [frames, setFrames] = createSignal<Frame[]>([]);
  const [currentFrame, setCurrentFrame] = createSignal(0);
  const [status, setStatus] = createSignal<"loading" | "playing" | "paused">("loading");
  const [error, setError] = createSignal<string | null>(null);
  const pbStyle = usePredictiveBackOverlayStyle();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let blobUrls: string[] = [];

  onMount(async () => {
    try {
      // 1. Fetch metadata
      const meta = await loadUgoiraMetadata(props.illustId);
      const zipUrl = meta.zip_urls.medium;

      // 2. Download ZIP
      const zipResp = await fetch(`/pixiv-img/${zipUrl.split("/").slice(3).join("/")}`);
      if (!zipResp.ok) throw new Error(`ZIP download failed: HTTP ${zipResp.status}`);
      const zipBlob = await zipResp.blob();

      // 3. Extract frames
      const zip = await JSZip.loadAsync(zipBlob);
      const extracted: Frame[] = [];

      for (const frameMeta of meta.frames) {
        const file = zip.file(frameMeta.file);
        if (!file) continue;
        const blob = await file.async("blob");
        const url = URL.createObjectURL(blob);
        blobUrls.push(url);
        extracted.push({ url, delay: frameMeta.delay });
      }

      if (extracted.length === 0) throw new Error("No frames found in ZIP");

      setFrames(extracted);
      setStatus("playing");
      scheduleNext(0, extracted);
    } catch (e) {
      console.error("[UgoiraViewer] Error:", e);
      setError((e as Error).message || "加载动图失败");
      setStatus("paused");
    }
  });

  function scheduleNext(index: number, frameList: Frame[]) {
    if (timer) clearTimeout(timer);
    const frame = frameList[index];
    if (!frame) return;
    setCurrentFrame(index);
    const nextIndex = (index + 1) % frameList.length;
    timer = setTimeout(() => scheduleNext(nextIndex, frameList), frame.delay);
  }

  function togglePause() {
    if (status() === "playing") {
      if (timer) clearTimeout(timer);
      timer = null;
      setStatus("paused");
    } else if (status() === "paused" && frames().length > 0) {
      setStatus("playing");
      scheduleNext(currentFrame(), frames());
    }
  }

  onCleanup(() => {
    if (timer) clearTimeout(timer);
    for (const url of blobUrls) {
      URL.revokeObjectURL(url);
    }
  });

  return (
    <div
      class="fixed inset-0 z-50 touch-none select-none flex items-start justify-center"
      style={{ "background-color": "var(--colorOverlayBackground)", ...pbStyle() }}
      onClick={togglePause}
    >
      {/* Close button */}
      <button
        class="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-[var(--borderRadiusCircular)] bg-[var(--colorOverlaySurface)] text-[var(--colorOverlayForeground)] text-xl hover:bg-[var(--colorOverlaySurfaceHover)] active:bg-[var(--colorOverlaySurfaceHover)] transition-all duration-[var(--durationFast)] border-none outline-none appearance-none cursor-pointer z-10"
        onClick={(e) => {
          e.stopPropagation();
          props.onClose();
        }}
        aria-label="关闭"
      >
        ←
      </button>

      {/* Status badge */}
      {status() === "loading" && (
        <div class="absolute top-4 right-4 px-2.5 py-1 rounded-[var(--borderRadiusCircular)] bg-[var(--colorOverlaySurface)] text-[var(--colorOverlayForeground)] text-[var(--fontSizeBase200)] font-medium z-10">
          加载中...
        </div>
      )}
      {status() === "paused" && (
        <div class="absolute top-4 right-4 px-2.5 py-1 rounded-[var(--borderRadiusCircular)] bg-[var(--colorOverlaySurface)] text-[var(--colorOverlayForeground)] text-[var(--fontSizeBase200)] font-medium z-10">
          已暂停
        </div>
      )}

      {/* Error state */}
      {error() && (
        <div class="text-[var(--colorOverlayForeground)] text-center px-6">
          <p class="[font-size:var(--fontSizeBase300)] mb-4">{error()}</p>
          <button class="btn-secondary" onClick={props.onClose}>
            返回
          </button>
        </div>
      )}

      {/* Cover image (shown while loading or if error) */}
      {(status() === "loading" || error()) && (
        <PixivImage
          src={props.coverUrl}
          alt="cover"
          loading="eager"
          class="max-w-full max-h-full object-cover object-top"
          draggable={false}
        />
      )}

      {/* Frame playback */}
      {status() !== "loading" && !error() && frames().length > 0 && (
        <img
          src={frames()[currentFrame()].url}
          alt={`frame ${currentFrame() + 1}`}
          class="max-w-full max-h-full object-contain object-top"
          draggable={false}
        />
      )}
    </div>
  );
};

export default UgoiraViewer;
