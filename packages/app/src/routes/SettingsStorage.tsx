import { type Component, Show, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { useDnsOverride, setUseDnsOverride, resetUiStore } from "../stores/uiStore";
import { clearImageCache } from "../utils/imageLoader";
import { resetBlockedIds } from "../stores/blockStore";
import { clearAll as clearNovelCache } from "../stores/novelCache";
import { resetReportedIds } from "../stores/reportStore";
import { logout } from "../stores/authStore";
import PageTransition from "../components/PageTransition";
import FluentIcon from "../components/ui/FluentIcon";

const SettingsStorage: Component = () => {
  const navigate = useNavigate();
  const [dialogState, setDialogState] = createSignal<{ type: "clear" } | null>(null);
  const [actionToast, setActionToast] = createSignal<string | null>(null);

  async function handleClearLocalData() {
    try {
      await logout();
      clearImageCache();
      await clearNovelCache();
      resetBlockedIds();
      resetReportedIds();
      await Preferences.clear();
      await resetUiStore();
      setDialogState(null);
      void navigate({ to: "/login", replace: true });
      setActionToast("本地数据已清除");
    } catch {
      setActionToast("清除失败，请重试");
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
            存储与缓存
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
          {/* ── 图片缓存管理 ── */}
          <div
            class="surface-flyout p-4 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)]"
            onClick={() => void navigate({ to: "/image-cache" })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void navigate({ to: "/image-cache" });
              }
            }}
            role="button"
            tabindex="0"
            aria-label="图片缓存"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)] flex items-center justify-center">
                  <FluentIcon name="server" size={24} />
                </div>
                <div class="min-w-0">
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    图片缓存管理
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    缓存层级开关、容量限制、清除缓存
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

          {/* ── DNS over HTTPS ── */}
          <div class="surface-flyout p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm1.75 5.44l-1.22-1.22a.75.75 0 0 0-1.06 0l-1.22 1.22a.75.75 0 1 0 1.06 1.06l.69-.69v4.19a.75.75 0 0 0 1.5 0V8.81l.69.69a.75.75 0 0 0 1.06-1.06z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    DNS over HTTPS
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    实验性
                    {Capacitor.isNativePlatform()
                      ? " · 仅 Android 生效"
                      : " · 仅适用于 Android 原生应用"}
                  </p>
                </div>
              </div>
              <fluent-switch
                checked={useDnsOverride()}
                disabled={!Capacitor.isNativePlatform()}
                on:change={() => setUseDnsOverride(!useDnsOverride())}
                aria-label="DNS over HTTPS"
              />
            </div>
          </div>

          {/* ── 清除所有本地数据 ── */}
          <div
            class="surface-flyout p-4 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)]"
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
        </div>

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
          <fluent-button
            slot="actions"
            appearance="secondary"
            on:click={() => setDialogState(null)}
          >
            取消
          </fluent-button>
          <fluent-button slot="actions" appearance="primary" on:click={handleClearLocalData}>
            确认清除
          </fluent-button>
        </fluent-dialog>
      </div>
    </PageTransition>
  );
};

export default SettingsStorage;
