import { type Component, onMount, createEffect } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { user } from "../stores/authStore";
import { setCurrentTab } from "../stores/uiStore";
import { illusts, nextUrl, loading, error, load, loadMore } from "../stores/userIllustsStore";
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
      load(uid);
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

          <VirtualFeed
            illusts={illusts()}
            loading={loading()}
            error={error()}
            hasMore={nextUrl() !== null}
            onIllustClick={(id) => navigate(`/illust/${id}`)}
            onLoadMore={loadMore}
            onRefresh={async () => {
              const uid = userId();
              if (uid) await load(uid);
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
