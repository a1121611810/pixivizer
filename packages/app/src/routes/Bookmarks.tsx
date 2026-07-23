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
import { createScrollDrivenVisibility } from "../primitives/createScrollDrivenVisibility";

const Bookmarks: Component = () => {
  const navigate = useNavigate();
  const { visible: headerVisible, suppress: suppressHeaderVisibility } =
    createScrollDrivenVisibility();

  onMount(() => {
    setCurrentTab("bookmarks");
  });

  return (
    <>
      <PageTransition>
        <div class="pb-16">
          <header
            class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4 transition-transform duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
            classList={{
              "translate-y-0": headerVisible(),
              "-translate-y-full": !headerVisible(),
            }}
            onDblClick={scrollToTop}
          >
            <h1
              class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--pageCardTextPrimary)] tracking-tight leading-none flex items-center gap-2 min-w-0"
              classList={{ "cursor-pointer": isLoggedIn() }}
              onClick={() => isLoggedIn() && void navigate({ to: "/me" })}
            >
              <Show when={isLoggedIn() && user()} fallback={<>Pictelio</>}>
                <UserAvatar />
                <span class="truncate max-w-[120px]">{user()!.name}</span>
              </Show>
            </h1>
          </header>

          <Show
            when={contentType() === "illust"}
            fallback={<NovelBookmarks suppressHeaderVisibility={suppressHeaderVisibility} />}
          >
            <IllustBookmarks suppressHeaderVisibility={suppressHeaderVisibility} />
          </Show>
        </div>
      </PageTransition>

      <NavBar />
    </>
  );
};

export default Bookmarks;
