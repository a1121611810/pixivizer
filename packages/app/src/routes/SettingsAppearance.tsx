import { type Component, Show } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import {
  theme,
  resolvedTheme,
  setThemePersisted,
  listQuality,
  setListQuality,
  detailQuality,
  setDetailQuality,
  type ImageQuality,
} from "../stores/uiStore";
import { colorTheme } from "../stores/themeStore";
import PageTransition from "../components/PageTransition";
import ThemeSelector from "../components/ThemeSelector";
import FluentIcon from "../components/ui/FluentIcon";

const SettingsAppearance: Component = () => {
  const navigate = useNavigate();

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
            外观设置
          </h1>
        </header>

        <div class="p-4 space-y-4">
          {/* ── 明暗主题 ── */}
          <Show when={colorTheme() === "fluent"}>
            <div class="surface-flyout p-4">
              <div class="flex items-center gap-3 mb-3">
                <div class="relative w-6 h-6 flex-shrink-0">
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: resolvedTheme() === "dark" ? 0 : 1,
                      transition: "opacity var(--durationFast) var(--curveEasyEase)",
                    }}
                  >
                    <FluentIcon name="weatherSunny" size={24} active />
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: resolvedTheme() === "dark" ? 1 : 0,
                      transition: "opacity var(--durationFast) var(--curveEasyEase)",
                    }}
                  >
                    <FluentIcon name="weatherMoon" size={24} active />
                  </div>
                </div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  明暗主题
                </p>
              </div>
              <div class="flex text-base rounded-[var(--borderRadiusCircular)] overflow-hidden border border-[var(--colorNeutralStroke2)]">
                {(["light", "system", "dark"] as const).map((t) => (
                  <button
                    onClick={() => setThemePersisted(t)}
                    class={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--durationNormal)] ${
                      theme() === t
                        ? "bg-[var(--colorCompoundBrandBackground)] text-white"
                        : "bg-transparent text-[var(--colorNeutralForeground2)] hover:text-[var(--colorNeutralForeground1)]"
                    }`}
                    aria-label={t === "light" ? "浅色" : t === "dark" ? "深色" : "跟随系统"}
                  >
                    {t === "light" ? "☀️ 浅色" : t === "dark" ? "🌙 深色" : "🔄 跟随"}
                  </button>
                ))}
              </div>
            </div>
          </Show>

          {/* ── 颜色主题 ── */}
          <div class="surface-flyout p-4">
            <div class="flex items-center gap-2 mb-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                class="text-[var(--colorNeutralForeground2)] flex-shrink-0"
              >
                <path
                  d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM7.75 9a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5zM7 12.75a.75.75 0 0 0 .75.75h8.5a.75.75 0 0 0 0-1.5h-8.5a.75.75 0 0 0-.75.75zM7.75 16a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5z"
                  fill="currentColor"
                />
              </svg>
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                颜色主题
              </p>
            </div>
            <ThemeSelector />
            <p class="mt-2 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
              选择应用整体配色；Fluent 默认支持明暗切换，其他主题为单模式
            </p>
          </div>

          {/* ── 列表画质 ── */}
          <div class="surface-flyout p-4">
            <div class="flex items-center gap-2 mb-3">
              <FluentIcon name="image" size={20} />
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                列表画质
              </p>
            </div>
            <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
              {(["medium", "large"] as ImageQuality[]).map((q) => (
                <button
                  class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                  classList={{
                    "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                      listQuality() === q,
                    "bg-transparent text-[var(--colorNeutralForeground2)]": listQuality() !== q,
                  }}
                  onClick={() => setListQuality(q)}
                >
                  {q === "medium" ? "默认" : "高清"}
                </button>
              ))}
            </div>
            <p class="mt-2 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
              控制首页推荐、关注和收藏列表中的图片清晰度
            </p>
          </div>

          {/* ── 详情画质 ── */}
          <div class="surface-flyout p-4">
            <div class="flex items-center gap-2 mb-3">
              <FluentIcon name="imageSearch" size={20} />
              <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                详情画质
              </p>
            </div>
            <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
              {(["medium", "large", "original"] as ImageQuality[]).map((q) => (
                <button
                  class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                  classList={{
                    "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                      detailQuality() === q,
                    "bg-transparent text-[var(--colorNeutralForeground2)]": detailQuality() !== q,
                  }}
                  onClick={() => setDetailQuality(q)}
                >
                  {q === "medium" ? "默认" : q === "large" ? "高清" : "原图"}
                </button>
              ))}
            </div>
            <p class="mt-2 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
              控制作品详情页中的图片清晰度
            </p>
          </div>

          {/* ── 布局设置入口 ── */}
          <div
            class="surface-flyout p-4 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)]"
            onClick={() => void navigate({ to: "/layout-settings" })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void navigate({ to: "/layout-settings" });
              }
            }}
            role="button"
            tabindex="0"
            aria-label="布局设置"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 6.25A3.25 3.25 0 0 1 6.25 3h11.5A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25zM6.25 4.5A1.75 1.75 0 0 0 4.5 6.25V9h2.25V5.25A1.72 1.72 0 0 0 6.25 4.5zM4.5 10.5v3h3v-3h-3zm4.5 0v3h3.75v-3H9zm5.25 0v3h3.75v-3h-3zm3.75-1.5h-3.75V5.25c.455 0 .873.173 1.188.48l.012.012.018.018c.315.315.506.735.532 1.19V9zm-5.25 0H9V5.25h3.75V9zm-8.25 6v2.75c0 .966.784 1.75 1.75 1.75h.5V15H4.5zm3.75 0v4.5H9V15H8.25zm5.25 0v4.5h.75V15h-.75zm5.25 0v4.5h.5a1.75 1.75 0 0 0 1.75-1.75V15h-2.25z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    布局设置
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    插画/小说布局模式、楼梯导航、自动隐藏导航栏
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
        </div>
      </div>
    </PageTransition>
  );
};

export default SettingsAppearance;
