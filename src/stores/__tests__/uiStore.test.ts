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

describe("age preference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).window = { dispatchEvent: vi.fn() };
    (globalThis as any).CustomEvent = class CustomEvent {
      constructor(public type: string) {}
    };
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
  });

  it("defaults ageConfirmed and isAdult to false", async () => {
    const { ageConfirmed, isAdult } = await loadStore();

    expect(ageConfirmed()).toBe(false);
    expect(isAdult()).toBe(false);
  });

  it("loading persisted minor state forces showR18 and showR18G to false", async () => {
    vi.mocked(Preferences.get).mockImplementation(async ({ key }) => {
      if (key === "age_confirmed") return { value: "true" };
      if (key === "is_adult") return { value: "false" };
      return { value: null };
    });

    const { loadAgePreference, setShowR18, setShowR18G, showR18, showR18G } = await loadStore();
    await setShowR18(true);
    await setShowR18G(true);
    await loadAgePreference();

    expect(showR18()).toBe(false);
    expect(showR18G()).toBe(false);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "show_r18",
      value: "false",
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "show_r18g",
      value: "false",
    });
  });

  it("loading persisted adult state leaves showR18 and showR18G as persisted", async () => {
    vi.mocked(Preferences.get).mockImplementation(async ({ key }) => {
      if (key === "age_confirmed") return { value: "true" };
      if (key === "is_adult") return { value: "true" };
      if (key === "show_r18") return { value: "true" };
      if (key === "show_r18g") return { value: "true" };
      return { value: null };
    });

    const { loadAgePreference, loadShowR18Preference, loadShowR18GPreference, showR18, showR18G } =
      await loadStore();
    await loadShowR18Preference();
    await loadShowR18GPreference();
    await loadAgePreference();

    expect(showR18()).toBe(true);
    expect(showR18G()).toBe(true);
  });

  it("setAgeConfirmation(true, false) sets minor and disables adult content", async () => {
    const { setAgeConfirmation, ageConfirmed, isAdult, showR18, showR18G } = await loadStore();

    await setAgeConfirmation(true, false);

    expect(ageConfirmed()).toBe(true);
    expect(isAdult()).toBe(false);
    expect(showR18()).toBe(false);
    expect(showR18G()).toBe(false);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "age_confirmed",
      value: "true",
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "is_adult",
      value: "false",
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "show_r18",
      value: "false",
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "show_r18g",
      value: "false",
    });
  });

  it("setAgeConfirmation(true, true) sets adult", async () => {
    const { setAgeConfirmation, ageConfirmed, isAdult } = await loadStore();

    await setAgeConfirmation(true, true);

    expect(ageConfirmed()).toBe(true);
    expect(isAdult()).toBe(true);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "age_confirmed",
      value: "true",
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "is_adult",
      value: "true",
    });
  });
});

describe("resetUiStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).window = { dispatchEvent: vi.fn() };
    (globalThis as any).CustomEvent = class CustomEvent {
      constructor(public type: string) {}
    };
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
  });

  it("resets all ui signals to defaults and persists preferences", async () => {
    const {
      resetUiStore,
      theme,
      setTheme,
      setShowR18,
      setShowR18G,
      setLayoutMode,
      setAutoHideNavBar,
      setShowDetailStairs,
      setAgeConfirmation,
      showR18,
      showR18G,
      layoutMode,
      autoHideNavBar,
      showDetailStairs,
      ageConfirmed,
      isAdult,
      cacheSize,
    } = await loadStore();

    await setTheme("dark");
    await setShowR18(true);
    await setShowR18G(true);
    await setLayoutMode("grid");
    await setAutoHideNavBar(false);
    await setShowDetailStairs(true);
    await setAgeConfirmation(true, true);

    await resetUiStore();

    expect(theme()).toBe("light");
    expect(showR18()).toBe(false);
    expect(showR18G()).toBe(false);
    expect(layoutMode()).toBe("waterfall");
    expect(autoHideNavBar()).toBe(true);
    expect(showDetailStairs()).toBe(false);
    expect(ageConfirmed()).toBe(false);
    expect(isAdult()).toBe(false);
    expect(cacheSize()).toBe(600);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "show_r18",
      value: "false",
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "show_r18g",
      value: "false",
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "layout_mode",
      value: "waterfall",
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "auto_hide_nav_bar",
      value: "true",
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "show_detail_stairs",
      value: "false",
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "age_confirmed",
      value: "false",
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: "is_adult",
      value: "false",
    });
  });
});
