import { type Component, onMount, onCleanup, Show, createMemo, createSignal } from "solid-js";
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
  recommendSubTab,
  setRecommendSubTab,
  type RecommendSubTab,
} from "../stores/feedStore";
import {
  setCurrentTab,
  openSettingsDrawer,
  layoutMode,
  contentType,
  setContentType,
} from "../stores/uiStore";
import type { Tab } from "../stores/uiStore";
import type { PixivIllust } from "../api/types";
import { user, isLoggedIn } from "../stores/authStore";
import UserAvatar from "../components/UserAvatar";
import VirtualFeed from "../components/VirtualFeed";
import NavBar from "../components/NavBar";
import NovelFeedPage from "./NovelFeedPage";
import PageTransition from "../components/PageTransition";
import SettingsDrawer from "../components/SettingsDrawer";

interface Props {
  tab: Tab;
}

const r18Handler = () => refresh();

function scrollToTop() {
  window.scroll(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

const TabFeedPage: Component<Props> = (props) => {
  const navigate = useNavigate();
  const cached = isFeedCached(props.tab);
  const [isSwitchingSubTab, setIsSwitchingSubTab] = createSignal(false);

  const filteredIllusts = createMemo<PixivIllust[]>(() => {
    // Track followTab changes so filter updates immediately
    followTab();
    return illusts(); // feedStore.computeFollowIllusts() already handles follow tab filtering
  });

  // Set current tab on mount so feedStore knows which data to fetch
  onMount(() => {
    setCurrentTab(props.tab);
    void ensureLoaded();
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

  // Content type changed -> save scroll position
  const contentTypeHandler = () => {
    saveTabScroll(props.tab);
  };
  onMount(() => {
    window.addEventListener("contentTypeChanged", contentTypeHandler);
    onCleanup(() => window.removeEventListener("contentTypeChanged", contentTypeHandler));
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
              onClick={() => isLoggedIn() && openSettingsDrawer()}
            >
              <Show when={isLoggedIn() && user()} fallback={<>Pictelio</>}>
                <UserAvatar />
                <span class="truncate max-w-[120px]">{user()!.name}</span>
              </Show>
            </h1>

            {/* ── Content type toggle ── */}
            <div class="flex items-center bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusSmall)] p-0.5 gap-0.5">
              <button
                class="px-2.5 py-1 rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase100)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                classList={{
                  "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                    contentType() === "illust",
                  "bg-transparent text-[var(--colorNeutralForeground2)]":
                    contentType() !== "illust",
                }}
                onClick={() => setContentType("illust")}
              >
                插画
              </button>
              <button
                class="px-2.5 py-1 rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase100)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                classList={{
                  "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                    contentType() === "novel",
                  "bg-transparent text-[var(--colorNeutralForeground2)]": contentType() !== "novel",
                }}
                onClick={() => setContentType("novel")}
              >
                小说
              </button>
            </div>
          </header>

          {/* ── 关注页三层过滤 ── */}
          <Show when={props.tab === "follow" && contentType() === "illust"}>
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

          {/* ── 推荐页子标签 ── */}
          <Show when={props.tab === "recommended" && contentType() === "illust"}>
            <div class="sticky top-12 z-10 surface-appbar px-4 pb-2" onDblClick={scrollToTop}>
              <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1 gap-1">
                {[
                  { key: "mixed" as RecommendSubTab, label: "综合" },
                  { key: "illust" as RecommendSubTab, label: "插画" },
                  { key: "manga" as RecommendSubTab, label: "漫画" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    role="tab"
                    aria-selected={recommendSubTab() === opt.key}
                    class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                    classList={{
                      "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                        recommendSubTab() === opt.key,
                      "bg-transparent text-[var(--colorNeutralForeground2)]":
                        recommendSubTab() !== opt.key,
                    }}
                    disabled={isSwitchingSubTab()}
                    classList={{
                      "opacity-50 cursor-not-allowed": isSwitchingSubTab(),
                    }}
                    onClick={async () => {
                      if (isSwitchingSubTab() || recommendSubTab() === opt.key) {
                        return;
                      }
                      setIsSwitchingSubTab(true);
                      try {
                        saveTabScroll(props.tab);
                        setRecommendSubTab(opt.key);
                        await ensureLoaded();
                        window.scrollTo(0, getFeedScrollY(props.tab));
                      } finally {
                        setIsSwitchingSubTab(false);
                      }
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </Show>

          <Show when={contentType() === "illust"} fallback={<NovelFeedPage tab={props.tab} />}>
            <VirtualFeed
              illusts={filteredIllusts()}
              loading={loading() || refreshing()}
              error={error()}
              hasMore={nextUrl() !== null}
              onIllustClick={(id) => navigate(`/illust/${id}`)}
              onLoadMore={fetchMore}
              onRefresh={refresh}
              skipAnimation={cached}
              layoutMode={layoutMode()}
              restoreScrollTop={cached ? getFeedScrollY(props.tab) : undefined}
            />
          </Show>
        </div>
      </PageTransition>

      <NavBar />

      <SettingsDrawer />
    </>
  );
};

export default TabFeedPage;
