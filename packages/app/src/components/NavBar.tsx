import { type Component, createEffect, createSignal, onMount, onCleanup } from "solid-js";
import { currentTab, setCurrentTab, autoHideNavBar } from "../stores/uiStore";
import { useNavigate } from "@tanstack/solid-router";
import FluentIcon, { type FluentIconName } from "./ui/FluentIcon";

// ── Tab definition ──
const tabs: { key: "recommended" | "follow" | "bookmarks"; label: string; icon: FluentIconName }[] =
  [
    { key: "recommended", label: "推荐", icon: "home" },
    { key: "follow", label: "关注", icon: "people" },
    { key: "bookmarks", label: "收藏", icon: "bookmark" },
  ];

// ── Sliding pill position ──
const [pillLeft, setPillLeft] = createSignal(0);
const [pillWidth, setPillWidth] = createSignal(0);
const [pillVisible, setPillVisible] = createSignal(false);

const NavBar: Component = () => {
  const navigate = useNavigate();
  let containerRef!: HTMLDivElement;
  const tabEls: Record<string, HTMLButtonElement> = {};

  const [hidden, setHidden] = createSignal(false);
  let lastScrollY = 0;
  let accumulatedDelta = 0;

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

    // ── Scroll-driven NavBar hide/show ──
    lastScrollY = window.scrollY;
    accumulatedDelta = 0;
    const HIDE_THRESHOLD = 30;
    const TOP_ZONE = 100;
    let scrollTicking = false;

    function onScroll() {
      if (!autoHideNavBar()) {
        setHidden(false);
        return;
      }

      const currentY = window.scrollY;

      // 顶部区域始终显示
      if (currentY < TOP_ZONE) {
        setHidden(false);
        accumulatedDelta = 0;
        lastScrollY = currentY;
        return;
      }

      const delta = currentY - lastScrollY;
      lastScrollY = currentY;

      // 程序化滚动跳转（页面切换恢复位置等），重置跟踪状态，不触发显隐
      if (Math.abs(delta) > 200) {
        accumulatedDelta = 0;
        return;
      }

      accumulatedDelta += delta;

      if (accumulatedDelta > HIDE_THRESHOLD) {
        setHidden(true);
        accumulatedDelta = 0;
      } else if (accumulatedDelta < -HIDE_THRESHOLD) {
        setHidden(false);
        accumulatedDelta = 0;
      }
    }

    function onScrollRaf() {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(() => {
          onScroll();
          scrollTicking = false;
        });
      }
    }

    window.addEventListener("scroll", onScrollRaf, { passive: true });

    onCleanup(() => {
      window.removeEventListener("scroll", onScrollRaf);
    });
  });

  // Tab change → slide pill + reset scroll tracking
  createEffect(() => {
    // Track currentTab() to trigger re-measurement
    currentTab();
    // Reset scroll tracking state on tab switch
    lastScrollY = window.scrollY;
    accumulatedDelta = 0;
    setHidden(false);
    requestAnimationFrame(updatePill);
  });

  return (
    <nav
      class="bottom-nav select-none nav-safe-bottom"
      aria-label="主导航"
      style={{
        transform: hidden()
          ? "translateY(calc(100% + 12px + env(safe-area-inset-bottom, 0px)))"
          : "translateY(0)",
        transition: `transform var(--durationNormal) var(--curveEasyEase)`,
      }}
    >
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
                if (tab.key === "bookmarks") {
                  void navigate({ to: "/bookmarks" });
                } else if (tab.key === "follow") {
                  void navigate({ to: "/following" });
                } else {
                  void navigate({ to: "/recommended" });
                }
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
