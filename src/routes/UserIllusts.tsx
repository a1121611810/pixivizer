import { type Component, createEffect } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { user } from "../stores/authStore";
import {
  illusts,
  nextUrl,
  loading,
  error,
  contentType,
  load,
  loadMore,
  switchType,
} from "../stores/userIllustsStore";
import { viewedUser, loadProfile } from "../stores/userStore";
import VirtualFeed from "../components/VirtualFeed";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import SettingsSheet from "../components/SettingsSheet";

const UserIllusts: Component = () => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const userId = () => Number(params.id);

  createEffect(() => {
    const uid = userId();
    if (uid) {
      load(uid, contentType());
      loadProfile(uid);
    }
  });

  return (
    <>
      <PageTransition>
        <div class="pb-16">
          <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4 gap-3">
            <button onClick={() => navigate(-1)} class="btn-icon" aria-label="返回">
              ←
            </button>
            <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none truncate">
              {(viewedUser() || user())?.name ?? ""} 的作品
            </h1>
          </header>

          {/* Segmented: 插画 / 漫画 */}
          <div class="px-4 py-3">
            <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
              <button
                classList={{
                  "segmented-item-active": contentType() === "illust",
                  "segmented-item-inactive": contentType() !== "illust",
                }}
                onClick={() => {
                  switchType("illust");
                  load(userId(), "illust");
                }}
              >
                插画
              </button>
              <button
                classList={{
                  "segmented-item-active": contentType() === "manga",
                  "segmented-item-inactive": contentType() !== "manga",
                }}
                onClick={() => {
                  switchType("manga");
                  load(userId(), "manga");
                }}
              >
                漫画
              </button>
            </div>
          </div>

          <VirtualFeed
            illusts={illusts()}
            loading={loading()}
            error={error()}
            hasMore={nextUrl() !== null}
            onIllustClick={(id) => navigate(`/illust/${id}`)}
            onLoadMore={loadMore}
            onRefresh={async () => {
              const uid = userId();
              if (uid) await load(uid, contentType());
            }}
          />
        </div>
      </PageTransition>

      <NavBar />

      <SettingsSheet />
    </>
  );
};

export default UserIllusts;
