import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pixivizer.app',
  appName: 'Pixivizer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['app-api.pixiv.net', 'i.pximg.net'],
  },
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
