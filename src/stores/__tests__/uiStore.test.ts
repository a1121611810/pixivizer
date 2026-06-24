import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { Device } from "@capacitor/device";
import { App } from "@capacitor/app";
import { setPredictiveBackEnabled } from "../../services/predictiveBack";

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: vi.fn(), isNativePlatform: vi.fn(() => false) },
}));

vi.mock("../../services/predictiveBack", () => ({
  setPredictiveBackEnabled: vi.fn(),
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: vi.fn(), set: vi.fn() },
}));

vi.mock("@capacitor/device", () => ({
  Device: { getInfo: vi.fn() },
}));

vi.mock("@capacitor/app", () => ({
  App: { toggleBackButtonHandler: vi.fn() },
}));

let originalDocument: unknown;

beforeAll(() => {
  originalDocument = (globalThis as any).document;
  (globalThis as any).document = {
    documentElement: {
      classList: { add: vi.fn(), remove: vi.fn() },
    },
  };
});

afterAll(() => {
  (globalThis as any).document = originalDocument;
});

async function loadStore() {
  vi.resetModules();
  const mod = await import("../uiStore");
  return mod;
}

describe("usePredictiveBack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to false on non-Android platforms", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");
    const { loadPredictiveBackPreference, usePredictiveBack, isPredictiveBackSupported } =
      await loadStore();
    await loadPredictiveBackPreference();
    expect(usePredictiveBack()).toBe(false);
    expect(isPredictiveBackSupported()).toBe(false);
  });

  it("defaults to true on Android 16+ when no preference exists", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Device.getInfo).mockResolvedValue({
      androidSDKVersion: 36,
    } as any);
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
    vi.mocked(App.toggleBackButtonHandler).mockResolvedValue(undefined);

    const { loadPredictiveBackPreference, usePredictiveBack, isPredictiveBackSupported } =
      await loadStore();
    await loadPredictiveBackPreference();

    expect(isPredictiveBackSupported()).toBe(true);
    expect(usePredictiveBack()).toBe(true);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "use_predictive_back",
      value: "true",
    });
  });

  it("defaults to false on Android 15 and below", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Device.getInfo).mockResolvedValue({
      androidSDKVersion: 35,
    } as any);
    vi.mocked(Preferences.set).mockResolvedValue(undefined);

    const { loadPredictiveBackPreference, usePredictiveBack, isPredictiveBackSupported } =
      await loadStore();
    await loadPredictiveBackPreference();

    expect(isPredictiveBackSupported()).toBe(false);
    expect(usePredictiveBack()).toBe(false);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "use_predictive_back",
      value: "false",
    });
  });

  it("restores saved preference when available", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    vi.mocked(Preferences.get).mockResolvedValue({ value: "false" });
    vi.mocked(Device.getInfo).mockResolvedValue({
      androidSDKVersion: 36,
    } as any);

    const { loadPredictiveBackPreference, usePredictiveBack } = await loadStore();
    await loadPredictiveBackPreference();

    expect(usePredictiveBack()).toBe(false);
  });

  it("setUsePredictiveBack persists and toggles native handler on Android", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    vi.mocked(Preferences.get).mockResolvedValue({ value: "true" });
    vi.mocked(Device.getInfo).mockResolvedValue({
      androidSDKVersion: 36,
    } as any);
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
    vi.mocked(App.toggleBackButtonHandler).mockResolvedValue(undefined);

    const { loadPredictiveBackPreference, setUsePredictiveBack } = await loadStore();
    await loadPredictiveBackPreference();
    await setUsePredictiveBack(false);

    expect(Preferences.set).toHaveBeenLastCalledWith({
      key: "use_predictive_back",
      value: "false",
    });
    expect(App.toggleBackButtonHandler).toHaveBeenLastCalledWith({
      enabled: true,
    });
    expect(setPredictiveBackEnabled).toHaveBeenLastCalledWith(false);
  });

  it("setUsePredictiveBack does not call native handler on non-Android", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");

    const { setUsePredictiveBack } = await loadStore();
    await setUsePredictiveBack(true);

    expect(Preferences.set).not.toHaveBeenCalled();
    expect(App.toggleBackButtonHandler).not.toHaveBeenCalled();
    expect(setPredictiveBackEnabled).not.toHaveBeenCalled();
  });
});
