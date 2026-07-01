/** Single card position in a masonry/grid/single layout */
export interface MasonryItemLayout {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  column: number;
}

/** Complete layout snapshot */
export interface MasonryLayout {
  items: MasonryItemLayout[];
  totalHeight: number;
  columns: number;
  columnWidth: number;
  gap: number; // vertical gap between items
  columnGap: number; // horizontal gap between columns
}

export type LayoutMode = "waterfall" | "single" | "grid";

/** Viewport clipping result */
export interface ScrollWindow {
  startIndex: number;
  endIndex: number;
}
