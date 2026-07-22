import { type Component, onMount, onCleanup, createSignal, createEffect, Show } from "solid-js";
import { useNavigate, useParams } from "@tanstack/solid-router";
import { user } from "../stores/authStore";
import { setCurrentTab, layoutMode } from "../stores/uiStore";
import { createScrollPosition } from "@solid-primitives/scroll";

import {
  profile,
  error as userError,
  loadProfile,
  loadFollowing,
} from "../stores/userStore";
import {
  illusts,
  novels,
  nextUrl,
  loading,
  error,
  contentType,
  load,
  loadMore,
  saveScrollPosition,
} from "../stores/userIllustsStore";

import ProfileBackground from "../components/ProfileBackground";
import ProfileCard from "../components/ProfileCard";
import CollapsedHeader from "../components/CollapsedHeader";
import UserWorksFeed from "../components/UserWorksFeed";
import PageTransition from "../components/PageTransition";
import SettingsDrawer from "../components/SettingsDrawer";
import NavBar from "../components/NavBar";
import ErrorDisplay from "../components/ErrorDisplay";
import { createScrollDrivenVisibility } from "../primitives/createScrollDrivenVisibility";

interface Props {
  userId?: string;
}

const PersonalCenter: Component<Props> = (props) => {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const targetUserId = () => Number(props.userId || params().id || user()?.id || 0);
  const isSelf = () => targetUserId() === Number(user()?.id ?? 0);

  const scroll = createScrollPosition();
  const COLLAPSE_THRESHOLD = 140;
  const [collapsed, setCollapsed] = createSignal(false);

  //── 视差偏移：Layer 1 背景慢速移动 ──
  const parallaxOffset = () => Math.min(scroll.y * 0.3, 200);

  //── 信息卡透明度：60–140px 区间渐变 ──
  const cardProgress = () => {
    const y = scroll.y;
    if (y < 60) return 1;
    if (y >= COLLAPSE_THRESHOLD) return 0;
    return 1 - (y - 60) / (COLLAPSE_THRESHOLD - 60);
  };

  //── Collapsed header 显隐 ──
  const { suppress: suppressHeaderVisibility } =
    createScrollDrivenVisibility({ topGuard: COLLAPSE_THRESHOLD });

  createEffect(() => {
    setCollapsed(scroll.y > COLLAPSE_THRESHOLD);
  });

  onMount(() => {
    setCurrentTab("me");
  });

  //── Tab 切换 ──
  function handleTabSwitch(type: "illust" | "manga" | "novel") {
    saveScrollPosition(window.scrollY);
    load(targetUserId(), type);
  }

  //── 首次加载 ──
  onMount(() => {
    const uid = targetUserId();
    if (uid) {
      loadProfile(uid);
      loadFollowing(uid);
      load(uid, contentType());
    }
  });

  onCleanup(() => {
    saveScrollPosition(window.scrollY);
  });

  return (
    <>
      <PageTransition>
        <div class="relative min-h-screen pb-16">
          {/* ═══ Layer 1: Background ═══ */}
          <div
            class="fixed"
            style={{
              transform: `translateY(${parallaxOffset()}px)`,
              height: "55vh",
              "z-index": 0,
            }}
          >
            <ProfileBackground userId={targetUserId()} />
          </div>

          {/* ═══ Main content wrapper ═══ */}
          <div class="relative z-10">
            {/* ═══ Layer 3: Profile Card ═══ */}
            <div
              class="pt-12 px-4 transition-all duration-[var(--durationSlow)] ease-[var(--curveEasyEase)]"
              style={{
                opacity: cardProgress(),
                transform: `scale(${0.85 + cardProgress() * 0.15}) translateY(${(1 - cardProgress()) * -20}px)`,
                "pointer-events": cardProgress() < 0.1 ? "none" : "auto",
              }}
            >
              <Show when={profile()}>
                <ProfileCard targetUserId={targetUserId()} isSelf={isSelf()} />
              </Show>
            </div>

            {/* ═══ Layer 4: Content Section ═══ */}
            <div class="relative z-20 mt-4">
              {/* Segmented control */}
              <div class="px-4 py-3">
                <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
                  <button
                    classList={{
                      "segmented-item-active": contentType() === "illust",
                      "segmented-item-inactive": contentType() !== "illust",
                    }}
                    onClick={() => handleTabSwitch("illust")}
                  >
                    插画
                  </button>
                  <button
                    classList={{
                      "segmented-item-active": contentType() === "manga",
                      "segmented-item-inactive": contentType() !== "manga",
                    }}
                    onClick={() => handleTabSwitch("manga")}
                  >
                    漫画
                  </button>
                  <button
                    classList={{
                      "segmented-item-active": contentType() === "novel",
                      "segmented-item-inactive": contentType() !== "novel",
                    }}
                    onClick={() => handleTabSwitch("novel")}
                  >
                    小说
                  </button>
                </div>
              </div>

              {/* Works feed */}
              <div class="px-4">
                <Show when={userError()}>
                  <ErrorDisplay
                    error={userError()!}
                    onRetry={() => {
                      const uid = targetUserId();
                      if (uid) loadProfile(uid);
                    }}
                  />
                </Show>

                <UserWorksFeed
                  contentType={contentType()}
                  illusts={illusts()}
                  novels={novels()}
                  loading={loading()}
                  error={error()}
                  hasMore={nextUrl() !== null}
                  onIllustClick={(id) => void navigate({ to: `/illust/${id}` })}
                  onNovelClick={(id) => void navigate({ to: `/novel/${id}` })}
                  onLoadMore={loadMore}
                  onRefresh={async () => {
                    const uid = targetUserId();
                    if (uid) {
                      await load(uid, contentType(), true);
                    }
                  }}
                  layoutMode={layoutMode()}
                  suppressHeaderVisibility={suppressHeaderVisibility}
                />
              </div>
            </div>
          </div>
        </div>
      </PageTransition>

      {/* ═══ Collapsed Header ═══ */}
      <CollapsedHeader visible={collapsed()} />

      <SettingsDrawer />
      <NavBar />
    </>
  );
};

export default PersonalCenter;
