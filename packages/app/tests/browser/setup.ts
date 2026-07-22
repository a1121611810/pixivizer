// @vitest-environment browser
// 全局 mock：在 browser mode 下由 Vite 服务层拦截模块请求
// 此文件在 setupFiles 中配置，每个测试文件执行前自动运行

// ── 注册 Fluent UI 自定义元素 ──
import "@fluentui/web-components/web-components.js";

// ── Capacitor ──
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "web", isNativePlatform: () => false },
  CapacitorHttp: { request: vi.fn(), get: vi.fn(), post: vi.fn() },
  registerPlugin: <T>(_pluginName: string): T => ({}) as T,
}));

// ── Define public config for browser tests ──
globalThis.__PUBLIC_CONFIG__ = {
  userAgent: "PixivIOSApp/7.18.3 (iOS 18.5; iPhone15,4)",
  appOs: "ios",
  appOsVersion: "18.5",
  authUrl: "https://oauth.secure.pixiv.net/auth/token",
  apiBaseUrl: "https://app-api.pixiv.net",
  loginUrl: "https://app-api.pixiv.net/web/v1/login",
  redirectUri: "https://app-api.pixiv.net/web/v1/users/auth/pixiv/callback",
  imageCdnUrl: "https://i.pximg.net",
  referer: "https://app-api.pixiv.net/",
  contentType: "application/x-www-form-urlencoded",
  timeout: {
    connect: 15000,
    read: 30000,
    overrides: {
      imageProxy: { connect: 10000, read: 15000 },
      dnsQuery: { connect: 5000, read: 5000 },
      oauthDialog: { read: 120000 },
    },
  },
  minWebviewVersion: 85,
  cacheDir: "pictelio-images",
  cacheMaxBytes: 314572800,
  dohUrl: "https://cloudflare-dns.com/dns-query?name=",
  allowedHosts: ["app-api.pixiv.net", "i.pximg.net"],
};

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: () => Promise.resolve({ value: null }),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    toggleBackButtonHandler: vi.fn(),
    addListener: vi.fn(() => ({ remove: vi.fn() })),
    exitApp: vi.fn(),
  },
}));

vi.mock("@capacitor/device", () => ({
  Device: { getInfo: () => Promise.resolve({ androidSDKVersion: 30 }) },
}));

// ── TanStack Router ──
vi.mock("@tanstack/solid-router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => () => ({ pathname: "/" }),
  useParams: () => () => ({}),
  useRouter: () => ({ history: { back: vi.fn() } }),
  getRouteApi: () => ({ useLoaderData: () => () => undefined }),
  useBeforeLeave: (fn: unknown) => fn as any,
}));
