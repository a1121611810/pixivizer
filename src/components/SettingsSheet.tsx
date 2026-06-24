import { type Component, Show, createSignal, createEffect, onCleanup } from "solid-js";
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
} from "../stores/uiStore";
import { usePredictiveBackOverlayStyle } from "../services/predictiveBack";

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

const SettingsSheet: Component = () => {
  const [closing, setClosing] = createSignal(false);
  const [mounted, setMounted] = createSignal(false);
  const pbStyle = usePredictiveBackOverlayStyle();

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

  function toggleTheme() {
    setTheme(theme() === "dark" ? "light" : "dark");
  }

  // Prevent body scroll when touching the scrim while sheet is open
  function handleScrimTouchMove(e: TouchEvent) {
    if (e.target === e.currentTarget) {
      e.preventDefault();
    }
  }

  return (
    <Show when={showSettingsSheet()}>
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
                {(["medium", "large", "original"] as ImageQuality[]).map((q) => (
                  <button
                    class="flex-1 py-[var(--spacingVerticalS)] px-[var(--spacingHorizontalM)] rounded-[var(--borderRadiusSmall)] [font-size:var(--fontSizeBase200)] font-semibold transition-all active:scale-95 appearance-none border-none outline-none cursor-pointer"
                    classList={{
                      "bg-[var(--colorNeutralBackground1)] text-[var(--colorNeutralForeground1)] shadow-[var(--elevation2)]":
                        listQuality() === q,
                      "bg-transparent text-[var(--colorNeutralForeground2)]": listQuality() !== q,
                    }}
                    onClick={() => setListQuality(q)}
                  >
                    {q === "medium" ? "默认" : q === "large" ? "高清" : "原图"}
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

          {/* Version footer */}
          <div class="px-5 py-4">
            <p class="[font-size:var(--fontSizeBase100)] text-[var(--colorNeutralForegroundDisabled)] text-center select-none">
              Pixivizer v0.1.0
            </p>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default SettingsSheet;
