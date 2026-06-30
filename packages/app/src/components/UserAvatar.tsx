import { type Component, createSignal, createEffect } from "solid-js";
import { Capacitor } from "@capacitor/core";
import { user } from "../stores/authStore";
import { loadImage, resolveImageUrl } from "../utils/imageLoader";

const isNative = Capacitor.isNativePlatform();

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

  return (
    <fluent-avatar
      src={avatarUrl() || undefined}
      alt="用户头像"
      size="24"
      shape="circular"
    />
  );
};

export default UserAvatar;
