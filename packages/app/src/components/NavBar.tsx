import { type Component, createEffect, createSignal, onMount, onCleanup } from "solid-js";
import { currentTab, setCurrentTab, autoHideNavBar } from "../stores/uiStore";
import { useNavigate } from "@tanstack/solid-router";
import FluentIcon, { type FluentIconName } from "./ui/FluentIcon";

// ── Tab definitions ──
type NavTab = "recommended" | "follow" | "bookmarks" | "history";

interface TabDef {
  key: NavTab;
  label: string;
  icon: FluentIconName;
}

const leftTabs: TabDef[] = [
  { key: "recommended", label: "推荐", icon: "home" },
  { key: "follow", label: "关注", icon: "people" },
];

const rightTabs: TabDef[] = [
  { key: "bookmarks", label: "收藏", icon: "bookmark" },
  { key: "history", label: "历史", icon: "history" },
];

/** 路由路径映射 */
const TAB_PATH: Record<NavTab, string> = {
  recommended: "/recommended",
  follow: "/following",
  bookmarks: "/bookmarks",
  history: "/history",
};

/** 类型守卫：判断 Tab 是否属于 NavTab */
function toNavTab(tab: string): NavTab | null {
  if (tab === "recommended" || tab === "follow" || tab === "bookmarks" || tab === "history") {
    return tab;
  }
  return null;
}

const NavBar: Component = () => {
  const navigate = useNavigate();

  // ── State ──
  const [compact, setCompact] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<NavTab>("recommended");

  // Sync with currentTab from store
  createEffect(() => {
    const ct = toNavTab(currentTab());
    if (ct) {
      setActiveTab(ct);
    }
  });

  // ── 触摸滑动手势标志（防止点击触发）──
  let swiped = false;

  // ── Scroll-driven compact/expand ──
  let lastScrollY = 0;
  const HIDE_THRESHOLD = 20;
  const TOP_ZONE = 100;
  let scrollTicking = false;

  function onScroll() {
    // 如果用户关闭了自动隐藏，始终展开
    if (!autoHideNavBar()) {
      if (compact()) {
        setCompact(false);
      }
      return;
    }

    const currentY = window.scrollY;

    // TOP_ZONE 内始终展开
    if (currentY < TOP_ZONE) {
      if (compact()) {
        setCompact(false);
      }
      lastScrollY = currentY;
      return;
    }

    const delta = currentY - lastScrollY;
    lastScrollY = currentY;

    // 程序化跳转（如页面切换恢复滚动位置）跳过
    if (Math.abs(delta) > 200) {
      return;
    }

    // 直接根据滚动方向判断
    if (delta >= HIDE_THRESHOLD && !compact()) {
      setCompact(true);
    } else if (delta <= -HIDE_THRESHOLD && compact()) {
      setCompact(false);
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

  onMount(() => {
    lastScrollY = window.scrollY;

    window.addEventListener("scroll", onScrollRaf, { passive: true });
  });

  onCleanup(() => {
    clearTimeout(animTimer);
    window.removeEventListener("scroll", onScrollRaf);
  });

  // Tab 切换时重置滚动跟踪
  createEffect(() => {
    currentTab();
    lastScrollY = window.scrollY;
  });

  // ── 中心按钮触摸滑动检测 ──
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 30;
  // 回顶动画状态
  const [scrollToTopAnim, setScrollToTopAnim] = createSignal(false);
  let animTimer: ReturnType<typeof setTimeout> | undefined;

  function handleTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
    swiped = false;
  }

  function handleTouchEnd(e: TouchEvent) {
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (dy > SWIPE_THRESHOLD) {
      swiped = true;
      // 触发动效
      setScrollToTopAnim(true);
      clearTimeout(animTimer);
      animTimer = setTimeout(() => setScrollToTopAnim(false), 600);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // ── 中心按钮点击：导航到搜索页（滑动回顶时不触发）──
  function handleCenterClick() {
    if (swiped) {
      swiped = false;
      return;
    }
    void navigate({ to: "/search" });
  }

  // ── Tab 导航 ──
  function handleTabClick(key: NavTab) {
    setCurrentTab(key);
    void navigate({ to: TAB_PATH[key] });
  }

  return (
    <nav class="floating-nav" aria-label="主导航">
      <div class="floating-nav-capsule" classList={{ "floating-nav-capsule-compact": compact() }}>
        {/* 左侧按钮组：推荐 + 关注 */}
        <div
          class="floating-nav-group"
          classList={{
            "floating-nav-group-visible": !compact(),
            "floating-nav-group-hidden": compact(),
          }}
          aria-hidden={compact()}
        >
          {leftTabs.map((tab) => (
            <button
              class="floating-nav-item"
              classList={{ "floating-nav-item-active": activeTab() === tab.key }}
              onClick={() => handleTabClick(tab.key)}
              aria-current={activeTab() === tab.key ? "page" : undefined}
              aria-label={tab.label}
              tabIndex={compact() ? -1 : 0}
            >
              <FluentIcon name={tab.icon} active={activeTab() === tab.key} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 中心大圆按钮（搜索入口） */}
        <button
          class="floating-nav-center"
          classList={{ "scroll-top-anim": scrollToTopAnim() }}
          onClick={handleCenterClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-label="搜索"
        >
          <FluentIcon name="search" size={24} />
        </button>

        {/* 右侧按钮组：收藏 + 历史 */}
        <div
          class="floating-nav-group"
          classList={{
            "floating-nav-group-visible": !compact(),
            "floating-nav-group-hidden": compact(),
          }}
          aria-hidden={compact()}
        >
          {rightTabs.map((tab) => (
            <button
              class="floating-nav-item"
              classList={{ "floating-nav-item-active": activeTab() === tab.key }}
              onClick={() => handleTabClick(tab.key)}
              aria-current={activeTab() === tab.key ? "page" : undefined}
              aria-label={tab.label}
              tabIndex={compact() ? -1 : 0}
            >
              <FluentIcon name={tab.icon} active={activeTab() === tab.key} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
