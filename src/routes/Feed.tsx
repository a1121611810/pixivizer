import { type Component, createEffect, onMount, onCleanup, untrack } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  illusts,
  nextUrl,
  loading,
  refreshing,
  error,
  ensureLoaded,
  fetchMore,
  refresh,
  saveFeedScroll,
  saveTabScroll,
  markFeedMounted,
  isFeedCached,
  getFeedScrollY,
} from "../stores/feedStore";
import { currentTab, setShowSettingsSheet } from "../stores/uiStore";
import VirtualFeed from "../components/VirtualFeed";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import SettingsSheet from "../components/SettingsSheet";

const Feed: Component = () => {
  const navigate = useNavigate();
  const cached = isFeedCached();
  let prevTab = currentTab();

  // Restore scroll when returning to a cached feed
  onMount(() => {
    if (cached) {
      requestAnimationFrame(() => {
        window.scrollTo(0, getFeedScrollY());
      });
      markFeedMounted();
    }
  });

  // Save scroll when leaving the feed page entirely
  onCleanup(() => {
    saveFeedScroll();
    markFeedMounted();
  });

  // Tab change: save old tab's scroll, restore new tab's scroll, load data
  createEffect(() => {
    const tab = currentTab();
    // Save scroll for the tab we're leaving
    if (tab !== prevTab && (prevTab === "recommended" || prevTab === "follow")) {
      saveTabScroll(prevTab);
    }
    prevTab = tab;
    // Restore scroll for the tab we're switching to
    const savedY = getFeedScrollY();
    if (savedY > 0) {
      requestAnimationFrame(() => window.scrollTo(0, savedY));
    }
    untrack(() => ensureLoaded());
  });

  return (
    <>
      <PageTransition>
        <div class="pb-16">
          <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center justify-between px-4">
            <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none">
              Pixivizer
            </h1>
            <button
              class="btn-icon"
              onClick={() => setShowSettingsSheet(true)}
              aria-label="设置"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="currentColor"/>
                <path d="M10.52 2.03a.6.6 0 0 0-1.04 0L8.47 3.85a.6.6 0 0 1-.72.31l-1.67-.57a.6.6 0 0 0-.77.7l.42 1.73a.6.6 0 0 1-.26.74l-1.53.85a.6.6 0 0 0-.07 1.03l1.5.95a.6.6 0 0 1 .24.75l-.5 1.7a.6.6 0 0 0 .72.77l1.7-.5a.6.6 0 0 1 .74.26l.85 1.53a.6.6 0 0 0 1.03.07l.95-1.5a.6.6 0 0 1 .75-.24l1.7.5a.6.6 0 0 0 .77-.72l-.5-1.7a.6.6 0 0 1 .26-.74l1.53-.85a.6.6 0 0 0 .07-1.03l-1.5-.95a.6.6 0 0 1-.24-.75l.5-1.7a.6.6 0 0 0-.72-.77l-1.7.5a.6.6 0 0 1-.74-.26l-.85-1.53a.6.6 0 0 0-1.03-.07l-.95 1.5a.6.6 0 0 1-.75.24l-1.7-.5a.6.6 0 0 0-.77.72l.5 1.7a.6.6 0 0 1-.26.74l-1.53.85a.6.6 0 0 0-.07 1.03l1.5.95a.6.6 0 0 1 .24.75l-.5 1.7a.6.6 0 0 0 .72.77l1.7-.5a.6.6 0 0 1 .74.26l.85 1.53a.6.6 0 0 0 1.03.07l.95-1.5a.6.6 0 0 1 .75-.24l1.7.5a.6.6 0 0 0 .77-.72l-.5-1.7a.6.6 0 0 1 .26-.74l1.53-.85a.6.6 0 0 0 .07-1.03l-1.5-.95a.6.6 0 0 1-.24-.75l.5-1.7a.6.6 0 0 0-.72-.77l-1.7.5a.6.6 0 0 1-.74-.26l-.85-1.53a.6.6 0 0 0-1.03-.07l-.95 1.5a.6.6 0 0 1-.75.24l-1.7-.5a.6.6 0 0 0-.77.72z" fill="currentColor" opacity=".15"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M11.28 1.73a1.6 1.6 0 0 0-2.56 0L8.1 2.96a.4.4 0 0 1-.48.2l-1.1-.37a1.6 1.6 0 0 0-2.05 1.87l.28 1.15a.4.4 0 0 1-.17.5l-1.02.56a1.6 1.6 0 0 0-.2 2.75l1 .64a.4.4 0 0 1 .17.5l-.34 1.13a1.6 1.6 0 0 0 1.93 2.04l1.13-.33a.4.4 0 0 1 .5.17l.56 1.02a1.6 1.6 0 0 0 2.75.2l.64-1a.4.4 0 0 1 .5-.17l1.13.34a1.6 1.6 0 0 0 2.04-1.93l-.33-1.13a.4.4 0 0 1 .17-.5l1.02-.56a1.6 1.6 0 0 0 .2-2.75l-1-.64a.4.4 0 0 1-.17-.5l.34-1.13a1.6 1.6 0 0 0-1.93-2.04l-1.13.33a.4.4 0 0 1-.5-.17l-.56-1.02a1.6 1.6 0 0 0-2.75-.2l-.64 1a.4.4 0 0 1-.5.17l-1.13-.34a1.6 1.6 0 0 0-2.04 1.93l.33 1.13a.4.4 0 0 1-.17.5l-1.02.56a1.6 1.6 0 0 0-.2 2.75l1 .64a.4.4 0 0 1 .17.5l-.34 1.13a1.6 1.6 0 0 0 1.93 2.04l1.13-.33a.4.4 0 0 1 .5.17l.56 1.02a1.6 1.6 0 0 0 2.75.2l.64-1a.4.4 0 0 1 .5-.17l1.13.34a1.6 1.6 0 0 0 2.04-1.93l-.33-1.13a.4.4 0 0 1 .17-.5l1.02-.56a1.6 1.6 0 0 0 .2-2.75l-1-.64a.4.4 0 0 1-.17-.5l.34-1.13a1.6 1.6 0 0 0-1.93-2.04l-1.13.33a.4.4 0 0 1-.5-.17l-.56-1.02a1.6 1.6 0 0 0-2.75-.2l-.64 1a.4.4 0 0 1-.5.17l-1.13-.34a1.6 1.6 0 0 0-2.04 1.93zM10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor"/>
              </svg>
            </button>
          </header>

          <VirtualFeed
            illusts={illusts()}
            loading={loading() || refreshing()}
            error={error()}
            hasMore={nextUrl() !== null}
            onIllustClick={(id) => navigate(`/illust/${id}`)}
            onLoadMore={fetchMore}
            onRefresh={refresh}
            onSettingsOpen={() => setShowSettingsSheet(true)}
            skipAnimation={cached}
          />
        </div>
      </PageTransition>

      <NavBar />

      <SettingsSheet />
    </>
  );
};

export default Feed;
