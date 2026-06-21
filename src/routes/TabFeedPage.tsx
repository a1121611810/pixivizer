import { type Component, onMount, onCleanup } from "solid-js";
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
  saveTabScroll,
  isFeedCached,
  getFeedScrollY,
} from "../stores/feedStore";
import { setCurrentTab, setShowSettingsSheet } from "../stores/uiStore";
import type { Tab } from "../stores/uiStore";
import VirtualFeed from "../components/VirtualFeed";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import SettingsSheet from "../components/SettingsSheet";

interface Props {
  tab: Tab;
}

const TabFeedPage: Component<Props> = (props) => {
  const navigate = useNavigate();
  const cached = isFeedCached();

  // Set current tab on mount so feedStore knows which data to fetch
  onMount(() => {
    setCurrentTab(props.tab);
    ensureLoaded();
    // Restore scroll if cached
    if (cached) {
      const y = getFeedScrollY();
      if (y > 0) {
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    }
  });

  // Save scroll on unmount
  onCleanup(() => {
    saveTabScroll(props.tab);
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
              class="btn-icon text-xl"
              onClick={() => setShowSettingsSheet(true)}
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

export default TabFeedPage;
