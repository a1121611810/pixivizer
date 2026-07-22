import { type Component, Show, createSignal, createEffect } from "solid-js";
import { useRouter } from "@tanstack/solid-router";
import { user } from "../stores/authStore";
import { viewedUser } from "../stores/userStore";
import { Capacitor } from "@capacitor/core";
import { resolveImageUrl, loadImage } from "../utils/imageLoader";
import { scrollToTop } from "../utils/scrollToTop";

interface Props {
  visible: boolean;
  onBack?: () => void;
}

function AvatarFallback(props: { class?: string }) {
  return (
    <div
      class={`flex items-center justify-center bg-[var(--colorNeutralBackground2)] ${props.class || ""}`}
    >
      <svg
        width="60%" height="60%" viewBox="0 0 24 24" fill="none"
        class="text-[var(--colorNeutralForegroundDisabled)]"
      >
        <circle cx="12" cy="8" r="4" fill="currentColor" />
        <path d="M5 21c0-4 3.1-7 7-7s7 3 7 7" fill="currentColor" />
      </svg>
    </div>
  );
}

const CollapsedHeader: Component<Props> = (props) => {
  const router = useRouter();
  const displayUser = () => user() || viewedUser();
  const isNative = Capacitor.isNativePlatform();
  const [avatarUrl, setAvatarUrl] = createSignal("");
  const [errored, setErrored] = createSignal(false);

  createEffect(() => {
    const u = displayUser();
    if (!u) {
      setAvatarUrl("");
      return;
    }
    const src = u.profile_image_urls.medium || u.profile_image_urls.px_50x50 || "";
    if (!src) {
      setAvatarUrl("");
      return;
    }
    setErrored(false);
    if (isNative) {
      loadImage(src).then((r) => setAvatarUrl(r.url)).catch(() => {});
    } else {
      setAvatarUrl(resolveImageUrl(src));
    }
  });

  return (
    <header
      class="surface-appbar fixed top-0 left-0 right-0 z-30 h-12 flex items-center px-4 gap-3 transition-all duration-[var(--durationSlow)] ease-[var(--curveEasyEase)]"
      classList={{
        "translate-y-0 opacity-100 pointer-events-auto": props.visible,
        "-translate-y-full opacity-0 pointer-events-none": !props.visible,
      }}
      onDblClick={scrollToTop}
    >
      <fluent-button
        appearance="subtle"
        aria-label="返回"
        class="w-8 h-8 p-0 min-w-8"
        on:click={() => (props.onBack ? props.onBack() : router.history.back())}
      >
        ←
      </fluent-button>

      <div class="flex items-center gap-2 min-w-0 flex-1">
        <div class="relative w-7 h-7 flex-shrink-0">
          <AvatarFallback class="absolute inset-0 rounded-[var(--borderRadiusCircular)]" />
          <Show when={!errored() && avatarUrl()}>
            <img
              src={avatarUrl()}
              alt={displayUser()?.name ?? ""}
              class="absolute inset-0 w-full h-full rounded-[var(--borderRadiusCircular)] object-cover"
              onError={() => setErrored(true)}
            />
          </Show>
        </div>
        <span class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)] truncate">
          {displayUser()?.name}
        </span>
      </div>
    </header>
  );
};

export default CollapsedHeader;
