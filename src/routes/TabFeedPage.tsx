import { type Component, onMount, onCleanup, Show } from "solid-js";
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
import { user, isLoggedIn } from "../stores/authStore";
import { resolveImageUrl } from "../utils/imageLoader";
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
          <header
            class="sticky top-0 z-20 surface-appbar h-12 flex items-center justify-between px-4"
            onDblClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none flex items-center gap-2 min-w-0">
              <Show when={isLoggedIn() && user()} fallback={<>Pixivizer</>}>
                <img
                  src={resolveImageUrl(user()!.profile_image_urls.medium)}
                  alt={user()!.name}
                  class="w-6 h-6 rounded-[var(--borderRadiusCircular)] flex-shrink-0"
                />
                <span class="truncate max-w-[120px]">{user()!.name}</span>
              </Show>
            </h1>
            <button
              class="btn-icon"
              onClick={() => setShowSettingsSheet(true)}
              onDblClick={(e) => e.stopPropagation()}
              aria-label="设置"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12.003.75a.75.75 0 0 1 .75.75v1.087a6.7 6.7 0 0 1 1.97.812l.765-.765a.75.75 0 0 1 1.06 1.06l-.742.743c.488.541.894 1.15 1.194 1.81l1.032-.32a.75.75 0 1 1 .462 1.427l-1.054.342c.05.402.06.813.028 1.22l1.06.382a.75.75 0 0 1-.497 1.416l-1.077-.378a6.693 6.693 0 0 1-1.268 1.849l.753.754a.75.75 0 0 1-1.06 1.06l-.78-.78a6.716 6.716 0 0 1-1.823.789v1.112a.75.75 0 0 1-1.5 0v-1.102a6.658 6.658 0 0 1-1.853-.794l-.777.777a.75.75 0 0 1-1.06-1.06l.75-.75a6.695 6.695 0 0 1-1.27-1.835l-1.08.376a.75.75 0 1 1-.496-1.415l1.06-.384a6.745 6.745 0 0 1 .032-1.245l-1.05-.342a.75.75 0 1 1 .465-1.427l1.032.32c.303-.658.713-1.267 1.204-1.806l-.743-.743a.75.75 0 1 1 1.06-1.06l.766.766a6.687 6.687 0 0 1 1.962-.811V1.5a.75.75 0 0 1 .75-.75zm-.005 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"
                  fill="currentColor"
                />
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

export default TabFeedPage;
