import { type Component, onMount, onCleanup, Show, createSignal, createMemo } from "solid-js";
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
  getTabRawIllusts,
  followRestrict,
  setFollowRestrict,
} from "../stores/feedStore";
import { setCurrentTab, setShowSettingsSheet } from "../stores/uiStore";
import type { Tab } from "../stores/uiStore";
import type { PixivIllust, RestrictType } from "../api/types";
import { user, isLoggedIn } from "../stores/authStore";
import UserAvatar from "../components/UserAvatar";
import VirtualFeed from "../components/VirtualFeed";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import SettingsSheet from "../components/SettingsSheet";

interface Props {
  tab: Tab;
}

type FollowSubTab = "all" | "r18" | "r18g";

const r18Handler = () => refresh();

function scrollToTop() {
  window.scroll(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

const TabFeedPage: Component<Props> = (props) => {
  const navigate = useNavigate();
  const cached = isFeedCached();
  const [followSubTab, setFollowSubTab] = createSignal<FollowSubTab>("all");

  // Filter illusts based on follow sub-tab selection.
  // "全部" uses the globally-filtered illusts() (respects R18/R18G toggles).
  // "R18" use raw data from tabIllusts so sub-tab filtering is independent of global toggles.
  const filteredIllusts = createMemo<PixivIllust[]>(() => {
    if (props.tab !== "follow") return illusts();
    const sub = followSubTab();
    if (sub === "all") return illusts();
    // Use raw unfiltered data for sub-tab specific filtering
    const raw = getTabRawIllusts("follow");
    if (sub === "r18") return raw.filter((i) => i.x_restrict === 1 || i.x_restrict === 2);
    return illusts();
  });

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

  // Save scroll + R18 auto refresh
  onCleanup(() => {
    saveTabScroll(props.tab);
  });

  // R18 / R-18G switch toggle auto-refresh
  onMount(() => {
    window.addEventListener("r18Changed", r18Handler);
    window.addEventListener("r18gChanged", r18Handler);
    onCleanup(() => {
      window.removeEventListener("r18Changed", r18Handler);
      window.removeEventListener("r18gChanged", r18Handler);
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
              <Show when={isLoggedIn() && user()} fallback={<>Pixivizer</>}>
                <UserAvatar />
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

          {/* ── 关注页双层过滤 ── */}
          <Show when={props.tab === "follow"}>
            <div class="sticky top-12 z-10 surface-appbar px-4 pb-2" onDblClick={scrollToTop}>
              {/* 第1层：公开/非公开 — 紧凑型，次要操作 */}
              <div class="flex items-center justify-between mb-2">
                <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] select-none">
                  浏览范围
                </span>
                <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-0.5 gap-0.5">
                  {([
                    { key: "public", label: "公开" },
                    { key: "private", label: "非公开" },
                  ] as { key: RestrictType; label: string }[]).map((r) => (
                    <button
                      class="py-[var(--spacingVerticalSNudge)] px-[var(--spacingHorizontalS)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase100)] font-medium transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                      classList={{
                        "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                          followRestrict() === r.key,
                        "bg-transparent text-[var(--colorNeutralForeground3)]":
                          followRestrict() !== r.key,
                      }}
                      onClick={() => {
                        if (followRestrict() !== r.key) {
                          setFollowRestrict(r.key);
                          refresh();
                        }
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* 第2层：全部 / R-18 — 主要过滤 */}
              <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1 gap-1">
                {([
                  { key: "all", label: "全部" },
                  { key: "r18", label: "R-18" },
                ] as { key: FollowSubTab; label: string }[]).map((sub) => (
                  <button
                    class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                    classList={{
                      "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                        followSubTab() === sub.key,
                      "bg-transparent text-[var(--colorNeutralForeground2)]":
                        followSubTab() !== sub.key,
                    }}
                    onClick={() => setFollowSubTab(sub.key)}
                  >
                    {sub.label}
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
          />
        </div>
      </PageTransition>

      <NavBar />

      <SettingsSheet />
    </>
  );
};

export default TabFeedPage;
