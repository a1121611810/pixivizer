import { defineConfig, presetUno, presetIcons } from 'unocss';

export default defineConfig({
  presets: [presetUno(), presetIcons()],
  shortcuts: {
    'btn': 'px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600',
    'card': 'rounded-xl bg-gray-800 overflow-hidden shadow-lg',
    'page': 'min-h-screen bg-gray-950 text-white',
  },
  theme: {
    colors: {
      dark: { 950: '#0a0a0f', 900: '#14141f', 800: '#1e1e2f' },
    },
  },
});
