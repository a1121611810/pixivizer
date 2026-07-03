// @vitest-environment browser
// 全局 mock：在 browser mode 下由 Vite 服务层拦截模块请求
// 此文件在 setupFiles 中配置，每个测试文件执行前自动运行

// ── 注册 Fluent UI 自定义元素 ──
import "@fluentui/web-components/web-components.js";

// ── Capacitor ──
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "web", isNativePlatform: () => false },
  CapacitorHttp: { request: vi.fn(), get: vi.fn(), post: vi.fn() },
}));

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

// ── SolidJS Router ──
vi.mock("@solidjs/router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
  useParams: () => ({}),
  useBeforeLeave: (fn: unknown) => fn as any,
}));
