import * as Comlink from "comlink";
import {
  computeMasonryLayout,
  appendToLayout,
  estimateTagAreaHeight,
} from "./computeMasonryLayout";
import type { MasonryLayout } from "./types";
import type { ComputeMasonryInput } from "./computeMasonryLayout";

const api = {
  compute(input: ComputeMasonryInput): MasonryLayout {
    return computeMasonryLayout(input);
  },
  append(
    existing: MasonryLayout,
    newItems: ReadonlyArray<{
      width: number;
      height: number;
      tags?: { name: string; translated_name?: string }[];
    }>,
  ): MasonryLayout {
    return appendToLayout(existing, newItems);
  },
  estimateTagAreaHeight,
};

Comlink.expose(api);

export type MasonryWorkerAPI = typeof api;
