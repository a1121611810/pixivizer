import { createMemo, createSignal, createEffect } from "solid-js";
import type { Accessor } from "solid-js";
import type { MasonryLayout, LayoutMode } from "../primitives/types";
import type { ComputeMasonryInput } from "../primitives/computeMasonryLayout";
import {
  computeMasonryLayout,
  appendToLayout,
  CARD_INFO_HEIGHT,
  estimateTagAreaHeight,
} from "../primitives/computeMasonryLayout";
import type { PixivIllust } from "../api/types";
import { getMasonryWorker } from "../primitives/createMasonryWorker";

/**
 * Pure function: given illusts + layout config, returns a reactive layout signal.
 * Mode routing is handled internally:
 * - "waterfall" → shortest-column algorithm (incremental if data grew)
 * - "single"   → single-column stacked
 * - "grid"     → fixed row height grid
 *
 * Waterfall layout computation runs on a Web Worker when available,
 * with synchronous fallback for responsiveness.
 */
export function createLayout(
  illusts: Accessor<PixivIllust[]>,
  columnWidth: Accessor<number>,
  columnCount: Accessor<number>,
  gap: Accessor<number>,
  columnGap: Accessor<number>,
  layoutMode: Accessor<LayoutMode>,
): Accessor<MasonryLayout> {
  // Track the first illust id from the last FULL (non-incremental) computation.
  // Used to detect when data source has been entirely replaced (e.g., switching
  // recommended sub-tabs) vs. merely appended to.
  let fullComputeFirstId: number | undefined;

  // Synchronous layout computation (primary, always available)
  const syncLayout = createMemo<MasonryLayout>((prev) => {
    const mode = layoutMode();
    const currentIllusts = illusts();
    const count = currentIllusts.length;
    const cw = columnWidth();
    const cc = columnCount();
    const g = gap();
    const cg = columnGap();

    if (count === 0) {
      return { items: [], totalHeight: 0, columns: cc, columnWidth: cw, gap: g, columnGap: cg };
    }

    if (mode === "single") {
      let currentY = 0;
      const items = currentIllusts.map((_ill, i) => {
        const effectiveH = _ill.type === "ugoira" ? Math.round(_ill.height * 0.75) : _ill.height;
        const aspectRatio = effectiveH > 0 ? _ill.width / effectiveH : 1;
        const tagHeight = estimateTagAreaHeight(_ill.tags, cw);
        const h = cw / aspectRatio + CARD_INFO_HEIGHT + tagHeight;
        const y = currentY;
        currentY += h + g;
        return { index: i, x: 0, y, width: cw, height: h, column: 0 };
      });
      const totalHeight =
        items.length > 0 ? items[items.length - 1].y + items[items.length - 1].height : 0;
      return { items, totalHeight, columns: 1, columnWidth: cw, gap: g, columnGap: cg };
    }

    if (mode === "grid") {
      const rowHeight = 200 + CARD_INFO_HEIGHT;
      const items = currentIllusts.map((_ill, i) => {
        const col = i % cc;
        const row = Math.floor(i / cc);
        return {
          index: i,
          x: col * (cw + cg),
          y: row * (rowHeight + g),
          width: cw,
          height: rowHeight,
          column: col,
        };
      });
      const totalRows = Math.ceil(items.length / cc);
      return {
        items,
        totalHeight: totalRows * (rowHeight + g) - g,
        columns: cc,
        columnWidth: cw,
        gap: g,
        columnGap: cg,
      };
    }

    // Waterfall
    const input: ComputeMasonryInput = {
      items: currentIllusts.map((ill) => ({
        width: ill.width,
        height: ill.type === "ugoira" ? Math.round(ill.height * 0.75) : ill.height,
        tags: ill.tags,
      })),
      columnWidth: cw,
      columnCount: cc,
      gap: g,
      columnGap: cg,
    };

    // Incremental append if data grew AND data source hasn't been replaced.
    // The `prev.items.length > 0 && count > prev.items.length` check alone is
    // not sufficient: when switching recommended sub-tabs (mixed↔illust↔manga),
    // the entire dataset is replaced with a different array that may happen to
    // be longer, causing corrupt layout (cards missing / gaps). We guard by
    // comparing the first item's id against the last full-compute baseline.
    if (
      prev &&
      prev.items.length > 0 &&
      count > prev.items.length &&
      fullComputeFirstId !== undefined &&
      currentIllusts[0]?.id === fullComputeFirstId
    ) {
      const newRaw = currentIllusts.slice(prev.items.length);
      const newItems = newRaw.map((ill) => ({
        width: ill.width,
        height: ill.type === "ugoira" ? Math.round(ill.height * 0.75) : ill.height,
        tags: ill.tags,
      }));
      return appendToLayout(prev, newItems);
    }

    fullComputeFirstId = currentIllusts[0]?.id;
    return computeMasonryLayout(input);
  });

  // Web Worker: background layout computation for waterfall mode
  const [workerLayout, setWorkerLayout] = createSignal<MasonryLayout | null>(null);

  createEffect(async () => {
    const mode = layoutMode();
    if (mode !== "waterfall") {
      // 非 waterfall 模式：清除可能残留的 worker 计算结果
      setWorkerLayout(null);
      return;
    }
    const count = illusts().length;
    if (count < 10) return; // small dataset, worker overhead not worth it
    const cw = columnWidth();
    const cc = columnCount();
    const g = gap();
    const cg = columnGap();
    if (count === 0 || cw <= 0) return;

    const input: ComputeMasonryInput = {
      items: illusts().map((ill) => ({
        width: ill.width,
        height: ill.type === "ugoira" ? Math.round(ill.height * 0.75) : ill.height,
        tags: ill.tags,
      })),
      columnWidth: cw,
      columnCount: cc,
      gap: g,
      columnGap: cg,
    };

    try {
      const worker = await getMasonryWorker();
      if (!worker) return;
      const result = await worker.compute(input);
      setWorkerLayout(result);
    } catch {
      // Worker unavailable, keep sync layout
    }
  });

  // Return worker result when available, otherwise sync layout
  return createMemo(() => workerLayout() || syncLayout());
}
