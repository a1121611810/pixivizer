import { type Component, Show, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import {
  autoCheckUpdate,
  hasUpdate,
  isCheckingUpdate,
  latestVersion,
  checkCompleted,
  setAutoCheckUpdate,
  setHasUpdate,
  setIsCheckingUpdate,
  setLatestVersion,
  setLatestReleaseUrl,
  setCheckCompleted,
} from "../stores/uiStore";
import { isLoggedIn, logout } from "../stores/authStore";
import { checkForUpdate } from "../services/updateService";
import PageTransition from "../components/PageTransition";
import FluentIcon from "../components/ui/FluentIcon";

async function handleCheckUpdate() {
  if (isCheckingUpdate()) {
    return;
  }
  setIsCheckingUpdate(true);
  const result = await checkForUpdate();
  setHasUpdate(result.hasUpdate);
  setLatestVersion(result.latestVersion);
  setLatestReleaseUrl(result.latestReleaseUrl);
  setIsCheckingUpdate(false);
  setCheckCompleted(true);
  if (result.hasUpdate && result.latestReleaseUrl) {
    window.open(result.latestReleaseUrl, "_blank", "noopener,noreferrer");
  }
}

function openDeleteAccountPage() {
  window.open("https://www.pixiv.net/leave.php", "_blank", "noopener,noreferrer");
}

const SettingsAbout: Component = () => {
  const navigate = useNavigate();
  const [dialogState, setDialogState] = createSignal<{ type: "deleteAccount" } | null>(null);
  const [actionToast, setActionToast] = createSignal<string | null>(null);

  async function handleLogout() {
    try {
      await logout();
      void navigate({ to: "/login", replace: true });
      setActionToast("已退出登录");
    } catch {
      setActionToast("退出登录失败");
    }
  }

  return (
    <PageTransition>
      <div class="min-h-screen pb-16 bg-[var(--colorNeutralBackground2)]">
        {/* Sticky header */}
        <header class="sticky top-0 z-20 surface-appbar h-12 flex items-center px-4 gap-3">
          <fluent-button
            appearance="subtle"
            aria-label="返回"
            on:click={() => navigate({ to: "/settings" })}
            style="min-width:32px;width:32px;height:32px;padding:0"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15.53 4.22a.75.75 0 0 1 0 1.06L8.81 12l6.72 6.72a.75.75 0 1 1-1.06 1.06l-7.25-7.25a.75.75 0 0 1 0-1.06l7.25-7.25a.75.75 0 0 1 1.06 0z"
                fill="currentColor"
              />
            </svg>
          </fluent-button>
          <h1 class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] flex-1">
            关于
          </h1>
        </header>

        {/* Action toast */}
        <Show when={actionToast()}>
          <fluent-message-bar
            intent="success"
            style="position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:60;pointer-events:none"
          >
            {actionToast()}
          </fluent-message-bar>
        </Show>

        <div class="p-4 space-y-4">
          {/* ── Brand area ── */}
          <div class="surface-flyout p-6 flex flex-col items-center gap-3">
            {/* Pictelio logo */}
            <svg width="56" height="56" viewBox="0 0 192 192" fill="none" aria-hidden="true">
              <defs>
                <filter id="aboutShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="6"
                    flood-color="#000000"
                    flood-opacity="0.08"
                  />
                </filter>
              </defs>
              <rect
                x="12"
                y="12"
                width="168"
                height="168"
                rx="44"
                fill="#ffffff"
                filter="url(#aboutShadow)"
              />
              <svg x="36" y="36" width="120" height="120" viewBox="0 0 64 64">
                <path
                  d="M18 12 C18 12 16 28 19 52 C19 52 22 54 24 50 C26 47 24 39 26 33 C26 33 37 35 45 27 C51 21 47 13 38 11 C31 9 24 12 18 12 Z"
                  fill="#2b579a"
                />
                <path
                  d="M22 16 C22 16 21 28 23 46"
                  fill="none"
                  stroke="#5a9fd4"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <circle cx="42" cy="19" r="2" fill="#7ab8e8" />
                <circle cx="46" cy="25" r="1.5" fill="#7ab8e8" />
              </svg>
            </svg>
            <div class="text-center">
              <p class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
                Pictelio
              </p>
              <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] mt-0.5">
                第三方插画浏览器 · v{APP_VERSION}
              </p>
            </div>
          </div>

          {/* ── 启动时检查更新 ── */}
          <div class="surface-flyout p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 4.5a7.5 7.5 0 0 0-5.303 12.803.75.75 0 0 0 1.06-1.06A6 6 0 1 1 18 12h-3.75a.75.75 0 0 0-.53 1.28l3.25 3.247a.75.75 0 0 0 1.06 0l3.25-3.247A.75.75 0 0 0 20.28 12H16.5A7.5 7.5 0 0 0 12 4.5z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    启动时检查更新
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    每次打开 App 时后台检测新版本
                  </p>
                </div>
              </div>
              <fluent-switch
                checked={autoCheckUpdate()}
                on:change={() => setAutoCheckUpdate(!autoCheckUpdate())}
                aria-label="启动时检查更新"
              />
            </div>
          </div>

          {/* ── 检查更新 ── */}
          <div
            class="surface-flyout p-4 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)]"
            onClick={handleCheckUpdate}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCheckUpdate();
              }
            }}
            role="button"
            tabindex="0"
            aria-label="检查更新"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.25 14.66l-4-4a.75.75 0 0 1 1.06-1.06l2.97 2.97 5.22-5.97a.75.75 0 1 1 1.14 1l-5.75 6.5a.75.75 0 0 1-.56.25.75.75 0 0 1-.55-.23l-.53-.52V16.66z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  检查更新
                </p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0 ml-3">
                <Show when={isCheckingUpdate()}>
                  <fluent-spinner size="tiny"></fluent-spinner>
                </Show>
                <Show when={checkCompleted() && !isCheckingUpdate()}>
                  <span
                    class="[font-size:var(--fontSizeBase200)] font-semibold leading-snug"
                    classList={{
                      "text-[var(--colorStatusSuccessForeground1)]":
                        !hasUpdate() && latestVersion() !== "",
                      "text-[var(--colorBrandForeground1)]": hasUpdate(),
                      "text-[var(--colorNeutralForeground3)]": latestVersion() === "",
                    }}
                  >
                    {latestVersion() !== ""
                      ? hasUpdate()
                        ? `v${latestVersion()} ✨`
                        : `v${APP_VERSION} ✅`
                      : `v${APP_VERSION} 🔄`}
                  </span>
                </Show>
              </div>
            </div>
          </div>

          {/* ── 退出登录 ── */}
          <Show when={isLoggedIn()}>
            <div
              class="surface-flyout p-4 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)]"
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

          {/* ── 删除 Pixiv 账号 ── */}
          <div
            class="surface-flyout p-4 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)]"
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
        </div>

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
          <fluent-button
            slot="actions"
            appearance="secondary"
            on:click={() => setDialogState(null)}
          >
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
      </div>
    </PageTransition>
  );
};

export default SettingsAbout;
