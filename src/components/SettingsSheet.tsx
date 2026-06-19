import { type Component, Show, onMount, onCleanup, createSignal } from 'solid-js';
import {
  showSettingsSheet,
  setShowSettingsSheet,
  theme,
  setTheme,
} from '../stores/uiStore';

const SettingsSheet: Component = () => {
  const [closing, setClosing] = createSignal(false);
  const [mounted, setMounted] = createSignal(false);

  // Animate in on mount
  onMount(() => {
    (window as any).__settingsOpen = true;
    requestAnimationFrame(() => setMounted(true));

    const handler = () => close();
    window.addEventListener('closeSettings', handler);

    onCleanup(() => {
      (window as any).__settingsOpen = false;
      window.removeEventListener('closeSettings', handler);
    });
  });

  function close() {
    setClosing(true);
    setTimeout(() => {
      setShowSettingsSheet(false);
      setClosing(false);
      setMounted(false);
    }, 250); // match --durationGentle
  }

  function handleScrimClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function toggleTheme() {
    setTheme(theme() === 'dark' ? 'light' : 'dark');
  }

  // Prevent body scroll while sheet is open
  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
  }

  return (
    <Show when={showSettingsSheet()}>
      <div
        class="fixed inset-0 z-50"
        onClick={handleScrimClick}
        onTouchMove={handleTouchMove}
      >
        {/* Scrim */}
        <div
          class="absolute inset-0 transition-opacity"
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
                <span class="text-xl leading-none select-none">
                  {theme() === 'dark' ? '🌙' : '☀️'}
                </span>
                <div>
                  <p class="[font-size:var(--fontSizeBase300)] font-medium text-[var(--colorNeutralForeground1)] leading-snug">
                    深色模式
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    {theme() === 'dark' ? '已开启' : '已关闭'}
                  </p>
                </div>
              </div>

              {/* Fluent-style toggle switch */}
              <button
                onClick={toggleTheme}
                role="switch"
                aria-checked={theme() === 'dark'}
                aria-label="深色模式"
                class="relative flex-shrink-0 w-[42px] h-[24px] rounded-[var(--borderRadiusCircular)] border-0 outline-none cursor-pointer transition-colors duration-[var(--durationFast)] focus-visible:[box-shadow:0_0_0_var(--strokeWidthThick)_var(--colorStrokeFocus2),0_0_0_calc(var(--strokeWidthThick)+var(--strokeWidthThin))_var(--colorStrokeFocus1)]"
                style={{
                  'background-color':
                    theme() === 'dark'
                      ? 'var(--colorCompoundBrandBackground)'
                      : 'var(--colorNeutralStrokeAccessible)',
                }}
              >
                <span
                  class="absolute top-[3px] w-[18px] h-[18px] rounded-[var(--borderRadiusCircular)] shadow-[var(--elevation4)] transition-transform duration-[var(--durationFast)]"
                  style={{
                    'background-color': 'var(--colorNeutralBackground1)',
                    transform:
                      theme() === 'dark'
                        ? 'translateX(20px)'
                        : 'translateX(3px)',
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
