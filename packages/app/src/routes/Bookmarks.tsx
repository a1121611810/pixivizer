import { type Component, createEffect, onMount, onCleanup, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  illusts,
  nextUrl,
  loading,
  error,
  restrict,
  ensureLoaded,
  fetchMore,
  refresh,
  setRestrict,
  saveBookmarkScroll,
  getBookmarkScrollY,
} from "../stores/bookmarkStore";
import { user, isLoggedIn } from "../stores/authStore";
import UserAvatar from "../components/UserAvatar";
import { setShowSettingsSheet, setCurrentTab, layoutMode } from "../stores/uiStore";
import VirtualFeed from "../components/VirtualFeed";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import SettingsSheet from "../components/SettingsSheet";

const r18Handler = () => refresh();

const Bookmarks: Component = () => {
  const navigate = useNavigate();

  // Restore scroll position when returning to this page
  onMount(() => {
    setCurrentTab("bookmarks");
    // 返回收藏页时静默刷新（已有数据后台更新，无数据由 effect 处理）
    if (illusts().length > 0 && !loading()) {
      refresh();
    }

    // R18 开关切换时自动刷新
    window.addEventListener("r18Changed", r18Handler);
    onCleanup(() => {
      window.removeEventListener("r18Changed", r18Handler);
    });
  });

  // Save scroll position when leaving
  onCleanup(() => {
    saveBookmarkScroll();
  });

  // Load data when restrict changes or when user becomes available
  createEffect(() => {
    const u = user();
    restrict(); // track restrict changes
    if (u) {
      ensureLoaded();
    }
  });

  return (
    <>
      <PageTransition>
        <div class="pb-16">
          <header
            class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4"
            onDblClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <h1
              class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none flex items-center gap-2 min-w-0"
              classList={{ "cursor-pointer": isLoggedIn() }}
              onClick={() => isLoggedIn() && navigate("/me")}
            >
              <Show when={isLoggedIn() && user()} fallback={<>Pictelio</>}>
                <UserAvatar />
                <span class="truncate max-w-[120px]">{user()!.name}</span>
              </Show>
            </h1>
          </header>

          {/* Segmented: 公开收藏 / 非公开收藏 */}
          <div class="flex justify-center py-3 px-4">
            <div
              class="inline-flex rounded-[var(--borderRadiusMedium)] p-0.5"
              style={{ background: "var(--colorNeutralBackground2)" }}
            >
              <button
                class="px-4 py-1.5 rounded-[var(--borderRadiusSmall)] text-sm font-medium transition-colors"
                classList={{
                  "bg-[var(--colorBrandBackground)] text-white": restrict() === "public",
                  "text-[var(--colorNeutralForeground2)]": restrict() !== "public",
                }}
                onClick={() => setRestrict("public")}
              >
                公开收藏
              </button>
              <button
                class="px-4 py-1.5 rounded-[var(--borderRadiusSmall)] text-sm font-medium transition-colors"
                classList={{
                  "bg-[var(--colorBrandBackground)] text-white": restrict() === "private",
                  "text-[var(--colorNeutralForeground2)]": restrict() !== "private",
                }}
                onClick={() => setRestrict("private")}
              >
                非公开收藏
              </button>
            </div>
          </div>

          <VirtualFeed
            illusts={illusts()}
            loading={loading()}
            error={error()}
            hasMore={nextUrl() !== null}
            onIllustClick={(id) => navigate(`/illust/${id}`)}
            onLoadMore={fetchMore}
            onRefresh={refresh}
            onSettingsOpen={() => setShowSettingsSheet(true)}
            emptyText={restrict() === "public" ? "公开收藏夹为空" : "非公开收藏夹为空"}
            skipAnimation={true}
            layoutMode={layoutMode()}
            restoreScrollTop={getBookmarkScrollY()}
          />
        </div>
      </PageTransition>

      <NavBar />

      <SettingsSheet />
    </>
  );
};

export default Bookmarks;
