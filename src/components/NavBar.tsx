import type { Component } from 'solid-js';
import { currentTab, setCurrentTab } from '../stores/uiStore';

const tabs = [
  { key: 'recommended' as const, label: '推荐' },
  { key: 'follow' as const, label: '关注' },
];

const NavBar: Component = () => (
  <nav class="fixed bottom-0 left-0 right-0 flex justify-around bg-dark-900 border-t border-gray-800 py-3 px-6">
    {tabs.map((tab) => (
      <button
        class={`text-sm font-medium transition-colors ${
          currentTab() === tab.key
            ? 'text-blue-400'
            : 'text-gray-500 hover:text-gray-300'
        }`}
        onClick={() => setCurrentTab(tab.key)}
      >
        {tab.label}
      </button>
    ))}
  </nav>
);

export default NavBar;
