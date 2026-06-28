# In-App Update Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app version detection feature that checks GitHub Releases for new versions, with a settings toggle (default off) and manual check button.

**Architecture:** A new `updateService.ts` module handles GitHub API requests and version comparison. The `uiStore` holds 7 new signals for update state with `@capacitor/preferences` persistence for the toggle. `SettingsSheet.tsx` gets a new UI section. `App.tsx` gets a conditional startup trigger.

**Tech Stack:** SolidJS + TypeScript + Capacitor + Vite

## Global Constraints

- No additional npm dependencies (no semver library — use numeric comparison)
- All GitHub API calls use `https://api.github.com/repos/a1121611810/pixivizer/releases/latest`
- All error handling must be silent (console.warn only, no user-facing error toasts)
- Toggle default: `false` (off)
- Only stable releases (reject `prerelease: true`)

---

### Task 1: Create `src/services/updateService.ts`

**Files:**
- Create: `src/services/updateService.ts`

**Interfaces:**
- Produces: `checkForUpdate(): Promise<CheckResult>`, `isNewer(local: string, remote: string): boolean`, types `CheckResult` and `GitHubRelease`

- [ ] **Step 1: Create the update service module**

Write `src/services/updateService.ts`:

```typescript
/**
 * In-app update check service.
 *
 * Fetches the latest stable release from GitHub and compares
 * version numbers to determine if an update is available.
 */

import { APP_VERSION } from "../types/env";

// ── Types ──

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string;
  published_at: string;
  prerelease: boolean;
}

export interface CheckResult {
  hasUpdate: boolean;
  latestVersion: string;
  latestReleaseUrl: string;
  latestChangelog: string;
}

// ── State ──

let cachedResult: CheckResult | null = null;

// ── Version comparison (no semver dependency) ──

/**
 * Compare two version strings numerically.
 * Returns true if `remote` is newer than `local`.
 * Handles optional leading "v" prefix on remote.
 */
function isNewer(local: string, remote: string): boolean {
  const lParts = local.split(".").map(Number);
  const rParts = remote.replace(/^v/, "").split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const l = lParts[i] ?? 0;
    const r = rParts[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false; // equal
}

// ── Core fetch ──

const GITHUB_API_URL =
  "https://api.github.com/repos/a1121611810/pixivizer/releases/latest";

/**
 * Fetch the latest stable release from GitHub and compare
 * against the current app version.
 *
 * All errors are silently caught — returns a safe default
 * so callers never need to handle exceptions.
 */
export async function checkForUpdate(): Promise<CheckResult> {
  try {
    const res = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": `Pictelio/${APP_VERSION}`,
      },
    });

    if (!res.ok) {
      console.warn(
        `[updateService] GitHub API responded with ${res.status}`,
      );
      return cachedResult ?? noUpdateResult();
    }

    const release: GitHubRelease = await res.json();

    // Skip pre-releases
    if (release.prerelease) {
      console.warn(
        `[updateService] Latest release is a pre-release, skipping`,
      );
      return cachedResult ?? noUpdateResult();
    }

    const hasUpdate = isNewer(APP_VERSION, release.tag_name);
    const result: CheckResult = {
      hasUpdate,
      latestVersion: release.tag_name.replace(/^v/, ""),
      latestReleaseUrl: release.html_url,
      latestChangelog: release.body || "",
    };

    cachedResult = result;
    return result;
  } catch (err) {
    console.warn("[updateService] Failed to check for update:", err);
    return cachedResult ?? noUpdateResult();
  }
}

/**
 * Get the last cached check result, or null if never checked.
 */
export function getCachedResult(): CheckResult | null {
  return cachedResult;
}

/**
 * Reset cached state (useful for testing).
 */
export function resetCache(): void {
  cachedResult = null;
}

// ── Helpers ──

function noUpdateResult(): CheckResult {
  return {
    hasUpdate: false,
    latestVersion: "",
    latestReleaseUrl: "",
    latestChangelog: "",
  };
}
```

- [ ] **Step 2: Verify the file compiles (type check)**

Run: `cd /Users/lilianda/develop/pixivizer && npx tsc --noEmit src/services/updateService.ts`
Expected: No type errors (may need to adjust path or use `pnpm run check`)

- [ ] **Step 3: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add src/services/updateService.ts
git commit -m "feat: add update check service with GitHub API integration"
```

---

### Task 2: Extend `src/stores/uiStore.ts` with update signals

**Files:**
- Modify: `src/stores/uiStore.ts`

**Interfaces:**
- Consumes: none (pure store extension)
- Produces: `autoCheckUpdate`, `setAutoCheckUpdate`, `loadAutoCheckUpdatePreference`, `hasUpdate`, `setHasUpdate`, `latestVersion`, `setLatestVersion`, `latestReleaseUrl`, `setLatestReleaseUrl`, `latestChangelog`, `setLatestChangelog`, `isCheckingUpdate`, `setIsCheckingUpdate`, `lastCheckTime`, `setLastCheckTime`

- [ ] **Step 1: Add the Preference key constant**

Find the block of `PREF_KEY_*` constants (around line 31-38 in uiStore.ts) and add after `PREF_KEY_IS_ADULT`:

```typescript
const PREF_KEY_AUTO_CHECK_UPDATE = "auto_check_update";
```

- [ ] **Step 2: Add signal declarations**

After the `isAdult` signal (around line 48), add:

```typescript
const [autoCheckUpdateSig, setAutoCheckUpdateSig] = createSignal<boolean>(false);
const [hasUpdateSig, setHasUpdateSig] = createSignal<boolean>(false);
const [latestVersionSig, setLatestVersionSig] = createSignal<string>("");
const [latestReleaseUrlSig, setLatestReleaseUrlSig] = createSignal<string>("");
const [latestChangelogSig, setLatestChangelogSig] = createSignal<string>("");
const [isCheckingUpdateSig, setIsCheckingUpdateSig] = createSignal<boolean>(false);
const [lastCheckTimeSig, setLastCheckTimeSig] = createSignal<number>(0);
```

- [ ] **Step 3: Add setter + load functions**

After `loadShowDetailStairsPreference()` (around line 275), add:

```typescript
async function setAutoCheckUpdate(enabled: boolean): Promise<void> {
  setAutoCheckUpdateSig(enabled);
  try {
    await Preferences.set({ key: PREF_KEY_AUTO_CHECK_UPDATE, value: String(enabled) });
  } catch (e) {
    console.warn("[uiStore] Failed to persist autoCheckUpdate", e);
  }
}

async function loadAutoCheckUpdatePreference(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREF_KEY_AUTO_CHECK_UPDATE });
    if (value !== null) {
      setAutoCheckUpdateSig(value === "true");
    }
  } catch (e) {
    console.warn("[uiStore] Failed to load autoCheckUpdate preference", e);
  }
}
```

- [ ] **Step 4: Wire into `resetUiStore`**

In `resetUiStore()` (around line 278), add after `await setAgeConfirmation(false, false);`:

```typescript
await setAutoCheckUpdate(false);
```

- [ ] **Step 5: Add to exports**

In the export block at the bottom of the file, add:

```typescript
autoCheckUpdateSig as autoCheckUpdate,
setAutoCheckUpdate,
loadAutoCheckUpdatePreference,
hasUpdateSig as hasUpdate,
setHasUpdate: setHasUpdateSig,
latestVersionSig as latestVersion,
setLatestVersion: setLatestVersionSig,
latestReleaseUrlSig as latestReleaseUrl,
setLatestReleaseUrl: setLatestReleaseUrlSig,
latestChangelogSig as latestChangelog,
setLatestChangelog: setLatestChangelogSig,
isCheckingUpdateSig as isCheckingUpdate,
setIsCheckingUpdate: setIsCheckingUpdateSig,
lastCheckTimeSig as lastCheckTime,
setLastCheckTime: setLastCheckTimeSig,
```

- [ ] **Step 6: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add src/stores/uiStore.ts
git commit -m "feat: add update-check signals and preference to uiStore"
```

---

### Task 3: Wire startup auto-check into `src/App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `autoCheckUpdate` (from uiStore), `checkForUpdate` (from updateService)

- [ ] **Step 1: Add imports**

Add after existing uiStore imports (around line 15):

```typescript
import { checkForUpdate } from "./services/updateService";
```

Add `autoCheckUpdate` and `loadAutoCheckUpdatePreference` to the existing uiStore import:

Find the line:
```typescript
import {
  loadPredictiveBackPreference,
  ...
  loadAgePreference,
} from "./stores/uiStore";
```

Add `loadAutoCheckUpdatePreference,` and `autoCheckUpdate,` to the import.

- [ ] **Step 2: Add load call in onMount**

In `App.tsx` `onMount`, after `await loadAgePreference();` (around line 89), add:

```typescript
await loadAutoCheckUpdatePreference();
```

- [ ] **Step 3: Add auto-check trigger**

After the `await loadBlockedIds();` line (around line 93), add:

```typescript
// Silently check for updates on startup if toggle is enabled
if (autoCheckUpdate()) {
  checkForUpdate(); // fire-and-forget, non-blocking
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add src/App.tsx
git commit -m "feat: wire startup auto-update check in App.tsx"
```

---

### Task 4: Add update check UI to `src/components/SettingsSheet.tsx`

**Files:**
- Modify: `src/components/SettingsSheet.tsx`

**Interfaces:**
- Consumes: `autoCheckUpdate`, `setAutoCheckUpdate`, `hasUpdate`, `setHasUpdate`, `latestVersion`, `setLatestVersion`, `latestReleaseUrl`, `setLatestReleaseUrl`, `latestChangelog`, `setLatestChangelog`, `isCheckingUpdate`, `setIsCheckingUpdate`, `lastCheckTime`, `setLastCheckTime` (from uiStore)
- Consumes: `checkForUpdate` (from updateService)

- [ ] **Step 1: Add imports**

Add to the existing uiStore imports in SettingsSheet.tsx:

Find the import block from `../stores/uiStore` (lines 4-34) and add these to the destructured list:
```
autoCheckUpdate,
setAutoCheckUpdate,
hasUpdate,
setHasUpdate,
latestVersion,
setLatestVersion,
latestReleaseUrl,
setLatestReleaseUrl,
latestChangelog,
setLatestChangelog,
isCheckingUpdate,
setIsCheckingUpdate,
```

Add the updateService import:
```typescript
import { checkForUpdate } from "../services/updateService";
```

- [ ] **Step 2: Add the "检测更新" section before the "About" entry**

Find the "About entry" row (starts around line 1088: `{/* About entry — clickable row */}`).

Just **before** the About row (before `{/* About entry — clickable row */}`), add:

```typescript
          {/* Divider */}
          <div class="divider mx-5" />

          {/* ── 检测更新 ── */}
          <div class="px-5 py-3 flex flex-col">
            <p class="[font-size:var(--fontSizeBase200)] font-semibold text-[var(--colorNeutralForeground3)] uppercase tracking-wide mb-1">
              检测更新
            </p>

            {/* 启动时检查更新 — toggle row */}
            <div
              class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
              onClick={() => setAutoCheckUpdate(!autoCheckUpdate())}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setAutoCheckUpdate(!autoCheckUpdate());
                }
              }}
              role="switch"
              aria-checked={autoCheckUpdate()}
              tabindex="0"
              aria-label="启动时检查更新"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 2c.345 0 .68.044 1 .128V4.2a.75.75 0 1 1-.5 1.415l-.5-.166V2.628A6.97 6.97 0 0 0 5.05 8.5H7.2a.75.75 0 0 1 0 1.5H4.06a.75.75 0 0 1-.73-.933A8.5 8.5 0 0 1 12 2zm8.67 9.933a.75.75 0 0 1 .73.567A8.5 8.5 0 0 1 12 22a8.5 8.5 0 0 1-5.647-15.12.75.75 0 0 1 .98 1.138A6.97 6.97 0 0 0 5.05 8.5h2.15a.75.75 0 0 1 0 1.5H4.06a.75.75 0 0 1-.73-.933A8.5 8.5 0 0 1 12 2c.345 0 .68.044 1 .128V4.2a.75.75 0 1 1-.5 1.415l-.5-.166V2.628A6.97 6.97 0 0 0 5.05 8.5H7.2a.75.75 0 0 1 0 1.5H4.06a.75.75 0 0 1-.73-.933A8.5 8.5 0 0 1 12 2zm-.75 6.5a.75.75 0 0 1 1.5 0v3.19l2.28 2.28a.75.75 0 1 1-1.06 1.06l-2.72-2.72V8.5z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                    启动时检查更新
                  </p>
                  <p class="[font-size:var(--fontSizeBase200)] text-[var(--colorNeutralForeground3)] leading-snug">
                    每次打开 App 时后台检测新版本
                  </p>
                </div>
              </div>
              <div
                class="flex-shrink-0 w-11 h-5 rounded-full relative transition-colors duration-[var(--durationFast)]"
                style={{
                  "background-color": autoCheckUpdate()
                    ? "var(--colorCompoundBrandBackground)"
                    : "var(--colorNeutralStroke2)",
                }}
              >
                <div
                  class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-[var(--elevation2)] transition-transform duration-[var(--durationFast)]"
                  style={{
                    transform: autoCheckUpdate() ? "translateX(1.375rem)" : "translateX(0.125rem)",
                  }}
                />
              </div>
            </div>

            {/* 检查更新 — button row */}
            <div
              class="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--colorNeutralBackground1Hover)] active:scale-[0.98] transition-transform duration-[var(--durationFast)] focus-visible:outline focus-visible:outline-[length:var(--strokeWidthThick)] focus-visible:outline-offset-[var(--strokeWidthThick)] focus-visible:outline-[color:var(--colorStrokeFocus2)] rounded-[var(--borderRadiusMedium)] -mx-2 px-2"
              onClick={async () => {
                setIsCheckingUpdate(true);
                const result = await checkForUpdate();
                setHasUpdate(result.hasUpdate);
                setLatestVersion(result.latestVersion);
                setLatestReleaseUrl(result.latestReleaseUrl);
                setLatestChangelog(result.latestChangelog);
                setIsCheckingUpdate(false);
                // If update available, open the release page
                if (result.hasUpdate && result.latestReleaseUrl) {
                  window.open(result.latestReleaseUrl, "_blank", "noopener,noreferrer");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  // Trigger same logic as onClick
                  setIsCheckingUpdate(true);
                  checkForUpdate().then((result) => {
                    setHasUpdate(result.hasUpdate);
                    setLatestVersion(result.latestVersion);
                    setLatestReleaseUrl(result.latestReleaseUrl);
                    setLatestChangelog(result.latestChangelog);
                    setIsCheckingUpdate(false);
                    if (result.hasUpdate && result.latestReleaseUrl) {
                      window.open(result.latestReleaseUrl, "_blank", "noopener,noreferrer");
                    }
                  });
                }
              }}
              role="button"
              tabindex="0"
              aria-label="检查更新"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="relative w-6 h-6 flex-shrink-0 text-[var(--colorNeutralForeground2)] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5.25 3A2.25 2.25 0 0 0 3 5.25v13.5A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V5.25A2.25 2.25 0 0 0 18.75 3H5.25zm0 1.5h13.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75V5.25a.75.75 0 0 1 .75-.75zM12 7.75a.75.75 0 0 1 .75.75v2.75h2.75a.75.75 0 0 1 0 1.5h-2.75v2.75a.75.75 0 0 1-1.5 0v-2.75H8.5a.75.75 0 0 1 0-1.5h2.75V8.5a.75.75 0 0 1 .75-.75z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <p class="[font-size:var(--fontSizeBase400)] font-semibold text-[var(--colorNeutralForeground1)] leading-snug">
                  检查更新
                </p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0 ml-3">
                {/* Loading spinner */}
                <Show when={isCheckingUpdate()}>
                  <div
                    class="w-4 h-4 [border-width:var(--strokeWidthThick)] border-solid [border-color:var(--colorNeutralStroke2)] [border-top-color:var(--colorBrandStroke1)] rounded-[var(--borderRadiusCircular)]"
                    style="animation: spin 1s linear infinite"
                  />
                </Show>
                {/* Latest version tag — only visible after check */}
                <Show when={!isCheckingUpdate() && latestVersion() !== ""}>
                  <span
                    class="[font-size:var(--fontSizeBase200)] font-semibold leading-snug"
                    classList={{
                      "text-[var(--colorStatusSuccessForeground1)]": !hasUpdate(),
                      "text-[var(--colorBrandForeground1)]": hasUpdate(),
                    }}
                  >
                    {hasUpdate() ? `v${latestVersion()} ✨` : `v${APP_VERSION} ✅`}
                  </span>
                </Show>
              </div>
            </div>
          </div>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/lilianda/develop/pixivizer
git add src/components/SettingsSheet.tsx
git commit -m "feat: add update check UI section to SettingsSheet"
```

---

## Self-Review

### 1. Spec Coverage

| Spec Requirement | Task(s) | Status |
|---|---|---|
| Toggle "启动时检查更新" (default OFF) | Task 2 (signal + preference), Task 4 (UI toggle) | ✅ |
| "检查更新" button | Task 4 (UI button row) | ✅ |
| Startup silent check | Task 3 (App.tsx trigger) | ✅ |
| Visual indicator on new version | Task 4 (version tag + accent color) | ✅ |
| Source: GitHub Releases (stable only) | Task 1 (updateService.ts — filters prerelease) | ✅ |
| Manual check shows inline status | Task 4 (loading spinner + version tag) | ✅ |
| Link to GitHub Release page | Task 4 (window.open on click when hasUpdate) | ✅ |
| No semver dependency | Task 1 (isNewer uses numeric comparison) | ✅ |
| Silent error handling | Task 1 (all errors caught, console.warn only) | ✅ |

### 2. Placeholder Scan
No "TBD", "TODO", or incomplete step content found.

### 3. Type Consistency
All signal names, function signatures, and import paths are consistent across tasks.
