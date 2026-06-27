import { type Component, Show, createSignal, createEffect, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  showSettingsSheet,
  setShowSettingsSheet,
  theme,
  setTheme,
  listQuality,
  setListQuality,
  detailQuality,
  setDetailQuality,
  type ImageQuality,
  cacheSize,
  setCacheSize,
  usePredictiveBack,
  setUsePredictiveBack,
  isPredictiveBackSupported,
  autoHideNavBar,
  setAutoHideNavBar,
  showR18,
  setShowR18,
  showR18G,
  setShowR18G,
  layoutMode,
  setLayoutMode,
  type LayoutMode,
  showDetailStairs,
  setShowDetailStairs,
  ageConfirmed,
  isAdult,
  setAgeConfirmation,
} from "../stores/uiStore";
import { usePredictiveBackOverlayStyle } from "../services/predictiveBack";

function reconfirmAge() {
  setAgeConfirmation(false, false);
}

// ── Fluent UI System Icons (24px) — SVG path data ──
// Sourced from microsoft/fluentui-system-icons
// Each icon has regular (outline) and filled (solid) variant for crossfade

const iconPaths = {
  weatherSunny: {
    regular:
      "M12 2.75a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1a.75.75 0 0 1 .75-.75zm0 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-1.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm8.75-8.25a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zM4.25 8a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zm14.44-4.03a.75.75 0 0 1 0 1.06l-.72.72a.75.75 0 1 1-1.06-1.06l.72-.72a.75.75 0 0 1 1.06 0zM6.34 17.66a.75.75 0 0 1 0 1.06l-.72.72a.75.75 0 1 1-1.06-1.06l.72-.72a.75.75 0 0 1 1.06 0zm13.09-9.66a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zM5.34 4.97a.75.75 0 0 1 1.06 0l.72.72a.75.75 0 0 1-1.06 1.06l-.72-.72a.75.75 0 0 1 0-1.06zm12.32 12.32a.75.75 0 0 1 1.06 0l.72.72a.75.75 0 0 1-1.06 1.06l-.72-.72a.75.75 0 0 1 0-1.06z",
    filled:
      "M12 2a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1A.75.75 0 0 1 12 2zm0 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm9.75-9.5h-1a.75.75 0 0 0 0 1.5h1a.75.75 0 0 0 0-1.5zm-19.5 0h-1a.75.75 0 0 0 0 1.5h1a.75.75 0 0 0 0-1.5zm16.97-4.72a.75.75 0 0 0-1.06 0l-.72.72a.75.75 0 0 0 1.06 1.06l.72-.72a.75.75 0 0 0 0-1.06zM7.4 17.66a.75.75 0 0 0-1.06 0l-.72.72a.75.75 0 0 0 1.06 1.06l.72-.72a.75.75 0 0 0 0-1.06zM5.34 4.97a.75.75 0 0 0-1.06 1.06l.72.72a.75.75 0 0 0 1.06-1.06l-.72-.72zm13.32 12.32a.75.75 0 0 0-1.06 1.06l.72.72a.75.75 0 0 0 1.06-1.06l-.72-.72z",
  },
  weatherMoon: {
    regular:
      "M20.026 16.004a.75.75 0 0 1 .236 1.034 8.002 8.002 0 0 1-11.303-11.303.75.75 0 0 1 1.27.27 6.5 6.5 0 0 0 9.826 9.826.75.75 0 0 1-.029.173zm-9.463-1.1a6.5 6.5 0 0 1 8.423-8.423A8.002 8.002 0 0 1 9.078 17.94a6.5 6.5 0 0 1 1.485-3.036z",
    filled:
      "M20.026 16.004a.75.75 0 0 1 .236 1.034A8 8 0 1 1 6.962 5.72a.75.75 0 0 1 1.27.799A6.5 6.5 0 0 0 19.476 15.2a.75.75 0 0 1 .55.803z",
  },
  image: {
    regular:
      "M17.75 3A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3zm0 1.5H6.25A1.75 1.75 0 0 0 4.5 6.25v11.5c0 .966.784 1.75 1.75 1.75h11.5a1.75 1.75 0 0 0 1.75-1.75V6.25a1.75 1.75 0 0 0-1.75-1.75zm-1.72 1.72a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5zm0 1.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM5 15.25V17.5l.005.16A1.75 1.75 0 0 0 6.75 19.25h10.5a1.75 1.75 0 0 0 1.745-1.607L19 17.5v-2.25a.75.75 0 0 0-.648-.743L18.25 14.5H5.75a.75.75 0 0 0-.743.648z",
    filled:
      "M17.75 3A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3zm-1.72 7.78a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5zM5 15.25V17.5l.005.16A1.75 1.75 0 0 0 6.75 19.25h10.5a1.75 1.75 0 0 0 1.745-1.607L19 17.5v-2.25a.75.75 0 0 0-.648-.743L18.25 14.5H5.75a.75.75 0 0 0-.743.648z",
  },
  imageSearch: {
    regular:
      "M17.75 3A3.25 3.25 0 0 1 21 6.25v5.772a3.501 3.501 0 0 0-1.5-.657V12h-3.75a2.25 2.25 0 0 0-2.25 2.25v3.232l-.207-.17-5.23-4.405a.75.75 0 0 0-.982.03l-2.08 1.942V6.25A1.75 1.75 0 0 1 6.25 4.5h11.5a1.75 1.75 0 0 1 1.75 1.75v1.022a3.507 3.507 0 0 0-1.5.15V6.25zM16.03 6.22a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5zm0 1.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5zm-.101 6.53l4.157 4.146a.75.75 0 0 1-1.06 1.06l-4.158-4.146a3.495 3.495 0 0 1 1.061-1.06zm2.572 2.457a2 2 0 1 1-.033.07l.033-.07z",
    filled:
      "M21 10.764v3.486a2.25 2.25 0 0 0 0-3.486zM16.03 6.22a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5zm-.072 8.25a3.487 3.487 0 0 0-1.414.597l-4.267-3.582a.75.75 0 0 0-.982.03l-3.294 3.11V6.25A3.25 3.25 0 0 1 9.25 3h5.5A3.25 3.25 0 0 1 18 6.25v9.757a3.493 3.493 0 0 0-2.042-1.537zm3.114 5.35l-3.646-3.646a2 2 0 1 1 1.06-1.06l3.646 3.646a.75.75 0 0 1-1.06 1.06z",
  },
  server: {
    regular:
      "M9.25 3A3.25 3.25 0 0 0 6 6.25v11.5A3.25 3.25 0 0 0 9.25 21h5.5A3.25 3.25 0 0 0 18 17.75V6.25A3.25 3.25 0 0 0 14.75 3zM7.5 6.25A1.75 1.75 0 0 1 9.25 4.5h5.5a1.75 1.75 0 0 1 1.75 1.75v11.5a1.75 1.75 0 0 1-1.75 1.75h-5.5a1.75 1.75 0 0 1-1.75-1.75zm5.75 11.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zm2.75-9.25a.75.75 0 0 1-.75.75H8.75a.75.75 0 0 1 0-1.5h6.5a.75.75 0 0 1 .75.75zm0 3a.75.75 0 0 1-.75.75H8.75a.75.75 0 0 1 0-1.5h6.5a.75.75 0 0 1 .75.75z",
    filled:
      "M14.75 21H9.25A3.25 3.25 0 0 1 6 17.75V6.25A3.25 3.25 0 0 1 9.25 3h5.5A3.25 3.25 0 0 1 18 6.25v11.5A3.25 3.25 0 0 1 14.75 21zm-2-3a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm2.5-9.25a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 .75-.75zm0 3a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 .75-.75z",
  },
  settings: {
    regular:
      "M12.003.75a.75.75 0 0 1 .75.75v1.087a6.696 6.696 0 0 1 1.97.812l.765-.765a.75.75 0 0 1 1.06 1.06l-.742.743c.488.541.894 1.15 1.194 1.81l1.032-.32a.75.75 0 1 1 .462 1.427l-1.054.342c.05.402.06.813.028 1.22l1.06.382a.75.75 0 0 1-.497 1.416l-1.077-.378a6.687 6.687 0 0 1-1.268 1.849l.753.754a.75.75 0 0 1-1.06 1.06l-.78-.78a6.696 6.696 0 0 1-1.823.789v1.112a.75.75 0 0 1-1.5 0v-1.102a6.67 6.67 0 0 1-1.853-.794l-.777.777a.75.75 0 0 1-1.06-1.06l.75-.75a6.697 6.697 0 0 1-1.27-1.835l-1.08.376a.75.75 0 1 1-.496-1.415l1.06-.384a6.736 6.736 0 0 1 .032-1.245l-1.05-.342a.75.75 0 1 1 .465-1.427l1.032.32c.303-.658.713-1.267 1.204-1.806l-.743-.743a.75.75 0 1 1 1.06-1.06l.766.766a6.694 6.694 0 0 1 1.962-.811V1.5a.75.75 0 0 1 .75-.75zm-.005 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
    filled:
      "M12.003.75a.75.75 0 0 1 .75.75v1.087a6.7 6.7 0 0 1 1.97.812l.765-.765a.75.75 0 0 1 1.06 1.06l-.742.743c.488.541.894 1.15 1.194 1.81l1.032-.32a.75.75 0 1 1 .462 1.427l-1.054.342c.05.402.06.813.028 1.22l1.06.382a.75.75 0 0 1-.497 1.416l-1.077-.378a6.693 6.693 0 0 1-1.268 1.849l.753.754a.75.75 0 0 1-1.06 1.06l-.78-.78a6.716 6.716 0 0 1-1.823.789v1.112a.75.75 0 0 1-1.5 0v-1.102a6.658 6.658 0 0 1-1.853-.794l-.777.777a.75.75 0 0 1-1.06-1.06l.75-.75a6.695 6.695 0 0 1-1.27-1.835l-1.08.376a.75.75 0 1 1-.496-1.415l1.06-.384a6.745 6.745 0 0 1 .032-1.245l-1.05-.342a.75.75 0 1 1 .465-1.427l1.032.32c.303-.658.713-1.267 1.204-1.806l-.743-.743a.75.75 0 1 1 1.06-1.06l.766.766a6.687 6.687 0 0 1 1.962-.811V1.5a.75.75 0 0 1 .75-.75zm-.005 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
  },
} as const;

type IconName = keyof typeof iconPaths;

// ── Fluent Icon component with filled/regular crossfade ──
const FluentIcon: Component<{ name: IconName; size?: number; active?: boolean }> = (props) => {
  const paths = iconPaths[props.name];
  const size = props.size ?? 24;
  const active = props.active ?? false;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={paths.regular}
        fill="currentColor"
        style={{
          opacity: active ? 0 : 1,
          transition: "opacity var(--durationFast) var(--curveEasyEase)",
        }}
      />
      <path
        d={paths.filled}
        fill="currentColor"
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity var(--durationFast) var(--curveEasyEase)",
        }}
      />
    </svg>
  );
};

function toggleTheme() {
  setTheme(theme() === "dark" ? "light" : "dark");
}

// Prevent body scroll when touching the scrim while sheet is open
function handleScrimTouchMove(e: TouchEvent) {
  if (e.target === e.currentTarget) {
    e.preventDefault();
  }
}

const SettingsSheet: Component = () => {
  const navigate = useNavigate();
  const [closing, setClosing] = createSignal(false);
  const [mounted, setMounted] = createSignal(false);
  const [ageGateMessage, setAgeGateMessage] = createSignal<string | null>(null);
  const pbStyle = usePredictiveBackOverlayStyle();

  // Auto-hide the age gate hint toast
  createEffect(() => {
    if (ageGateMessage()) {
      const timer = setTimeout(() => setAgeGateMessage(null), 2500);
      onCleanup(() => clearTimeout(timer));
    }
  });

  function requireAdult(action: () => void) {
    if (!isAdult()) {
      setAgeGateMessage("请先确认已满 18 岁");
      return;
    }
    action();
  }

  // Reset animation state and register back-button listener each time opened
  createEffect(() => {
    if (showSettingsSheet()) {
      (window as any).__settingsOpen = true;

      const handler = () => close();
      window.addEventListener("closeSettings", handler);

      setMounted(false);
      setClosing(false);
      // Double rAF ensures a paint frame at opacity:0 before transitioning to opacity:1
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });

      onCleanup(() => {
        (window as any).__settingsOpen = false;
        window.removeEventListener("closeSettings", handler);
      });
    }
  });

  function close() {
    setClosing(true);
    setTimeout(() => {
      setShowSettingsSheet(false);
    }, 250); // match --durationGentle
  }

  return (
    <Show when={showSettingsSheet()}>
      {/* Age gate hint toast */}
      <Show when={ageGateMessage()}>
        <div
          class="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-[var(--colorStatusWarningBackground2)] text-[var(--colorStatusWarningForeground1)] border border-[var(--colorStatusWarningForeground1)] rounded-[var(--borderRadius2XLarge)] shadow-[var(--elevation8)] px-5 py-2.5 [font-size:var(--fontSizeBase200)] font-medium whitespace-nowrap pointer-events-none transition-all duration-[var(--durationGentle)]"
          style={{
            animation: "fluent-scale-enter var(--durationNormal) var(--curveDecelerateMid) both",
          }}
        >
          {ageGateMessage()}
        </div>
      </Show>

      <div class="fixed inset-0 z-50" style={pbStyle()}>
        {/* Scrim — click to close */}
        <div
          class="absolute inset-0 transition-opacity cursor-pointer"
          onClick={close}
          onTouchMove={handleScrimTouchMove}
          style={{
            "background-color": "var(--colorScrim)",
            opacity: mounted() && !closing() ? 1 : 0,
            transition: `opacity var(--durationGentle) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}`,
          }}
        />

        {/* Sheet — slides down from top */}
        <div
          class="absolute top-0 left-0 right-0 surface-appbar rounded-b-[var(--borderRadius4XLarge)] shadow-[var(--elevation28)]"
          style={{
            "max-height": "50vh",
            "overflow-y": "auto",
            transform: mounted() && !closing() ? "translateY(0)" : "translateY(-100%)",
            opacity: mounted() && !closing() ? 1 : 0,
            transition: `transform var(--durationGentle) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}, opacity var(--durationNormal) ${closing() ? "var(--curveAccelerateMid)" : "var(--curveDecelerateMid)"}`,
          }}
        >
          {/* Drag handle (visual affordance, non-functional in v1) */}
          <div class="flex justify-center pt-2 pb-1">
            <div class="w-10 h-1 rounded-[var(--borderRadiusCircular)] bg-[var(--colorNeutralStroke1)]" />
          </div>

          {/* Header */}
          <div class="flex items-center justify-between px-5 pt-1 pb-2">
            <h2 class="[font-size:var(--fontSizeBase500)] font-semibold text-[var(--colorNeutralForeground1)]">
              设置
            </h2>
            <button class="btn-icon" onClick={close} aria-label="关闭设置">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M15.14 4.86a.67.67 0 0 0-.95 0L10 9.05 5.81 4.86a.67.67 0 0 0-.95.95L9.05 10l-4.19 4.19a.67.67 0 0 0 .95.95L10 10.95l4.19 4.19a.67.67 0 0 0 .95-.95L10.95 10l4.19-4.19a.67.67 0 0 0 0-.95z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div class="divider mx-5" />

          {/* ── Settings rows ── */}
          <div class="px-5 py-3 flex flex-col">
            {/* Theme toggle row */}
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: theme() === "dark" ? 0 : 1,
                      transition: "opacity var(--durationFast) var(--curveEasyEase)",
                    }}
                  >
                    <path d={iconPaths.weatherSunny.filled} fill="currentColor" />
                  </svg>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: theme() === "dark" ? 1 : 0,
                      transition: "opacity var(--durationFast) var(--curveEasyEase)",
                    }}
                  >
                    <path d={iconPaths.weatherMoon.filled} fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    深色模式
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    {theme() === "dark" ? "已开启 · 点击关闭" : "已关闭 · 点击开启"}
                  </p>
                </div>
              </div>

              {/* Toggle switch — uses classList for reliable Solid reactivity */}
              <button
                onClick={toggleTheme}
                role="switch"
                aria-checked={theme() === "dark"}
                aria-label="深色模式"
                class="relative flex-shrink-0 w-14 h-7 p-0 rounded-[var(--borderRadiusCircular)] appearance-none border-0 outline-none cursor-pointer transition-colors duration-[var(--durationNormal)]"
                classList={{
                  "bg-[var(--colorCompoundBrandBackground)]": theme() === "dark",
                  "bg-[var(--colorNeutralStrokeAccessible)]": theme() !== "dark",
                }}
              >
                <span
                  class="absolute top-0.5 left-0 w-6 h-6 rounded-[var(--borderRadiusCircular)] bg-white shadow-[var(--elevation4)] transition-transform duration-[var(--durationNormal)]"
                  classList={{
                    "translate-x-[28px]": theme() === "dark",
                    "translate-x-0.5": theme() !== "dark",
                  }}
                />
              </button>
            </div>

            {/* 自动隐藏导航栏开关行 */}
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3.75 5.25a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75zm0 4.5a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75zm0 4.5a.75.75 0 0 0 0 1.5h11.5a.75.75 0 0 0 0-1.5H3.75z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    自动隐藏导航栏
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    页面向下滚动时收起导航栏，上滑时重新显示
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAutoHideNavBar(!autoHideNavBar())}
                role="switch"
                aria-checked={autoHideNavBar()}
                aria-label="自动隐藏导航栏"
                class="relative flex-shrink-0 w-14 min-h-10 px-0 py-[var(--spacingVerticalSNudge)] appearance-none border-0 outline-none rounded-[var(--borderRadiusCircular)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] transition-colors duration-[var(--durationNormal)] ease-[var(--curveEasyEase)] flex items-center justify-center active:scale-[0.98] cursor-pointer"
              >
                <span
                  class="relative block w-14 h-7 rounded-[var(--borderRadiusCircular)] transition-colors duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                  classList={{
                    "bg-[var(--colorCompoundBrandBackground)]": autoHideNavBar(),
                    "bg-[var(--colorNeutralStrokeAccessible)]": !autoHideNavBar(),
                  }}
                >
                  <span
                    class="absolute top-0.5 left-0 w-6 h-6 rounded-[var(--borderRadiusCircular)] bg-white shadow-[var(--elevation4)] transition-transform duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                    classList={{
                      "translate-x-[28px]": autoHideNavBar(),
                      "translate-x-0.5": !autoHideNavBar(),
                    }}
                  />
                </span>
              </button>
            </div>

            {/* 显示 R18 内容开关行 */}
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M6.25 3A3.25 3.25 0 0 0 3 6.25v11.5A3.25 3.25 0 0 0 6.25 21h11.5A3.25 3.25 0 0 0 21 17.75V6.25A3.25 3.25 0 0 0 17.75 3H6.25zm0 1.5h11.5a1.75 1.75 0 0 1 1.75 1.75v11.5c0 .966-.784 1.75-1.75 1.75H6.25a1.75 1.75 0 0 1-1.75-1.75V6.25c0-.966.784-1.75 1.75-1.75zM7 8.75A1.75 1.75 0 0 1 8.75 7h.084A1.75 1.75 0 0 1 10.5 8.84v.33a1.75 1.75 0 0 1-1.75 1.75l-.084-.001A1.75 1.75 0 0 1 7 9.08V8.75zm6.5 0A1.75 1.75 0 0 1 15.25 7h.084A1.75 1.75 0 0 1 17 8.84v.33a1.75 1.75 0 0 1-1.75 1.75l-.084-.001A1.75 1.75 0 0 1 13.5 9.08V8.75zM8.724 15.5a.75.75 0 0 0 0 1.5h6.552a.75.75 0 0 0 0-1.5H8.724z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    显示 R18 内容
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    关闭后列表中不展示敏感内容，需刷新列表生效
                  </p>
                </div>
              </div>

              <button
                onClick={() => requireAdult(() => setShowR18(!showR18()))}
                role="switch"
                aria-checked={showR18()}
                aria-label="显示 R18 内容"
                class="relative flex-shrink-0 w-14 min-h-10 px-0 py-[var(--spacingVerticalSNudge)] appearance-none border-0 outline-none rounded-[var(--borderRadiusCircular)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] transition-colors duration-[var(--durationNormal)] ease-[var(--curveEasyEase)] flex items-center justify-center active:scale-[0.98] cursor-pointer"
              >
                <span
                  class="relative block w-14 h-7 rounded-[var(--borderRadiusCircular)] transition-colors duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                  classList={{
                    "bg-[var(--colorCompoundBrandBackground)]": showR18(),
                    "bg-[var(--colorNeutralStrokeAccessible)]": !showR18(),
                  }}
                >
                  <span
                    class="absolute top-0.5 left-0 w-6 h-6 rounded-[var(--borderRadiusCircular)] bg-white shadow-[var(--elevation4)] transition-transform duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                    classList={{
                      "translate-x-[28px]": showR18(),
                      "translate-x-0.5": !showR18(),
                    }}
                  />
                </span>
              </button>
            </div>

            {/* 显示 R-18G 内容开关行 */}
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M10.82 2.001a1.752 1.752 0 0 1 2.36 0c.53.47 6.07 5.42 8.587 11.508.168.405.233.815.233 1.211a4.751 4.751 0 0 1-4.755 4.752 4.4 4.4 0 0 1-1.77-.427L15.5 19c-3.428 0-5.26 0-7-.027a4.753 4.753 0 0 1-4.727-4.725c0-.397.065-.807.233-1.211C6.525 7.422 12.065 2.472 12.595 2l.005.005L10.82 2zm1.18 1.44c-.26.28-5.643 5.058-8.065 10.798a3.28 3.28 0 0 0-.185.796 3.253 3.253 0 0 0 3.24 3.222c1.678.026 3.412.027 6.76.027h.225c.236 0 .473.07.675.2l.022.014a2.9 2.9 0 0 0 1.163.277 3.251 3.251 0 0 0 3.188-2.538c.031-.22.049-.443.052-.667v-.048a3.25 3.25 0 0 0-.157-.813C16.846 8.498 11.463 3.72 11.2 3.44L12 2.64l-.8.8h.001zM12 8.001a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    显示 R-18G 内容
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    关闭后列表中不展示猎奇内容，需刷新列表生效
                  </p>
                </div>
              </div>

              <button
                onClick={() => requireAdult(() => setShowR18G(!showR18G()))}
                role="switch"
                aria-checked={showR18G()}
                aria-label="显示 R-18G 内容"
                class="relative flex-shrink-0 w-14 min-h-10 px-0 py-[var(--spacingVerticalSNudge)] appearance-none border-0 outline-none rounded-[var(--borderRadiusCircular)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] transition-colors duration-[var(--durationNormal)] ease-[var(--curveEasyEase)] flex items-center justify-center active:scale-[0.98] cursor-pointer"
              >
                <span
                  class="relative block w-14 h-7 rounded-[var(--borderRadiusCircular)] transition-colors duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                  classList={{
                    "bg-[var(--colorCompoundBrandBackground)]": showR18G(),
                    "bg-[var(--colorNeutralStrokeAccessible)]": !showR18G(),
                  }}
                >
                  <span
                    class="absolute top-0.5 left-0 w-6 h-6 rounded-[var(--borderRadiusCircular)] bg-white shadow-[var(--elevation4)] transition-transform duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                    classList={{
                      "translate-x-[28px]": showR18G(),
                      "translate-x-0.5": !showR18G(),
                    }}
                  />
                </span>
              </button>
            </div>

            {/* 重新确认年龄 */}
            <Show when={ageConfirmed()}>
              <div class="flex items-center justify-between py-2">
                <div class="flex items-center gap-3">
                  <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm0 4.5a.75.75 0 0 1 .75.75v4.19l2.47 2.47a.75.75 0 0 1-1.06 1.06l-2.72-2.72a.75.75 0 0 1-.22-.53V8.75a.75.75 0 0 1 .75-.75z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div>
                    <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                      重新确认年龄
                    </p>
                    <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                      点击后再次弹出年龄确认对话框
                    </p>
                  </div>
                </div>

                <button
                  class="btn-secondary py-2 px-4"
                  onClick={reconfirmAge}
                  aria-label="重新确认年龄"
                >
                  重新确认
                </button>
              </div>
            </Show>

            {/* 预测性返回手势开关行 */}
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm3.78 5.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 0 1 1.06-1.06l1.47 1.47 3.72-3.72a.75.75 0 0 1 1.06 0z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    预测性返回手势
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    {isPredictiveBackSupported()
                      ? "使用 Android 16 系统级侧滑返回预览"
                      : "仅 Android 16 及以上系统可用"}
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  isPredictiveBackSupported() && setUsePredictiveBack(!usePredictiveBack())
                }
                role="switch"
                aria-checked={usePredictiveBack()}
                aria-label="预测性返回手势"
                disabled={!isPredictiveBackSupported()}
                class="relative flex-shrink-0 w-14 min-h-10 px-0 py-[var(--spacingVerticalSNudge)] appearance-none border-0 outline-none rounded-[var(--borderRadiusCircular)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] transition-colors duration-[var(--durationNormal)] ease-[var(--curveEasyEase)] flex items-center justify-center active:scale-[0.98]"
                classList={{
                  "cursor-pointer": isPredictiveBackSupported(),
                  "cursor-not-allowed": !isPredictiveBackSupported(),
                }}
              >
                <span
                  class="relative block w-14 h-7 rounded-[var(--borderRadiusCircular)] transition-colors duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                  classList={{
                    "bg-[var(--colorCompoundBrandBackground)] hover:bg-[var(--colorCompoundBrandBackgroundHover)]":
                      usePredictiveBack() && isPredictiveBackSupported(),
                    "bg-[var(--colorNeutralStrokeAccessible)] hover:bg-[var(--colorNeutralStrokeAccessibleHover)]":
                      !usePredictiveBack() && isPredictiveBackSupported(),
                    "bg-[var(--colorNeutralStrokeDisabled)]": !isPredictiveBackSupported(),
                  }}
                >
                  <span
                    class="absolute top-0.5 left-0 w-6 h-6 rounded-[var(--borderRadiusCircular)] shadow-[var(--elevation4)] transition-transform duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                    classList={{
                      "bg-[var(--colorNeutralForegroundOnBrand)]":
                        usePredictiveBack() && isPredictiveBackSupported(),
                      "bg-[var(--colorNeutralBackground1)]":
                        !usePredictiveBack() && isPredictiveBackSupported(),
                      "bg-[var(--colorNeutralForegroundDisabled)]": !isPredictiveBackSupported(),
                      "translate-x-[28px]": usePredictiveBack() && isPredictiveBackSupported(),
                      "translate-x-0.5": !usePredictiveBack() || !isPredictiveBackSupported(),
                    }}
                  />
                </span>
              </button>
            </div>

            {/* Layout mode selector */}
            <div class="py-2">
              <div class="flex items-center gap-2 mb-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  class="text-[var(--colorNeutralForeground2)] flex-shrink-0"
                >
                  <path
                    d="M3 6.25A3.25 3.25 0 0 1 6.25 3h11.5A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25zM6.25 4.5A1.75 1.75 0 0 0 4.5 6.25V9h2.25V5.25A1.72 1.72 0 0 0 6.25 4.5zM4.5 10.5v3h3v-3h-3zm4.5 0v3h3.75v-3H9zm5.25 0v3h3.75v-3h-3zm3.75-1.5h-3.75V5.25c.455 0 .873.173 1.188.48l.012.012.018.018c.315.315.506.735.532 1.19V9zm-5.25 0H9V5.25h3.75V9zm-8.25 6v2.75c0 .966.784 1.75 1.75 1.75h.5V15H4.5zm3.75 0v4.5H9V15H8.25zm5.25 0v4.5h.75V15h-.75zm5.25 0v4.5h.5a1.75 1.75 0 0 0 1.75-1.75V15h-2.25z"
                    fill="currentColor"
                  />
                </svg>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  布局模式
                </p>
              </div>
              <div class="flex bg-[var(--colorNeutralBackground2)] rounded-[var(--borderRadiusMedium)] p-1.5 gap-1">
                {(["waterfall", "single", "grid"] as LayoutMode[]).map((m) => (
                  <button
                    class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                    classList={{
                      "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                        layoutMode() === m,
                      "bg-transparent text-[var(--colorNeutralForeground2)]": layoutMode() !== m,
                    }}
                    onClick={() => setLayoutMode(m)}
                  >
                    {m === "waterfall" ? "瀑布流" : m === "single" ? "单列" : "网格"}
                  </button>
                ))}
              </div>
              <p class="mt-1.5 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                {layoutMode() === "waterfall"
                  ? "双列瀑布流，图片错落有致"
                  : layoutMode() === "single"
                    ? "单列大图，适合浏览细节"
                    : "三列网格，信息密度最高"}
              </p>
            </div>

            {/* 详情页楼梯导航开关行 */}
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 6.25A3.25 3.25 0 0 1 6.25 3h11.5A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25zM6.25 4.5A1.75 1.75 0 0 0 4.5 6.25V9h2.25V5.25A1.72 1.72 0 0 0 6.25 4.5zM4.5 10.5v3h3v-3h-3zm4.5 0v3h3.75v-3H9zm5.25 0v3h3.75v-3h-3zm3.75-1.5h-3.75V5.25c.455 0 .873.173 1.188.48l.012.012.018.018c.315.315.506.735.532 1.19V9zm-5.25 0H9V5.25h3.75V9zm-8.25 6v2.75c0 .966.784 1.75 1.75 1.75h.5V15H4.5zm3.75 0v4.5H9V15H8.25zm5.25 0v4.5h.75V15h-.75zm5.25 0v4.5h.5a1.75 1.75 0 0 0 1.75-1.75V15h-2.25z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    详情页楼梯导航
                    <span class="inline-flex items-center ml-1 px-[var(--spacingHorizontalXS)] py-[var(--spacingVerticalXXS)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase100)] font-semibold text-[var(--colorPaletteGreenForeground2)] bg-[var(--colorPaletteGreenBackground2)] align-middle">
                      Beta
                    </span>
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    在多页作品中显示右侧页码导航条，方便快速跳转
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDetailStairs(!showDetailStairs())}
                role="switch"
                aria-checked={showDetailStairs()}
                aria-label="详情页楼梯导航"
                class="relative flex-shrink-0 w-14 min-h-10 px-0 py-[var(--spacingVerticalSNudge)] appearance-none border-0 outline-none rounded-[var(--borderRadiusCircular)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] transition-colors duration-[var(--durationNormal)] ease-[var(--curveEasyEase)] flex items-center justify-center active:scale-[0.98] cursor-pointer"
              >
                <span
                  class="relative block w-14 h-7 rounded-[var(--borderRadiusCircular)] transition-colors duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                  classList={{
                    "bg-[var(--colorCompoundBrandBackground)]": showDetailStairs(),
                    "bg-[var(--colorNeutralStrokeAccessible)]": !showDetailStairs(),
                  }}
                >
                  <span
                    class="absolute top-0.5 left-0 w-6 h-6 rounded-[var(--borderRadiusCircular)] bg-white shadow-[var(--elevation4)] transition-transform duration-[var(--durationNormal)] ease-[var(--curveEasyEase)]"
                    classList={{
                      "translate-x-[28px]": showDetailStairs(),
                      "translate-x-0.5": !showDetailStairs(),
                    }}
                  />
                </span>
              </button>
            </div>

            {/* Divider before quality settings */}
            <div class="divider my-1" />

            {/* List image quality */}
            <div class="py-2">
              <div class="flex items-center gap-2 mb-2">
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
            </div>

            {/* Detail image quality */}
            <div class="py-2">
              <div class="flex items-center gap-2 mb-2">
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
            </div>
          </div>

          {/* Divider before cache size */}
          <div class="divider my-1" />

          {/* Image cache size */}
          <div class="px-5 py-2">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <FluentIcon name="server" size={20} />
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  图片缓存数
                </p>
              </div>
              <span class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorCompoundBrandForeground1)]">
                {cacheSize()}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForegroundDisabled)] flex-shrink-0">
                100
              </span>
              <input
                type="range"
                min="100"
                max="1000"
                step="100"
                value={cacheSize()}
                onInput={(e) => setCacheSize(Number(e.currentTarget.value))}
                class="flex-1 h-1 rounded-[var(--borderRadiusCircular)] cursor-pointer"
                style={{
                  "accent-color": "var(--colorCompoundBrandBackground)",
                }}
              />
              <span class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForegroundDisabled)] flex-shrink-0">
                1000
              </span>
            </div>
            <p class="mt-2 [font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
              缓存数越大，图片加载越快，但占用的内存也越多。推荐 400~600。
            </p>
          </div>

          {/* Divider */}
          <div class="divider mx-5" />

          {/* About entry — clickable row */}
          <div
            class="flex items-center justify-between mx-4 mb-4 px-5 py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)]"
            onClick={() => {
              close();
              navigate("/about");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                close();
                navigate("/about");
              }
            }}
            role="button"
            tabindex="0"
            aria-label="关于"
          >
            <div class="flex items-center gap-3 min-w-0">
              {/* Pictelio logo — small 32px */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 192 192"
                fill="none"
                aria-hidden="true"
                class="flex-shrink-0"
              >
                <defs>
                  <linearGradient id="settingsPGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#0078d4" />
                    <stop offset="55%" stop-color="#2899f5" />
                    <stop offset="100%" stop-color="#60aaff" />
                  </linearGradient>
                </defs>
                <rect
                  x="12"
                  y="12"
                  width="168"
                  height="168"
                  rx="44"
                  fill="var(--colorNeutralBackground2)"
                />
                <path
                  d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
                  fill="url(#settingsPGrad)"
                />
                <path
                  d="M60 40 h44 a34 34 0 0 1 0 68 h-44 v48 h-20 v-116 z"
                  fill="white"
                  fill-opacity="0.12"
                />
              </svg>
              <div class="min-w-0">
                <p class="[font-size:var(--fontSizeBase300)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  Pictelio
                </p>
                <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                  关于 · v{APP_VERSION}
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
        </div>
      </div>
    </Show>
  );
};

export default SettingsSheet;
