import { type Component, onMount, Show } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { user, isLoggedIn } from "../stores/authStore";
import UserAvatar from "../components/UserAvatar";
import { setCurrentTab, contentType } from "../stores/uiStore";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import IllustBookmarks from "./IllustBookmarks";
import NovelBookmarks from "./NovelBookmarks";
import { scrollToTop } from "../utils/scrollToTop";

const Bookmarks: Component = () => {
  const navigate = useNavigate();

  onMount(() => {
    setCurrentTab("bookmarks");
  });

  return (
    <>
      <PageTransition>
        <div class="pb-16">
          <header
            class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4"
            onDblClick={scrollToTop}
          >
            <h1
              class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] tracking-tight leading-none flex items-center gap-2 min-w-0"
              classList={{ "cursor-pointer": isLoggedIn() }}
              onClick={() => isLoggedIn() && void navigate({ to: "/me" })}
            >
              <Show when={isLoggedIn() && user()} fallback={<>Pictelio</>}>
                <UserAvatar />
                <span class="truncate max-w-[120px]">{user()!.name}</span>
              </Show>
            </h1>
          </header>

          <Show when={contentType() === "illust"} fallback={<NovelBookmarks />}>
            <IllustBookmarks />
          </Show>
        </div>
      </PageTransition>

      <NavBar />
    </>
  );
};

export default Bookmarks;
