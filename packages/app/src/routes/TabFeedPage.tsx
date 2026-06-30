import { type Component, onMount, onCleanup, Show, createMemo } from "solid-js";
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
  followTab,
  setFollowTab,
} from "../stores/feedStore";
import { setCurrentTab, setShowSettingsSheet, layoutMode } from "../stores/uiStore";
import type { Tab } from "../stores/uiStore";
import type { PixivIllust } from "../api/types";
import { user, isLoggedIn } from "../stores/authStore";
import UserAvatar from "../components/UserAvatar";
import VirtualFeed from "../components/VirtualFeed";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import SettingsSheet from "../components/SettingsSheet";

interface Props {
  tab: Tab;
}

const r18Handler = () => refresh();
const layoutHandler = () => refresh();

function scrollToTop() {
  window.scroll(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

const TabFeedPage: Component<Props> = (props) => {
  const navigate = useNavigate();
  const cached = isFeedCached(props.tab);

  const filteredIllusts = createMemo<PixivIllust[]>(() => {
    // Track followTab changes so filter updates immediately
    followTab();
    return illusts(); // feedStore.computeFollowIllusts() already handles follow tab filtering
  });

  // Set current tab on mount so feedStore knows which data to fetch
  onMount(() => {
    setCurrentTab(props.tab);
    ensureLoaded();
    // Restore scroll if cached
    if (cached) {
      const y = getFeedScrollY(props.tab);
      if (y > 0) {
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    }
  });

  // Save scroll + R18 auto refresh
  onCleanup(() => {
    saveTabScroll(props.tab);
  });

  // R18 / R-18G switch toggle auto-refresh
  onMount(() => {
    window.addEventListener("r18Changed", r18Handler);
    window.addEventListener("r18gChanged", r18Handler);
    window.addEventListener("layoutModeChanged", layoutHandler);
    onCleanup(() => {
      window.removeEventListener("r18Changed", r18Handler);
      window.removeEventListener("r18gChanged", r18Handler);
      window.removeEventListener("layoutModeChanged", layoutHandler);
    });
  });
  return (
    <>
      <PageTransition>
        <div class="pb-16">
          <header
            class="sticky top-0 z-20 surface-appbar h-12 flex items-center justify-between px-4"
            onDblClick={scrollToTop}
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
            <div
              onClick={() => setShowSettingsSheet(true)}
              style="display:inline-flex"
            >
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

          {/* ── 关注页三层过滤 ── */}
          <Show when={props.tab === "follow"}>
            <div class="sticky top-12 z-10 surface-appbar px-4 pb-2" onDblClick={scrollToTop}>
              <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1 gap-1">
                {[
                  { key: "all" as const, label: "全部" },
                  { key: "public" as const, label: "公开" },
                  { key: "private" as const, label: "非公开" },
                ].map((opt) => (
                  <button
                    class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                    classList={{
                      "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                        followTab() === opt.key,
                      "bg-transparent text-[var(--colorNeutralForeground2)]":
                        followTab() !== opt.key,
                    }}
                    onClick={() => {
                      if (followTab() !== opt.key) {
                        setFollowTab(opt.key);
                      }
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </Show>

          <VirtualFeed
            illusts={filteredIllusts()}
            loading={loading() || refreshing()}
            error={error()}
            hasMore={nextUrl() !== null}
            onIllustClick={(id) => navigate(`/illust/${id}`)}
            onLoadMore={fetchMore}
            onRefresh={refresh}
            onSettingsOpen={() => setShowSettingsSheet(true)}
            skipAnimation={cached}
            layoutMode={layoutMode()}
          />
        </div>
      </PageTransition>

      <NavBar />

      <SettingsSheet />
    </>
  );
};

export default TabFeedPage;
