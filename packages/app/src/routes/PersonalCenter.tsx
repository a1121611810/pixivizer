import { type Component, onMount, Show, createSignal, createEffect } from "solid-js";
import { useNavigate, useParams, useRouter, useLocation, Outlet } from "@tanstack/solid-router";
import { Capacitor } from "@capacitor/core";
import { user } from "@/stores/authStore";
import { setCurrentTab } from "@/stores/uiStore";
import { profile, viewedUser, loadProfile, loadFollowing } from "@/stores/userStore";
import { resolveImageUrl, loadImage } from "@/utils/imageLoader";
import FluentIcon from "@/components/ui/FluentIcon";

interface Props {
  userId?: string;
}

const isNative = Capacitor.isNativePlatform();

/** 为 role="button" 的 div 提供键盘激活（Enter/Space） */
function handleKeyDown(e: KeyboardEvent, action: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    action();
  }
}

const PersonalCenter: Component<Props> = (props) => {
  const navigate = useNavigate();
  const router = useRouter();
  const params = useParams({ strict: false });
  const location = useLocation();
  const targetUserId = () => Number(props.userId || params().id || user()?.id || 0);
  const displayUser = () => viewedUser() || user();
  // 判断是否在子路由（/user/$id/illusts、/user/$id/following、/user/$id/followers）
  // 如果在子路由，只渲染 <Outlet /> 让子页面显示；否则渲染个人中心主页内容
  const isRootUserPage = () => /^\/(?:me|user\/\d+)$/.test(location().pathname);
  const totalWorks = () =>
    (profile()?.total_illusts ?? 0) +
    (profile()?.total_manga ?? 0) +
    (profile()?.total_novels ?? 0);

  //── 头像加载 ──
  const [avatarUrl, setAvatarUrl] = createSignal("");
  const [avatarErrored, setAvatarErrored] = createSignal(false);

  createEffect(() => {
    const u = displayUser();
    if (!u) {
      setAvatarUrl("");
      return;
    }
    const src = u.profile_image_urls.px_50x50 || u.profile_image_urls.medium || "";
    if (!src) {
      setAvatarUrl("");
      return;
    }
    setAvatarErrored(false);
    if (isNative) {
      loadImage(src)
        .then((r) => setAvatarUrl(r.url))
        .catch(() => setAvatarErrored(true));
    } else {
      setAvatarUrl(resolveImageUrl(src));
    }
  });

  onMount(() => {
    setCurrentTab("me");
    const uid = targetUserId();
    if (uid) {
      loadProfile(uid);
      loadFollowing(uid);
    }
  });

  return (
    <Show when={isRootUserPage()} fallback={<Outlet />}>
      <div class="min-h-screen" style={{ "background-color": "var(--pageCardBg)" }}>
        {/* 顶部栏：返回按钮 + 搜索入口 */}
        <div class="flex items-center justify-between px-4 pt-3">
          <fluent-button
            appearance="subtle"
            aria-label="返回"
            on:click={() => router.history.back()}
            class="w-10 h-10 p-0 min-w-10"
          >
            ←
          </fluent-button>

          <div
            class="flex items-center gap-1.5 rounded-full bg-[var(--pageCardSearchBg)] px-4 py-2 cursor-pointer active:scale-[0.97] transition-transform focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)]"
            onClick={() => void navigate({ to: "/search" })}
            onKeyDown={(e) => handleKeyDown(e, () => navigate({ to: "/search" }))}
            role="button"
            tabindex="0"
            aria-label="搜索"
          >
            <FluentIcon name="search" size={16} />
            <span class="text-sm text-[var(--pageCardTextSecondary)]">搜索</span>
          </div>
        </div>

        {/* 用户信息卡片 */}
        <div class="px-4 mt-4">
          <div class="bg-[var(--pageCardSurface)] rounded-[var(--pageCardRadius)] p-5 flex items-center gap-4 shadow-[var(--pageCardShadow)]">
            <Show
              when={!avatarErrored() && avatarUrl()}
              fallback={
                <div class="w-14 h-14 rounded-full bg-[var(--colorBrandBackground)] flex items-center justify-center text-white [font-size:var(--fontSizeBase500)] font-semibold flex-shrink-0">
                  {displayUser()?.name?.charAt(0) || "P"}
                </div>
              }
            >
              <img
                src={avatarUrl()}
                alt={displayUser()?.name ?? ""}
                class="w-14 h-14 rounded-full object-cover flex-shrink-0"
                onError={() => setAvatarErrored(true)}
              />
            </Show>
            <div class="flex-1 min-w-0">
              <div class="text-lg font-bold text-[var(--pageCardTextPrimary)] truncate font-sans">
                {displayUser()?.name || "Pictelio"}
              </div>
            </div>
          </div>
        </div>

        {/* 功能菜单卡片组 */}
        <div class="px-4 mt-4">
          <div class="bg-[var(--pageCardSurface)] rounded-[var(--pageCardRadius)] shadow-[var(--pageCardShadow)]">
            {/* 我的作品 */}
            <div
              class="flex items-center px-5 py-4 gap-3 cursor-pointer active:scale-[0.98] transition-transform border-b border-[var(--pageCardBorder)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--colorStrokeFocus2)]"
              onClick={() => void navigate({ to: `/user/${targetUserId()}/illusts` })}
              onKeyDown={(e) =>
                handleKeyDown(e, () => navigate({ to: `/user/${targetUserId()}/illusts` }))
              }
              role="button"
              tabindex="0"
              aria-label="我的作品"
            >
              <FluentIcon name="image" size={22} />
              <span class="flex-1 text-base font-medium text-[var(--pageCardTextPrimary)] font-sans">
                我的作品
              </span>
              <span class="text-sm text-[var(--pageCardTextSecondary)] mr-1">{totalWorks()}</span>
              <FluentIcon name="chevronRight" size={16} />
            </div>

            {/* 我的收藏 */}
            <div
              class="flex items-center px-5 py-4 gap-3 cursor-pointer active:scale-[0.98] transition-transform border-b border-[var(--pageCardBorder)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--colorStrokeFocus2)]"
              onClick={() => void navigate({ to: "/bookmarks" })}
              onKeyDown={(e) => handleKeyDown(e, () => navigate({ to: "/bookmarks" }))}
              role="button"
              tabindex="0"
              aria-label="我的收藏"
            >
              <FluentIcon name="bookmark" size={22} />
              <span class="flex-1 text-base font-medium text-[var(--pageCardTextPrimary)] font-sans">
                我的收藏
              </span>
              <span class="text-sm text-[var(--pageCardTextSecondary)] mr-1">
                {profile()?.total_illust_bookmarks_public ?? 0}
              </span>
              <FluentIcon name="chevronRight" size={16} />
            </div>

            {/* 我的关注 */}
            <div
              class="flex items-center px-5 py-4 gap-3 cursor-pointer active:scale-[0.98] transition-transform border-b border-[var(--pageCardBorder)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--colorStrokeFocus2)]"
              onClick={() => void navigate({ to: `/user/${targetUserId()}/following` })}
              onKeyDown={(e) =>
                handleKeyDown(e, () => navigate({ to: `/user/${targetUserId()}/following` }))
              }
              role="button"
              tabindex="0"
              aria-label="我的关注"
            >
              <FluentIcon name="people" size={22} />
              <span class="flex-1 text-base font-medium text-[var(--pageCardTextPrimary)] font-sans">
                我的关注
              </span>
              <span class="text-sm text-[var(--pageCardTextSecondary)] mr-1">
                {profile()?.total_follow_users ?? 0}
              </span>
              <FluentIcon name="chevronRight" size={16} />
            </div>

            {/* 我的粉丝 */}
            <div
              class="flex items-center px-5 py-4 gap-3 cursor-pointer active:scale-[0.98] transition-transform focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--colorStrokeFocus2)]"
              onClick={() => void navigate({ to: `/user/${targetUserId()}/followers` })}
              onKeyDown={(e) =>
                handleKeyDown(e, () => navigate({ to: `/user/${targetUserId()}/followers` }))
              }
              role="button"
              tabindex="0"
              aria-label="我的粉丝"
            >
              <FluentIcon name="people" size={22} />
              <span class="flex-1 text-base font-medium text-[var(--pageCardTextPrimary)] font-sans">
                我的粉丝
              </span>
              <span class="text-sm text-[var(--pageCardTextSecondary)] mr-1">
                {profile()?.total_mypixiv_users ?? 0}
              </span>
              <FluentIcon name="chevronRight" size={16} />
            </div>
          </div>
        </div>

        {/* 设置卡片 */}
        <div class="px-4 mt-3">
          <div class="bg-[var(--pageCardSurface)] rounded-[var(--pageCardRadius)] shadow-[var(--pageCardShadow)]">
            <div
              class="flex items-center px-5 py-4 gap-3 cursor-pointer active:scale-[0.98] transition-transform focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--colorStrokeFocus2)]"
              onClick={() => void navigate({ to: "/settings" })}
              onKeyDown={(e) => handleKeyDown(e, () => navigate({ to: "/settings" }))}
              role="button"
              tabindex="0"
              aria-label="设置"
            >
              <FluentIcon name="settings" size={22} />
              <span class="flex-1 text-base font-medium text-[var(--pageCardTextPrimary)] font-sans">
                设置
              </span>
              <FluentIcon name="chevronRight" size={16} />
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default PersonalCenter;
