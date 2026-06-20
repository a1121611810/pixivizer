import { type Component, createEffect, createSignal, onMount } from "solid-js";
import { currentTab, setCurrentTab } from "../stores/uiStore";

// ── Fluent UI System Icons (24px) — SVG path data ──
// Sourced from microsoft/fluentui-system-icons via Iconify API
// Each icon has a regular (outline) and filled (solid) variant for crossfade

const iconPaths = {
  home: {
    regular:
      "M10.55 2.532a2.25 2.25 0 0 1 2.9 0l6.75 5.692c.507.428.8 1.057.8 1.72v9.31a1.75 1.75 0 0 1-1.75 1.75h-3.5a1.75 1.75 0 0 1-1.75-1.75v-5.007a.25.25 0 0 0-.25-.25h-3.5a.25.25 0 0 0-.25.25v5.007a1.75 1.75 0 0 1-1.75 1.75h-3.5A1.75 1.75 0 0 1 3 19.254v-9.31c0-.663.293-1.292.8-1.72zm1.933 1.147a.75.75 0 0 0-.966 0L4.767 9.37a.75.75 0 0 0-.267.573v9.31c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-5.007c0-.967.784-1.75 1.75-1.75h3.5c.966 0 1.75.783 1.75 1.75v5.007c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-9.31a.75.75 0 0 0-.267-.573z",
    filled:
      "M13.45 2.533a2.25 2.25 0 0 0-2.9 0L3.8 8.228a2.25 2.25 0 0 0-.8 1.72v9.305c0 .966.784 1.75 1.75 1.75h3a1.75 1.75 0 0 0 1.75-1.75V15.25c0-.68.542-1.232 1.217-1.25h2.566a1.25 1.25 0 0 1 1.217 1.25v4.003c0 .966.784 1.75 1.75 1.75h3a1.75 1.75 0 0 0 1.75-1.75V9.947a2.25 2.25 0 0 0-.8-1.72z",
  },
  people: {
    regular:
      "M5.5 8a2.5 2.5 0 1 1 5 0a2.5 2.5 0 0 1-5 0M8 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8m7.5 5a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0M17 6a3 3 0 1 0 0 6a3 3 0 0 0 0-6m-2.752 13.038c.703.285 1.604.462 2.753.462c2.282 0 3.586-.697 4.297-1.558c.345-.418.52-.84.61-1.163a2.7 2.7 0 0 0 .093-.573v-.027A2.18 2.18 0 0 0 19.822 14H14.18q-.042 0-.082.002c.394.41.68.925.816 1.498h4.908c.372 0 .674.299.679.669l-.003.032q-.006.058-.037.18a1.6 1.6 0 0 1-.32.605c-.35.426-1.172 1.014-3.14 1.014c-.98 0-1.676-.146-2.17-.345c-.108.4-.286.883-.583 1.383M4.25 14A2.25 2.25 0 0 0 2 16.25v.278a2 2 0 0 0 .014.208a4.5 4.5 0 0 0 .778 2.07C3.61 19.974 5.172 21 8 21s4.39-1.025 5.208-2.195a4.5 4.5 0 0 0 .778-2.07a3 3 0 0 0 .014-.207v-.278A2.25 2.25 0 0 0 11.75 14zm-.75 2.507v-.257a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 .75.75v.257l-.007.08a3 3 0 0 1-.514 1.358C11.486 18.65 10.422 19.5 8 19.5s-3.486-.85-3.98-1.555a3 3 0 0 1-.513-1.358z",
    filled:
      "M8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12ZM17 12C18.6569 12 20 10.6569 20 9C20 7.34315 18.6569 6 17 6C15.3431 6 14 7.34315 14 9C14 10.6569 15.3431 12 17 12ZM4.25 14C3.00736 14 2 15.0074 2 16.25V16.5C2 16.5 2 21 8 21C14 21 14 16.5 14 16.5V16.25C14 15.0074 12.9926 14 11.75 14H4.25ZM17.0002 19.5C15.829 19.5 14.9321 19.3189 14.2453 19.0416C14.5873 18.4667 14.7719 17.9142 14.8724 17.4836C14.9328 17.2247 14.9645 17.0027 14.9813 16.8353C14.9897 16.7512 14.9944 16.68 14.997 16.6237C14.9983 16.5955 14.9991 16.5709 14.9996 16.5503L15.0001 16.5222L15.0002 16.5103L15.0002 16.505L15.0002 16.5024C15.0002 16.4992 15.0002 16.5 15.0002 16.5V16.25C15.0002 15.3779 14.6567 14.5861 14.0977 14.0023C14.1316 14.0008 14.1658 14 14.2002 14H19.8002C21.0152 14 22.0002 14.985 22.0002 16.2C22.0002 16.2 22.0002 19.5 17.0002 19.5Z",
  },
  bookmark: {
    regular:
      "M6.19094 21.8547C5.6948 22.2117 5.00293 21.8571 5.00293 21.2459V6.25C5.00293 4.45507 6.458 3 8.25293 3H15.7513C17.5462 3 19.0013 4.45507 19.0013 6.25V21.2459C19.0013 21.8571 18.3094 22.2117 17.8133 21.8547L12.0021 17.6738L6.19094 21.8547ZM17.5013 6.25C17.5013 5.2835 16.7178 4.5 15.7513 4.5H8.25293C7.28643 4.5 6.50293 5.2835 6.50293 6.25V19.7824L11.5641 16.141C11.8258 15.9528 12.1785 15.9528 12.4401 16.141L17.5013 19.7824V6.25Z",
    filled:
      "M6.19 21.855a.75.75 0 0 1-1.187-.61V6.25A3.25 3.25 0 0 1 8.253 3h7.498a3.25 3.25 0 0 1 3.25 3.25v14.996a.75.75 0 0 1-1.188.609l-5.81-4.181z",
  },
} as const;

type IconName = keyof typeof iconPaths;

// ── Fluent Icon with filled/regular crossfade ──
const FluentIcon: Component<{ name: IconName; active: boolean }> = (props) => {
  const paths = iconPaths[props.name];
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      class="relative flex-shrink-0"
      aria-hidden="true"
    >
      {/* Regular (outline) — visible when inactive */}
      <path
        d={paths.regular}
        fill="currentColor"
        class="transition-opacity duration-[var(--durationFast)] ease-[var(--curveEasyEase)]"
        classList={{ "opacity-100": !props.active, "opacity-0": props.active }}
      />
      {/* Filled (solid) — visible when active */}
      <path
        d={paths.filled}
        fill="currentColor"
        class="transition-opacity duration-[var(--durationFast)] ease-[var(--curveEasyEase)]"
        classList={{ "opacity-0": !props.active, "opacity-100": props.active }}
      />
    </svg>
  );
};

// ── Tab definition ──
const tabs: { key: "recommended" | "follow" | "bookmarks"; label: string; icon: IconName }[] = [
  { key: "recommended", label: "推荐", icon: "home" },
  { key: "follow", label: "关注", icon: "people" },
  { key: "bookmarks", label: "收藏", icon: "bookmark" },
];

// ── Sliding pill position ──
const [pillLeft, setPillLeft] = createSignal(0);
const [pillWidth, setPillWidth] = createSignal(0);
const [pillVisible, setPillVisible] = createSignal(false);

const NavBar: Component = () => {
  let containerRef!: HTMLDivElement;
  const tabEls: Record<string, HTMLButtonElement> = {};

  // Measure and position the sliding pill whenever active tab changes
  const updatePill = () => {
    const tabKey = currentTab();
    const el = tabEls[tabKey];
    if (!el || !containerRef) return;
    const containerRect = containerRef.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setPillLeft(elRect.left - containerRect.left);
    setPillWidth(elRect.width);
    setPillVisible(true);
  };

  // Initial layout → measure pill position
  onMount(() => {
    requestAnimationFrame(updatePill);
  });

  // Tab change → slide pill
  createEffect(() => {
    // Track currentTab() to trigger re-measurement
    currentTab();
    requestAnimationFrame(updatePill);
  });

  return (
    <nav class="bottom-nav select-none nav-safe-bottom" aria-label="主导航">
      <div ref={containerRef} class="bottom-nav-container relative">
        {/* Sliding active pill indicator */}
        <div
          class="bottom-nav-pill absolute"
          classList={{ "opacity-100": pillVisible() }}
          style={{
            left: `${pillLeft()}px`,
            width: `${pillWidth()}px`,
          }}
          aria-hidden="true"
        />

        {tabs.map((tab) => {
          const isActive = () => currentTab() === tab.key;
          return (
            <button
              ref={(el) => {
                tabEls[tab.key] = el;
              }}
              class="bottom-nav-item relative"
              classList={{
                "bottom-nav-item-active": isActive(),
                "bottom-nav-item-inactive": !isActive(),
              }}
              onClick={() => {
                setCurrentTab(tab.key);
              }}
              aria-current={isActive() ? "page" : undefined}
              aria-label={tab.label}
            >
              <FluentIcon name={tab.icon} active={isActive()} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavBar;
