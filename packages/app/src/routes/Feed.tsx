import { type Component, createEffect, onMount, onCleanup, untrack } from "solid-js";
import { useNavigate } from "@/router-adapter";
import {
  illusts,
  nextUrl,
  loading,
  refreshing,
  error,
  ensureLoaded,
  fetchMore,
  refresh,
  saveTabScroll,
  markFeedMounted,
  isFeedCached,
  getFeedScrollY,
} from "../stores/feedStore";
import { currentTab, openSettingsDrawer, layoutMode } from "../stores/uiStore";
import VirtualFeed from "../components/VirtualFeed";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import SettingsDrawer from "../components/SettingsDrawer";
const Feed: Component = () => {
  const navigate = useNavigate();
  const cached = isFeedCached();
  let prevTab = currentTab();
  let scrollRestored = false;

  // Mark feed mounted on first render
  onMount(() => {
    markFeedMounted();
  });

  // Save scroll when leaving the feed page entirely
  onCleanup(() => {
    markFeedMounted();
  });

  onMount(() => {});

  // Tab change: save old tab's scroll, restore new tab's scroll, load data
  createEffect(() => {
    const tab = currentTab();
    // Save scroll for the tab we're leaving
    if (tab !== prevTab && (prevTab === "recommended" || prevTab === "follow")) {
      saveTabScroll(prevTab);
      scrollRestored = false; // reset flag for new tab
    }
    prevTab = tab;
    untrack(() => ensureLoaded());
  });

  return (
    <>
      <PageTransition>
        <div class="pb-16">
          <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center justify-between px-4">
            <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none">
              Pictelio
            </h1>
            <div onClick={() => openSettingsDrawer()} style="display:inline-flex">
              <fluent-button
                appearance="subtle"
                aria-label="设置"
                style="min-width:32px;width:32px;height:32px;padding:0;pointer-events:none"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12.003.75a.75.75 0 0 1 .75.75v1.087a6.7 6.7 0 0 1 1.97.812l.765-.765a.75.75 0 0 1 1.06 1.06l-.742.743c.488.541.894 1.15 1.194 1.81l1.032-.32a.75.75 0 1 1 .462 1.427l-1.054.342c.05.402.06.813.028 1.22l1.06.382a.75.75 0 0 1-.497 1.416l-1.077-.378a6.693 6.693 0 0 1-1.268 1.849l.753.754a.75.75 0 0 1-1.06 1.06l-.78-.78a6.716 6.716 0 0 1-1.823.789v1.112a.75.75 0 0 1-1.5 0v-1.102a6.658 6.658 0 0 1-1.853-.794l-.777.777a.75.75 0 0 1-1.06-1.06l.75-.75a6.695 6.695 0 0 1-1.27-1.835l-1.08.376a.75.75 0 1 1-.496-1.415l1.06-.384a6.745 6.745 0 0 1 .032-1.245l-1.05-.342a.75.75 0 1 1 .465-1.427l1.032.32c.303-.658.713-1.267 1.204-1.806l-.743-.743a.75.75 0 1 1 1.06-1.06l.766.766a6.687 6.687 0 0 1 1.962-.811V1.5a.75.75 0 0 1 .75-.75zm-.005 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"
                    fill="currentColor"
                  />
                </svg>
              </fluent-button>
            </div>
          </header>

          <VirtualFeed
            illusts={illusts()}
            loading={loading() || refreshing()}
            error={error()}
            hasMore={nextUrl() !== null}
            onIllustClick={(id) => navigate(`/illust/${id}`)}
            onLoadMore={fetchMore}
            onRefresh={refresh}
            skipAnimation={cached}
            layoutMode={layoutMode()}
            restoreScrollTop={!scrollRestored && cached ? getFeedScrollY() : undefined}
          />
        </div>
      </PageTransition>

      <NavBar />

      <SettingsDrawer />
    </>
  );
};

export default Feed;
