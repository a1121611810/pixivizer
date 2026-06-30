import { createSignal, createEffect, createMemo, onCleanup } from "solid-js"
import type { Accessor } from "solid-js"
import type { MasonryLayout, ScrollWindow } from "./types"
import { computeWindow } from "./computeMasonryLayout"

export interface VirtualScrollOptions {
  layout: Accessor<MasonryLayout>
  overscan?: number
}

export interface VirtualScrollResult {
  visibleRange: Accessor<ScrollWindow>
  totalHeight: Accessor<number>
  /** Returns inline style object for the item at the given layout index */
  getItemStyle: (index: number) => {
    position: "absolute"
    top: string
    left: string
    width: string
    height: string
  }
  scrollTop: Accessor<number>
  containerRef: (el: HTMLDivElement) => void
  setScrollTop: (y: number) => void
}

/**
 * SolidJS primitive that consumes a MasonryLayout and produces
 * a virtual window of visible items + absolute positioning styles.
 * The scroll container is managed internally.
 */
export function createVirtualScroll(opts: VirtualScrollOptions): VirtualScrollResult {
  const overscan = opts.overscan ?? 400
  const [scrollTop, setScrollTop] = createSignal(0)
  const [viewportHeight, setViewportHeight] = createSignal(800)
  let containerEl: HTMLDivElement | undefined

  const visibleRange = createMemo(() => {
    const layout = opts.layout()
    if (layout.items.length === 0) return { startIndex: 0, endIndex: -1 }
    return computeWindow(layout, scrollTop(), viewportHeight(), overscan)
  })

  const totalHeight = createMemo(() => opts.layout().totalHeight)

  function getItemStyle(index: number) {
    const layout = opts.layout()
    const item = layout.items[index]
    if (!item) {
      return {
        position: "absolute" as const,
        top: "0px",
        left: "0px",
        width: "0px",
        height: "0px",
      }
    }
    return {
      position: "absolute" as const,
      top: `${item.y}px`,
      left: `${item.x}px`,
      width: `${item.width}px`,
      height: `${item.height}px`,
    }
  }

  function containerRef(el: HTMLDivElement) {
    containerEl = el
    if (!el) return

    const onScroll = () => {
      setScrollTop(el.scrollTop)
    }
    el.addEventListener("scroll", onScroll, { passive: true })

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height)
      }
    })
    resizeObserver.observe(el)

    onCleanup(() => {
      el.removeEventListener("scroll", onScroll)
      resizeObserver.disconnect()
    })
  }

  return {
    visibleRange,
    totalHeight,
    getItemStyle,
    scrollTop,
    containerRef,
    setScrollTop,
  }
}
