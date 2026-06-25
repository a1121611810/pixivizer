import { createSignal, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import { usePredictiveBackOverlayStyle } from "../services/predictiveBack";

interface Props {
  imageUrls: string[];
  initialPage?: number;
  onClose?: () => void;
}

function imgUrl(url: string): string {
  const parts = url.split("/");
  return `/pixiv-img/${parts.slice(3).join("/")}`;
}

const ImageViewer: Component<Props> = (props) => {
  const [scale, setScale] = createSignal(1);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [currentPage, setCurrentPage] = createSignal(props.initialPage ?? 0);
  const [animating, setAnimating] = createSignal(false);
  const pbStyle = usePredictiveBackOverlayStyle();

  let touchStart = { x: 0, y: 0, dist: 0, time: 0 };
  let lastDist = 0;

  const handleTouchStart = (e: TouchEvent) => {
    if (animating()) return;
    const touches = e.touches;
    touchStart.time = Date.now();

    if (touches.length === 1) {
      touchStart.x = touches[0].clientX;
      touchStart.y = touches[0].clientY;
    } else if (touches.length === 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      touchStart.dist = Math.sqrt(dx * dx + dy * dy);
      lastDist = touchStart.dist;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (animating()) return;
    const touches = e.touches;

    if (touches.length === 2 && scale() >= 1) {
      e.preventDefault();
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist / lastDist;
      lastDist = dist;

      const newScale = Math.max(1, Math.min(5, scale() * delta));
      setScale(newScale);
    } else if (touches.length === 1 && scale() === 1) {
      const deltaX = touches[0].clientX - touchStart.x;
      if (Math.abs(deltaX) > 50) {
        if (deltaX < 0 && currentPage() < props.imageUrls.length - 1) {
          setAnimating(true);
          setCurrentPage(currentPage() + 1);
          setTimeout(() => setAnimating(false), 200);
        } else if (deltaX > 0 && currentPage() > 0) {
          setAnimating(true);
          setCurrentPage(currentPage() - 1);
          setTimeout(() => setAnimating(false), 200);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (scale() < 1) setScale(1);
  };

  const handleDblClick = () => {
    if (scale() > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  onCleanup(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  });

  return (
    <div
      class="fixed inset-0 z-50 touch-none select-none"
      style={{ "background-color": "var(--colorOverlayBackground)", ...pbStyle() }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDblClick={handleDblClick}
    >
      <div
        class="flex h-full transition-transform duration-[var(--durationNormal)]"
        style={{
          transform: `translateX(-${currentPage() * 100}%)`,
        }}
      >
        {props.imageUrls.map((url, i) => (
          <div class="min-w-full h-full flex items-center justify-center">
            <img
              src={imgUrl(url)}
              alt={`page ${i + 1}`}
              class="max-w-full max-h-full object-contain transition-transform duration-[var(--durationNormal)]"
              style={{
                transform:
                  i === currentPage()
                    ? `scale(${scale()}) translate(${position().x}px, ${position().y}px)`
                    : "none",
              }}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {props.imageUrls.length > 1 && (
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {props.imageUrls.map((_, i) => (
            <div
              class={`w-2 h-2 rounded-[var(--borderRadiusCircular)] transition-colors ${
                i === currentPage()
                  ? "bg-[var(--colorOverlayForeground)]"
                  : "bg-[var(--colorOverlaySurface)]"
              }`}
            />
          ))}
        </div>
      )}

      <button
        class="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-[var(--borderRadiusCircular)] bg-[var(--colorOverlaySurface)] text-[var(--colorOverlayForeground)] text-xl"
        onClick={props.onClose}
      >
        ←
      </button>
    </div>
  );
};

export default ImageViewer;
