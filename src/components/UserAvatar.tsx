import { type Component, createSignal, createEffect, Show } from "solid-js";
import { Capacitor } from "@capacitor/core";
import { user } from "../stores/authStore";
import { loadImage, resolveImageUrl } from "../utils/imageLoader";

const isNative = Capacitor.isNativePlatform();

const DEFAULT_AVATAR =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="%23e0e0e0"/><circle cx="12" cy="9" r="4" fill="%23bdbdbd"/><path d="M5 20c0-4 3.1-7 7-7s7 3 7 7" fill="%23bdbdbd"/></svg>`,
  );

const UserAvatar: Component = () => {
  const [avatarUrl, setAvatarUrl] = createSignal("");

  createEffect(() => {
    const u = user();
    if (!u) return;
    const src = u.profile_image_urls.px_50x50 || u.profile_image_urls.medium || "";
    if (isNative) {
      loadImage(src).then((r) => setAvatarUrl(r.url));
    } else {
      setAvatarUrl(resolveImageUrl(src));
    }
  });

  function onError(e: Event) {
    const img = e.target as HTMLImageElement;
    if (img.src !== DEFAULT_AVATAR) img.src = DEFAULT_AVATAR;
  }

  return (
    <Show when={avatarUrl()}>
      <img
        src={avatarUrl()}
        class="w-6 h-6 rounded-[var(--borderRadiusCircular)] flex-shrink-0"
        onError={onError}
      />
    </Show>
  );
};

export default UserAvatar;
