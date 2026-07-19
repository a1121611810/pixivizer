import { type Component, Show, createSignal, createEffect, onCleanup } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import FluentIcon from "./ui/FluentIcon";
import { pushOverlay, popOverlay } from "../stores/backGestureStore";
import {
  showSettingsDrawer,
  closeSettingsDrawer,
  resetUiStore,
} from "../stores/uiStore";
import { isLoggedIn, logout, user } from "../stores/authStore";
import { clearImageCache, resolveImageUrl, loadImage } from "../utils/imageLoader";
import { resetBlockedIds } from "../stores/blockStore";
import { clearAll as clearNovelCache } from "../stores/novelCache";
import { resetReportedIds } from "../stores/reportStore";
import { profile, loadProfile } from "../stores/userStore";
import BlocklistSheet from "./BlocklistSheet";

function openDeleteAccountPage() {
  // TODO: Install @capacitor/browser and use Browser.open({ url }) for a native in-app/system browser experience.
  window.open("https://www.pixiv.net/leave.php", "_blank", "noopener,noreferrer");
}

function fmtNum(n: number | undefined): string {
  if (n == null) {
    return "—";
  }
  if (n >= 10_000) {
    return `${(n / 10_000).toFixed(1)}万`;
  }
  return String(n);
}

function AvatarFallback(props: { class?: string }) {
  return (
    <div
      class={`flex items-center justify-center bg-[var(--colorNeutralBackground2)] ${props.class || ""}`}
    >
      <svg
        width="60%"
        height="60%"
        viewBox="0 0 24 24"
        fill="none"
        class="text-[var(--colorNeutralForegroundDisabled)]"
      >
        <circle cx="12" cy="8" r="4" fill="currentColor" />
        <path d="M5 21c0-4 3.1-7 7-7s7 3 7 7" fill="currentColor" />
      </svg>
    </div>
  );
}

const SettingsDrawer: Component = () => {
  const navigate = useNavigate();
  const [ageGateMessage, setAgeGateMessage] = createSignal<string | null>(null);
  const [showBlocklist, setShowBlocklist] = createSignal(false);
  const [actionToast, setActionToast] = createSignal<string | null>(null);
  const [profileError, setProfileError] = createSignal(false);
  const isNative = Capacitor.isNativePlatform();
  const [settingsAvatarUrl, setSettingsAvatarUrl] = createSignal("");
  const [settingsAvatarErrored, setSettingsAvatarErrored] = createSignal(false);

  createEffect(() => {
    const u = user();
    if (!u) {
      setSettingsAvatarUrl("");
      return;
    }
    const src =
      u.profile_image_urls.medium ||
      u.profile_image_urls.px_170x170 ||
      u.profile_image_urls.px_50x50 ||
      "";
    console.log(
      src,
      !!u.profile_image_urls.medium,
      !!u.profile_image_urls.px_170x170,
      !!u.profile_image_urls.px_50x50,
    );
    if (!src) {
      setSettingsAvatarUrl("");
      return;
    }
    if (isNative) {
      loadImage(src)
        .then((r) => {
          setSettingsAvatarUrl(r.url);
        })
        .catch((err) => {});
    } else {
      const url = resolveImageUrl(src);
      setSettingsAvatarUrl(url);
    }
  });
  const [dialogState, setDialogState] = createSignal<
    { type: "clear" } | { type: "deleteAccount" } | null
  >(null);

  // Auto-hide the age gate hint toast
  createEffect(() => {
    if (ageGateMessage()) {
      const timer = setTimeout(() => setAgeGateMessage(null), 2500);
      onCleanup(() => clearTimeout(timer));
    }
  });

  // Auto-hide action toast
  createEffect(() => {
    if (actionToast()) {
      const timer = setTimeout(() => setActionToast(null), 2500);
      onCleanup(() => clearTimeout(timer));
    }
  });

  async function handleLogout() {
    try {
      await logout();
      closeSettingsDrawer();
      void navigate({ to: "/login", replace: true });
      setActionToast("已退出登录");
    } catch {
      setActionToast("退出登录失败");
    }
  }

  async function handleClearLocalData() {
    try {
      await logout();
      clearImageCache();
      await clearNovelCache();
      resetBlockedIds();
      resetReportedIds();
      await Preferences.clear();
      await resetUiStore();
      closeSettingsDrawer();
      void navigate({ to: "/login", replace: true });
      setActionToast("本地数据已清除");
    } catch {
      setActionToast("清除失败，请重试");
    } finally {
      closeSettingsDrawer();
    }
  }

  // SettingsDrawer 打开时压入 overlay 栈，关闭时弹出；同步关闭嵌套的 BlocklistSheet
  createEffect(() => {
    if (showSettingsDrawer()) {
      setProfileError(false);
      // 利用缓存，几乎零成本
      loadProfile().catch(() => setProfileError(true));
      pushOverlay("settingsDrawer", closeSettingsDrawer);

      onCleanup(() => {
        setShowBlocklist(false);
        popOverlay("settingsDrawer");
      });
    }
  });

  // BlocklistSheet 打开时压入 overlay 栈，确保返回键先关闭子面板
  createEffect(() => {
    if (showBlocklist()) {
      pushOverlay("blocklistSheet", () => setShowBlocklist(false));
      onCleanup(() => {
        popOverlay("blocklistSheet");
      });
    }
  });

  // Close Drawer時清理狀態
  createEffect(() => {
    if (!showSettingsDrawer()) {
      setDialogState(null);
      setAgeGateMessage(null);
      setActionToast(null);
    }
  });

  // Drawer 控制器 — fluent-drawer 使用 show()/hide() 方法，不支持 open 属性
  createEffect(() => {
    const drawerEl = document.querySelector("fluent-drawer");
    if (!drawerEl) {
      return;
    }
    if (showSettingsDrawer()) {
      drawerEl.show();
    } else {
      drawerEl.hide();
    }
  });

  return (
    <>
      {/* Age gate hint toast */}
      <Show when={ageGateMessage()}>
        <fluent-message-bar
          intent="warning"
          style="position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:60;pointer-events:none"
        >
          {ageGateMessage()}
        </fluent-message-bar>
      </Show>

      {/* Action success toast */}
      <Show when={actionToast()}>
        <fluent-message-bar
          intent="success"
          style="position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:60;pointer-events:none"
        >
          {actionToast()}
        </fluent-message-bar>
      </Show>

      <fluent-drawer
        type="modal"
        position="start"
        on:toggle={(e: CustomEvent) => {
          if (e.detail?.newState === "closed") {
            closeSettingsDrawer();
          }
        }}
      >
        {/* ════════════════════════════════════════════ */}
        {/* Drawer Header */}
        {/* ════════════════════════════════════════════ */}
        <div class="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
            设置
          </h2>
          <fluent-button
            appearance="subtle"
            aria-label="关闭设置"
            on:click={closeSettingsDrawer}
            style="min-width:32px;width:32px;height:32px;padding:0"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M15.14 4.86a.67.67 0 0 0-.95 0L10 9.05 5.81 4.86a.67.67 0 0 0-.95.95L9.05 10l-4.19 4.19a.67.67 0 0 0 .95.95L10 10.95l4.19 4.19a.67.67 0 0 0 .95-.95L10.95 10l4.19-4.19a.67.67 0 0 0 0-.95z"
                fill="currentColor"
              />
            </svg>
          </fluent-button>
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* 个人概要区 */}
        {/* ════════════════════════════════════════════ */}
        <Show when={user()}>
          <div class="flex flex-col items-center px-5 pt-4 pb-3">
            {/* Avatar */}
            <div class="relative w-20 h-20">
              <AvatarFallback class="absolute inset-0 rounded-[var(--borderRadiusCircular)] ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]" />
              <Show when={!settingsAvatarErrored() && settingsAvatarUrl()}>
                <img
                  src={settingsAvatarUrl()}
                  alt={user()!.name}
                  class="absolute inset-0 w-full h-full rounded-[var(--borderRadiusCircular)] object-cover ring-[var(--strokeWidthThin)] ring-[var(--colorNeutralStroke1)]"
                  onError={() => setSettingsAvatarErrored(true)}
                />
              </Show>
            </div>
            {/* Name */}
            <h2 class="mt-2 [font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
              {user()!.name}
            </h2>
            {/* Account */}
            <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)]">
              @{user()!.account}
            </p>
            {/* Stats card — 仅 profile 加载成功后显示 */}
            <Show when={profile()}>
              <div class="w-full mt-3 surface-card rounded-[var(--borderRadiusMedium)] px-4 py-3 flex">
                {/* 作品 */}
                <div
                  class="flex-1 text-center cursor-pointer rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
                  onClick={() => {
                    closeSettingsDrawer();
                    void navigate({ to: `/user/${user()!.id}/illusts` });
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="查看作品"
                >
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    {fmtNum(
                      (profile()?.total_illusts ?? 0) +
                        (profile()?.total_manga ?? 0) +
                        (profile()?.total_novels ?? 0),
                    )}
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    作品
                  </p>
                </div>
                {/* 关注 */}
                <div
                  class="flex-1 text-center cursor-pointer rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
                  onClick={() => {
                    closeSettingsDrawer();
                    void navigate({ to: `/user/${user()!.id}/following` });
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="查看关注"
                >
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    {fmtNum(profile()?.total_follow_users)}
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    关注
                  </p>
                </div>
                {/* 粉丝 */}
                <div
                  class="flex-1 text-center cursor-pointer rounded-[var(--borderRadiusMedium)] transition-all duration-[var(--durationFast)] ease-[var(--curveEasyEase)] hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.97] focus-visible:outline focus-visible:outline-offset-[var(--strokeWidthThin)] focus-visible:outline-[var(--colorStrokeFocus2)]"
                  onClick={() => {
                    closeSettingsDrawer();
                    void navigate({ to: `/user/${user()!.id}/followers` });
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="查看粉丝"
                >
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    {fmtNum(profile()?.total_mypixiv_users)}
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    粉丝
                  </p>
                </div>
              </div>
            </Show>
            {/* 数据未加载时显示占位骨架 */}
            <Show when={!profile() && !profileError() && user()}>
              <div class="w-full mt-3 surface-card rounded-[var(--borderRadiusMedium)] px-4 py-3 flex">
                <div class="flex-1 text-center">
                  <div class="h-5 w-10 bg-[var(--colorNeutralBackground2)] rounded mx-auto" />
                  <div class="h-3 w-6 bg-[var(--colorNeutralBackground2)] rounded mx-auto mt-1" />
                </div>
                <div class="flex-1 text-center">
                  <div class="h-5 w-10 bg-[var(--colorNeutralBackground2)] rounded mx-auto" />
                  <div class="h-3 w-6 bg-[var(--colorNeutralBackground2)] rounded mx-auto mt-1" />
                </div>
                <div class="flex-1 text-center">
                  <div class="h-5 w-10 bg-[var(--colorNeutralBackground2)] rounded mx-auto" />
                  <div class="h-3 w-6 bg-[var(--colorNeutralBackground2)] rounded mx-auto mt-1" />
                </div>
              </div>
            </Show>
            {/* 数据加载失败时显示占位 */}
            <Show when={profileError() && user()}>
              <div class="w-full mt-3 surface-card rounded-[var(--borderRadiusMedium)] px-4 py-3 flex">
                <div class="flex-1 text-center">
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    —
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    作品
                  </p>
                </div>
                <div class="flex-1 text-center">
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    —
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    关注
                  </p>
                </div>
                <div class="flex-1 text-center">
                  <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                    —
                  </p>
                  <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForeground3)] mt-0.5">
                    粉丝
                  </p>
                </div>
              </div>
            </Show>
          </div>
        </Show>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第1组：显示与交互 */}
        {/* ════════════════════════════════════════════ */}
        <div
          class="flex items-center justify-between py-3 px-5 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)]"
          onClick={() => {
            closeSettingsDrawer();
            void navigate({ to: "/settings/appearance" });
          }}
          role="button"
          tabindex="0"
          aria-label="显示与交互"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
              <FluentIcon name="weatherSunny" size={24} />
            </div>
            <div class="min-w-0">
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                显示与交互
              </p>
              <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                主题、颜色、布局模式
              </p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="flex-shrink-0 text-[var(--colorNeutralForeground3)] ml-2">
            <path d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z" fill="currentColor" />
          </svg>
        </div>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第2组：内容与过滤 */}
        {/* ════════════════════════════════════════════ */}
        <div
          class="flex items-center justify-between py-3 px-5 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)]"
          onClick={() => {
            closeSettingsDrawer();
            void navigate({ to: "/settings/content" });
          }}
          role="button"
          tabindex="0"
          aria-label="内容与过滤"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
              <FluentIcon name="filter" size={24} />
            </div>
            <div class="min-w-0">
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                内容与过滤
              </p>
              <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                R18 开关、屏蔽列表、年龄确认
              </p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="flex-shrink-0 text-[var(--colorNeutralForeground3)] ml-2">
            <path d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z" fill="currentColor" />
          </svg>
        </div>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第3组：存储与缓存 */}
        {/* ════════════════════════════════════════════ */}
        <div
          class="flex items-center justify-between py-3 px-5 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)]"
          onClick={() => {
            closeSettingsDrawer();
            void navigate({ to: "/settings/storage" });
          }}
          role="button"
          tabindex="0"
          aria-label="存储与缓存"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
              <FluentIcon name="server" size={24} />
            </div>
            <div class="min-w-0">
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                存储与缓存
              </p>
              <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                图片缓存、DNS、清除数据
              </p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="flex-shrink-0 text-[var(--colorNeutralForeground3)] ml-2">
            <path d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z" fill="currentColor" />
          </svg>
        </div>

        <fluent-divider></fluent-divider>

        {/* ════════════════════════════════════════════ */}
        {/* 第4组：账号与应用 */}
        {/* ════════════════════════════════════════════ */}
        <div class="px-5 py-3 flex flex-col">
          <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
            账号与应用
          </p>

          {/* 退出登录 */}
          <Show when={isLoggedIn()}>
            <div
              class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
              onClick={handleLogout}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleLogout();
                }
              }}
              role="button"
              tabindex="0"
              aria-label="退出登录"
            >
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <FluentIcon name="signOut" size={24} />
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    退出登录
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    清除当前登录凭证，不会删除本地其他数据
                  </p>
                </div>
              </div>
            </div>
          </Show>

          {/* 清除所有本地数据 */}
          <div
            class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
            onClick={() => setDialogState({ type: "clear" })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setDialogState({ type: "clear" });
              }
            }}
            role="button"
            tabindex="0"
            aria-label="清除所有本地数据"
          >
            <div class="flex items-center gap-3">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorStatusDangerForeground1)]">
                <FluentIcon name="delete" size={24} />
              </div>
              <div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorStatusDangerForeground1)] leading-snug">
                  清除所有本地数据
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  删除登录凭证、图片缓存、设置、屏蔽与举报记录
                </p>
              </div>
            </div>
          </div>

          {/* 删除 Pixiv 账号 */}
          <div
            class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
            onClick={() => setDialogState({ type: "deleteAccount" })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setDialogState({ type: "deleteAccount" });
              }
            }}
            role="button"
            tabindex="0"
            aria-label="删除 Pixiv 账号"
          >
            <div class="flex items-center gap-3">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                <FluentIcon name="open" size={24} />
              </div>
              <div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  删除 Pixiv 账号
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  打开 Pixiv 官方账号删除页面，按官方流程操作
                </p>
              </div>
            </div>
            {/* Chevron right */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              class="flex-shrink-0 text-[var(--colorNeutralForeground3)] ml-2"
            >
              <path
                d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z"
                fill="currentColor"
              />
            </svg>
          </div>

          {/* 关于 — 版本信息、更新检查 */}
          <div
            class="flex items-center justify-between py-3 px-1 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)]"
            onClick={() => {
              closeSettingsDrawer();
              void navigate({ to: "/settings/about" });
            }}
            role="button"
            tabindex="0"
            aria-label="关于"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                <FluentIcon name="info" size={24} />
              </div>
              <div class="min-w-0">
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  关于
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  版本 {APP_VERSION}、检查更新
                </p>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="flex-shrink-0 text-[var(--colorNeutralForeground3)] ml-2">
              <path d="M8.22 4.22a.75.75 0 0 1 1.06 0l7.25 7.25a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06-1.06L15.19 12 8.22 5.28a.75.75 0 0 1 0-1.06z" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Bottom spacer */}
        <div class="h-8" />
      </fluent-drawer>

      {/* BlocklistSheet */}
      <Show when={showBlocklist()}>
        <BlocklistSheet isOpen={showBlocklist()} onClose={() => { setShowBlocklist(false); }} />
      </Show>

      {/* Clear data dialog */}
      <fluent-dialog
        open={dialogState()?.type === "clear"}
        on:close={() => setDialogState(null)}
        aria-label="清除所有本地数据？"
      >
        <h3 slot="title">清除所有本地数据？</h3>
        <p>
          这将删除本应用在本机保存的全部数据，包括：登录凭证、图片缓存、浏览设置、屏蔽列表、举报记录。此操作不可恢复，但不会删除你的
          Pixiv 账号及其在 Pixiv 服务器上的数据。
        </p>
        <fluent-button slot="actions" appearance="secondary" on:click={() => setDialogState(null)}>
          取消
        </fluent-button>
        <fluent-button slot="actions" appearance="primary" on:click={handleClearLocalData}>
          确认清除
        </fluent-button>
      </fluent-dialog>

      {/* Delete account dialog */}
      <fluent-dialog
        open={dialogState()?.type === "deleteAccount"}
        on:close={() => setDialogState(null)}
        aria-label="删除 Pixiv 账号？"
      >
        <h3 slot="title">删除 Pixiv 账号？</h3>
        <p>
          Pictelio 是第三方客户端，无法直接删除你的 Pixiv 账号。点击确认将打开 Pixiv
          官方账号删除页面，请按官方流程操作。
        </p>
        <fluent-button slot="actions" appearance="secondary" on:click={() => setDialogState(null)}>
          取消
        </fluent-button>
        <fluent-button
          slot="actions"
          appearance="primary"
          on:click={() => {
            setDialogState(null);
            openDeleteAccountPage();
          }}
        >
          前往 Pixiv
        </fluent-button>
      </fluent-dialog>
    </>
  );
};

export default SettingsDrawer;
