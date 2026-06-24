import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@capacitor/core", async () => {
  const actual = await vi.importActual<typeof import("@capacitor/core")>("@capacitor/core");
  return {
    ...actual,
    Capacitor: { getPlatform: vi.fn(() => "web"), isNativePlatform: vi.fn(() => false) },
  };
});

vi.mock("../api/illust", () => ({
  loadRecommended: vi.fn(),
  loadFollow: vi.fn(),
  loadNext: vi.fn(),
}));

let mockCurrentTab = "recommended";

vi.mock("../uiStore", () => ({
  get currentTab() {
    return () => mockCurrentTab;
  },
  setCurrentTab: vi.fn((t: string) => {
    mockCurrentTab = t;
  }),
  setShowSettingsSheet: vi.fn(),
}));

describe("saveTabScroll", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCurrentTab = "recommended";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).window = undefined;
  });

  it("saves window.scrollY as the tab scroll position", async () => {
    (globalThis as any).window = { scrollY: 1234 };
    const { saveTabScroll, getFeedScrollY } = await import("../feedStore");

    saveTabScroll("recommended");

    expect(getFeedScrollY()).toBe(1234);
  });

  it("saves different scroll positions per tab", async () => {
    (globalThis as any).window = { scrollY: 567 };
    mockCurrentTab = "follow";
    const { saveTabScroll, getFeedScrollY } = await import("../feedStore");

    saveTabScroll("follow");

    expect(getFeedScrollY()).toBe(567);
  });
});
