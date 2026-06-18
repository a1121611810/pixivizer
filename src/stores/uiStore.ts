import { createSignal } from 'solid-js';

type Tab = 'recommended' | 'follow';
type Theme = 'dark' | 'light';

const [currentTab, setCurrentTab] = createSignal<Tab>('recommended');
const [theme, setTheme] = createSignal<Theme>('dark');

export { currentTab, setCurrentTab, theme, setTheme };
