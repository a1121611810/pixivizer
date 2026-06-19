import { type Component, Show, createSignal, createEffect, onCleanup } from 'solid-js';
import {
  showSettingsSheet,
  setShowSettingsSheet,
  theme,
  setTheme,
} from '../stores/uiStore';

const SettingsSheet: Component = () => {
  const [closing, setClosing] = createSignal(false);
  const [mounted, setMounted] = createSignal(false);

  // Reset animation state and register back-button listener each time opened
  createEffect(() => {
    if (showSettingsSheet()) {
      (window as any).__settingsOpen = true;

      const handler = () => close();
      window.addEventListener('closeSettings', handler);

      setMounted(false);
      setClosing(false);
      // Double rAF ensures a paint frame at opacity:0 before transitioning to opacity:1
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });

      onCleanup(() => {
        (window as any).__settingsOpen = false;
        window.removeEventListener('closeSettings', handler);
      });
    }
  });

  function close() {
    setClosing(true);
    setTimeout(() => {
      setShowSettingsSheet(false);
    }, 250); // match --durationGentle
  }

  function handleScrimClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function toggleTheme() {
    setTheme(theme() === 'dark' ? 'light' : 'dark');
  }

  // Prevent body scroll when touching the scrim while sheet is open
  function handleScrimTouchMove(e: TouchEvent) {
    if (e.target === e.currentTarget) {
      e.preventDefault();
    }
  }

  return (
    <Show when={showSettingsSheet()}>
      <div class="fixed inset-0 z-50" onClick={handleScrimClick}>
        {/* Scrim */}
        <div
          class="absolute inset-0 transition-opacity"
          onTouchMove={handleScrimTouchMove}
          style={{
            'background-color': 'var(--colorScrim)',
            opacity: mounted() && !closing() ? 1 : 0,
            transition: `opacity var(--durationGentle) ${closing() ? 'var(--curveAccelerateMid)' : 'var(--curveDecelerateMid)'}`,
          }}
        />

        {/* Sheet — slides down from top */}
        <div
          class="absolute top-0 left-0 right-0 surface-appbar rounded-b-[var(--borderRadius4XLarge)] shadow-[var(--elevation28)]"
          style={{
            'max-height': '50vh',
            'overflow-y': 'auto',
            transform: mounted() && !closing()
              ? 'translateY(0)'
              : 'translateY(-100%)',
            opacity: mounted() && !closing() ? 1 : 0,
            transition: `transform var(--durationGentle) ${closing() ? 'var(--curveAccelerateMid)' : 'var(--curveDecelerateMid)'}, opacity var(--durationNormal) ${closing() ? 'var(--curveAccelerateMid)' : 'var(--curveDecelerateMid)'}`,
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
            <button
              class="btn-icon"
              onClick={close}
              aria-label="关闭设置"
            >
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
                <span class="text-2xl leading-none select-none">
                  {theme() === 'dark' ? '🌙' : '☀️'}
                </span>
                <div>
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    深色模式
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    {theme() === 'dark' ? '已开启 · 点击关闭' : '已关闭 · 点击开启'}
                  </p>
                </div>
              </div>

              {/* Toggle switch — uses classList for reliable Solid reactivity */}
              <button
                onClick={toggleTheme}
                role="switch"
                aria-checked={theme() === 'dark'}
                aria-label="深色模式"
                class="relative flex-shrink-0 w-14 h-7 p-0 rounded-[var(--borderRadiusCircular)] appearance-none border-0 outline-none cursor-pointer transition-colors duration-[var(--durationNormal)]"
                classList={{
                  'bg-[var(--colorCompoundBrandBackground)]': theme() === 'dark',
                  'bg-[var(--colorNeutralStrokeAccessible)]': theme() !== 'dark',
                }}
              >
                <span
                  class="absolute top-0.5 left-0 w-6 h-6 rounded-[var(--borderRadiusCircular)] bg-white shadow-[var(--elevation4)] transition-transform duration-[var(--durationNormal)]"
                  classList={{
                    'translate-x-[28px]': theme() === 'dark',
                    'translate-x-0.5': theme() !== 'dark',
                  }}
                />
              </button>
            </div>
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
