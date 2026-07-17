/**
 * 浏览历史页面 — Fluent Design System 2。
 *
 * 数据：TanStack DB `useLiveQuery` 从 `historyCollection` 查询当前用户记录。
 * 渲染：日期分组时间线，独立 surface-card 列表。
 */

import { type Component, createMemo, createSignal, Show } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { useLiveQuery, eq } from "@tanstack/solid-db";
import { historyCollection, removeHistoryEntry, clearAllHistory } from "@/stores/historyStore";
import { user } from "@/stores/authStore";
import { showR18, showR18G } from "@/stores/uiStore";
import { resolveImageUrl } from "@/utils/imageLoader";
import PageTransition from "@/components/PageTransition";
import LoadingSpinner from "@/components/LoadingSpinner";
import FluentIcon from "@/components/ui/FluentIcon";
import NavBar from "@/components/NavBar";

// ─── Types ───

type TimelineItem =
  | { type: "header"; dateLabel: string; id: string }
  | { type: "entry"; entry: import("@/stores/historyStore").HistoryEntry; id: string };

// ─── Helpers ───

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildTimeline(entries: import("@/stores/historyStore").HistoryEntry[]): TimelineItem[] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => b.visitedAt - a.visitedAt);
  const result: TimelineItem[] = [];
  let currentDate = "";
  for (const entry of sorted) {
    const dateLabel = formatDate(entry.visitedAt);
    if (dateLabel !== currentDate) {
      currentDate = dateLabel;
      result.push({ type: "header", dateLabel, id: `header-${dateLabel}` });
    }
    result.push({ type: "entry", entry, id: `entry-${entry.key}` });
  }
  return result;
}

// ─── Component ───

const HistoryPage: Component = () => {
  const navigate = useNavigate();
  const currentUser = user;
  const [confirmingClear, setConfirmingClear] = createSignal(false);

  const query = useLiveQuery((q) =>
    q
      .from({ h: historyCollection })
      .where(({ h }) => eq(h.userId, currentUser()?.id ?? ""))
      .orderBy(({ h }) => h.visitedAt, "desc"),
  );

  const items = createMemo<TimelineItem[]>(() => {
    const data = query() as import("@/stores/historyStore").HistoryEntry[] | undefined;
    if (!data || data.length === 0) return [];
    return buildTimeline(data);
  });

  const handleClearAll = async () => {
    if (!confirmingClear()) {
      setConfirmingClear(true);
      setTimeout(() => setConfirmingClear(false), 3000);
      return;
    }
    await clearAllHistory();
    setConfirmingClear(false);
  };

  return (
    <PageTransition>
      <div class="flex flex-col h-screen bg-[var(--colorNeutralBackground2)]">
        {/* Header */}
        <header class="flex items-center justify-between px-4 pt-4 pb-2">
          <h1
            style={{
              "font-size": "var(--fontSizeBase500)",
              "font-weight": "var(--fontWeightSemibold)",
              color: "var(--colorNeutralForeground1)",
            }}
          >
            浏览历史
          </h1>
          <Show when={items().length > 0} fallback={null}>
            <button
              class="history-clear-btn"
              classList={{ "history-clear-btn-confirm": confirmingClear() }}
              onClick={handleClearAll}
              aria-label="清空浏览历史"
            >
              {confirmingClear() ? "确认清空？" : "清空"}
            </button>
          </Show>
        </header>

        {/* Content */}
        <Show
          when={!query.isLoading}
          fallback={
            <div class="flex-1 flex flex-col items-center justify-center gap-3">
              <div class="text-[var(--colorNeutralForeground3)] animate-spin">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.2" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </div>
              <span
                style={{
                  "font-size": "var(--fontSizeBase300)",
                  color: "var(--colorNeutralForeground3)",
                }}
              >
                加载历史记录...
              </span>
            </div>
          }
        >
          <Show
            when={items().length > 0}
            fallback={
              <div class="flex-1 flex flex-col items-center justify-center gap-3">
                <FluentIcon name="history" size={48} />
                <div class="flex flex-col items-center gap-1">
                  <span
                    style={{
                      "font-size": "var(--fontSizeBase300)",
                      color: "var(--colorNeutralForeground2)",
                    }}
                  >
                    暂无浏览记录
                  </span>
                  <span
                    style={{
                      "font-size": "var(--fontSizeBase200)",
                      color: "var(--colorNeutralForeground3)",
                    }}
                  >
                    浏览过的作品会出现在这里
                  </span>
                </div>
              </div>
            }
          >
            {/* Scrollable card list */}
            <div class="flex-1 overflow-auto px-4 pb-20">
              {items().map((item) => {
                if (item.type === "header") {
                  return (
                    <div
                      class="mt-2 mb-1"
                      style={{
                        "font-size": "var(--fontSizeBase200)",
                        color: "var(--colorNeutralForeground3)",
                        "font-weight": "var(--fontWeightSemibold)",
                      }}
                    >
                      {item.dateLabel}
                    </div>
                  );
                }

                const e = item.entry;
                const hideByR18 = (e.xRestrict === 1 && !showR18()) || (e.xRestrict === 2 && !showR18G());

                return (
                  <div
                    class="history-entry-card flex items-center gap-3 p-2.5 pr-3 mt-2"
                    onClick={() => {
                      if (e.type === "illust") {
                        void navigate({ to: "/illust/$id", params: { id: String(e.id) } });
                      } else {
                        void navigate({ to: "/novel/$id", params: { id: String(e.id) } });
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        if (e.type === "illust") {
                          void navigate({ to: "/illust/$id", params: { id: String(e.id) } });
                        } else {
                          void navigate({ to: "/novel/$id", params: { id: String(e.id) } });
                        }
                      }
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      class="relative flex-shrink-0 rounded-[var(--borderRadiusMedium)] overflow-hidden"
                      style={{
                        width: "40px",
                        height: "40px",
                        background: "var(--colorNeutralBackground2)",
                      }}
                    >
                      {e.thumbnailUrl && (
                        <img
                          src={resolveImageUrl(e.thumbnailUrl)}
                          alt={e.title}
                          class={`w-full h-full object-cover ${hideByR18 ? "filter blur-[8px]" : ""}`}
                        />
                      )}
                      {hideByR18 && (
                        <span
                          class="absolute flex items-center justify-center rounded-[var(--borderRadiusSmall)]"
                          style={{
                            top: "2px",
                            left: "2px",
                            "font-size": "9px",
                            padding: "1px 3px",
                            background: "var(--colorDangerBackground)",
                            color: "var(--colorDangerForeground)",
                            "font-weight": "var(--fontWeightBold)",
                          }}
                        >
                          {e.xRestrict === 2 ? "R18G" : "R-18"}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div class="flex-1 min-w-0">
                      <div
                        class="truncate"
                        style={{
                          "font-size": "var(--fontSizeBase300)",
                          "line-height": "var(--lineHeightBase300)",
                          color: "var(--colorNeutralForeground1)",
                        }}
                      >
                        {e.title}
                      </div>
                      <div
                        class="mt-0.5"
                        style={{
                          "font-size": "var(--fontSizeBase200)",
                          "line-height": "var(--lineHeightBase200)",
                          color: "var(--colorNeutralForeground3)",
                        }}
                      >
                        {e.userName} · {formatTime(e.visitedAt)} · {e.visitCount}次
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      class="history-delete-btn"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        removeHistoryEntry(e.key);
                      }}
                      aria-label={`删除 ${e.title}`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </Show>
        </Show>
      </div>
      <NavBar />
    </PageTransition>
  );
};

export default HistoryPage;
