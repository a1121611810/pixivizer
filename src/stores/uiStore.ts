import { createSignal, createEffect } from 'solid-js';

type Tab = 'recommended' | 'follow' | 'bookmarks';
export type Theme = 'dark' | 'light';
export type ImageQuality = 'medium' | 'large' | 'original';

const [currentTab, setCurrentTab] = createSignal<Tab>('recommended');
const [theme, setTheme] = createSignal<Theme>('light');
const [showSettingsSheet, setShowSettingsSheet] = createSignal(false);
const [listQuality, setListQuality] = createSignal<ImageQuality>('medium');
const [detailQuality, setDetailQuality] = createSignal<ImageQuality>('medium');

// Sync theme class to <html> whenever it changes
createEffect(() => {
  const root = document.documentElement;
  if (theme() === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
});

// Log tab changes for debugging
createEffect(() => {
});

export {
  currentTab, setCurrentTab,
  theme, setTheme,
  showSettingsSheet, setShowSettingsSheet,
  listQuality, setListQuality,
  detailQuality, setDetailQuality,
};
