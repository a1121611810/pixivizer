import { createSignal, onCleanup, type Accessor } from "solid-js";

/**
 * Tracks container element width via ResizeObserver.
 * Returns the element's clientWidth as a signal.
 */
export function useContainerWidth(): {
  width: Accessor<number>;
  ref: (el: HTMLDivElement) => void;
} {
  const [width, setWidth] = createSignal(0);

  function ref(el: HTMLDivElement) {
    if (!el) {
      return;
    }
    setWidth(el.clientWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  }

  return { width, ref };
}
