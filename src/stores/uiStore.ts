import { createSignal, createEffect } from 'solid-js';

type Tab = 'recommended' | 'follow' | 'bookmarks';
export type Theme = 'dark' | 'light';

const [currentTab, setCurrentTab] = createSignal<Tab>('recommended');
const [theme, setTheme] = createSignal<Theme>('light');

// Sync theme class to <html> whenever it changes
createEffect(() => {
  const root = document.documentElement;
  if (theme() === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
});

export { currentTab, setCurrentTab, theme, setTheme };
