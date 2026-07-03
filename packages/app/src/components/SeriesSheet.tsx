import { type Component, Show, createSignal, createEffect, For, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { loadSeries, type NovelSeriesDetailResponse } from "../api/novel";
import SeriesSheetItem from "./SeriesSheetItem";
import LoadingSpinner from "./LoadingSpinner";

interface Props {
  seriesId: number;
  seriesTitle: string;
  authorName: string;
  authorId: number;
  isOpen: boolean;
  onClose: () => void;
}

const SeriesSheet: Component<Props> = (props) => {
  const navigate = useNavigate();

  // 手动 fetch，避免 createResource 触发外层 Suspense 导致全页白屏
  const [seriesData, setSeriesData] = createSignal<NovelSeriesDetailResponse | null>(null);
  const [fetchLoading, setFetchLoading] = createSignal(false);
  const [fetchError, setFetchError] = createSignal<string | null>(null);
  let abortController: AbortController | null = null;

  createEffect(() => {
    if (props.isOpen && props.seriesId) {
      abortController?.abort();
      abortController = new AbortController();

      setFetchLoading(true);
      setFetchError(null);
      setSeriesData(null);

      loadSeries(props.seriesId)
        .then((result) => {
          if (!abortController?.signal.aborted) {
            setSeriesData(result);
            setFetchLoading(false);
          }
        })
        .catch((e) => {
          if (!abortController?.signal.aborted) {
            setFetchError((e as { message?: string }).message ?? "加载失败");
            setFetchLoading(false);
          }
        });
    } else {
      setSeriesData(null);
      setFetchError(null);
      setFetchLoading(false);
    }
  });

  onCleanup(() => {
    abortController?.abort();
  });

  // 打开 Sheet 时锁定背景滚动
  createEffect(() => {
    if (props.isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      onCleanup(() => {
        document.body.style.overflow = prev;
      });
    }
  });

  function refetch() {
    setFetchLoading(true);
    setFetchError(null);
    loadSeries(props.seriesId)
      .then((result) => {
        if (!abortController?.signal.aborted) {
          setSeriesData(result);
          setFetchLoading(false);
        }
      })
      .catch((e) => {
        if (!abortController?.signal.aborted) {
          setFetchError((e as { message?: string }).message ?? "加载失败");
          setFetchLoading(false);
        }
      });
  }

  function close() {
    props.onClose();
  }

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50">
        {/* Scrim */}
        <div class="absolute inset-0" style="background-color:var(--colorScrim)" onClick={close} />

        {/* Sheet panel */}
        <div
          class="absolute bottom-0 left-0 right-0 surface-appbar rounded-t-[var(--borderRadius4XLarge)] shadow-[var(--elevation28)]"
          style="max-height:80vh;overflow-y:auto;animation:fluent-slide-down var(--durationGentle) var(--curveDecelerateMid) both"
        >
          {/* Drag handle */}
          <div class="flex justify-center pt-2 pb-1">
            <div class="w-10 h-1 rounded-[var(--borderRadiusCircular)] bg-[var(--colorNeutralStroke1)]" />
          </div>

          {/* Header */}
          <div class="flex items-center justify-between px-5 pt-1 pb-2">
            <h2 class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
              系列作品
            </h2>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-[var(--borderRadiusSmall)] text-[var(--colorNeutralForeground1)] hover:bg-[var(--colorNeutralBackground2)] active:scale-95 transition-all appearance-none border-none outline-none cursor-pointer"
              onClick={close}
              aria-label="关闭"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15.14 4.86a.67.67 0 0 0-.95 0L10 9.05 5.81 4.86a.67.67 0 0 0-.95.95L9.05 10l-4.19 4.19a.67.67 0 0 0 .95.95L10 10.95l4.19 4.19a.67.67 0 0 0 .95-.95L10.95 10l4.19-4.19a.67.67 0 0 0 0-.95z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          <fluent-divider style="margin-inline:20px"></fluent-divider>

          {/* ── Series metadata ── */}
          <div class="px-5 py-3">
            <h3 class="[font-size:var(--fontSizeBase400)] font-bold text-[var(--colorNeutralForeground1)] leading-tight">
              {props.seriesTitle}
            </h3>
            <button
              class="[font-size:var(--fontSizeBase200)] text-[var(--colorBrandForeground1)] hover:underline bg-transparent border-none p-0 cursor-pointer mt-1"
              onClick={() => {
                close();
                navigate(`/user/${props.authorId}`);
              }}
            >
              @{props.authorName}
            </button>

            {/* Stats from API */}
            <Show when={seriesData()}>
              {(d) => (
                <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-1">
                  总字数: {d().novel_series_detail.total_character_count.toLocaleString()}字 ·{" "}
                  {d().novels.length}部作品
                </p>
              )}
            </Show>
          </div>

          <fluent-divider style="margin-inline:20px"></fluent-divider>

          {/* ── Content area ── */}
          <div class="min-h-[160px]">
            {/* Loading state */}
            <Show when={fetchLoading() && !seriesData()}>
              <div class="flex justify-center py-8">
                <LoadingSpinner text="加载中..." />
              </div>
            </Show>

            {/* Error state */}
            <Show when={fetchError()}>
              <div class="flex flex-col items-center justify-center py-8 gap-3 px-5">
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorStatusDangerForeground1)] text-center">
                  加载失败：{fetchError()}
                </p>
                <button
                  class="px-4 py-1.5 rounded-[var(--borderRadiusMedium)] bg-[var(--colorBrandBackground)] text-white [font-size:var(--fontSizeBase200)] font-medium border-none cursor-pointer active:scale-95 transition-all"
                  onClick={() => refetch()}
                >
                  重试
                </button>
              </div>
            </Show>

            {/* Novel list */}
            <Show when={seriesData()}>
              {(d) => (
                <Show
                  when={d().novels.length > 0}
                  fallback={
                    <p class="text-center py-8 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
                      暂无作品
                    </p>
                  }
                >
                  <div class="py-1">
                    <For each={d().novels}>
                      {(novel) => (
                        <SeriesSheetItem
                          novel={novel}
                          onClick={(id) => {
                            close();
                            navigate(`/novel/${id}`);
                          }}
                        />
                      )}
                    </For>
                  </div>
                </Show>
              )}
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default SeriesSheet;
