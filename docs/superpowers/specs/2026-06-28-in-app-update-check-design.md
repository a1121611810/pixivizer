# In-App Update Check Design

> Pictelio 应用内版本检测更新功能设计文档

## Overview

Add an in-app update check feature that detects new versions from GitHub Releases, with a settings toggle (default off) and manual check button.

## Problem

Users have no way to know when a new version of Pictelio is available without manually visiting the GitHub Releases page. The app should optionally notify users of updates and provide a one-tap way to check.

## Requirements

1. Add a toggle in Settings: "启动时检查更新" (default: OFF)
2. Add a "检查更新" button in Settings, always available
3. On app startup (if toggle ON), silently check GitHub Releases for new version
4. Show visual indicator when a new version is found
5. Update source: GitHub Releases (stable releases only, no pre-releases)
6. Manual check shows inline status (checking / up-to-date / update available)
7. When a new version is detected, provide a link to the GitHub Release page

## Design

### 1. New file: `src/services/updateService.ts`

```typescript
interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string;
  published_at: string;
  prerelease: boolean;
}

// Core function
async function checkForUpdate(): Promise<CheckResult>

// Version comparison (no external dependency)
function isNewer(local: string, remote: string): boolean

// Get cached result (avoid refetch if already checked recently)
function getCachedResult(): CheckResult | null
```

**API call:**
- `GET https://api.github.com/repos/a1121611810/pixivizer/releases/latest`
- Headers: `Accept: application/vnd.github.v3+json`, `User-Agent: Pictelio/${APP_VERSION}`
- Filter: reject if `prerelease === true`
- Compare: strip leading "v" from `tag_name`, compare `major.minor.patch` numerically

**Error handling:** All errors (network, rate limit, parse failure) → silent fail, keep previous state.

### 2. uiStore additions

| Signal | Type | Default | Description |
|--------|------|---------|-------------|
| `autoCheckUpdate` | `boolean` | `false` | Toggle: check on startup |
| `hasUpdate` | `boolean` | `false` | Whether a new version exists |
| `latestVersion` | `string` | `""` | Latest GitHub version string |
| `latestReleaseUrl` | `string` | `""` | URL to the release page |
| `latestChangelog` | `string` | `""` | Release body (changelog) |
| `isCheckingUpdate` | `boolean` | `false` | Loading state for manual check |
| `lastCheckTime` | `number` | `0` | Timestamp of last check |

### 3. Preferences

| Key | Type | Purpose |
|-----|------|---------|
| `auto_check_update` | `string` ("true"/"false") | Persist toggle state |

### 4. SettingsSheet.tsx additions

Insert a new "检测更新" section before the "关于" row:

```
━━━ 检测更新 ━━━

🔄 启动时检查更新                    [Toggle]
每次打开 App 时后台检测新版本

[ 检查更新 ]              v1.3.0 ✨     ← update available
                          v1.2.0 ✅     ← up to date
                          ⟳ 检查中...   ← loading state
```

- Toggle row: follows existing switch pattern (e.g., autoHideNavBar)
- Button row: click → call `checkForUpdate()` → show result inline
- When `hasUpdate === true`: button row shows version badge with accent color
- Clicking when update available: open `latestReleaseUrl` via `window.open`

### 5. App.tsx trigger point

In `onMount()`, after loading all preferences, add:

```typescript
import { autoCheckUpdate, checkForUpdate } from "./services/updateService";

// After all load*Preference() calls:
if (autoCheckUpdate()) {
  checkForUpdate(); // fire-and-forget, non-blocking
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/services/updateService.ts` | **NEW** — core check logic |
| `src/stores/uiStore.ts` | Add 7 new signals + 1 Preference key |
| `src/components/SettingsSheet.tsx` | Add toggle row + button row + status display |
| `src/App.tsx` | Add auto-check trigger on startup |

## Testing

1. Manual: Toggle ON → restart app → verify silent check runs
2. Manual: Press "检查更新" button → verify loading state + result display
3. Edge case: No network → verify graceful degradation (no error, no false positive)
4. Edge case: Current version matches latest → verify shows "已是最新"
5. Edge case: Current version ahead of GitHub (dev build) → verify shows "已是最新"

## Future Considerations

- Could add push notifications via Capacitor when update is detected
- Could add in-app download/update flow (requires APK download + install permissions)
- Could add release notes page (/update route) for richer presentation

## Decision Log

- 2026-06-28: Chose GitHub Releases API over custom server (simpler, no infra)
- 2026-06-28: Chose silent startup check + manual button over push notifications
- 2026-06-28: Chose not to persist check results (fresh check on each startup/manual press)
- 2026-06-28: Chose no semver library dependency (simple numeric comparison sufficient)
