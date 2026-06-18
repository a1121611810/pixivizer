import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  plugins: [solid(), UnoCSS()],
  server: {
    proxy: {
      '/pixiv-img': {
        target: 'https://i.pximg.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pixiv-img/, ''),
        headers: { 'Referer': 'https://app-api.pixiv.net/' },
      },
    },
  },
  build: { target: 'esnext' },
});
