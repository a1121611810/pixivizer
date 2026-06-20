import type { Component } from "solid-js";
import { currentTab, setCurrentTab } from "../stores/uiStore";
import { useNavigate } from "@solidjs/router";

const tabs = [
  { key: "recommended" as const, label: "推荐", icon: "🏠" },
  { key: "follow" as const, label: "关注", icon: "👥" },
  { key: "bookmarks" as const, label: "收藏", icon: "⭐" },
];

const NavBar: Component = () => {
  const navigate = useNavigate();

  return (
    <nav class="fixed bottom-0 left-0 right-0 flex justify-around surface-appbar py-2 px-4 select-none">
      {tabs.map((tab) => (
        <button
          class="flex flex-col items-center gap-0.5 min-w-0 px-2 py-1 rounded-[var(--borderRadiusMedium)] transition-colors duration-[var(--durationFast)] appearance-none border-none outline-none cursor-pointer"
          classList={{
            "text-[var(--colorBrandForeground1)]": currentTab() === tab.key,
            "text-[var(--colorNeutralForeground2)] hover:text-[var(--colorNeutralForeground1)] active:bg-[var(--colorNeutralBackground1Pressed)]":
              currentTab() !== tab.key,
          }}
          onClick={() => {
            setCurrentTab(tab.key);
            if (tab.key === "bookmarks") {
              navigate("/bookmarks");
            } else {
              navigate("/feed");
            }
          }}
        >
          <span class="text-lg leading-none">{tab.icon}</span>
          <span class="[font-size:var(--fontSizeBase100)] font-medium leading-none">
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

export default NavBar;
