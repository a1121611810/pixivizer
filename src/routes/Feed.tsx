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
              onClick={() => {
                console.log("[Feed] gear icon clicked → calling setShowSettingsSheet(true)");
                setShowSettingsSheet(true);
              }}
              aria-label="设置"
            >
              ⚙️
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
            onSettingsOpen={() => {
              console.log("[Feed] VirtualFeed onSettingsOpen → calling setShowSettingsSheet(true)");
              setShowSettingsSheet(true);
            }}
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
