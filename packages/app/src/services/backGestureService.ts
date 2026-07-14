import { createSignal } from "solid-js";
import { App as CapApp } from "@capacitor/app";

export type OverlayType =
  | "viewer"
  | "settingsDrawer"
  | "seriesSheet"
  | "readerSettingsSheet"
  | "commentSheet";

interface OverlayEntry {
  type: OverlayType;
  close: () => void;
}

interface RouterLike {
  state: { location: { pathname: string } };
  history: { back: () => void };
}

const [stack, setStack] = createSignal<OverlayEntry[]>([]);

const rootPaths = new Set(["/recommended", "/following", "/bookmarks", "/login"]);

/** Time window (ms) within which two back presses at root exit the app. */
const EXIT_DOUBLE_TAP_MS = 2000;

export function pushOverlay(type: OverlayType, close: () => void): void {
  setStack((prev) => [...prev, { type, close }]);
}

export function popOverlay(type: OverlayType): boolean {
  let removed = false;
  setStack((prev) => {
    const idx = prev.findLastIndex((entry) => entry.type === type);
    if (idx === -1) return prev;
    removed = true;
    const entry = prev[idx];
    entry.close();
    return prev.slice(0, idx).concat(prev.slice(idx + 1));
  });
  return removed;
}

export function closeTopOverlay(): boolean {
  const top = stack()[stack().length - 1];
  if (!top) return false;
  top.close();
  setStack((prev) => prev.slice(0, -1));
  return true;
}

export async function registerBackGesture(router: RouterLike): Promise<() => void> {
  let lastBackTime = 0;
  const listener = await CapApp.addListener("backButton", () => {
    if (closeTopOverlay()) return;

    const pathname = router.state.location.pathname;
    if (!rootPaths.has(pathname)) {
      router.history.back();
      return;
    }

    if (Date.now() - lastBackTime < EXIT_DOUBLE_TAP_MS) {
      void CapApp.exitApp();
    } else {
      lastBackTime = Date.now();
      window.dispatchEvent(new CustomEvent("exitHint"));
    }
  });

  return () => listener.remove();
}
