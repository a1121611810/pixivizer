import { type Component, createSignal, createEffect, Show } from "solid-js";
import { Capacitor } from "@capacitor/core";
import { user } from "../stores/authStore";
import { loadImage, resolveImageUrl } from "../utils/imageLoader";

const isNative = Capacitor.isNativePlatform();

const UserAvatar: Component = () => {
  const [avatarUrl, setAvatarUrl] = createSignal("");

  createEffect(() => {
    const u = user();
    if (!u) return;
    const src = u.profile_image_urls.px_50x50;
    if (isNative) {
      loadImage(src).then((r) => setAvatarUrl(r.url));
    } else {
      setAvatarUrl(resolveImageUrl(src));
    }
  });

  return (
    <Show when={avatarUrl()}>
      <img src={avatarUrl()} class="w-6 h-6 rounded-[var(--borderRadiusCircular)] flex-shrink-0" />
    </Show>
  );
};

export default UserAvatar;
