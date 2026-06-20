import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import UnoCSS from 'unocss/vite';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 系统代理（中国大陆需要代理访问 Pixiv）
const proxyUrl = process.env.https_proxy
  || process.env.HTTPS_PROXY
  || process.env.http_proxy
  || process.env.HTTP_PROXY
  || 'http://127.0.0.1:10808';
console.log(`[vite] 🔧 使用代理: ${proxyUrl}`);
const proxyAgent = new HttpsProxyAgent(proxyUrl);

export default defineConfig({
  plugins: [solid(), UnoCSS()],
  server: {
    proxy: {
      '/pixiv-img': {
        target: 'https://i.pximg.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pixiv-img/, ''),
        headers: {
          'Referer': 'https://app-api.pixiv.net/',
          'User-Agent': 'PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)',
        },
        agent: proxyAgent,
      },
      '/pixiv-api': {
        target: 'https://app-api.pixiv.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pixiv-api/, ''),
        headers: {
          'User-Agent': 'PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)',
          'Referer': 'https://app-api.pixiv.net/',
        },
        agent: proxyAgent,
      },
      '/pixiv-oauth': {
        target: 'https://oauth.secure.pixiv.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pixiv-oauth/, ''),
        headers: {
          'User-Agent': 'PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)',
        },
        agent: proxyAgent,
      },
    },
  },
  build: { target: 'esnext' },
});
